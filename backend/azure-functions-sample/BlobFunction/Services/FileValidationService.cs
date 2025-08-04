using Azure.Storage.Blobs;
using BlobFunction.Models;
using Microsoft.Extensions.Logging;

namespace BlobFunction.Services;

public class FileValidationService : IFileValidationService
{
    private readonly ILogger<FileValidationService> _logger;
    private readonly string[] _defaultAllowedExtensions = { ".csv", ".txt" };
    private const long DefaultMaxSizeBytes = 100_000_000; // 100MB

    public FileValidationService(ILogger<FileValidationService> logger)
    {
        _logger = logger;
    }

    public async Task<FileValidationResult> ValidateFile(BlobClient blobClient, string fileName)
    {
        var result = new FileValidationResult { IsValid = true };

        try
        {
            _logger.LogInformation("🔍 Validating file: {FileName}", fileName);

            // Check file extension
            if (!ValidateFileExtension(fileName))
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid file extension. Allowed: {string.Join(", ", _defaultAllowedExtensions)}");
            }

            // Check file size
            if (!await ValidateFileSize(blobClient))
            {
                result.IsValid = false;
                result.Errors.Add($"File too large. Maximum size: {DefaultMaxSizeBytes:N0} bytes");
            }
            else
            {
                // Get actual file size
                var properties = await blobClient.GetPropertiesAsync();
                result.FileSizeBytes = properties.Value.ContentLength;
            }

            // Estimate record count
            if (result.IsValid)
            {
                result.EstimatedRecordCount = await EstimateRecordCount(blobClient);
                
                if (result.EstimatedRecordCount > 100_000)
                {
                    result.Warnings.Add($"Large file detected: {result.EstimatedRecordCount:N0} estimated records");
                }
            }

            // Check if file is empty
            if (result.FileSizeBytes < 10)
            {
                result.IsValid = false;
                result.Errors.Add("File appears to be empty or too small");
            }

            if (result.IsValid)
            {
                _logger.LogInformation("✅ File validation passed: {FileName} ({Size:N0} bytes, ~{Records:N0} records)", 
                    fileName, result.FileSizeBytes, result.EstimatedRecordCount);
            }
            else
            {
                _logger.LogWarning("❌ File validation failed: {FileName}. Errors: {Errors}", 
                    fileName, string.Join(", ", result.Errors));
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error validating file: {FileName}", fileName);
            result.IsValid = false;
            result.Errors.Add($"Validation error: {ex.Message}");
            return result;
        }
    }

    public async Task<bool> ValidateFileSize(BlobClient blobClient, long maxSizeBytes = DefaultMaxSizeBytes)
    {
        try
        {
            var properties = await blobClient.GetPropertiesAsync();
            var fileSize = properties.Value.ContentLength;
            
            var isValid = fileSize <= maxSizeBytes;
            
            if (!isValid)
            {
                _logger.LogWarning("⚠️ File size {FileSize:N0} exceeds maximum {MaxSize:N0} bytes", 
                    fileSize, maxSizeBytes);
            }

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error checking file size");
            return false;
        }
    }

    public bool ValidateFileExtension(string fileName, string[] allowedExtensions = null)
    {
        try
        {
            allowedExtensions ??= _defaultAllowedExtensions;
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            
            var isValid = allowedExtensions.Contains(extension);
            
            if (!isValid)
            {
                _logger.LogWarning("⚠️ Invalid file extension: {Extension}. Allowed: {AllowedExtensions}", 
                    extension, string.Join(", ", allowedExtensions));
            }

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error validating file extension for: {FileName}", fileName);
            return false;
        }
    }

    public async Task<int> EstimateRecordCount(BlobClient blobClient)
    {
        try
        {
            var response = await blobClient.DownloadStreamingAsync();
            using var stream = response.Value.Content;
            using var reader = new StreamReader(stream);

            var lineCount = 0;
            var sampleSize = 10000; // Read first 10KB to estimate

            var buffer = new char[sampleSize];
            var charsRead = await reader.ReadAsync(buffer, 0, sampleSize);
            
            if (charsRead == 0)
                return 0;

            var sampleText = new string(buffer, 0, charsRead);
            var linesInSample = sampleText.Count(c => c == '\n');
            
            // Get total file size
            var properties = await blobClient.GetPropertiesAsync();
            var totalSize = properties.Value.ContentLength;
            
            if (linesInSample == 0 || charsRead == 0)
                return 0;

            // Estimate total lines based on sample
            var estimatedLines = (int)((double)linesInSample / charsRead * totalSize);
            
            // Subtract 1 for header row if present
            var estimatedRecords = Math.Max(0, estimatedLines - 1);
            
            _logger.LogInformation("📊 Estimated {Records:N0} records in file (based on {SampleSize:N0} byte sample)", 
                estimatedRecords, charsRead);

            return estimatedRecords;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error estimating record count");
            return 0;
        }
    }
}