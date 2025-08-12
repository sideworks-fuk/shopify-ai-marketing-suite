# Shopify GraphQL Billing API 最新仕様（2024年版）

## 作成日：2025年8月12日
## 作成者：Kenji（プロジェクトマネージャー）

---

## 📌 重要な変更点

### API バージョン
- **推奨バージョン**: 2024-01 以降
- **廃止予定API**: `recurringApplicationChargeCreate` → `appSubscriptionCreate`に移行

---

## 1. 最新のGraphQLミューテーション

### 1.1 サブスクリプション作成（2024年版）

```graphql
# 正しい最新API実装
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
      lineItems {
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
    confirmationUrl
    userErrors {
      field
      message
      code
    }
  }
}
```

### 1.2 入力パラメータ定義

```graphql
input AppSubscriptionCreateInput {
  name: String!
  lineItems: [AppSubscriptionLineItemInput!]!
  returnUrl: URL!
  trialDays: Int
  test: Boolean
  replacementBehavior: AppSubscriptionReplacementBehavior
}

input AppSubscriptionLineItemInput {
  plan: AppPlanInput!
}

input AppPlanInput {
  appRecurringPricingDetails: AppRecurringPricingInput!
}

input AppRecurringPricingInput {
  price: MoneyInput!
  interval: AppPricingInterval!
}

input MoneyInput {
  amount: Decimal!
  currencyCode: CurrencyCode!
}

enum AppPricingInterval {
  EVERY_30_DAYS
  ANNUAL
}

enum AppSubscriptionReplacementBehavior {
  APPLY_IMMEDIATELY
  APPLY_ON_NEXT_BILLING_CYCLE
  STANDARD
}
```

---

## 2. C# 実装例（最新版）

### 2.1 GraphQLクライアント実装

```csharp
using GraphQL;
using GraphQL.Client.Http;
using GraphQL.Client.Serializer.Newtonsoft;

public class ShopifyBillingService
{
    private readonly GraphQLHttpClient _graphQLClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ShopifyBillingService> _logger;

    public ShopifyBillingService(
        IConfiguration configuration,
        ILogger<ShopifyBillingService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        
        var shopUrl = _configuration["Shopify:ShopUrl"];
        var accessToken = _configuration["Shopify:AccessToken"];
        
        _graphQLClient = new GraphQLHttpClient(
            $"https://{shopUrl}/admin/api/2024-01/graphql.json",
            new NewtonsoftJsonSerializer()
        );
        
        _graphQLClient.HttpClient.DefaultRequestHeaders.Add(
            "X-Shopify-Access-Token", accessToken
        );
    }

    public async Task<CreateSubscriptionResult> CreateSubscriptionAsync(
        string planName,
        decimal price,
        int trialDays = 7)
    {
        var mutation = new GraphQLRequest
        {
            Query = @"
                mutation CreateAppSubscription($input: AppSubscriptionCreateInput!) {
                  appSubscriptionCreate(appSubscription: $input) {
                    appSubscription {
                      id
                      name
                      status
                      currentPeriodEnd
                      trialDays
                    }
                    confirmationUrl
                    userErrors {
                      field
                      message
                      code
                    }
                  }
                }",
            Variables = new
            {
                input = new
                {
                    name = planName,
                    returnUrl = $"{_configuration["App:BaseUrl"]}/subscription/confirm",
                    trialDays = trialDays,
                    test = _configuration["Shopify:TestMode"] == "true",
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
                                        amount = price,
                                        currencyCode = "USD"
                                    },
                                    interval = "EVERY_30_DAYS"
                                }
                            }
                        }
                    }
                }
            }
        };

        try
        {
            var response = await _graphQLClient.SendMutationAsync<CreateSubscriptionResponse>(mutation);
            
            if (response.Errors?.Any() == true)
            {
                _logger.LogError("GraphQL errors: {Errors}", 
                    string.Join(", ", response.Errors.Select(e => e.Message)));
                throw new ShopifyApiException("Subscription creation failed");
            }

            var result = response.Data.AppSubscriptionCreate;
            
            if (result.UserErrors?.Any() == true)
            {
                _logger.LogWarning("User errors: {Errors}", 
                    string.Join(", ", result.UserErrors.Select(e => $"{e.Field}: {e.Message}")));
                throw new ShopifyApiException($"Subscription creation failed: {result.UserErrors.First().Message}");
            }

            return new CreateSubscriptionResult
            {
                SubscriptionId = result.AppSubscription.Id,
                ConfirmationUrl = result.ConfirmationUrl,
                Status = result.AppSubscription.Status
            };
        }
        catch (GraphQLHttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed");
            throw new ShopifyApiException("Failed to communicate with Shopify API", ex);
        }
    }
}
```

