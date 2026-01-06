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

        /// <summary>
        /// 顧客データを1ページ取得（保存は行わない）
        /// </summary>
        public async Task<(List<ShopifyCustomer> Customers, string? NextPageInfo)> FetchCustomersPageAsync(
            int storeId, DateTime? sinceDate = null, string? pageInfo = null)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null || string.IsNullOrEmpty(store.AccessToken))
            {
                throw new InvalidOperationException($"Store {storeId} not found or not authenticated");
            }

            var client = CreateShopifyClient(store.Domain ?? store.Name, store.AccessToken);
            var url = BuildCustomersUrl(store.Domain ?? store.Name, sinceDate, pageInfo);
            
            _logger.LogInformation("🛒 [ShopifyApiService] FetchCustomersPageAsync開始: StoreId={StoreId}, Domain={Domain}, Url={Url}, SinceDate={SinceDate}, PageInfo={PageInfo}", 
                storeId, store.Domain ?? store.Name, url, sinceDate, pageInfo ?? "null");
            
            var response = await _retryPolicy.ExecuteAsync(async () => 
                await client.GetAsync(url));

            _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンス受信: StatusCode={StatusCode}, StoreId={StoreId}", 
                response.StatusCode, storeId);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンスJSON受信: Length={Length}, StoreId={StoreId}", 
                    json.Length, storeId);
                
                var customersData = JsonSerializer.Deserialize<ShopifyCustomersResponse>(json);
                var customerCount = customersData?.Customers?.Count ?? 0;
                
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンス解析完了: CustomerCount={CustomerCount}, StoreId={StoreId}", 
                    customerCount, storeId);
                
                var nextPageInfo = ExtractPageInfo(response.Headers);
                _logger.LogInformation("🛒 [ShopifyApiService] FetchCustomersPageAsync完了: CustomerCount={CustomerCount}, NextPageInfo={NextPageInfo}, StoreId={StoreId}", 
                    customerCount, nextPageInfo ?? "null", storeId);
                
                return (customersData?.Customers ?? new List<ShopifyCustomer>(), 
                       string.IsNullOrEmpty(nextPageInfo) ? null : nextPageInfo);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("🛒 [ShopifyApiService] Failed to fetch customers: StatusCode={StatusCode}, ErrorContent={ErrorContent}, StoreId={StoreId}", 
                    response.StatusCode, errorContent, storeId);
                throw new HttpRequestException($"Failed to fetch customers: {response.StatusCode}");
            }
        }

        /// <summary>
        /// 注文データを1ページ取得（保存は行わない）
        /// </summary>
        public async Task<(List<ShopifyOrder> Orders, string? NextPageInfo)> FetchOrdersPageAsync(
            int storeId, DateTime? sinceDate = null, string? pageInfo = null)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null || string.IsNullOrEmpty(store.AccessToken))
            {
                throw new InvalidOperationException($"Store {storeId} not found or not authenticated");
            }

            var client = CreateShopifyClient(store.Domain ?? store.Name, store.AccessToken);
            var url = BuildOrdersUrl(store.Domain ?? store.Name, sinceDate, pageInfo);
            
            _logger.LogInformation("🛒 [ShopifyApiService] FetchOrdersPageAsync開始: StoreId={StoreId}, Domain={Domain}, Url={Url}, SinceDate={SinceDate}, PageInfo={PageInfo}", 
                storeId, store.Domain ?? store.Name, url, sinceDate, pageInfo ?? "null");
            
            var response = await _retryPolicy.ExecuteAsync(async () => 
                await client.GetAsync(url));

            _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンス受信: StatusCode={StatusCode}, StoreId={StoreId}", 
                response.StatusCode, storeId);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンスJSON受信: Length={Length}, StoreId={StoreId}", 
                    json.Length, storeId);
                
                var ordersData = JsonSerializer.Deserialize<ShopifyOrdersResponse>(json);
                var orderCount = ordersData?.Orders?.Count ?? 0;
                
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンス解析完了: OrderCount={OrderCount}, StoreId={StoreId}", 
                    orderCount, storeId);
                
                var nextPageInfo = ExtractPageInfo(response.Headers);
                _logger.LogInformation("🛒 [ShopifyApiService] FetchOrdersPageAsync完了: OrderCount={OrderCount}, NextPageInfo={NextPageInfo}, StoreId={StoreId}", 
                    orderCount, nextPageInfo ?? "null", storeId);
                
                return (ordersData?.Orders ?? new List<ShopifyOrder>(), 
                       string.IsNullOrEmpty(nextPageInfo) ? null : nextPageInfo);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("🛒 [ShopifyApiService] Failed to fetch orders: StatusCode={StatusCode}, ErrorContent={ErrorContent}, StoreId={StoreId}", 
                    response.StatusCode, errorContent, storeId);
                throw new HttpRequestException($"Failed to fetch orders: {response.StatusCode}");
            }
        }

        /// <summary>
        /// 商品データを1ページ取得（保存は行わない）
        /// </summary>
        public async Task<(List<ShopifyProduct> Products, string? NextPageInfo)> FetchProductsPageAsync(
            int storeId, DateTime? sinceDate = null, string? pageInfo = null)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null || string.IsNullOrEmpty(store.AccessToken))
            {
                throw new InvalidOperationException($"Store {storeId} not found or not authenticated");
            }

            var client = CreateShopifyClient(store.Domain ?? store.Name, store.AccessToken);
            var url = BuildProductsUrl(store.Domain ?? store.Name, sinceDate, pageInfo);
            
            _logger.LogInformation("🛒 [ShopifyApiService] FetchProductsPageAsync開始: StoreId={StoreId}, Domain={Domain}, Url={Url}, SinceDate={SinceDate}, PageInfo={PageInfo}", 
                storeId, store.Domain ?? store.Name, url, sinceDate, pageInfo ?? "null");
            
            var response = await _retryPolicy.ExecuteAsync(async () => 
                await client.GetAsync(url));

            _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンス受信: StatusCode={StatusCode}, StoreId={StoreId}", 
                response.StatusCode, storeId);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンスJSON受信: Length={Length}, StoreId={StoreId}", 
                    json.Length, storeId);
                
                var productsData = JsonSerializer.Deserialize<ShopifyProductsResponse>(json);
                var productCount = productsData?.Products?.Count ?? 0;
                
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンス解析完了: ProductCount={ProductCount}, StoreId={StoreId}", 
                    productCount, storeId);
                
                var nextPageInfo = ExtractPageInfo(response.Headers);
                _logger.LogInformation("🛒 [ShopifyApiService] FetchProductsPageAsync完了: ProductCount={ProductCount}, NextPageInfo={NextPageInfo}, StoreId={StoreId}", 
                    productCount, nextPageInfo ?? "null", storeId);
                
                return (productsData?.Products ?? new List<ShopifyProduct>(), 
                       string.IsNullOrEmpty(nextPageInfo) ? null : nextPageInfo);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("🛒 [ShopifyApiService] Failed to fetch products: StatusCode={StatusCode}, ErrorContent={ErrorContent}, StoreId={StoreId}", 
                    response.StatusCode, errorContent, storeId);
                throw new HttpRequestException($"Failed to fetch products: {response.StatusCode}");
            }
        }

        #region Private Methods

        private HttpClient CreateShopifyClient(string shopUrl, string accessToken)
        {
            _logger.LogInformation("🔵 [ShopifyApiService] CreateShopifyClient開始: ShopUrl={ShopUrl}, TokenLength={TokenLength}",
                shopUrl, accessToken?.Length ?? 0);
            
            // AccessTokenが暗号化されている場合は復号化
            var decryptedToken = DecryptTokenIfEncrypted(accessToken ?? string.Empty);
            
            _logger.LogInformation("🔵 [ShopifyApiService] Token復号化後: DecryptedTokenLength={Length}, DecryptedTokenPrefix={Prefix}",
                decryptedToken?.Length ?? 0, 
                !string.IsNullOrEmpty(decryptedToken) && decryptedToken.Length > 0 
                    ? decryptedToken.Substring(0, Math.Min(10, decryptedToken.Length)) 
                    : "null");
            
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Shopify-Access-Token", decryptedToken ?? string.Empty);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            
            _logger.LogInformation("🔵 [ShopifyApiService] HttpClient作成完了");
            
            return client;
        }

        /// <summary>
        /// トークンが暗号化されている場合は復号化する
        /// </summary>
        private string DecryptTokenIfEncrypted(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("🔴 [ShopifyApiService] DecryptTokenIfEncrypted: Token is null or empty");
                return token;
            }

            _logger.LogInformation("🔵 [ShopifyApiService] DecryptTokenIfEncrypted開始: TokenLength={Length}, TokenPrefix={Prefix}",
                token.Length, token.Length > 0 ? token.Substring(0, Math.Min(10, token.Length)) : "null");

            // Base64エンコードされた文字列かどうかを簡易チェック
            // 暗号化されたトークンは通常Base64エンコードされている
            try
            {
                var key = _configuration["Shopify:EncryptionKey"];
                if (string.IsNullOrEmpty(key))
                {
                    _logger.LogInformation("🔵 [ShopifyApiService] EncryptionKey未設定、Base64デコードを試行");
                    
                    // Base64エンコードされた文字列かどうかをチェック
                    var bytes = Convert.FromBase64String(token);
                    var decoded = System.Text.Encoding.UTF8.GetString(bytes);
                    
                    _logger.LogInformation("🔵 [ShopifyApiService] Base64デコード成功: DecodedPrefix={Prefix}",
                        decoded.Length > 0 ? decoded.Substring(0, Math.Min(10, decoded.Length)) : "null");
                    
                    return decoded;
                }

                // AES暗号化されたトークンを復号化
                _logger.LogInformation("🔵 [ShopifyApiService] AES復号化を試行");
                using var aes = System.Security.Cryptography.Aes.Create();
                aes.Key = Convert.FromBase64String(key);
                
                var fullCipher = Convert.FromBase64String(token);
                var iv = new byte[aes.IV.Length];
                var cipher = new byte[fullCipher.Length - iv.Length];
                
                Buffer.BlockCopy(fullCipher, 0, iv, 0, iv.Length);
                Buffer.BlockCopy(fullCipher, iv.Length, cipher, 0, cipher.Length);
                
                aes.IV = iv;
                
                using var decryptor = aes.CreateDecryptor();
                using var msDecrypt = new MemoryStream(cipher);
                using var csDecrypt = new System.Security.Cryptography.CryptoStream(msDecrypt, decryptor, System.Security.Cryptography.CryptoStreamMode.Read);
                using var srDecrypt = new StreamReader(csDecrypt);
                
                var decrypted = srDecrypt.ReadToEnd();
                _logger.LogInformation("🔵 [ShopifyApiService] AES復号化成功: DecryptedPrefix={Prefix}",
                    decrypted.Length > 0 ? decrypted.Substring(0, Math.Min(10, decrypted.Length)) : "null");
                
                return decrypted;
            }
            catch (Exception ex)
            {
                // 復号化に失敗した場合は、そのまま返す（既に復号化済みの可能性）
                _logger.LogWarning(ex, "🟡 [ShopifyApiService] DecryptTokenIfEncrypted: 復号化失敗、元のトークンを返却. Error: {Error}", ex.Message);
                return token;
            }
        }

        private string BuildCustomersUrl(string shopUrl, DateTime? sinceDate, string? pageInfo)
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

        private string BuildProductsUrl(string shopUrl, DateTime? sinceDate, string? pageInfo)
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

        private string BuildOrdersUrl(string shopUrl, DateTime? sinceDate, string? pageInfo)
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
                existingCustomer.Phone = customer.Phone;
                existingCustomer.TotalSpent = customer.TotalSpent;
                existingCustomer.TotalOrders = customer.OrdersCount;
                // 分析に必要なフィールド
                existingCustomer.ProvinceCode = customer.ProvinceCode ?? customer.DefaultAddress?.ProvinceCode;
                existingCustomer.CountryCode = customer.CountryCode ?? customer.DefaultAddress?.CountryCode;
                existingCustomer.City = customer.City ?? customer.DefaultAddress?.City;
                existingCustomer.Tags = customer.Tags;
                existingCustomer.AcceptsEmailMarketing = customer.AcceptsEmailMarketing;
                existingCustomer.AcceptsSMSMarketing = customer.AcceptsSMSMarketing;
                existingCustomer.AddressPhone = customer.DefaultAddress?.Phone;
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
                    Phone = customer.Phone,
                    TotalSpent = customer.TotalSpent,
                    TotalOrders = customer.OrdersCount,
                    // 分析に必要なフィールド
                    ProvinceCode = customer.ProvinceCode ?? customer.DefaultAddress?.ProvinceCode,
                    CountryCode = customer.CountryCode ?? customer.DefaultAddress?.CountryCode,
                    City = customer.City ?? customer.DefaultAddress?.City,
                    Tags = customer.Tags,
                    AcceptsEmailMarketing = customer.AcceptsEmailMarketing,
                    AcceptsSMSMarketing = customer.AcceptsSMSMarketing,
                    AddressPhone = customer.DefaultAddress?.Phone,
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

            // CustomerIdを取得
            int customerId = 0;
            if (order.Customer != null && !string.IsNullOrEmpty(order.Customer.Id.ToString()))
            {
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => 
                        c.StoreId == storeId && 
                        c.ShopifyCustomerId == order.Customer.Id.ToString());
                
                if (customer != null)
                {
                    customerId = customer.Id;
                }
            }

            if (existingOrder != null)
            {
                // 更新
                existingOrder.OrderNumber = order.OrderNumber ?? $"#{order.Id}";
                existingOrder.TotalPrice = order.TotalPrice;
                existingOrder.SubtotalPrice = order.SubtotalPrice;
                existingOrder.TotalTax = order.TotalTax;
                existingOrder.TaxPrice = order.TotalTax;  // 互換性のため
                existingOrder.Currency = order.Currency ?? "JPY";
                existingOrder.Status = order.Status ?? "pending";
                existingOrder.FinancialStatus = order.FinancialStatus ?? "pending";
                existingOrder.FulfillmentStatus = order.FulfillmentStatus;
                existingOrder.Email = order.Email;
                existingOrder.CustomerId = customerId; // CustomerIdも更新
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
                    OrderNumber = order.OrderNumber ?? $"#{order.Id}",
                    Email = order.Email,
                    CustomerId = customerId, // CustomerIdを設定
                    TotalPrice = order.TotalPrice,
                    SubtotalPrice = order.SubtotalPrice,
                    TotalTax = order.TotalTax,
                    TaxPrice = order.TotalTax,  // 互換性のため
                    Currency = order.Currency ?? "JPY",
                    Status = order.Status ?? "pending",
                    FinancialStatus = order.FinancialStatus ?? "pending",
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

        // 内部モデルをpublicにして、ジョブクラスから使用可能にする
        public class ShopifyCustomersResponse
        {
            public List<ShopifyCustomer> Customers { get; set; } = new();
        }

        public class ShopifyCustomer
        {
            public long Id { get; set; }
            public string FirstName { get; set; } = string.Empty;
            public string LastName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string? Phone { get; set; }
            public decimal TotalSpent { get; set; }
            public int OrdersCount { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
            // 分析に必要なフィールド
            public string? ProvinceCode { get; set; }
            public string? CountryCode { get; set; }
            public string? City { get; set; }
            public string? Tags { get; set; }
            public bool AcceptsEmailMarketing { get; set; }
            public bool AcceptsSMSMarketing { get; set; }
            // 住所情報（Default Address）
            public ShopifyCustomerAddress? DefaultAddress { get; set; }
        }

        public class ShopifyCustomerAddress
        {
            public string? ProvinceCode { get; set; }
            public string? CountryCode { get; set; }
            public string? City { get; set; }
            public string? Phone { get; set; }
        }

        public class ShopifyProductsResponse
        {
            public List<ShopifyProduct> Products { get; set; } = new();
        }

        public class ShopifyProduct
        {
            public long Id { get; set; }
            public string Title { get; set; } = string.Empty;
            public string? ProductType { get; set; }
            public string? Vendor { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
            public List<ShopifyVariant> Variants { get; set; } = new();
        }

        public class ShopifyVariant
        {
            public long Id { get; set; }
            public string Title { get; set; } = string.Empty;
            public decimal Price { get; set; }
            public string? Sku { get; set; }
        }

        public class ShopifyOrdersResponse
        {
            public List<ShopifyOrder> Orders { get; set; } = new();
        }

        public class ShopifyOrder
        {
            public long Id { get; set; }
            public string? Email { get; set; }
            public string? OrderNumber { get; set; }
            public decimal TotalPrice { get; set; }
            public decimal SubtotalPrice { get; set; }
            public decimal TotalTax { get; set; }
            public string Currency { get; set; } = "JPY";
            public string FinancialStatus { get; set; } = "pending";
            public string? FulfillmentStatus { get; set; }
            public string? Status { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
            public ShopifyCustomer? Customer { get; set; }
            public List<ShopifyLineItem> LineItems { get; set; } = new();
        }

        public class ShopifyLineItem
        {
            public long Id { get; set; }
            public long? ProductId { get; set; }
            public long? VariantId { get; set; }
            public string Title { get; set; } = string.Empty;
            public int Quantity { get; set; }
            public decimal Price { get; set; }
            public string? Sku { get; set; }
            public string? VariantTitle { get; set; }
            public string? Vendor { get; set; }
        }

        #endregion
    }
}