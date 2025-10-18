using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// Shopify課金サービスインターフェース
    /// </summary>
    public interface ISubscriptionService
    {
        Task<SubscriptionResult> CreateSubscription(string shopDomain, string accessToken, int planId);
        Task<bool> ConfirmSubscription(string shopDomain, string accessToken, long chargeId);
        Task<bool> CancelSubscription(string shopDomain, string accessToken, long chargeId);
        Task<SubscriptionResult> ChangePlan(string shopDomain, string accessToken, long currentChargeId, int newPlanId);
        Task CheckTrialExpirations();
        Task UpdateSubscriptionStatus(string shopDomain);
        
        // BillingController用の追加メソッド
        Task<List<SubscriptionPlan>> GetAvailablePlansAsync();
        Task<SubscriptionServiceResult> CreateOrUpdateSubscriptionAsync(int storeId, string planId, string returnUrl);
        Task<SubscriptionServiceResult> CancelSubscriptionAsync(int storeId);
        Task<SubscriptionServiceResult> ChangePlanAsync(int storeId, string newPlanId, string returnUrl);
        Task<SubscriptionServiceResult> StartFreeTrialAsync(int storeId, string planId, int trialDays);
    }

    /// <summary>
    /// Shopify課金サービス実装
    /// </summary>
    public class ShopifySubscriptionService : ISubscriptionService
    {
        private readonly ShopifyDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ShopifySubscriptionService> _logger;

        public ShopifySubscriptionService(
            ShopifyDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<ShopifySubscriptionService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// サブスクリプションを作成
        /// </summary>
        public async Task<SubscriptionResult> CreateSubscription(string shopDomain, string accessToken, int planId)
        {
            try
            {
                var plan = await _context.SubscriptionPlans.FindAsync(planId);
                if (plan == null)
                {
                    return new SubscriptionResult 
                    { 
                        Success = false, 
                        ErrorMessage = "Plan not found" 
                    };
                }

                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Domain == shopDomain);
                
                if (store == null)
                {
                    return new SubscriptionResult 
                    { 
                        Success = false, 
                        ErrorMessage = "Store not found" 
                    };
                }

                // GraphQL Mutation for creating subscription (2024-01 API)
                var mutation = @"
                    mutation CreateAppSubscription($input: AppSubscriptionCreateInput!) {
                        appSubscriptionCreate(appSubscription: $input) {
                            appSubscription {
                                id
                                name
                                status
                                createdAt
                                currentPeriodEnd
                                test
                                trialDays
                            }
                            confirmationUrl
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }";

                var appUrl = _configuration["AppUrl"] ?? "https://ec-ranger.azurewebsites.net";
                var variables = new
                {
                    input = new
                    {
                        name = plan.Name,
                        lineItems = new[]
                        {
                            new
                            {
                                plan = new
                                {
                                    appRecurringPricingDetails = new
                                    {
                                        price = new
                                        {
                                            amount = plan.Price,
                                            currencyCode = "USD"
                                        },
                                        interval = "EVERY_30_DAYS"
                                    }
                                }
                            }
                        },
                        returnUrl = $"{appUrl}/api/subscription/confirm?shop={shopDomain}",
                        trialDays = plan.TrialDays,
                        test = _configuration.GetValue<bool>("Shopify:TestMode", true)
                    }
                };

                var response = await ExecuteGraphQL(shopDomain, accessToken, mutation, variables);
                
                if (response != null && response.RootElement.TryGetProperty("data", out var data))
                {
                    var appSubscriptionCreate = data.GetProperty("appSubscriptionCreate");
                    
                    if (appSubscriptionCreate.TryGetProperty("userErrors", out var errors) && errors.GetArrayLength() > 0)
                    {
                        var errorMessage = errors[0].GetProperty("message").GetString();
                        return new SubscriptionResult 
                        { 
                            Success = false, 
                            ErrorMessage = errorMessage 
                        };
                    }

                    if (appSubscriptionCreate.TryGetProperty("confirmationUrl", out var confirmationUrl))
                    {
                        // サブスクリプションレコードを作成（pending状態）
                        var subscription = new StoreSubscription
                        {
                            StoreId = store.Id,
                            PlanId = planId,
                            Status = "pending",
                            TrialEndsAt = DateTime.UtcNow.AddDays(plan.TrialDays),
                            ConfirmationUrl = confirmationUrl.GetString(),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.StoreSubscriptions.Add(subscription);
                        await _context.SaveChangesAsync();

                        _logger.LogInformation("Subscription created for store {Store}, Plan: {Plan}", shopDomain, plan.Name);

                        return new SubscriptionResult
                        {
                            Success = true,
                            ConfirmationUrl = confirmationUrl.GetString()
                        };
                    }
                }

                return new SubscriptionResult 
                { 
                    Success = false, 
                    ErrorMessage = "Failed to create subscription" 
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription for store {Store}", shopDomain);
                return new SubscriptionResult 
                { 
                    Success = false, 
                    ErrorMessage = ex.Message 
                };
            }
        }

        /// <summary>
        /// サブスクリプションを確認
        /// </summary>
        public async Task<bool> ConfirmSubscription(string shopDomain, string accessToken, long chargeId)
        {
            try
            {
                // GraphQL Query to get subscription details
                var query = @"
                    query getAppSubscription($id: ID!) {
                        node(id: $id) {
                            ... on AppSubscription {
                                id
                                name
                                status
                                currentPeriodEnd
                                trialDays
                                test
                                lineItems {
                                    edges {
                                        node {
                                            id
                                            plan {
                                                pricingDetails {
                                                    ... on AppRecurringPricing {
                                                        price {
                                                            amount
                                                            currencyCode
                                                        }
                                                        interval
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }";

                var gid = $"gid://shopify/AppSubscription/{chargeId}";
                var variables = new { id = gid };

                var response = await ExecuteGraphQL(shopDomain, accessToken, query, variables);
                
                if (response != null && response.RootElement.TryGetProperty("data", out var data))
                {
                    var node = data.GetProperty("node");
                    var status = node.GetProperty("status").GetString();

                    if (status == "ACTIVE")
                    {
                        // ローカルDBのサブスクリプションを更新
                        var store = await _context.Stores
                            .FirstOrDefaultAsync(s => s.Domain == shopDomain);

                        if (store != null)
                        {
                            var subscription = await _context.StoreSubscriptions
                                .Where(s => s.StoreId == store.Id && s.Status == "pending")
                                .OrderByDescending(s => s.CreatedAt)
                                .FirstOrDefaultAsync();

                            if (subscription != null)
                            {
                                subscription.ShopifyChargeId = chargeId;
                                subscription.Status = "active";
                                subscription.ActivatedAt = DateTime.UtcNow;
                                
                                if (node.TryGetProperty("currentPeriodEnd", out var periodEnd))
                                {
                                    subscription.CurrentPeriodEnd = DateTime.Parse(periodEnd.GetString()!);
                                }
                                
                                subscription.UpdatedAt = DateTime.UtcNow;

                                await _context.SaveChangesAsync();

                                _logger.LogInformation("Subscription confirmed for store {Store}, ChargeId: {ChargeId}", shopDomain, chargeId);
                                return true;
                            }
                        }
                    }
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming subscription for store {Store}", shopDomain);
                return false;
            }
        }

        /// <summary>
        /// サブスクリプションをキャンセル
        /// </summary>
        public async Task<bool> CancelSubscription(string shopDomain, string accessToken, long chargeId)
        {
            try
            {
                var mutation = @"
                    mutation appSubscriptionCancel($id: ID!) {
                        appSubscriptionCancel(id: $id) {
                            appSubscription {
                                id
                                status
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }";

                var gid = $"gid://shopify/AppSubscription/{chargeId}";
                var variables = new { id = gid };

                var response = await ExecuteGraphQL(shopDomain, accessToken, mutation, variables);
                
                if (response != null && response.RootElement.TryGetProperty("data", out var data))
                {
                    var appSubscriptionCancel = data.GetProperty("appSubscriptionCancel");
                    
                    if (appSubscriptionCancel.TryGetProperty("userErrors", out var errors) && errors.GetArrayLength() == 0)
                    {
                        _logger.LogInformation("Subscription cancelled for store {Store}, ChargeId: {ChargeId}", shopDomain, chargeId);
                        return true;
                    }
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling subscription for store {Store}", shopDomain);
                return false;
            }
        }

        /// <summary>
        /// プランを変更
        /// </summary>
        public async Task<SubscriptionResult> ChangePlan(string shopDomain, string accessToken, long currentChargeId, int newPlanId)
        {
            try
            {
                // 現在のサブスクリプションをキャンセル
                await CancelSubscription(shopDomain, accessToken, currentChargeId);

                // 新しいサブスクリプションを作成
                return await CreateSubscription(shopDomain, accessToken, newPlanId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing plan for store {Store}", shopDomain);
                return new SubscriptionResult 
                { 
                    Success = false, 
                    ErrorMessage = ex.Message 
                };
            }
        }

        /// <summary>
        /// トライアル期限切れをチェック
        /// </summary>
        public async Task CheckTrialExpirations()
        {
            try
            {
                var expiredTrials = await _context.StoreSubscriptions
                    .Include(s => s.Store)
                    .Where(s => s.TrialEndsAt <= DateTime.UtcNow 
                             && s.Status == "active" 
                             && s.ShopifyChargeId != null)
                    .ToListAsync();

                foreach (var subscription in expiredTrials)
                {
                    _logger.LogInformation("Trial expired for store {Store}", subscription.Store?.Domain);
                    
                    // TODO: 通知を送信
                    // await _notificationService.SendTrialExpirationNotice(subscription);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking trial expirations");
            }
        }

        /// <summary>
        /// サブスクリプション状態を更新
        /// </summary>
        public async Task UpdateSubscriptionStatus(string shopDomain)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Domain == shopDomain);

                if (store == null || string.IsNullOrEmpty(store.AccessToken))
                {
                    return;
                }

                var activeSubscription = await _context.StoreSubscriptions
                    .Where(s => s.StoreId == store.Id && s.Status == "active" && s.ShopifyChargeId != null)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (activeSubscription != null)
                {
                    // Shopifyから最新の状態を取得
                    var query = @"
                        query getAppSubscription($id: ID!) {
                            node(id: $id) {
                                ... on AppSubscription {
                                    status
                                    currentPeriodEnd
                                }
                            }
                        }";

                    var gid = $"gid://shopify/AppSubscription/{activeSubscription.ShopifyChargeId}";
                    var variables = new { id = gid };

                    var response = await ExecuteGraphQL(shopDomain, store.AccessToken, query, variables);
                    
                    if (response != null && response.RootElement.TryGetProperty("data", out var data))
                    {
                        var node = data.GetProperty("node");
                        var status = node.GetProperty("status").GetString();

                        // ステータスを更新
                        activeSubscription.Status = status?.ToLower() ?? "unknown";
                        
                        if (node.TryGetProperty("currentPeriodEnd", out var periodEnd))
                        {
                            activeSubscription.CurrentPeriodEnd = DateTime.Parse(periodEnd.GetString()!);
                        }
                        
                        activeSubscription.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating subscription status for store {Store}", shopDomain);
            }
        }

        /// <summary>
        /// 利用可能なプラン一覧を取得
        /// </summary>
        public async Task<List<SubscriptionPlan>> GetAvailablePlansAsync()
        {
            return await _context.SubscriptionPlans
                .Where(p => p.IsActive)
                .OrderBy(p => p.Price)
                .ToListAsync();
        }

        /// <summary>
        /// サブスクリプションを作成または更新
        /// </summary>
        public async Task<SubscriptionServiceResult> CreateOrUpdateSubscriptionAsync(int storeId, string planId, string returnUrl)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.StoreSubscriptions)
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = "Store not found"
                    };
                }

                // プランIDを数値に変換
                if (!int.TryParse(planId, out int planIdInt))
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = "Invalid plan ID"
                    };
                }

                // 既存のアクティブなサブスクリプションをキャンセル
                var existingSubscription = store.StoreSubscriptions
                    .FirstOrDefault(s => s.Status == "active" || s.Status == "trialing");

                if (existingSubscription != null)
                {
                    existingSubscription.Status = "cancelled";
                    existingSubscription.CancelledAt = DateTime.UtcNow;
                    existingSubscription.UpdatedAt = DateTime.UtcNow;
                }

                // Shopify APIを呼び出してサブスクリプション作成
                var result = await CreateSubscription(store.Domain, store.AccessToken, planIdInt);

                if (result.Success)
                {
                    // データベースに新しいサブスクリプションを作成
                    var newSubscription = new StoreSubscription
                    {
                        StoreId = storeId,
                        PlanId = planIdInt,
                        Status = "pending",
                        CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StoreSubscriptions.Add(newSubscription);
                    await _context.SaveChangesAsync();

                    return new SubscriptionServiceResult
                    {
                        Success = true,
                        ConfirmationUrl = result.ConfirmationUrl,
                        Subscription = newSubscription
                    };
                }
                else
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = result.ErrorMessage
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating/updating subscription for store {StoreId}", storeId);
                return new SubscriptionServiceResult
                {
                    Success = false,
                    Error = "An error occurred while creating the subscription"
                };
            }
        }

        /// <summary>
        /// サブスクリプションをキャンセル
        /// </summary>
        public async Task<SubscriptionServiceResult> CancelSubscriptionAsync(int storeId)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.StoreSubscriptions)
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = "Store not found"
                    };
                }

                var activeSubscription = store.StoreSubscriptions
                    .FirstOrDefault(s => s.Status == "active" || s.Status == "trialing");

                if (activeSubscription == null)
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = "No active subscription found"
                    };
                }

                // Shopify APIを呼び出してキャンセル
                if (activeSubscription.ShopifyChargeId.HasValue)
                {
                    var cancelled = await CancelSubscription(store.Domain, store.AccessToken, activeSubscription.ShopifyChargeId.Value);
                    
                    if (!cancelled)
                    {
                        _logger.LogWarning("Failed to cancel Shopify charge for store {StoreId}", storeId);
                    }
                }

                // データベースのステータスを更新
                activeSubscription.Status = "cancelled";
                activeSubscription.CancelledAt = DateTime.UtcNow;
                activeSubscription.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return new SubscriptionServiceResult
                {
                    Success = true,
                    Subscription = activeSubscription
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling subscription for store {StoreId}", storeId);
                return new SubscriptionServiceResult
                {
                    Success = false,
                    Error = "An error occurred while cancelling the subscription"
                };
            }
        }

        /// <summary>
        /// プランを変更
        /// </summary>
        public async Task<SubscriptionServiceResult> ChangePlanAsync(int storeId, string newPlanId, string returnUrl)
        {
            try
            {
                // 既存のサブスクリプションをキャンセル
                var cancelResult = await CancelSubscriptionAsync(storeId);
                
                if (!cancelResult.Success)
                {
                    return cancelResult;
                }

                // 新しいプランでサブスクリプションを作成
                return await CreateOrUpdateSubscriptionAsync(storeId, newPlanId, returnUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing plan for store {StoreId}", storeId);
                return new SubscriptionServiceResult
                {
                    Success = false,
                    Error = "An error occurred while changing the plan"
                };
            }
        }

        /// <summary>
        /// 無料トライアルを開始
        /// </summary>
        public async Task<SubscriptionServiceResult> StartFreeTrialAsync(int storeId, string planId, int trialDays)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.StoreSubscriptions)
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = "Store not found"
                    };
                }

                // 既にサブスクリプションがある場合はエラー
                var existingSubscription = store.StoreSubscriptions
                    .Any(s => s.Status != "cancelled");

                if (existingSubscription)
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = "Store already has a subscription"
                    };
                }

                // プランIDを数値に変換
                if (!int.TryParse(planId, out int planIdInt))
                {
                    return new SubscriptionServiceResult
                    {
                        Success = false,
                        Error = "Invalid plan ID"
                    };
                }

                // 無料トライアルサブスクリプションを作成
                var trialSubscription = new StoreSubscription
                {
                    StoreId = storeId,
                    PlanId = planIdInt,
                    Status = "trialing",
                    CurrentPeriodEnd = DateTime.UtcNow.AddDays(trialDays),
                    TrialEndsAt = DateTime.UtcNow.AddDays(trialDays),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.StoreSubscriptions.Add(trialSubscription);
                await _context.SaveChangesAsync();

                return new SubscriptionServiceResult
                {
                    Success = true,
                    Subscription = trialSubscription
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting free trial for store {StoreId}", storeId);
                return new SubscriptionServiceResult
                {
                    Success = false,
                    Error = "An error occurred while starting the free trial"
                };
            }
        }

        /// <summary>
        /// GraphQLを実行（Rate Limit対策とリトライ機構付き）
        /// </summary>
        private async Task<JsonDocument?> ExecuteGraphQL(string shopDomain, string accessToken, string query, object variables, int maxRetries = 3)
        {
            var retryCount = 0;
            var delay = TimeSpan.FromSeconds(1);

            while (retryCount < maxRetries)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.Add("X-Shopify-Access-Token", accessToken);
                    client.Timeout = TimeSpan.FromSeconds(30); // タイムアウト設定

                    var graphqlEndpoint = $"https://{shopDomain}/admin/api/2024-01/graphql.json";
                    
                    var requestBody = new
                    {
                        query = query,
                        variables = variables
                    };

                    var json = JsonSerializer.Serialize(requestBody);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync(graphqlEndpoint, content);
                    
                    // Rate Limit チェック
                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    {
                        retryCount++;
                        
                        // Retry-Afterヘッダーから待機時間を取得
                        if (response.Headers.RetryAfter != null)
                        {
                            delay = response.Headers.RetryAfter.Delta ?? TimeSpan.FromSeconds(Math.Pow(2, retryCount));
                        }
                        else
                        {
                            delay = TimeSpan.FromSeconds(Math.Pow(2, retryCount)); // 指数バックオフ
                        }
                        
                        _logger.LogWarning("Rate limited. Retrying after {Delay} seconds. Attempt {Attempt}/{MaxRetries}", 
                            delay.TotalSeconds, retryCount, maxRetries);
                        
                        await Task.Delay(delay);
                        continue;
                    }
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        var document = JsonDocument.Parse(responseContent);
                        
                        // GraphQLエラーチェック
                        if (document.RootElement.TryGetProperty("errors", out var errors))
                        {
                            var errorMessages = new List<string>();
                            foreach (var error in errors.EnumerateArray())
                            {
                                if (error.TryGetProperty("message", out var message))
                                {
                                    errorMessages.Add(message.GetString() ?? "Unknown error");
                                }
                            }
                            
                            _logger.LogError("GraphQL errors: {Errors}", string.Join(", ", errorMessages));
                            
                            // スロットリングエラーの場合はリトライ
                            if (errorMessages.Any(m => m.Contains("throttled", StringComparison.OrdinalIgnoreCase)))
                            {
                                retryCount++;
                                delay = TimeSpan.FromSeconds(Math.Pow(2, retryCount));
                                await Task.Delay(delay);
                                continue;
                            }
                        }
                        
                        return document;
                    }

                    _logger.LogWarning("GraphQL request failed with status {Status}", response.StatusCode);
                    
                    // 5xx エラーの場合はリトライ
                    if ((int)response.StatusCode >= 500)
                    {
                        retryCount++;
                        delay = TimeSpan.FromSeconds(Math.Pow(2, retryCount));
                        _logger.LogWarning("Server error. Retrying after {Delay} seconds. Attempt {Attempt}/{MaxRetries}", 
                            delay.TotalSeconds, retryCount, maxRetries);
                        await Task.Delay(delay);
                        continue;
                    }
                    
                    return null;
                }
                catch (TaskCanceledException ex)
                {
                    _logger.LogError(ex, "Request timeout for GraphQL request");
                    retryCount++;
                    
                    if (retryCount < maxRetries)
                    {
                        delay = TimeSpan.FromSeconds(Math.Pow(2, retryCount));
                        _logger.LogWarning("Timeout. Retrying after {Delay} seconds. Attempt {Attempt}/{MaxRetries}", 
                            delay.TotalSeconds, retryCount, maxRetries);
                        await Task.Delay(delay);
                        continue;
                    }
                    
                    return null;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error executing GraphQL request");
                    retryCount++;
                    
                    if (retryCount < maxRetries)
                    {
                        delay = TimeSpan.FromSeconds(Math.Pow(2, retryCount));
                        _logger.LogWarning("Error occurred. Retrying after {Delay} seconds. Attempt {Attempt}/{MaxRetries}", 
                            delay.TotalSeconds, retryCount, maxRetries);
                        await Task.Delay(delay);
                        continue;
                    }
                    
                    return null;
                }
            }
            
            _logger.LogError("Max retries ({MaxRetries}) exceeded for GraphQL request", maxRetries);
            return null;
        }
    }

    /// <summary>
    /// サブスクリプション操作の結果
    /// </summary>
    public class SubscriptionResult
    {
        public bool Success { get; set; }
        public string? ConfirmationUrl { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// サブスクリプションサービスの結果（BillingController用）
    /// </summary>
    public class SubscriptionServiceResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public string? ConfirmationUrl { get; set; }
        public StoreSubscription? Subscription { get; set; }
    }
}