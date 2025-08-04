using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using Azure.Identity;
using BlobFunction.Models;
using System.Diagnostics;
using System.Globalization;

namespace BlobFunction.Services;

public class DataImportService : IDataImportService
{
    private readonly ILogger<DataImportService> _logger;
    private readonly IConfiguration _configuration;
    private readonly string _connectionString;

    public DataImportService(
        ILogger<DataImportService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _connectionString = _configuration.GetConnectionString("AZURE_SQL_CONNECTIONSTRING") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    public async Task<ImportResult> ImportCustomers(List<CustomerCsvRecord> customers, string storeId)
    {
        var result = new ImportResult();
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("💾 Starting import of {Count} customers for store {StoreId}", 
                customers.Count, storeId);

            using var connection = await CreateConnectionAsync();

            foreach (var customer in customers)
            {
                try
                {
                    var sql = @"
                        MERGE Customers AS target
                        USING (SELECT @Email AS Email, @StoreId AS StoreId) AS source
                        ON target.Email = source.Email AND target.StoreId = source.StoreId
                        WHEN MATCHED THEN
                            UPDATE SET 
                                FirstName = @FirstName,
                                LastName = @LastName,
                                Phone = @Phone,
                                AcceptsEmailMarketing = @AcceptsEmailMarketing,
                                TotalSpent = @TotalSpent,
                                TotalOrders = @TotalOrders,
                                Tags = @Tags,
                                UpdatedAt = GETUTCDATE()
                        WHEN NOT MATCHED THEN
                            INSERT (Email, StoreId, FirstName, LastName, Phone, AcceptsEmailMarketing, TotalSpent, TotalOrders, Tags, CreatedAt, UpdatedAt)
                            VALUES (@Email, @StoreId, @FirstName, @LastName, @Phone, @AcceptsEmailMarketing, @TotalSpent, @TotalOrders, @Tags, GETUTCDATE(), GETUTCDATE());";

                    using var command = new SqlCommand(sql, connection);
                    command.Parameters.AddWithValue("@Email", customer.Email ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@StoreId", storeId);
                    command.Parameters.AddWithValue("@FirstName", customer.FirstName ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@LastName", customer.LastName ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Phone", customer.Phone ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@AcceptsEmailMarketing", 
                        ParseBooleanString(customer.AcceptsEmailMarketing) ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@TotalSpent", 
                        ParseDecimalString(customer.TotalSpent) ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@TotalOrders", 
                        ParseIntString(customer.TotalOrders) ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Tags", customer.Tags ?? (object)DBNull.Value);

                    await command.ExecuteNonQueryAsync();
                    result.ImportedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "💥 Error importing customer: {Email}", customer.Email);
                    result.ErrorCount++;
                    result.Errors.Add($"Customer {customer.Email}: {ex.Message}");
                }
            }

            result.ProcessingTime = stopwatch.Elapsed;
            _logger.LogInformation("✅ Customer import completed. Imported: {Imported}, Errors: {Errors}, Time: {Time:mm\\:ss}", 
                result.ImportedCount, result.ErrorCount, result.ProcessingTime);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error during customer import");
            result.Errors.Add($"Import failed: {ex.Message}");
            return result;
        }
    }

    public async Task<ImportResult> ImportOrders(List<OrderCsvRecord> orders, string storeId)
    {
        var result = new ImportResult();
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("💾 Starting import of {Count} orders for store {StoreId}", 
                orders.Count, storeId);

            using var connection = await CreateConnectionAsync();

            foreach (var order in orders)
            {
                try
                {
                    // Import order
                    var orderSql = @"
                        MERGE Orders AS target
                        USING (SELECT @Name AS Name, @StoreId AS StoreId) AS source
                        ON target.Name = source.Name AND target.StoreId = source.StoreId
                        WHEN MATCHED THEN
                            UPDATE SET 
                                Email = @Email,
                                FinancialStatus = @FinancialStatus,
                                FulfillmentStatus = @FulfillmentStatus,
                                Currency = @Currency,
                                TotalPrice = @TotalPrice,
                                SubtotalPrice = @SubtotalPrice,
                                TotalTax = @TotalTax,
                                UpdatedAt = @UpdatedAt
                        WHEN NOT MATCHED THEN
                            INSERT (Name, StoreId, Email, FinancialStatus, FulfillmentStatus, Currency, TotalPrice, SubtotalPrice, TotalTax, CreatedAt, UpdatedAt)
                            VALUES (@Name, @StoreId, @Email, @FinancialStatus, @FulfillmentStatus, @Currency, @TotalPrice, @SubtotalPrice, @TotalTax, @CreatedAt, @UpdatedAt);";

                    using var orderCommand = new SqlCommand(orderSql, connection);
                    orderCommand.Parameters.AddWithValue("@Name", order.Name ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@StoreId", storeId);
                    orderCommand.Parameters.AddWithValue("@Email", order.Email ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@FinancialStatus", order.FinancialStatus ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@FulfillmentStatus", order.FulfillmentStatus ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@Currency", order.Currency ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@TotalPrice", ParseDecimalString(order.Total) ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@SubtotalPrice", ParseDecimalString(order.Subtotal) ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@TotalTax", ParseDecimalString(order.Taxes) ?? (object)DBNull.Value);
                    orderCommand.Parameters.AddWithValue("@CreatedAt", ParseDateString(order.CreatedAt) ?? DateTime.UtcNow);
                    orderCommand.Parameters.AddWithValue("@UpdatedAt", ParseDateString(order.UpdatedAt) ?? DateTime.UtcNow);

                    await orderCommand.ExecuteNonQueryAsync();

                    // Import line item if present
                    if (!string.IsNullOrWhiteSpace(order.LineitemName))
                    {
                        await ImportOrderLineItem(connection, order, storeId);
                    }

                    result.ImportedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "💥 Error importing order: {OrderName}", order.Name);
                    result.ErrorCount++;
                    result.Errors.Add($"Order {order.Name}: {ex.Message}");
                }
            }

            result.ProcessingTime = stopwatch.Elapsed;
            _logger.LogInformation("✅ Order import completed. Imported: {Imported}, Errors: {Errors}, Time: {Time:mm\\:ss}", 
                result.ImportedCount, result.ErrorCount, result.ProcessingTime);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error during order import");
            result.Errors.Add($"Import failed: {ex.Message}");
            return result;
        }
    }

