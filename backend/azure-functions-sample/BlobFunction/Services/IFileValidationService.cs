using Azure.Storage.Blobs;
using BlobFunction.Models;

namespace BlobFunction.Services;

public interface IFileValidationService
{
    /// <summary>
    /// Validates uploaded file for processing
    /// </summary>
    Task<FileValidationResult> ValidateFile(BlobClient blobClient, string fileName);

    /// <summary>
    /// Checks file size limits
    /// </summary>
    Task<bool> ValidateFileSize(BlobClient blobClient, long maxSizeBytes = 100_000_000); // 100MB default

    /// <summary>
    /// Validates file extension and type
    /// </summary>
    bool ValidateFileExtension(string fileName, string[] allowedExtensions = null);

    /// <summary>
    /// Estimates number of records in CSV file
    /// </summary>
    Task<int> EstimateRecordCount(BlobClient blobClient);
}