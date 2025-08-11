using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Polly;
using Polly.Extensions.Http;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// Shopify API連携サービス（実装版）
    /// ShopifySharpの代わりにREST APIを直接呼び出す実装
    /// </summary>
    public class ShopifyApiService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ShopifyApiService> _logger;
        private readonly ShopifyDbContext _context;
        private readonly IAsyncPolicy<HttpResponseMessage> _retryPolicy;

        public ShopifyApiService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<ShopifyApiService> logger,
            ShopifyDbContext context)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _context = context;

            // リトライポリシーの設定
            _retryPolicy = HttpPolicyExtensions
                .HandleTransientHttpError()
                .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                .WaitAndRetryAsync(
                    3,
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (outcome, timespan, retryCount, context) =>
                    {
                        _logger.LogWarning($"Retry {retryCount} after {timespan} seconds");
                    });
        }

        /// <summary>
        /// 顧客データを同期
        /// </summary>
        public async Task<int> SyncCustomersAsync(int storeId, DateTime? sinceDate = null)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null || string.IsNullOrEmpty(store.AccessToken))
            {
                throw new InvalidOperationException($"Store {storeId} not found or not authenticated");
            }

            var client = CreateShopifyClient(store.Domain ?? store.Name, store.AccessToken);
            var syncedCount = 0;
            var pageInfo = string.Empty;
            var hasNextPage = true;

            while (hasNextPage)
            {
                var url = BuildCustomersUrl(store.Domain ?? store.Name, sinceDate, pageInfo);
                var response = await _retryPolicy.ExecuteAsync(async () => 
                    await client.GetAsync(url));

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var customersData = JsonSerializer.Deserialize<ShopifyCustomersResponse>(json);
                    
                    if (customersData?.Customers != null)
                    {
                        foreach (var shopifyCustomer in customersData.Customers)
                        {
                            await UpsertCustomerAsync(storeId, shopifyCustomer);
                            syncedCount++;
                        }
                    }

                    // ページネーション処理
                    pageInfo = ExtractPageInfo(response.Headers);
                    hasNextPage = !string.IsNullOrEmpty(pageInfo);
                }
                else
                {
                    _logger.LogError($"Failed to fetch customers: {response.StatusCode}");
                    break;
                }
            }

            // 同期日時を更新
            store.LastSyncDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Synced {syncedCount} customers for store {storeId}");
            return syncedCount;
        }

        /// <summary>
        /// 商品データを同期
        /// </summary>
        public async Task<int> SyncProductsAsync(int storeId, DateTime? sinceDate = null)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null || string.IsNullOrEmpty(store.AccessToken))
            {
                throw new InvalidOperationException($"Store {storeId} not found or not authenticated");
            }

            var client = CreateShopifyClient(store.Domain ?? store.Name, store.AccessToken);
            var syncedCount = 0;
            var pageInfo = string.Empty;
            var hasNextPage = true;

            while (hasNextPage)
            {
                var url = BuildProductsUrl(store.Domain ?? store.Name, sinceDate, pageInfo);
                var response = await _retryPolicy.ExecuteAsync(async () => 
                    await client.GetAsync(url));

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var productsData = JsonSerializer.Deserialize<ShopifyProductsResponse>(json);
                    
                    if (productsData?.Products != null)
                    {
                        foreach (var shopifyProduct in productsData.Products)
                        {
                            await UpsertProductAsync(storeId, shopifyProduct);
                            syncedCount++;
                        }
                    }

                    // ページネーション処理
                    pageInfo = ExtractPageInfo(response.Headers);
                    hasNextPage = !string.IsNullOrEmpty(pageInfo);
                }
                else
                {
                    _logger.LogError($"Failed to fetch products: {response.StatusCode}");
                    break;
                }
            }

            _logger.LogInformation($"Synced {syncedCount} products for store {storeId}");
            return syncedCount;
        }

        /// <summary>
        /// 注文データを同期
        /// </summary>
        public async Task<int> SyncOrdersAsync(int storeId, DateTime? sinceDate = null)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null || string.IsNullOrEmpty(store.AccessToken))
            {
                throw new InvalidOperationException($"Store {storeId} not found or not authenticated");
            }

            var client = CreateShopifyClient(store.Domain ?? store.Name, store.AccessToken);
            var syncedCount = 0;
            var pageInfo = string.Empty;
            var hasNextPage = true;

            while (hasNextPage)
            {
                var url = BuildOrdersUrl(store.Domain ?? store.Name, sinceDate, pageInfo);
                var response = await _retryPolicy.ExecuteAsync(async () => 
                    await client.GetAsync(url));

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var ordersData = JsonSerializer.Deserialize<ShopifyOrdersResponse>(json);
                    
                    if (ordersData?.Orders != null)
                    {
                        foreach (var shopifyOrder in ordersData.Orders)
                        {
                            await UpsertOrderAsync(storeId, shopifyOrder);
                            syncedCount++;
                        }
                    }

                    // ページネーション処理
                    pageInfo = ExtractPageInfo(response.Headers);
                    hasNextPage = !string.IsNullOrEmpty(pageInfo);
                }
                else
                {
                    _logger.LogError($"Failed to fetch orders: {response.StatusCode}");
                    break;
                }
            }

            _logger.LogInformation($"Synced {syncedCount} orders for store {storeId}");
            return syncedCount;
        }

        #region Private Methods

        private HttpClient CreateShopifyClient(string shopUrl, string accessToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Shopify-Access-Token", accessToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return client;
        }

        private string BuildCustomersUrl(string shopUrl, DateTime? sinceDate, string pageInfo)
        {
            var baseUrl = $"https://{shopUrl}/admin/api/2024-01/customers.json?limit=250";
            
            if (sinceDate.HasValue)
            {
                baseUrl += $"&updated_at_min={sinceDate.Value:yyyy-MM-ddTHH:mm:ssZ}";
            }
            
            if (!string.IsNullOrEmpty(pageInfo))
            {
                baseUrl += $"&page_info={pageInfo}";
            }
            
            return baseUrl;
        }

        private string BuildProductsUrl(string shopUrl, DateTime? sinceDate, string pageInfo)
        {
            var baseUrl = $"https://{shopUrl}/admin/api/2024-01/products.json?limit=250";
            
            if (sinceDate.HasValue)
            {
                baseUrl += $"&updated_at_min={sinceDate.Value:yyyy-MM-ddTHH:mm:ssZ}";
            }
            
            if (!string.IsNullOrEmpty(pageInfo))
            {
                baseUrl += $"&page_info={pageInfo}";
            }
            
            return baseUrl;
        }

        private string BuildOrdersUrl(string shopUrl, DateTime? sinceDate, string pageInfo)
        {
            var baseUrl = $"https://{shopUrl}/admin/api/2024-01/orders.json?limit=250&status=any";
            
            if (sinceDate.HasValue)
            {
                baseUrl += $"&updated_at_min={sinceDate.Value:yyyy-MM-ddTHH:mm:ssZ}";
            }
            
            if (!string.IsNullOrEmpty(pageInfo))
            {
                baseUrl += $"&page_info={pageInfo}";
            }
            
            return baseUrl;
        }

        private string ExtractPageInfo(HttpResponseHeaders headers)
        {
            if (headers.TryGetValues("Link", out var linkValues))
            {
                var link = linkValues.FirstOrDefault();
                if (!string.IsNullOrEmpty(link))
                {
                    // Extract page_info from Link header
                    var parts = link.Split(',');
                    foreach (var part in parts)
                    {
                        if (part.Contains("rel=\"next\""))
                        {
                            var match = System.Text.RegularExpressions.Regex.Match(part, @"page_info=([^&>]+)");
                            if (match.Success)
                            {
                                return match.Groups[1].Value;
                            }
                        }
                    }
                }
            }
            return string.Empty;
        }

        private async Task UpsertCustomerAsync(int storeId, ShopifyCustomer customer)
        {
            var existingCustomer = await _context.Customers
                .FirstOrDefaultAsync(c => c.StoreId == storeId && 
                                         c.ShopifyCustomerId == customer.Id.ToString());

            if (existingCustomer != null)
            {
                // 更新
                existingCustomer.FirstName = customer.FirstName;
                existingCustomer.LastName = customer.LastName;
                existingCustomer.Email = customer.Email;
                existingCustomer.TotalSpent = customer.TotalSpent;
                existingCustomer.TotalOrders = customer.OrdersCount;
                existingCustomer.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // 新規作成
                var newCustomer = new Customer
                {
                    StoreId = storeId,
                    ShopifyCustomerId = customer.Id.ToString(),
                    FirstName = customer.FirstName,
                    LastName = customer.LastName,
                    Email = customer.Email,
                    TotalSpent = customer.TotalSpent,
                    TotalOrders = customer.OrdersCount,
                    IsActive = true,
                    CreatedAt = customer.CreatedAt ?? DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Customers.Add(newCustomer);
            }

            await _context.SaveChangesAsync();
        }

        private async Task UpsertProductAsync(int storeId, ShopifyProduct product)
        {
            var existingProduct = await _context.Products
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.StoreId == storeId && 
                                        p.ShopifyProductId == product.Id.ToString());

            if (existingProduct != null)
            {
                // 更新
                existingProduct.Title = product.Title;
                existingProduct.ProductType = product.ProductType;
                existingProduct.Vendor = product.Vendor;
                existingProduct.UpdatedAt = DateTime.UtcNow;

                // バリアント更新
                if (product.Variants != null)
                {
                    foreach (var variant in product.Variants)
                    {
                        var existingVariant = existingProduct.Variants
                            .FirstOrDefault(v => v.ShopifyVariantId == variant.Id.ToString());

                        if (existingVariant != null)
                        {
                            existingVariant.Title = variant.Title;
                            existingVariant.Price = variant.Price;
                            existingVariant.Sku = variant.Sku;
                            existingVariant.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            existingProduct.Variants.Add(new ProductVariant
                            {
                                ShopifyVariantId = variant.Id.ToString(),
                                Title = variant.Title,
                                Price = variant.Price,
                                Sku = variant.Sku,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
            }
            else
            {
                // 新規作成
                var newProduct = new Product
                {
                    StoreId = storeId,
                    ShopifyProductId = product.Id.ToString(),
                    Title = product.Title,
                    ProductType = product.ProductType,
                    Vendor = product.Vendor,
                    CreatedAt = product.CreatedAt ?? DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    Variants = new List<ProductVariant>()
                };

                if (product.Variants != null)
                {
                    foreach (var variant in product.Variants)
                    {
                        newProduct.Variants.Add(new ProductVariant
                        {
                            ShopifyVariantId = variant.Id.ToString(),
                            Title = variant.Title,
                            Price = variant.Price,
                            Sku = variant.Sku,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }

                _context.Products.Add(newProduct);
            }

            await _context.SaveChangesAsync();
        }

        private async Task UpsertOrderAsync(int storeId, ShopifyOrder order)
        {
            var existingOrder = await _context.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.StoreId == storeId && 
                                        o.ShopifyOrderId == order.Id.ToString());

            if (existingOrder != null)
            {
                // 更新
                existingOrder.TotalPrice = order.TotalPrice;
                existingOrder.SubtotalPrice = order.SubtotalPrice;
                existingOrder.TotalTax = order.TotalTax;
                existingOrder.TaxPrice = order.TotalTax;  // 互換性のため
                existingOrder.Currency = order.Currency;
                existingOrder.FinancialStatus = order.FinancialStatus;
                existingOrder.FulfillmentStatus = order.FulfillmentStatus;
                existingOrder.UpdatedAt = DateTime.UtcNow;

                // 注文アイテム更新
                if (order.LineItems != null)
                {
                    foreach (var item in order.LineItems)
                    {
                        var existingItem = existingOrder.OrderItems
                            .FirstOrDefault(i => i.ShopifyLineItemId == item.Id.ToString());

                        if (existingItem != null)
                        {
                            existingItem.Quantity = item.Quantity;
                            existingItem.Price = item.Price;
                            existingItem.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            existingOrder.OrderItems.Add(new OrderItem
                            {
                                ShopifyLineItemId = item.Id.ToString(),
                                ShopifyProductId = item.ProductId?.ToString(),
                                ShopifyVariantId = item.VariantId?.ToString(),
                                ProductTitle = item.Title,
                            Title = item.Title,
                                Quantity = item.Quantity,
                                Price = item.Price,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
            }
            else
            {
                // 新規作成
                var newOrder = new Order
                {
                    StoreId = storeId,
                    ShopifyOrderId = order.Id.ToString(),
                    ShopifyCustomerId = order.Customer?.Id.ToString(),
                    Email = order.Email,
                    TotalPrice = order.TotalPrice,
                    SubtotalPrice = order.SubtotalPrice,
                    TotalTax = order.TotalTax,
                    TaxPrice = order.TotalTax,  // 互換性のため
                    Currency = order.Currency,
                    FinancialStatus = order.FinancialStatus,
                    FulfillmentStatus = order.FulfillmentStatus,
                    CreatedAt = order.CreatedAt ?? DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    OrderItems = new List<OrderItem>()
                };

                if (order.LineItems != null)
                {
                    foreach (var item in order.LineItems)
                    {
                        newOrder.OrderItems.Add(new OrderItem
                        {
                            ShopifyLineItemId = item.Id.ToString(),
                            ShopifyProductId = item.ProductId?.ToString(),
                            ShopifyVariantId = item.VariantId?.ToString(),
                            ProductTitle = item.Title,
                            Title = item.Title,
                            Quantity = item.Quantity,
                            Price = item.Price,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }

                _context.Orders.Add(newOrder);
            }

            await _context.SaveChangesAsync();
        }

        #endregion

        #region Response Models

        private class ShopifyCustomersResponse
        {
            public List<ShopifyCustomer> Customers { get; set; }
        }

        private class ShopifyCustomer
        {
            public long Id { get; set; }
            public string FirstName { get; set; }
            public string LastName { get; set; }
            public string Email { get; set; }
            public decimal TotalSpent { get; set; }
            public int OrdersCount { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        private class ShopifyProductsResponse
        {
            public List<ShopifyProduct> Products { get; set; }
        }

        private class ShopifyProduct
        {
            public long Id { get; set; }
            public string Title { get; set; }
            public string ProductType { get; set; }
            public string Vendor { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
            public List<ShopifyVariant> Variants { get; set; }
        }

        private class ShopifyVariant
        {
            public long Id { get; set; }
            public string Title { get; set; }
            public decimal Price { get; set; }
            public string Sku { get; set; }
        }

        private class ShopifyOrdersResponse
        {
            public List<ShopifyOrder> Orders { get; set; }
        }

        private class ShopifyOrder
        {
            public long Id { get; set; }
            public string Email { get; set; }
            public decimal TotalPrice { get; set; }
            public decimal SubtotalPrice { get; set; }
            public decimal TotalTax { get; set; }
            public string Currency { get; set; }
            public string FinancialStatus { get; set; }
            public string FulfillmentStatus { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
            public ShopifyCustomer Customer { get; set; }
            public List<ShopifyLineItem> LineItems { get; set; }
        }

        private class ShopifyLineItem
        {
            public long Id { get; set; }
            public long? ProductId { get; set; }
            public long? VariantId { get; set; }
            public string Title { get; set; }
            public int Quantity { get; set; }
            public decimal Price { get; set; }
        }

        #endregion
    }
}