    public async Task<ImportResult> ImportProducts(List<ProductCsvRecord> products, string storeId)
    {
        var result = new ImportResult();
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("💾 Starting import of {Count} products for store {StoreId}", 
                products.Count, storeId);

            using var connection = await CreateConnectionAsync();

            foreach (var product in products)
            {
                try
                {
                    var sql = @"
                        MERGE Products AS target
                        USING (SELECT @Handle AS Handle, @StoreId AS StoreId) AS source
                        ON target.Handle = source.Handle AND target.StoreId = source.StoreId
                        WHEN MATCHED THEN
                            UPDATE SET 
                                Title = @Title,
                                BodyHtml = @BodyHtml,
                                Vendor = @Vendor,
                                ProductType = @ProductType,
                                Tags = @Tags,
                                Status = @Status,
                                UpdatedAt = GETUTCDATE()
                        WHEN NOT MATCHED THEN
                            INSERT (Handle, StoreId, Title, BodyHtml, Vendor, ProductType, Tags, Status, CreatedAt, UpdatedAt)
                            VALUES (@Handle, @StoreId, @Title, @BodyHtml, @Vendor, @ProductType, @Tags, @Status, GETUTCDATE(), GETUTCDATE());";

                    using var command = new SqlCommand(sql, connection);
                    command.Parameters.AddWithValue("@Handle", product.Handle ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@StoreId", storeId);
                    command.Parameters.AddWithValue("@Title", product.Title ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@BodyHtml", product.BodyHtml ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Vendor", product.Vendor ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@ProductType", product.Type ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Tags", product.Tags ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Status", product.Published ?? (object)DBNull.Value);

                    await command.ExecuteNonQueryAsync();
                    result.ImportedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "💥 Error importing product: {Handle}", product.Handle);
                    result.ErrorCount++;
                    result.Errors.Add($"Product {product.Handle}: {ex.Message}");
                }
            }

            result.ProcessingTime = stopwatch.Elapsed;
            _logger.LogInformation("✅ Product import completed. Imported: {Imported}, Errors: {Errors}, Time: {Time:mm\\:ss}", 
                result.ImportedCount, result.ErrorCount, result.ProcessingTime);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error during product import");
            result.Errors.Add($"Import failed: {ex.Message}");
            return result;
        }
    }