### 2.2 レスポンスモデル

```csharp
public class CreateSubscriptionResponse
{
    public AppSubscriptionCreatePayload AppSubscriptionCreate { get; set; }
}

public class AppSubscriptionCreatePayload
{
    public AppSubscription AppSubscription { get; set; }
    public string ConfirmationUrl { get; set; }
    public List<UserError> UserErrors { get; set; }
}

public class AppSubscription
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Status { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public int? TrialDays { get; set; }
    public bool Test { get; set; }
}

public class UserError
{
    public string Field { get; set; }
    public string Message { get; set; }
    public string Code { get; set; }
}

public class CreateSubscriptionResult
{
    public string SubscriptionId { get; set; }
    public string ConfirmationUrl { get; set; }
    public string Status { get; set; }
}
```

---

## 3. Webhook検証の具体的実装

### 3.1 Webhookコントローラー

```csharp
[ApiController]
[Route("api/webhook")]
public class WebhookController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ShopifyDbContext _context;
    private readonly ILogger<WebhookController> _logger;

    public WebhookController(
        IConfiguration configuration,
        ShopifyDbContext context,
        ILogger<WebhookController> logger)
    {
        _configuration = configuration;
        _context = context;
        _logger = logger;
    }

    [HttpPost("subscription")]
    public async Task<IActionResult> HandleSubscriptionWebhook(
        [FromHeader(Name = "X-Shopify-Hmac-Sha256")] string hmacHeader,
        [FromHeader(Name = "X-Shopify-Topic")] string topic,
        [FromHeader(Name = "X-Shopify-Shop-Domain")] string shopDomain,
        [FromHeader(Name = "X-Shopify-Webhook-Id")] string webhookId)
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();
        
        // 1. 署名検証
        if (!VerifyWebhookSignature(rawBody, hmacHeader))
        {
            _logger.LogWarning("Invalid webhook signature from shop: {Shop}", shopDomain);
            return Unauthorized("Invalid signature");
        }

        // 2. 冪等性の保証
        if (await _context.WebhookEvents.AnyAsync(w => w.WebhookId == webhookId))
        {
            _logger.LogInformation("Webhook already processed: {WebhookId}", webhookId);
            return Ok("Already processed");
        }

        try
        {
            // 3. Webhookイベントを記録
            var webhookEvent = new WebhookEvent
            {
                WebhookId = webhookId,
                Topic = topic,
                ShopDomain = shopDomain,
                Payload = rawBody,
                ReceivedAt = DateTime.UtcNow,
                ProcessedAt = null,
                Status = "Pending"
            };
            
            _context.WebhookEvents.Add(webhookEvent);
            await _context.SaveChangesAsync();

            // 4. トピックに応じた処理
            var processed = topic switch
            {
                "app_subscriptions/update" => await ProcessSubscriptionUpdate(rawBody, shopDomain),
                "app_subscriptions/cancel" => await ProcessSubscriptionCancel(rawBody, shopDomain),
                "app/uninstalled" => await ProcessAppUninstalled(rawBody, shopDomain),
                _ => false
            };

            // 5. 処理結果を更新
            webhookEvent.ProcessedAt = DateTime.UtcNow;
            webhookEvent.Status = processed ? "Completed" : "Failed";
            await _context.SaveChangesAsync();

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process webhook: {WebhookId}", webhookId);
            
            // エラーを記録
            var webhookEvent = await _context.WebhookEvents
                .FirstOrDefaultAsync(w => w.WebhookId == webhookId);
            
            if (webhookEvent != null)
            {
                webhookEvent.Status = "Error";
                webhookEvent.ErrorMessage = ex.Message;
                await _context.SaveChangesAsync();
            }
            
            // Shopifyには成功を返す（リトライ防止）
            return Ok();
        }
    }

    private bool VerifyWebhookSignature(string rawBody, string hmacHeader)
    {
        var secret = _configuration["Shopify:WebhookSecret"];
        
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody)));
        
        return hash == hmacHeader;
    }

    private async Task<bool> ProcessSubscriptionUpdate(string rawBody, string shopDomain)
    {
        var webhook = JsonSerializer.Deserialize<SubscriptionUpdateWebhook>(rawBody);
        
        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.ShopDomain == shopDomain);
        
        if (store == null)
        {
            _logger.LogWarning("Store not found: {Shop}", shopDomain);
            return false;
        }

        var subscription = await _context.StoreSubscriptions
            .FirstOrDefaultAsync(s => s.StoreId == store.Id && 
                                     s.ShopifySubscriptionId == webhook.Id);
        
        if (subscription == null)
        {
            // 新規サブスクリプション
            subscription = new StoreSubscription
            {
                StoreId = store.Id,
                ShopifySubscriptionId = webhook.Id,
                PlanName = webhook.Name,
                Status = webhook.Status,
                CurrentPeriodEnd = webhook.CurrentPeriodEnd,
                CreatedAt = DateTime.UtcNow
            };
            _context.StoreSubscriptions.Add(subscription);
        }
        else
        {
            // 既存サブスクリプションの更新
            subscription.Status = webhook.Status;
            subscription.CurrentPeriodEnd = webhook.CurrentPeriodEnd;
            subscription.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Subscription updated for store {Store}: {Status}", 
            shopDomain, webhook.Status);
        
        return true;
    }

    private async Task<bool> ProcessSubscriptionCancel(string rawBody, string shopDomain)
    {
        // キャンセル処理
        var webhook = JsonSerializer.Deserialize<SubscriptionCancelWebhook>(rawBody);
        
        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.ShopDomain == shopDomain);
        
        if (store == null) return false;

        var subscription = await _context.StoreSubscriptions
            .FirstOrDefaultAsync(s => s.StoreId == store.Id && 
                                     s.ShopifySubscriptionId == webhook.Id);
        
        if (subscription != null)
        {
            subscription.Status = "cancelled";
            subscription.CancelledAt = DateTime.UtcNow;
            subscription.CancellationReason = webhook.CancellationReason;
            await _context.SaveChangesAsync();
        }
        
        return true;
    }

    private async Task<bool> ProcessAppUninstalled(string rawBody, string shopDomain)
    {
        // アンインストール処理
        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.ShopDomain == shopDomain);
        
        if (store == null) return false;

        store.IsActive = false;
        store.UninstalledAt = DateTime.UtcNow;
        
        // すべてのサブスクリプションを無効化
        var subscriptions = await _context.StoreSubscriptions
            .Where(s => s.StoreId == store.Id && s.Status == "active")
            .ToListAsync();
        
        foreach (var subscription in subscriptions)
        {
            subscription.Status = "cancelled";
            subscription.CancelledAt = DateTime.UtcNow;
            subscription.CancellationReason = "App uninstalled";
        }
        
        await _context.SaveChangesAsync();
        
        return true;
    }
}
```

