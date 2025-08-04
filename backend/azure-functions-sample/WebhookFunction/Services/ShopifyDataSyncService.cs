using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using Azure.Identity;
using WebhookFunction.Models;
using Newtonsoft.Json;

namespace WebhookFunction.Services;

public class ShopifyDataSyncService : IShopifyDataSyncService
{
    private readonly ILogger<ShopifyDataSyncService> _logger;
    private readonly IConfiguration _configuration;
    private readonly string _connectionString;

    public ShopifyDataSyncService(
        ILogger<ShopifyDataSyncService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _connectionString = _configuration.GetConnectionString("AZURE_SQL_CONNECTIONSTRING") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    public async Task<bool> SyncOrderData(ShopifyWebhookData webhookData)
    {
        try
        {
            _logger.LogInformation("💾 Syncing order data to database");

            var orderData = JsonConvert.DeserializeObject<ShopifyOrderData>(webhookData.Data?.ToString() ?? "{}");
            if (orderData?.Id == null)
            {
                _logger.LogWarning("⚠️ Invalid order data in webhook");
                return false;
            }

            using var connection = await CreateConnectionAsync();
            
            // Upsert order
            var orderSql = @"
                MERGE Orders AS target
                USING (SELECT @ShopifyOrderId AS ShopifyOrderId, @StoreId AS StoreId) AS source
                ON target.ShopifyOrderId = source.ShopifyOrderId AND target.StoreId = source.StoreId
                WHEN MATCHED THEN
                    UPDATE SET 
                        Email = @Email,
                        TotalPrice = @TotalPrice,
                        SubtotalPrice = @SubtotalPrice,
                        TotalTax = @TotalTax,
                        Currency = @Currency,
                        FinancialStatus = @FinancialStatus,
                        FulfillmentStatus = @FulfillmentStatus,
                        UpdatedAt = @UpdatedAt
                WHEN NOT MATCHED THEN
                    INSERT (ShopifyOrderId, StoreId, Email, CreatedAt, UpdatedAt, TotalPrice, SubtotalPrice, TotalTax, Currency, FinancialStatus, FulfillmentStatus, ShopifyCustomerId)
                    VALUES (@ShopifyOrderId, @StoreId, @Email, @CreatedAt, @UpdatedAt, @TotalPrice, @SubtotalPrice, @TotalTax, @Currency, @FinancialStatus, @FulfillmentStatus, @ShopifyCustomerId);";

            using var orderCommand = new SqlCommand(orderSql, connection);
            orderCommand.Parameters.AddWithValue("@ShopifyOrderId", orderData.Id);
            orderCommand.Parameters.AddWithValue("@StoreId", webhookData.StoreId ?? "unknown");
            orderCommand.Parameters.AddWithValue("@Email", orderData.Email ?? (object)DBNull.Value);
            orderCommand.Parameters.AddWithValue("@CreatedAt", orderData.CreatedAt ?? DateTime.UtcNow);
            orderCommand.Parameters.AddWithValue("@UpdatedAt", orderData.UpdatedAt ?? DateTime.UtcNow);
            orderCommand.Parameters.AddWithValue("@TotalPrice", orderData.TotalPrice ?? (object)DBNull.Value);
            orderCommand.Parameters.AddWithValue("@SubtotalPrice", orderData.SubtotalPrice ?? (object)DBNull.Value);
            orderCommand.Parameters.AddWithValue("@TotalTax", orderData.TotalTax ?? (object)DBNull.Value);
            orderCommand.Parameters.AddWithValue("@Currency", orderData.Currency ?? (object)DBNull.Value);
            orderCommand.Parameters.AddWithValue("@FinancialStatus", orderData.FinancialStatus ?? (object)DBNull.Value);
            orderCommand.Parameters.AddWithValue("@FulfillmentStatus", orderData.FulfillmentStatus ?? (object)DBNull.Value);
            orderCommand.Parameters.AddWithValue("@ShopifyCustomerId", orderData.Customer?.Id ?? (object)DBNull.Value);

            await orderCommand.ExecuteNonQueryAsync();

            // Sync line items
            if (orderData.LineItems?.Any() == true)
            {
                await SyncOrderItems(connection, orderData.Id, orderData.LineItems, webhookData.StoreId ?? "unknown");
            }

            _logger.LogInformation("✅ Successfully synced order: {OrderId}", orderData.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error syncing order data");
            return false;
        }
    }

    public async Task<bool> SyncCustomerData(ShopifyWebhookData webhookData)
    {
        try
        {
            _logger.LogInformation("👤 Syncing customer data to database");

            var customerData = JsonConvert.DeserializeObject<ShopifyCustomerData>(webhookData.Data?.ToString() ?? "{}");
            if (customerData?.Id == null)
            {
                _logger.LogWarning("⚠️ Invalid customer data in webhook");
                return false;
            }

            using var connection = await CreateConnectionAsync();

            var customerSql = @"
                MERGE Customers AS target
                USING (SELECT @ShopifyCustomerId AS ShopifyCustomerId, @StoreId AS StoreId) AS source
                ON target.ShopifyCustomerId = source.ShopifyCustomerId AND target.StoreId = source.StoreId
                WHEN MATCHED THEN
                    UPDATE SET 
                        Email = @Email,
                        FirstName = @FirstName,
                        LastName = @LastName,
                        TotalOrders = @TotalOrders,
                        TotalSpent = @TotalSpent,
                        UpdatedAt = @UpdatedAt
                WHEN NOT MATCHED THEN
                    INSERT (ShopifyCustomerId, StoreId, Email, FirstName, LastName, TotalOrders, TotalSpent, CreatedAt, UpdatedAt)
                    VALUES (@ShopifyCustomerId, @StoreId, @Email, @FirstName, @LastName, @TotalOrders, @TotalSpent, @CreatedAt, @UpdatedAt);";

            using var customerCommand = new SqlCommand(customerSql, connection);
            customerCommand.Parameters.AddWithValue("@ShopifyCustomerId", customerData.Id);
            customerCommand.Parameters.AddWithValue("@StoreId", webhookData.StoreId ?? "unknown");
            customerCommand.Parameters.AddWithValue("@Email", customerData.Email ?? (object)DBNull.Value);
            customerCommand.Parameters.AddWithValue("@FirstName", customerData.FirstName ?? (object)DBNull.Value);
            customerCommand.Parameters.AddWithValue("@LastName", customerData.LastName ?? (object)DBNull.Value);
            customerCommand.Parameters.AddWithValue("@TotalOrders", customerData.OrdersCount ?? (object)DBNull.Value);
            customerCommand.Parameters.AddWithValue("@TotalSpent", customerData.TotalSpent ?? (object)DBNull.Value);
            customerCommand.Parameters.AddWithValue("@CreatedAt", customerData.CreatedAt ?? DateTime.UtcNow);
            customerCommand.Parameters.AddWithValue("@UpdatedAt", customerData.UpdatedAt ?? DateTime.UtcNow);

            await customerCommand.ExecuteNonQueryAsync();

            _logger.LogInformation("✅ Successfully synced customer: {CustomerId}", customerData.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error syncing customer data");
            return false;
        }
    }

    public async Task<bool> SyncProductData(ShopifyWebhookData webhookData)
    {
        try
        {
            _logger.LogInformation("🏷️ Syncing product data to database");

            var productData = JsonConvert.DeserializeObject<ShopifyProductData>(webhookData.Data?.ToString() ?? "{}");
            if (productData?.Id == null)
            {
                _logger.LogWarning("⚠️ Invalid product data in webhook");
                return false;
            }

            using var connection = await CreateConnectionAsync();

            var productSql = @"
                MERGE Products AS target
                USING (SELECT @ShopifyProductId AS ShopifyProductId, @StoreId AS StoreId) AS source
                ON target.ShopifyProductId = source.ShopifyProductId AND target.StoreId = source.StoreId
                WHEN MATCHED THEN
                    UPDATE SET 
                        Title = @Title,
                        BodyHtml = @BodyHtml,
                        Vendor = @Vendor,
                        ProductType = @ProductType,
                        Handle = @Handle,
                        Tags = @Tags,
                        Status = @Status,
                        UpdatedAt = @UpdatedAt
                WHEN NOT MATCHED THEN
                    INSERT (ShopifyProductId, StoreId, Title, BodyHtml, Vendor, ProductType, Handle, Tags, Status, CreatedAt, UpdatedAt)
                    VALUES (@ShopifyProductId, @StoreId, @Title, @BodyHtml, @Vendor, @ProductType, @Handle, @Tags, @Status, @CreatedAt, @UpdatedAt);";

            using var productCommand = new SqlCommand(productSql, connection);
            productCommand.Parameters.AddWithValue("@ShopifyProductId", productData.Id);
            productCommand.Parameters.AddWithValue("@StoreId", webhookData.StoreId ?? "unknown");
            productCommand.Parameters.AddWithValue("@Title", productData.Title ?? (object)DBNull.Value);
            productCommand.Parameters.AddWithValue("@BodyHtml", productData.BodyHtml ?? (object)DBNull.Value);
            productCommand.Parameters.AddWithValue("@Vendor", productData.Vendor ?? (object)DBNull.Value);
            productCommand.Parameters.AddWithValue("@ProductType", productData.ProductType ?? (object)DBNull.Value);
            productCommand.Parameters.AddWithValue("@Handle", productData.Handle ?? (object)DBNull.Value);
            productCommand.Parameters.AddWithValue("@Tags", productData.Tags ?? (object)DBNull.Value);
            productCommand.Parameters.AddWithValue("@Status", productData.Status ?? (object)DBNull.Value);
            productCommand.Parameters.AddWithValue("@CreatedAt", productData.CreatedAt ?? DateTime.UtcNow);
            productCommand.Parameters.AddWithValue("@UpdatedAt", productData.UpdatedAt ?? DateTime.UtcNow);

            await productCommand.ExecuteNonQueryAsync();

            _logger.LogInformation("✅ Successfully synced product: {ProductId}", productData.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error syncing product data");
            return false;
        }
    }

    public async Task<bool> UpdateCustomerStatistics(string customerId)
    {
        try
        {
            _logger.LogInformation("📊 Updating customer statistics for: {CustomerId}", customerId);

            using var connection = await CreateConnectionAsync();

            var updateSql = @"
                UPDATE Customers 
                SET 
                    TotalOrders = (SELECT COUNT(*) FROM Orders WHERE ShopifyCustomerId = @CustomerId),
                    TotalSpent = (SELECT ISNULL(SUM(TotalPrice), 0) FROM Orders WHERE ShopifyCustomerId = @CustomerId),
                    UpdatedAt = GETUTCDATE()
                WHERE ShopifyCustomerId = @CustomerId";

            using var command = new SqlCommand(updateSql, connection);
            command.Parameters.AddWithValue("@CustomerId", customerId);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            _logger.LogInformation("✅ Updated {RowsAffected} customer records", rowsAffected);
            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error updating customer statistics");
            return false;
        }
    }

    public async Task<bool> HandleOrderCancellation(ShopifyWebhookData webhookData)
    {
        try
        {
            _logger.LogInformation("❌ Handling order cancellation");

            var orderData = JsonConvert.DeserializeObject<ShopifyOrderData>(webhookData.Data?.ToString() ?? "{}");
            if (orderData?.Id == null)
            {
                return false;
            }

            // Mark order as cancelled and update customer statistics
            await SyncOrderData(webhookData);
            
            if (orderData.Customer?.Id != null)
            {
                await UpdateCustomerStatistics(orderData.Customer.Id.ToString());
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error handling order cancellation");
            return false;
        }
    }

    public async Task<bool> UpdateInventoryData(ShopifyWebhookData webhookData)
    {
        try
        {
            _logger.LogInformation("📦 Updating inventory data");
            
            // This would be implemented based on your inventory tracking needs
            await Task.CompletedTask;
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error updating inventory data");
            return false;
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

    private async Task SyncOrderItems(SqlConnection connection, long orderId, List<ShopifyLineItemData> lineItems, string storeId)
    {
        try
        {
            // Delete existing line items for this order
            var deleteSql = "DELETE FROM OrderItems WHERE OrderId = (SELECT Id FROM Orders WHERE ShopifyOrderId = @OrderId AND StoreId = @StoreId)";
            using var deleteCommand = new SqlCommand(deleteSql, connection);
            deleteCommand.Parameters.AddWithValue("@OrderId", orderId);
            deleteCommand.Parameters.AddWithValue("@StoreId", storeId);
            await deleteCommand.ExecuteNonQueryAsync();

            // Insert new line items
            var insertSql = @"
                INSERT INTO OrderItems (OrderId, ShopifyLineItemId, ProductTitle, VariantTitle, Sku, Vendor, Quantity, Price, TotalDiscount, CreatedAt)
                SELECT o.Id, @ShopifyLineItemId, @ProductTitle, @VariantTitle, @Sku, @Vendor, @Quantity, @Price, @TotalDiscount, GETUTCDATE()
                FROM Orders o 
                WHERE o.ShopifyOrderId = @OrderId AND o.StoreId = @StoreId";

            foreach (var item in lineItems)
            {
                using var insertCommand = new SqlCommand(insertSql, connection);
                insertCommand.Parameters.AddWithValue("@OrderId", orderId);
                insertCommand.Parameters.AddWithValue("@StoreId", storeId);
                insertCommand.Parameters.AddWithValue("@ShopifyLineItemId", item.Id);
                insertCommand.Parameters.AddWithValue("@ProductTitle", item.Title ?? (object)DBNull.Value);
                insertCommand.Parameters.AddWithValue("@VariantTitle", item.VariantTitle ?? (object)DBNull.Value);
                insertCommand.Parameters.AddWithValue("@Sku", item.Sku ?? (object)DBNull.Value);
                insertCommand.Parameters.AddWithValue("@Vendor", item.Vendor ?? (object)DBNull.Value);
                insertCommand.Parameters.AddWithValue("@Quantity", item.Quantity);
                insertCommand.Parameters.AddWithValue("@Price", item.Price ?? (object)DBNull.Value);
                insertCommand.Parameters.AddWithValue("@TotalDiscount", item.TotalDiscount ?? (object)DBNull.Value);

                await insertCommand.ExecuteNonQueryAsync();
            }

            _logger.LogInformation("✅ Synced {Count} line items for order {OrderId}", lineItems.Count, orderId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error syncing order items");
            throw;
        }
    }
}