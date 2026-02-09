using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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
        
        // Shopify APIのJSONレスポンスはsnake_caseのため、PropertyNameCaseInsensitiveを有効化
        private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new FlexibleStringConverter() } // order_number等の数値/文字列両対応
        };

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
            // 🆕 429エラーの場合、Retry-Afterヘッダーを尊重するカスタムポリシー
            // HttpPolicyExtensionsを使用して、429エラーと500エラーを処理
            // 注意: Polly 8.xでは、Retry-Afterヘッダーを読み取るために、カスタムのsleepDurationProviderが必要
            // しかし、WaitAndRetryAsyncのシグネチャが制限されているため、シンプルな実装に変更
            _retryPolicy = HttpPolicyExtensions
                .HandleTransientHttpError()
                .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                .WaitAndRetryAsync(
                    retryCount: 5, // リトライ回数を5回に増加
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), // 指数バックオフ（2秒、4秒、8秒、16秒、32秒）
                    onRetry: (outcome, timespan, retryCount, ctx) =>
                    {
                        var statusCode = outcome.Result?.StatusCode.ToString() ?? "Unknown";
                        // 429エラーの場合、Retry-Afterヘッダーをログに記録
                        if (outcome.Result?.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                        {
                            var retryAfter = outcome.Result.Headers.RetryAfter;
                            if (retryAfter?.Delta != null)
                            {
                                _logger.LogWarning("🔄 [ShopifyApiService] Retry {RetryCount} after {WaitTime} seconds (Retry-After: {RetryAfter} seconds). StatusCode: {StatusCode}", 
                                    retryCount, timespan.TotalSeconds, retryAfter.Delta.Value.TotalSeconds, statusCode);
                            }
                            else
                            {
                                _logger.LogWarning("🔄 [ShopifyApiService] Retry {RetryCount} after {WaitTime} seconds. StatusCode: {StatusCode} (Retry-After header not found)", 
                                    retryCount, timespan.TotalSeconds, statusCode);
                            }
                        }
                        else
                        {
                            _logger.LogWarning("🔄 [ShopifyApiService] Retry {RetryCount} after {WaitTime} seconds. StatusCode: {StatusCode}", 
                                retryCount, timespan.TotalSeconds, statusCode);
                        }
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
                    var customersData = JsonSerializer.Deserialize<ShopifyCustomersResponse>(json, _jsonOptions);
                    
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
                    var productsData = JsonSerializer.Deserialize<ShopifyProductsResponse>(json, _jsonOptions);
                    
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
                    var ordersData = JsonSerializer.Deserialize<ShopifyOrdersResponse>(json, _jsonOptions);
                    
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
            
            // 🆕 レート制限ヘッダーのログ出力
            if (response.Headers.TryGetValues("X-Shopify-Shop-Api-Call-Limit", out var callLimitValues))
            {
                var callLimit = callLimitValues.FirstOrDefault();
                _logger.LogInformation("🛒 [ShopifyApiService] API Call Limit: {CallLimit}, StoreId={StoreId}", 
                    callLimit ?? "N/A", storeId);
            }

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンスJSON受信: Length={Length}, StoreId={StoreId}", 
                    json.Length, storeId);
                
                var customersData = JsonSerializer.Deserialize<ShopifyCustomersResponse>(json, _jsonOptions);
                var customerCount = customersData?.Customers?.Count ?? 0;
                
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンス解析完了: CustomerCount={CustomerCount}, StoreId={StoreId}", 
                    customerCount, storeId);
                
                // デバッグ: FirstName/LastName が空になる原因調査用。最初の2件のAPI応答をログ出力
                if (customerCount > 0 && customersData?.Customers != null)
                {
                    foreach (var c in customersData.Customers.Take(2))
                    {
                        _logger.LogInformation(
                            "🛒 [ShopifyApiService] 顧客サンプル(API応答): ShopifyCustomerId={Id}, FirstName=\"{FirstName}\", LastName=\"{LastName}\", Email=\"{Email}\", StoreId={StoreId}",
                            c.Id, c.FirstName ?? "(null)", c.LastName ?? "(null)", c.Email ?? "(null)", storeId);
                    }
                }
                
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
            
            // 🆕 レート制限ヘッダーのログ出力
            if (response.Headers.TryGetValues("X-Shopify-Shop-Api-Call-Limit", out var callLimitValues))
            {
                var callLimit = callLimitValues.FirstOrDefault();
                _logger.LogInformation("🛒 [ShopifyApiService] API Call Limit: {CallLimit}, StoreId={StoreId}", 
                    callLimit ?? "N/A", storeId);
            }

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンスJSON受信: Length={Length}, StoreId={StoreId}", 
                    json.Length, storeId);
                
                var ordersData = JsonSerializer.Deserialize<ShopifyOrdersResponse>(json, _jsonOptions);
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
                _logger.LogError("🛒 [ShopifyApiService] Failed to fetch orders: StatusCode={StatusCode}, StoreId={StoreId}", 
                    response.StatusCode, storeId);
                _logger.LogError("🛒 [ShopifyApiService] ErrorContent: {ErrorContent}", errorContent);
                _logger.LogError("🛒 [ShopifyApiService] Request URL: {Url}, PageInfo: {PageInfo}", url, pageInfo ?? "null");
                
                // BadRequestやForbiddenでも、Protected Customer Dataエラーが含まれている可能性がある
                if (errorContent.Contains("Protected customer data", StringComparison.OrdinalIgnoreCase) ||
                    errorContent.Contains("not approved to access REST endpoints", StringComparison.OrdinalIgnoreCase) ||
                    errorContent.Contains("protected-customer-data", StringComparison.OrdinalIgnoreCase))
                {
                    throw new HttpRequestException($"Failed to fetch orders: Protected customer data. {response.StatusCode}");
                }
                else
                {
                    // BadRequestの詳細なエラー内容を含める
                    throw new HttpRequestException($"Failed to fetch orders: {response.StatusCode}. ErrorContent: {errorContent}");
                }
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
            
            // 🆕 レート制限ヘッダーのログ出力
            if (response.Headers.TryGetValues("X-Shopify-Shop-Api-Call-Limit", out var callLimitValues))
            {
                var callLimit = callLimitValues.FirstOrDefault();
                _logger.LogInformation("🛒 [ShopifyApiService] API Call Limit: {CallLimit}, StoreId={StoreId}", 
                    callLimit ?? "N/A", storeId);
            }

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("🛒 [ShopifyApiService] Shopify APIレスポンスJSON受信: Length={Length}, StoreId={StoreId}", 
                    json.Length, storeId);
                
                var productsData = JsonSerializer.Deserialize<ShopifyProductsResponse>(json, _jsonOptions);
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

        /// <summary>
        /// GraphQL APIを使用して商品カテゴリー（Shopify標準分類）を一括取得
        /// REST APIにはcategoryフィールドがないため、GraphQLで取得する
        /// </summary>
        public async Task<Dictionary<string, string>> FetchProductCategoriesGraphQLAsync(int storeId)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null || string.IsNullOrEmpty(store.AccessToken))
            {
                throw new InvalidOperationException($"Store {storeId} not found or not authenticated");
            }

            var shopDomain = store.Domain ?? store.Name;
            var accessToken = DecryptTokenIfEncrypted(store.AccessToken);
            var categories = new Dictionary<string, string>();
            string? cursor = null;
            var hasNextPage = true;

            // API 2025-01の category フィールドを使用（2024-04以降で利用可能）
            const string query = @"
                query ($cursor: String) {
                  products(first: 250, after: $cursor) {
                    edges {
                      node {
                        id
                        productType
                        category {
                          name
                        }
                      }
                    }
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                  }
                }";

            _logger.LogInformation("📦 [GraphQL] 商品カテゴリー取得開始: StoreId={StoreId}, Domain={Domain}", storeId, shopDomain);

            while (hasNextPage)
            {
                var variables = new { cursor = cursor };
                var response = await ExecuteGraphQLAsync(shopDomain, accessToken, query, variables);

                if (response == null)
                {
                    _logger.LogWarning("📦 [GraphQL] レスポンスがnull: StoreId={StoreId}", storeId);
                    break;
                }

                if (response.RootElement.TryGetProperty("data", out var data) &&
                    data.TryGetProperty("products", out var products))
                {
                    if (products.TryGetProperty("edges", out var edges))
                    {
                        foreach (var edge in edges.EnumerateArray())
                        {
                            if (!edge.TryGetProperty("node", out var node)) continue;

                            var gid = node.GetProperty("id").GetString();
                            var shopifyProductId = gid?.Split('/').LastOrDefault();

                            string? categoryName = null;
                            // category.name から標準商品分類名を取得（API 2025-01）
                            if (node.TryGetProperty("category", out var category) &&
                                category.ValueKind != JsonValueKind.Null)
                            {
                                if (category.TryGetProperty("name", out var name))
                                {
                                    categoryName = name.GetString();
                                }
                            }

                            // "Uncategorized" / "カテゴリーなし" は未設定と同等なのでnull扱い
                            if (string.Equals(categoryName, "Uncategorized", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(categoryName, "カテゴリーなし"))
                            {
                                categoryName = null;
                            }

                            // 標準分類カテゴリーがある場合のみ登録（productTypeとは混ぜない）
                            if (!string.IsNullOrWhiteSpace(shopifyProductId) && !string.IsNullOrWhiteSpace(categoryName))
                            {
                                categories[shopifyProductId] = categoryName;
                            }
                        }
                    }

                    if (products.TryGetProperty("pageInfo", out var pageInfo))
                    {
                        hasNextPage = pageInfo.GetProperty("hasNextPage").GetBoolean();
                        if (hasNextPage)
                        {
                            cursor = pageInfo.GetProperty("endCursor").GetString();
                        }
                    }
                    else
                    {
                        hasNextPage = false;
                    }
                }
                else
                {
                    _logger.LogWarning("📦 [GraphQL] 予期しないレスポンス構造: StoreId={StoreId}", storeId);
                    break;
                }

                response.Dispose();
            }

            _logger.LogInformation("📦 [GraphQL] 商品カテゴリー取得完了: Count={Count}, StoreId={StoreId}", categories.Count, storeId);
            return categories;
        }

        #region Private Methods

        /// <summary>
        /// ShopifyProductIdからProducts.Category ?? Products.ProductTypeを取得
        /// OrderItem作成時にProductTypeを設定するために使用
        /// </summary>
        private async Task<string?> LookupProductTypeAsync(int storeId, string? shopifyProductId)
        {
            if (string.IsNullOrEmpty(shopifyProductId)) return null;

            var product = await _context.Products
                .Where(p => p.StoreId == storeId && p.ShopifyProductId == shopifyProductId)
                .Select(p => new { p.Category, p.ProductType })
                .FirstOrDefaultAsync();

            return product?.Category ?? product?.ProductType;
        }

        /// <summary>
        /// GraphQL APIを実行（リトライ・レート制限対応）
        /// ShopifySubscriptionServiceのパターンを流用
        /// </summary>
        private async Task<JsonDocument?> ExecuteGraphQLAsync(string shopDomain, string accessToken, string query, object variables, int maxRetries = 3)
        {
            var retryCount = 0;

            while (retryCount < maxRetries)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.Add("X-Shopify-Access-Token", accessToken);
                    client.DefaultRequestHeaders.Add("Accept-Language", "ja");
                    client.Timeout = TimeSpan.FromSeconds(30);

                    var graphqlEndpoint = $"https://{shopDomain}/admin/api/2025-01/graphql.json";
                    var requestBody = new { query, variables };
                    var json = JsonSerializer.Serialize(requestBody);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync(graphqlEndpoint, content);

                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    {
                        retryCount++;
                        var delay = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(Math.Pow(2, retryCount));
                        _logger.LogWarning("📦 [GraphQL] Rate limited. Retrying after {Delay}s. Attempt {Attempt}/{MaxRetries}",
                            delay.TotalSeconds, retryCount, maxRetries);
                        await Task.Delay(delay);
                        continue;
                    }

                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        var document = JsonDocument.Parse(responseContent);

                        if (document.RootElement.TryGetProperty("errors", out var errors))
                        {
                            var errorMessages = errors.EnumerateArray()
                                .Select(e => e.TryGetProperty("message", out var m) ? m.GetString() ?? "Unknown" : "Unknown")
                                .ToList();

                            _logger.LogError("📦 [GraphQL] Errors: {Errors}", string.Join(", ", errorMessages));

                            if (errorMessages.Any(m => m.Contains("throttled", StringComparison.OrdinalIgnoreCase)))
                            {
                                retryCount++;
                                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, retryCount)));
                                continue;
                            }
                        }

                        return document;
                    }

                    _logger.LogWarning("📦 [GraphQL] Request failed: Status={Status}", response.StatusCode);
                    if ((int)response.StatusCode >= 500)
                    {
                        retryCount++;
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, retryCount)));
                        continue;
                    }

                    return null;
                }
                catch (TaskCanceledException ex)
                {
                    _logger.LogError(ex, "📦 [GraphQL] Request timeout");
                    retryCount++;
                    if (retryCount < maxRetries)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, retryCount)));
                        continue;
                    }
                    return null;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "📦 [GraphQL] Error executing request");
                    retryCount++;
                    if (retryCount < maxRetries)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, retryCount)));
                        continue;
                    }
                    return null;
                }
            }

            _logger.LogError("📦 [GraphQL] Max retries ({MaxRetries}) exceeded", maxRetries);
            return null;
        }

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
            // 🆕 page_infoが指定されている場合、他のクエリパラメータ（updated_at_minなど）は使用できない
            // Shopify APIの仕様: page_infoを使用する場合、URLはpage_infoのみを含む必要がある
            if (!string.IsNullOrEmpty(pageInfo))
            {
                return $"https://{shopUrl}/admin/api/2024-01/customers.json?page_info={pageInfo}";
            }
            
            var baseUrl = $"https://{shopUrl}/admin/api/2024-01/customers.json?limit=250";
            
            if (sinceDate.HasValue)
            {
                baseUrl += $"&updated_at_min={sinceDate.Value:yyyy-MM-ddTHH:mm:ssZ}";
            }
            
            return baseUrl;
        }

        private string BuildProductsUrl(string shopUrl, DateTime? sinceDate, string? pageInfo)
        {
            // 🆕 page_infoが指定されている場合、他のクエリパラメータ（updated_at_minなど）は使用できない
            // Shopify APIの仕様: page_infoを使用する場合、URLはpage_infoのみを含む必要がある
            if (!string.IsNullOrEmpty(pageInfo))
            {
                return $"https://{shopUrl}/admin/api/2024-01/products.json?page_info={pageInfo}";
            }
            
            var baseUrl = $"https://{shopUrl}/admin/api/2024-01/products.json?limit=250";
            
            if (sinceDate.HasValue)
            {
                baseUrl += $"&updated_at_min={sinceDate.Value:yyyy-MM-ddTHH:mm:ssZ}";
            }
            
            return baseUrl;
        }

        private string BuildOrdersUrl(string shopUrl, DateTime? sinceDate, string? pageInfo)
        {
            // 🆕 page_infoが指定されている場合、他のクエリパラメータ（updated_at_minなど）は使用できない
            // Shopify APIの仕様: page_infoを使用する場合、URLはpage_infoのみを含む必要がある
            if (!string.IsNullOrEmpty(pageInfo))
            {
                return $"https://{shopUrl}/admin/api/2024-01/orders.json?page_info={pageInfo}";
            }
            
            var baseUrl = $"https://{shopUrl}/admin/api/2024-01/orders.json?limit=250&status=any";
            
            if (sinceDate.HasValue)
            {
                baseUrl += $"&updated_at_min={sinceDate.Value:yyyy-MM-ddTHH:mm:ssZ}";
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
                // 更新（Shopify APIがnullを返す場合に備え、空文字でフォールバック）
                existingCustomer.FirstName = customer.FirstName ?? string.Empty;
                existingCustomer.LastName = customer.LastName ?? string.Empty;
                existingCustomer.Email = customer.Email ?? string.Empty;
                existingCustomer.Phone = customer.Phone;
                existingCustomer.TotalSpent = customer.TotalSpentDecimal;
                existingCustomer.TotalOrders = customer.OrdersCount;
                // 分析に必要なフィールド
                existingCustomer.ProvinceCode = customer.ProvinceCode ?? customer.DefaultAddress?.ProvinceCode;
                existingCustomer.CountryCode = customer.CountryCode ?? customer.DefaultAddress?.CountryCode;
                existingCustomer.City = customer.City ?? customer.DefaultAddress?.City;
                existingCustomer.Tags = customer.Tags;
                existingCustomer.AcceptsEmailMarketing = customer.AcceptsEmailMarketing;
                existingCustomer.AcceptsSMSMarketing = customer.AcceptsSMSMarketing;
                existingCustomer.AddressPhone = customer.DefaultAddress?.Phone;
                existingCustomer.ShopifyCreatedAt ??= customer.CreatedAt;
                existingCustomer.ShopifyUpdatedAt = customer.UpdatedAt;
                existingCustomer.SyncedAt = DateTime.UtcNow;
                existingCustomer.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // 新規作成
                var newCustomer = new Customer
                {
                    StoreId = storeId,
                    ShopifyCustomerId = customer.Id.ToString(),
                    FirstName = customer.FirstName ?? string.Empty,
                    LastName = customer.LastName ?? string.Empty,
                    Email = customer.Email ?? string.Empty,
                    Phone = customer.Phone,
                    TotalSpent = customer.TotalSpentDecimal,
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
                    ShopifyCreatedAt = customer.CreatedAt,
                    ShopifyUpdatedAt = customer.UpdatedAt,
                    SyncedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
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
                // 更新（CategoryはGraphQL同期で設定するため、REST側では変更しない）
                existingProduct.Title = product.Title;
                existingProduct.ProductType = product.ProductType;
                existingProduct.Vendor = product.Vendor;
                existingProduct.ShopifyCreatedAt ??= product.CreatedAt;
                existingProduct.ShopifyUpdatedAt = product.UpdatedAt;
                existingProduct.SyncedAt = DateTime.UtcNow;
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
                            existingVariant.Price = variant.PriceDecimal;
                            existingVariant.Sku = variant.Sku;
                            existingVariant.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            existingProduct.Variants.Add(new ProductVariant
                            {
                                ShopifyVariantId = variant.Id.ToString(),
                                Title = variant.Title,
                                Price = variant.PriceDecimal,
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
                // 新規作成（CategoryはGraphQL同期で設定するため、REST側ではnull）
                var newProduct = new Product
                {
                    StoreId = storeId,
                    ShopifyProductId = product.Id.ToString(),
                    Title = product.Title,
                    ProductType = product.ProductType,
                    Vendor = product.Vendor,
                    ShopifyCreatedAt = product.CreatedAt,
                    ShopifyUpdatedAt = product.UpdatedAt,
                    SyncedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
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
                            Price = variant.PriceDecimal,
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
            Customer? targetCustomer = null;
            if (order.Customer != null && !string.IsNullOrEmpty(order.Customer.Id.ToString()))
            {
                targetCustomer = await _context.Customers
                    .FirstOrDefaultAsync(c => 
                        c.StoreId == storeId && 
                        c.ShopifyCustomerId == order.Customer.Id.ToString());
                
                if (targetCustomer != null)
                {
                    customerId = targetCustomer.Id;
                }
            }
            
            // 注文日時を取得（LastOrderDate 更新用）
            var orderDate = order.ProcessedAt ?? order.CreatedAt;

            if (existingOrder != null)
            {
                // 更新
                existingOrder.OrderNumber = order.OrderNumber ?? $"#{order.Id}";
                existingOrder.TotalPrice = order.TotalPriceDecimal;
                existingOrder.SubtotalPrice = order.SubtotalPriceDecimal;
                existingOrder.TotalTax = order.TotalTaxDecimal;
                existingOrder.TaxPrice = order.TotalTaxDecimal;  // 互換性のため
                existingOrder.Currency = order.Currency ?? "JPY";
                existingOrder.Status = order.Status ?? "pending";
                existingOrder.FinancialStatus = order.FinancialStatus ?? "pending";
                existingOrder.FulfillmentStatus = order.FulfillmentStatus;
                existingOrder.Email = order.Email;
                existingOrder.CustomerId = customerId; // CustomerIdも更新
                existingOrder.ShopifyCreatedAt ??= order.CreatedAt;
                existingOrder.ShopifyUpdatedAt = order.UpdatedAt;
                existingOrder.ShopifyProcessedAt = order.ProcessedAt; // 決済完了日時
                existingOrder.IsTest = order.Test;
                existingOrder.SyncedAt = DateTime.UtcNow;
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
                            existingItem.Price = item.PriceDecimal;
                            existingItem.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            // Productsテーブルからカテゴリー/商品タイプを取得
                            var productType = await LookupProductTypeAsync(storeId, item.ProductId?.ToString());
                            existingOrder.OrderItems.Add(new OrderItem
                            {
                                ShopifyLineItemId = item.Id.ToString(),
                                ShopifyProductId = item.ProductId?.ToString(),
                                ShopifyVariantId = item.VariantId?.ToString(),
                                ProductTitle = item.Title,
                                Title = item.Title,
                                ProductType = productType,
                                Quantity = item.Quantity,
                                Price = item.PriceDecimal,
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
                    TotalPrice = order.TotalPriceDecimal,
                    SubtotalPrice = order.SubtotalPriceDecimal,
                    TotalTax = order.TotalTaxDecimal,
                    TaxPrice = order.TotalTaxDecimal,  // 互換性のため
                    Currency = order.Currency ?? "JPY",
                    Status = order.Status ?? "pending",
                    FinancialStatus = order.FinancialStatus ?? "pending",
                    FulfillmentStatus = order.FulfillmentStatus,
                    ShopifyCreatedAt = order.CreatedAt,
                    ShopifyUpdatedAt = order.UpdatedAt,
                    ShopifyProcessedAt = order.ProcessedAt, // 決済完了日時
                    IsTest = order.Test,
                    SyncedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    OrderItems = new List<OrderItem>()
                };

                if (order.LineItems != null)
                {
                    foreach (var item in order.LineItems)
                    {
                        var productType = await LookupProductTypeAsync(storeId, item.ProductId?.ToString());
                        newOrder.OrderItems.Add(new OrderItem
                        {
                            ShopifyLineItemId = item.Id.ToString(),
                            ShopifyProductId = item.ProductId?.ToString(),
                            ShopifyVariantId = item.VariantId?.ToString(),
                            ProductTitle = item.Title,
                            Title = item.Title,
                            ProductType = productType,
                            Quantity = item.Quantity,
                            Price = item.PriceDecimal,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }

                _context.Orders.Add(newOrder);
            }

            // 顧客の LastOrderDate を更新（非正規化フィールド）。テスト注文は対象外。
            if (!order.Test && targetCustomer != null && orderDate.HasValue)
            {
                if (!targetCustomer.LastOrderDate.HasValue || orderDate > targetCustomer.LastOrderDate)
                {
                    targetCustomer.LastOrderDate = orderDate;
                    targetCustomer.UpdatedAt = DateTime.UtcNow;
                }
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
            [JsonPropertyName("id")]
            public long Id { get; set; }
            [JsonPropertyName("first_name")]
            public string FirstName { get; set; } = string.Empty;
            [JsonPropertyName("last_name")]
            public string LastName { get; set; } = string.Empty;
            [JsonPropertyName("email")]
            public string Email { get; set; } = string.Empty;
            [JsonPropertyName("phone")]
            public string? Phone { get; set; }
            // Shopify APIは金額を文字列として返すため、stringとして受け取る
            [JsonPropertyName("total_spent")]
            public string? TotalSpent { get; set; }
            [JsonPropertyName("orders_count")]
            public int OrdersCount { get; set; }
            
            // decimal型のTotalSpentプロパティ（後方互換性のため）
            public decimal TotalSpentDecimal => decimal.TryParse(TotalSpent, out var result) ? result : 0m;
            [JsonPropertyName("created_at")]
            public DateTime? CreatedAt { get; set; }
            [JsonPropertyName("updated_at")]
            public DateTime? UpdatedAt { get; set; }
            // 分析に必要なフィールド
            [JsonPropertyName("province_code")]
            public string? ProvinceCode { get; set; }
            [JsonPropertyName("country_code")]
            public string? CountryCode { get; set; }
            [JsonPropertyName("city")]
            public string? City { get; set; }
            [JsonPropertyName("tags")]
            public string? Tags { get; set; }
            [JsonPropertyName("accepts_email_marketing")]
            public bool AcceptsEmailMarketing { get; set; }
            [JsonPropertyName("accepts_sms_marketing")]
            public bool AcceptsSMSMarketing { get; set; }
            // 住所情報（Default Address）
            [JsonPropertyName("default_address")]
            public ShopifyCustomerAddress? DefaultAddress { get; set; }
        }

        public class ShopifyCustomerAddress
        {
            [JsonPropertyName("province_code")]
            public string? ProvinceCode { get; set; }
            [JsonPropertyName("country_code")]
            public string? CountryCode { get; set; }
            [JsonPropertyName("city")]
            public string? City { get; set; }
            [JsonPropertyName("phone")]
            public string? Phone { get; set; }
        }

        public class ShopifyProductsResponse
        {
            public List<ShopifyProduct> Products { get; set; } = new();
        }

        public class ShopifyProduct
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }
            [JsonPropertyName("title")]
            public string Title { get; set; } = string.Empty;
            [JsonPropertyName("product_type")]
            public string? ProductType { get; set; }
            [JsonPropertyName("vendor")]
            public string? Vendor { get; set; }
            [JsonPropertyName("created_at")]
            public DateTime? CreatedAt { get; set; }
            [JsonPropertyName("updated_at")]
            public DateTime? UpdatedAt { get; set; }
            [JsonPropertyName("variants")]
            public List<ShopifyVariant> Variants { get; set; } = new();
        }

        public class ShopifyVariant
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }
            [JsonPropertyName("title")]
            public string Title { get; set; } = string.Empty;
            // Shopify APIは価格を文字列として返すため、stringとして受け取る
            [JsonPropertyName("price")]
            public string? Price { get; set; }
            [JsonPropertyName("sku")]
            public string? Sku { get; set; }
            
            // decimal型のPriceプロパティ（後方互換性のため）
            public decimal PriceDecimal => decimal.TryParse(Price, out var result) ? result : 0m;
        }

        public class ShopifyOrdersResponse
        {
            public List<ShopifyOrder> Orders { get; set; } = new();
        }

        public class ShopifyOrder
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }
            [JsonPropertyName("email")]
            public string? Email { get; set; }
            [JsonPropertyName("order_number")]
            [JsonConverter(typeof(FlexibleStringConverter))]
            public string? OrderNumber { get; set; }
            // Shopify APIは価格を文字列として返すため、stringとして受け取る
            [JsonPropertyName("total_price")]
            public string? TotalPrice { get; set; }
            [JsonPropertyName("subtotal_price")]
            public string? SubtotalPrice { get; set; }
            [JsonPropertyName("total_tax")]
            public string? TotalTax { get; set; }
            [JsonPropertyName("currency")]
            public string Currency { get; set; } = "JPY";
            [JsonPropertyName("financial_status")]
            public string FinancialStatus { get; set; } = "pending";
            [JsonPropertyName("fulfillment_status")]
            public string? FulfillmentStatus { get; set; }
            [JsonPropertyName("status")]
            public string? Status { get; set; }
            [JsonPropertyName("created_at")]
            public DateTime? CreatedAt { get; set; }
            [JsonPropertyName("updated_at")]
            public DateTime? UpdatedAt { get; set; }
            /// <summary>
            /// 決済完了日時（分析レポートで優先使用すべき日時）
            /// </summary>
            [JsonPropertyName("processed_at")]
            public DateTime? ProcessedAt { get; set; }
            /// <summary>Shopifyのテスト注文フラグ。分析では本注文のみ対象のため除外する。</summary>
            [JsonPropertyName("test")]
            public bool Test { get; set; }
            [JsonPropertyName("customer")]
            public ShopifyCustomer? Customer { get; set; }
            [JsonPropertyName("line_items")]
            public List<ShopifyLineItem> LineItems { get; set; } = new();
            
            // decimal型のプロパティ（後方互換性のため）
            public decimal TotalPriceDecimal => decimal.TryParse(TotalPrice, out var result) ? result : 0m;
            public decimal SubtotalPriceDecimal => decimal.TryParse(SubtotalPrice, out var result) ? result : 0m;
            public decimal TotalTaxDecimal => decimal.TryParse(TotalTax, out var result) ? result : 0m;
        }

        public class ShopifyLineItem
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }
            [JsonPropertyName("product_id")]
            public long? ProductId { get; set; }
            [JsonPropertyName("variant_id")]
            public long? VariantId { get; set; }
            [JsonPropertyName("title")]
            public string Title { get; set; } = string.Empty;
            [JsonPropertyName("quantity")]
            public int Quantity { get; set; }
            // Shopify APIは価格を文字列として返すため、stringとして受け取る
            [JsonPropertyName("price")]
            public string? Price { get; set; }
            [JsonPropertyName("sku")]
            public string? Sku { get; set; }
            [JsonPropertyName("variant_title")]
            public string? VariantTitle { get; set; }
            [JsonPropertyName("vendor")]
            public string? Vendor { get; set; }
            
            // decimal型のPriceプロパティ（後方互換性のため）
            public decimal PriceDecimal => decimal.TryParse(Price, out var result) ? result : 0m;
        }

        #endregion

        #region Custom JsonConverters

        /// <summary>
        /// 数値と文字列の両方を受け取れる文字列コンバーター
        /// Shopify APIがorder_number等を数値として返す場合に対応
        /// </summary>
        public class FlexibleStringConverter : JsonConverter<string?>
        {
            public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType == JsonTokenType.String)
                {
                    return reader.GetString();
                }
                else if (reader.TokenType == JsonTokenType.Number)
                {
                    // 数値の場合は文字列に変換
                    if (reader.TryGetInt64(out var longValue))
                    {
                        return longValue.ToString();
                    }
                    else if (reader.TryGetDouble(out var doubleValue))
                    {
                        return doubleValue.ToString();
                    }
                }
                else if (reader.TokenType == JsonTokenType.Null)
                {
                    return null;
                }
                
                // その他の型は文字列として読み取る
                return reader.GetString();
            }

            public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
            {
                writer.WriteStringValue(value);
            }
        }

        #endregion
    }
}