### 3.2 Webhookモデル

```csharp
public class WebhookEvent
{
    public int Id { get; set; }
    public string WebhookId { get; set; }
    public string Topic { get; set; }
    public string ShopDomain { get; set; }
    public string Payload { get; set; }
    public DateTime ReceivedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string Status { get; set; }
    public string ErrorMessage { get; set; }
}

public class SubscriptionUpdateWebhook
{
    [JsonPropertyName("id")]
    public string Id { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; }
    
    [JsonPropertyName("status")]
    public string Status { get; set; }
    
    [JsonPropertyName("current_period_end")]
    public DateTime? CurrentPeriodEnd { get; set; }
    
    [JsonPropertyName("trial_ends_on")]
    public DateTime? TrialEndsOn { get; set; }
}

public class SubscriptionCancelWebhook
{
    [JsonPropertyName("id")]
    public string Id { get; set; }
    
    [JsonPropertyName("cancellation_reason")]
    public string CancellationReason { get; set; }
}
```

---

## 4. テスト実装

```csharp
[TestClass]
public class ShopifyBillingServiceTests
{
    [TestMethod]
    public async Task CreateSubscription_Should_Return_ConfirmationUrl()
    {
        // Arrange
        var service = new ShopifyBillingService(
            GetMockConfiguration(),
            GetMockLogger()
        );
        
        // Act
        var result = await service.CreateSubscriptionAsync(
            "Professional Plan",
            80.00m,
            7
        );
        
        // Assert
        Assert.IsNotNull(result);
        Assert.IsNotNull(result.ConfirmationUrl);
        Assert.IsNotNull(result.SubscriptionId);
        Assert.AreEqual("pending", result.Status);
    }
    
    [TestMethod]
    public void VerifyWebhookSignature_Should_Validate_Correctly()
    {
        // Arrange
        var secret = "test_secret";
        var body = "{\"id\":\"123\",\"status\":\"active\"}";
        var expectedSignature = ComputeSignature(body, secret);
        
        // Act & Assert
        Assert.IsTrue(VerifySignature(body, expectedSignature, secret));
    }
}
```

---

## 5. 注意事項

### API バージョン管理
- 常に最新の安定版APIを使用
- 廃止予定のAPIは早めに移行
- バージョンはヘッダーで明示的に指定

### エラーハンドリング
- GraphQLエラーとユーザーエラーを区別
- レート制限を考慮
- タイムアウト設定（30秒推奨）

### セキュリティ
- Webhook署名は必ず検証
- アクセストークンは環境変数で管理
- HTTPSのみ使用

---

**最終更新**: 2025年8月12日
**API バージョン**: 2024-01