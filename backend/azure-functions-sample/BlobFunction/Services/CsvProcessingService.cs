using Azure.Storage.Blobs;
using BlobFunction.Models;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text;

namespace BlobFunction.Services;

public class CsvProcessingService : ICsvProcessingService
{
    private readonly ILogger<CsvProcessingService> _logger;

    public CsvProcessingService(ILogger<CsvProcessingService> logger)
    {
        _logger = logger;
    }

    public async Task<List<CustomerCsvRecord>> ParseCustomersCsv(BlobClient blobClient)
    {
        try
        {
            _logger.LogInformation("👥 Parsing customers CSV file");
            
            var response = await blobClient.DownloadStreamingAsync();
            using var stream = response.Value.Content;
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null,
                BadDataFound = context =>
                {
                    _logger.LogWarning("⚠️ Bad data found at row {Row}: {RawRecord}", 
                        context.Parser.Row, context.RawRecord);
                }
            };

            using var csv = new CsvReader(reader, config);
            var records = new List<CustomerCsvRecord>();

            await foreach (var record in csv.GetRecordsAsync<CustomerCsvRecord>())
            {
                if (IsValidCustomerRecord(record))
                {
                    records.Add(record);
                }
                else
                {
                    _logger.LogWarning("⚠️ Skipping invalid customer record at row {Row}", csv.Parser.Row);
                }
            }

            _logger.LogInformation("✅ Parsed {Count} valid customer records", records.Count);
            return records;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error parsing customers CSV");
            return new List<CustomerCsvRecord>();
        }
    }

    public async Task<List<OrderCsvRecord>> ParseOrdersCsv(BlobClient blobClient)
    {
        try
        {
            _logger.LogInformation("🛍️ Parsing orders CSV file");
            
            var response = await blobClient.DownloadStreamingAsync();
            using var stream = response.Value.Content;
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null,
                BadDataFound = context =>
                {
                    _logger.LogWarning("⚠️ Bad data found at row {Row}: {RawRecord}", 
                        context.Parser.Row, context.RawRecord);
                }
            };

            using var csv = new CsvReader(reader, config);
            var records = new List<OrderCsvRecord>();

            await foreach (var record in csv.GetRecordsAsync<OrderCsvRecord>())
            {
                if (IsValidOrderRecord(record))
                {
                    records.Add(record);
                }
                else
                {
                    _logger.LogWarning("⚠️ Skipping invalid order record at row {Row}", csv.Parser.Row);
                }
            }

            _logger.LogInformation("✅ Parsed {Count} valid order records", records.Count);
            return records;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error parsing orders CSV");
            return new List<OrderCsvRecord>();
        }
    }

    public async Task<List<ProductCsvRecord>> ParseProductsCsv(BlobClient blobClient)
    {
        try
        {
            _logger.LogInformation("🏷️ Parsing products CSV file");
            
            var response = await blobClient.DownloadStreamingAsync();
            using var stream = response.Value.Content;
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null,
                BadDataFound = context =>
                {
                    _logger.LogWarning("⚠️ Bad data found at row {Row}: {RawRecord}", 
                        context.Parser.Row, context.RawRecord);
                }
            };

            using var csv = new CsvReader(reader, config);
            var records = new List<ProductCsvRecord>();

            await foreach (var record in csv.GetRecordsAsync<ProductCsvRecord>())
            {
                if (IsValidProductRecord(record))
                {
                    records.Add(record);
                }
                else
                {
                    _logger.LogWarning("⚠️ Skipping invalid product record at row {Row}", csv.Parser.Row);
                }
            }

            _logger.LogInformation("✅ Parsed {Count} valid product records", records.Count);
            return records;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error parsing products CSV");
            return new List<ProductCsvRecord>();
        }
    }

    public async Task<bool> ValidateCsvFormat(BlobClient blobClient, string expectedType)
    {
        try
        {
            _logger.LogInformation("🔍 Validating CSV format for type: {ExpectedType}", expectedType);
            
            var response = await blobClient.DownloadStreamingAsync();
            using var stream = response.Value.Content;
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            // Read first few lines to validate headers
            var firstLine = await reader.ReadLineAsync();
            if (string.IsNullOrEmpty(firstLine))
            {
                _logger.LogError("❌ CSV file is empty");
                return false;
            }

            var headers = firstLine.Split(',').Select(h => h.Trim('"')).ToArray();
            
            var isValid = expectedType.ToLower() switch
            {
                "customers" => ValidateCustomersHeaders(headers),
                "orders" => ValidateOrdersHeaders(headers),
                "products" => ValidateProductsHeaders(headers),
                _ => false
            };

            if (isValid)
            {
                _logger.LogInformation("✅ CSV format validation passed for {ExpectedType}", expectedType);
            }
            else
            {
                _logger.LogError("❌ CSV format validation failed for {ExpectedType}", expectedType);
            }

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error validating CSV format");
            return false;
        }
    }

    private bool IsValidCustomerRecord(CustomerCsvRecord record)
    {
        // Basic validation - require email or first/last name
        return !string.IsNullOrWhiteSpace(record.Email) || 
               (!string.IsNullOrWhiteSpace(record.FirstName) && !string.IsNullOrWhiteSpace(record.LastName));
    }

    private bool IsValidOrderRecord(OrderCsvRecord record)
    {
        // Basic validation - require name and total
        return !string.IsNullOrWhiteSpace(record.Name) && 
               !string.IsNullOrWhiteSpace(record.Total);
    }

    private bool IsValidProductRecord(ProductCsvRecord record)
    {
        // Basic validation - require title and handle
        return !string.IsNullOrWhiteSpace(record.Title) && 
               !string.IsNullOrWhiteSpace(record.Handle);
    }

    private bool ValidateCustomersHeaders(string[] headers)
    {
        var requiredHeaders = new[] { "Email", "First Name", "Last Name" };
        return requiredHeaders.Any(required => headers.Contains(required, StringComparer.OrdinalIgnoreCase));
    }

    private bool ValidateOrdersHeaders(string[] headers)
    {
        var requiredHeaders = new[] { "Name", "Total", "Email" };
        return requiredHeaders.Any(required => headers.Contains(required, StringComparer.OrdinalIgnoreCase));
    }

    private bool ValidateProductsHeaders(string[] headers)
    {
        var requiredHeaders = new[] { "Title", "Handle" };
        return requiredHeaders.Any(required => headers.Contains(required, StringComparer.OrdinalIgnoreCase));
    }
}