    private async Task ImportOrderLineItem(SqlConnection connection, OrderCsvRecord order, string storeId)
    {
        try
        {
            var lineItemSql = @"
                INSERT INTO OrderItems (OrderId, ProductTitle, VariantTitle, Sku, Vendor, Quantity, Price, TotalDiscount, CreatedAt)
                SELECT o.Id, @ProductTitle, @VariantTitle, @Sku, @Vendor, @Quantity, @Price, @TotalDiscount, GETUTCDATE()
                FROM Orders o 
                WHERE o.Name = @OrderName AND o.StoreId = @StoreId";

            using var lineItemCommand = new SqlCommand(lineItemSql, connection);
            lineItemCommand.Parameters.AddWithValue("@OrderName", order.Name ?? (object)DBNull.Value);
            lineItemCommand.Parameters.AddWithValue("@StoreId", storeId);
            lineItemCommand.Parameters.AddWithValue("@ProductTitle", order.LineitemName ?? (object)DBNull.Value);
            lineItemCommand.Parameters.AddWithValue("@VariantTitle", (object)DBNull.Value);
            lineItemCommand.Parameters.AddWithValue("@Sku", order.LineitemSku ?? (object)DBNull.Value);
            lineItemCommand.Parameters.AddWithValue("@Vendor", order.Vendor ?? (object)DBNull.Value);
            lineItemCommand.Parameters.AddWithValue("@Quantity", ParseIntString(order.LineitemQuantity) ?? 1);
            lineItemCommand.Parameters.AddWithValue("@Price", ParseDecimalString(order.LineitemPrice) ?? (object)DBNull.Value);
            lineItemCommand.Parameters.AddWithValue("@TotalDiscount", ParseDecimalString(order.LineitemDiscount) ?? 0);

            await lineItemCommand.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ Error importing line item for order: {OrderName}", order.Name);
        }
    }

    private async Task<SqlConnection> CreateConnectionAsync()
    {
        var connection = new SqlConnection(_connectionString);
        
        // Use Managed Identity for Azure SQL Database
        if (_connectionString.Contains("Authentication=Active Directory Default"))
        {
            connection.AccessToken = await GetAccessTokenAsync();
        }
        
        await connection.OpenAsync();
        return connection;
    }

    private async Task<string> GetAccessTokenAsync()
    {
        var credential = new DefaultAzureCredential();
        var tokenRequestContext = new Azure.Core.TokenRequestContext(new[] { "https://database.windows.net/.default" });
        var token = await credential.GetTokenAsync(tokenRequestContext);
        return token.Token;
    }

    private decimal? ParseDecimalString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        // Remove currency symbols and common formatting
        var cleanValue = value.Replace("$", "").Replace("¥", "").Replace(",", "").Trim();
        
        if (decimal.TryParse(cleanValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var result))
            return result;

        return null;
    }

    private int? ParseIntString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (int.TryParse(value.Trim(), out var result))
            return result;

        return null;
    }

    private bool? ParseBooleanString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var cleanValue = value.Trim().ToLower();
        return cleanValue switch
        {
            "yes" or "true" or "1" => true,
            "no" or "false" or "0" => false,
            _ => null
        };
    }

    private DateTime? ParseDateString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (DateTime.TryParse(value.Trim(), out var result))
            return result;

        return null;
    }
}