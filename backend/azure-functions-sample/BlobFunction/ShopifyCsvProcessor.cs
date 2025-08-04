using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Azure.Storage.Blobs;
using BlobFunction.Services;
using BlobFunction.Models;

namespace BlobFunction;

public class ShopifyCsvProcessor
{
    private readonly ILogger<ShopifyCsvProcessor> _logger;
    private readonly ICsvProcessingService _csvProcessor;
    private readonly IDataImportService _dataImport;
    private readonly IFileValidationService _fileValidator;

    public ShopifyCsvProcessor(
        ILogger<ShopifyCsvProcessor> logger,
        ICsvProcessingService csvProcessor,
        IDataImportService dataImport,
        IFileValidationService fileValidator)
    {
        _logger = logger;
        _csvProcessor = csvProcessor;
        _dataImport = dataImport;
        _fileValidator = fileValidator;
    }

    [Function("ProcessShopifyCsvFile")]
    public async Task ProcessCsvFile(
        [BlobTrigger("shopify-data-imports/{name}", Connection = "AzureWebJobsStorage")] 
        BlobClient blobClient,
        string name)
    {
        var startTime = DateTime.UtcNow;
        _logger.LogInformation("📁 Processing CSV file: {FileName}", name);

        try
        {
            // Validate file
            var validationResult = await _fileValidator.ValidateFile(blobClient, name);
            if (!validationResult.IsValid)
            {
                _logger.LogError("❌ File validation failed: {Errors}", string.Join(", ", validationResult.Errors));
                await MoveToErrorContainer(blobClient, name, validationResult.Errors);
                return;
            }

            _logger.LogInformation("✅ File validation passed: {FileName}", name);

            // Determine file type and process accordingly
            var processed = name.ToLower() switch
            {
                var filename when filename.Contains("customers") => await ProcessCustomersFile(blobClient, name),
                var filename when filename.Contains("orders") => await ProcessOrdersFile(blobClient, name),
                var filename when filename.Contains("products") => await ProcessProductsFile(blobClient, name),
                _ => await ProcessUnknownFile(blobClient, name)
            };

            if (processed)
            {
                var processingTime = DateTime.UtcNow - startTime;
                _logger.LogInformation("✅ Successfully processed {FileName} in {ProcessingTime:mm\\:ss}", 
                    name, processingTime);
                
                await MoveToProcessedContainer(blobClient, name);
            }
            else
            {
                _logger.LogError("❌ Failed to process {FileName}", name);
                await MoveToErrorContainer(blobClient, name, ["Processing failed"]);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error processing CSV file: {FileName}", name);
            await MoveToErrorContainer(blobClient, name, [ex.Message]);
        }
    }

    private async Task<bool> ProcessCustomersFile(BlobClient blobClient, string fileName)
    {
        try
        {
            _logger.LogInformation("👥 Processing customers CSV file: {FileName}", fileName);

            // Download and parse CSV
            var csvData = await _csvProcessor.ParseCustomersCsv(blobClient);
            if (!csvData.Any())
            {
                _logger.LogWarning("⚠️ No valid customer data found in {FileName}", fileName);
                return false;
            }

            _logger.LogInformation("📊 Found {Count} customer records in {FileName}", csvData.Count, fileName);

            // Extract store ID from filename or metadata
            var storeId = ExtractStoreIdFromFileName(fileName);
            
            // Import to database
            var importResult = await _dataImport.ImportCustomers(csvData, storeId);
            
            _logger.LogInformation("✅ Imported {Imported} customers, skipped {Skipped}, errors {Errors}", 
                importResult.ImportedCount, importResult.SkippedCount, importResult.ErrorCount);

            return importResult.ImportedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error processing customers file: {FileName}", fileName);
            return false;
        }
    }

    private async Task<bool> ProcessOrdersFile(BlobClient blobClient, string fileName)
    {
        try
        {
            _logger.LogInformation("🛍️ Processing orders CSV file: {FileName}", fileName);

            var csvData = await _csvProcessor.ParseOrdersCsv(blobClient);
            if (!csvData.Any())
            {
                _logger.LogWarning("⚠️ No valid order data found in {FileName}", fileName);
                return false;
            }

            _logger.LogInformation("📊 Found {Count} order records in {FileName}", csvData.Count, fileName);

            var storeId = ExtractStoreIdFromFileName(fileName);
            var importResult = await _dataImport.ImportOrders(csvData, storeId);
            
            _logger.LogInformation("✅ Imported {Imported} orders, skipped {Skipped}, errors {Errors}", 
                importResult.ImportedCount, importResult.SkippedCount, importResult.ErrorCount);

            return importResult.ImportedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error processing orders file: {FileName}", fileName);
            return false;
        }
    }

    private async Task<bool> ProcessProductsFile(BlobClient blobClient, string fileName)
    {
        try
        {
            _logger.LogInformation("🏷️ Processing products CSV file: {FileName}", fileName);

            var csvData = await _csvProcessor.ParseProductsCsv(blobClient);
            if (!csvData.Any())
            {
                _logger.LogWarning("⚠️ No valid product data found in {FileName}", fileName);
                return false;
            }

            _logger.LogInformation("📊 Found {Count} product records in {FileName}", csvData.Count, fileName);

            var storeId = ExtractStoreIdFromFileName(fileName);
            var importResult = await _dataImport.ImportProducts(csvData, storeId);
            
            _logger.LogInformation("✅ Imported {Imported} products, skipped {Skipped}, errors {Errors}", 
                importResult.ImportedCount, importResult.SkippedCount, importResult.ErrorCount);

            return importResult.ImportedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error processing products file: {FileName}", fileName);
            return false;
        }
    }

    private async Task<bool> ProcessUnknownFile(BlobClient blobClient, string fileName)
    {
        _logger.LogWarning("❓ Unknown file type: {FileName}. Moving to error container.", fileName);
        await MoveToErrorContainer(blobClient, fileName, ["Unknown file type"]);
        return false;
    }

    private string ExtractStoreIdFromFileName(string fileName)
    {
        try
        {
            // Extract store ID from filename patterns like:
            // "store1_customers_export.csv"
            // "customers_store2.csv"
            // "store3_orders_2024-08-02.csv"
            
            var parts = fileName.ToLower().Split('_', '-', '.');
            var storePart = parts.FirstOrDefault(p => p.StartsWith("store") && p.Length > 5);
            
            if (!string.IsNullOrEmpty(storePart))
            {
                return storePart;
            }

            // Default fallback
            _logger.LogWarning("⚠️ Could not extract store ID from filename: {FileName}. Using 'unknown'", fileName);
            return "unknown";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error extracting store ID from filename: {FileName}", fileName);
            return "unknown";
        }
    }

    private async Task MoveToProcessedContainer(BlobClient sourceBlob, string fileName)
    {
        try
        {
            var processedContainerName = Environment.GetEnvironmentVariable("PROCESSED_CONTAINER") ?? "processed-files";
            var destBlobName = $"{DateTime.UtcNow:yyyy-MM-dd}/{fileName}";
            
            var containerClient = sourceBlob.GetParentBlobContainerClient()
                .GetBlobServiceClient()
                .GetBlobContainerClient(processedContainerName);
            
            await containerClient.CreateIfNotExistsAsync();
            
            var destBlob = containerClient.GetBlobClient(destBlobName);
            await destBlob.StartCopyFromUriAsync(sourceBlob.Uri);
            
            // Wait a moment for copy to complete, then delete source
            await Task.Delay(1000);
            await sourceBlob.DeleteIfExistsAsync();
            
            _logger.LogInformation("📂 Moved {FileName} to processed container", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error moving file to processed container: {FileName}", fileName);
        }
    }

    private async Task MoveToErrorContainer(BlobClient sourceBlob, string fileName, IEnumerable<string> errors)
    {
        try
        {
            var errorContainerName = Environment.GetEnvironmentVariable("ERROR_CONTAINER") ?? "error-files";
            var destBlobName = $"{DateTime.UtcNow:yyyy-MM-dd}/{fileName}";
            
            var containerClient = sourceBlob.GetParentBlobContainerClient()
                .GetBlobServiceClient()
                .GetBlobContainerClient(errorContainerName);
            
            await containerClient.CreateIfNotExistsAsync();
            
            var destBlob = containerClient.GetBlobClient(destBlobName);
            await destBlob.StartCopyFromUriAsync(sourceBlob.Uri);
            
            // Add error metadata
            var metadata = new Dictionary<string, string>
            {
                ["ProcessedDate"] = DateTime.UtcNow.ToString("O"),
                ["ErrorCount"] = errors.Count().ToString(),
                ["Errors"] = string.Join("; ", errors.Take(5)) // Limit metadata size
            };
            
            await destBlob.SetMetadataAsync(metadata);
            
            // Wait a moment for copy to complete, then delete source
            await Task.Delay(1000);
            await sourceBlob.DeleteIfExistsAsync();
            
            _logger.LogInformation("📂 Moved {FileName} to error container with {ErrorCount} errors", 
                fileName, errors.Count());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error moving file to error container: {FileName}", fileName);
        }
    }
}