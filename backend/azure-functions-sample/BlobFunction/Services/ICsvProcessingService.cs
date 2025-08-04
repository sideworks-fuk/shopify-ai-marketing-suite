using Azure.Storage.Blobs;
using BlobFunction.Models;

namespace BlobFunction.Services;

public interface ICsvProcessingService
{
    /// <summary>
    /// Parses a customers CSV file from blob storage
    /// </summary>
    Task<List<CustomerCsvRecord>> ParseCustomersCsv(BlobClient blobClient);

    /// <summary>
    /// Parses an orders CSV file from blob storage
    /// </summary>
    Task<List<OrderCsvRecord>> ParseOrdersCsv(BlobClient blobClient);

    /// <summary>
    /// Parses a products CSV file from blob storage
    /// </summary>
    Task<List<ProductCsvRecord>> ParseProductsCsv(BlobClient blobClient);

    /// <summary>
    /// Validates CSV file format and structure
    /// </summary>
    Task<bool> ValidateCsvFormat(BlobClient blobClient, string expectedType);
}