# GDPR必須Webhook仕様書

**作成日**: 2025年7月29日  
**対象**: Shopify App Store申請必須要件

## 1. 概要

Shopifyアプリは、GDPR（一般データ保護規則）に準拠するため、4つの必須Webhookを実装する必要があります。これらのWebhookは、顧客データの削除要求やアプリのアンインストール時の処理を適切に行うためのものです。

## 2. 必須Webhook一覧

| Webhook | タイムアウト | データ削除期限 | 優先度 |
|---------|------------|--------------|--------|
| app/uninstalled | 5秒 | 48時間 | 最高 |
| customers/redact | 5秒 | 30日 | 高 |
| shop/redact | 5秒 | 90日 | 高 |
| customers/data_request | 5秒 | 10日（データ提供） | 中 |

## 3. 各Webhookの詳細仕様

### 3.1 app/uninstalled

#### 目的
アプリがストアからアンインストールされた際の処理

#### リクエスト形式
```http
POST /api/webhooks/app/uninstalled
Headers:
  X-Shopify-Topic: app/uninstalled
  X-Shopify-Hmac-Sha256: {hmac_signature}
  X-Shopify-Shop-Domain: example.myshopify.com
  X-Shopify-Api-Version: 2024-01
  X-Shopify-Webhook-Id: {webhook_id}

Body:
{
  "id": 123456789,
  "name": "Example Shop",
  "email": "shop@example.com",
  "domain": "example.myshopify.com",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2025-07-29T00:00:00Z"
}
```

#### 実装例
```csharp
[HttpPost("app/uninstalled")]
public async Task<IActionResult> AppUninstalled(
    [FromHeader(Name = "X-Shopify-Hmac-Sha256")] string hmac,
    [FromHeader(Name = "X-Shopify-Shop-Domain")] string shopDomain)
{
    // 1. HMAC検証
    var body = await Request.GetRawBodyStringAsync();
    if (!VerifyWebhookRequest(body, hmac))
    {
        return Unauthorized();
    }
    
    // 2. 即座に200 OKを返す（5秒タイムアウト対策）
    Response.StatusCode = 200;
    await Response.CompleteAsync();
    
    // 3. 非同期でデータ削除処理をキューに追加
    await _queueService.EnqueueAsync(new AppUninstalledTask
    {
        ShopDomain = shopDomain,
        ScheduledAt = DateTime.UtcNow,
        DeadlineAt = DateTime.UtcNow.AddHours(48)
    });
    
    return Ok();
}
```

#### 削除対象データ
- ストア情報（Storesテーブル）
- アクセストークン
- 全ての関連データ（Orders, Customers, Products）
- Webhook登録情報
- キャッシュデータ

### 3.2 customers/redact

#### 目的
特定の顧客データの削除要求処理

#### リクエスト形式
```http
POST /api/webhooks/customers/redact
Headers: 同上

Body:
{
  "shop_id": 123456789,
  "shop_domain": "example.myshopify.com",
  "customer": {
    "id": 987654321,
    "email": "customer@example.com",
    "phone": "+1234567890"
  },
  "orders_to_redact": [111111, 222222, 333333]
}
```

#### 実装例
```csharp
[HttpPost("customers/redact")]
public async Task<IActionResult> CustomersRedact(
    [FromHeader(Name = "X-Shopify-Hmac-Sha256")] string hmac,
    [FromBody] CustomerRedactRequest request)
{
    // HMAC検証
    var body = await Request.GetRawBodyStringAsync();
    if (!VerifyWebhookRequest(body, hmac))
    {
        return Unauthorized();
    }
    
    // 即座に200 OKを返す
    Response.StatusCode = 200;
    await Response.CompleteAsync();
    
    // 非同期処理
    await _queueService.EnqueueAsync(new CustomerRedactTask
    {
        ShopDomain = request.ShopDomain,
        CustomerId = request.Customer.Id,
        OrderIds = request.OrdersToRedact,
        DeadlineAt = DateTime.UtcNow.AddDays(30)
    });
    
    return Ok();
}
```

#### 削除対象データ
- 顧客個人情報（氏名、メール、電話番号、住所）
- 指定された注文の個人情報
- ただし、統計データは匿名化して保持可能

### 3.3 shop/redact

#### 目的
ストア全体のデータ削除要求処理（GDPR対応）

#### リクエスト形式
```http
POST /api/webhooks/shop/redact
Headers: 同上

Body:
{
  "shop_id": 123456789,
  "shop_domain": "example.myshopify.com"
}
```

#### 実装例
```csharp
[HttpPost("shop/redact")]
public async Task<IActionResult> ShopRedact(
    [FromHeader(Name = "X-Shopify-Hmac-Sha256")] string hmac,
    [FromBody] ShopRedactRequest request)
{
    // HMAC検証
    var body = await Request.GetRawBodyStringAsync();
    if (!VerifyWebhookRequest(body, hmac))
    {
        return Unauthorized();
    }
    
    // 即座に200 OKを返す
    Response.StatusCode = 200;
    await Response.CompleteAsync();
    
    // 非同期処理（90日の猶予期間）
    await _queueService.EnqueueAsync(new ShopRedactTask
    {
        ShopDomain = request.ShopDomain,
        ShopId = request.ShopId,
        DeadlineAt = DateTime.UtcNow.AddDays(90)
    });
    
    return Ok();
}
```

#### 削除対象データ
- ストアに関連する全てのデータ
- バックアップデータ
- ログデータ（法的要求がない限り）

### 3.4 customers/data_request

#### 目的
顧客データの開示要求処理

#### リクエスト形式
```http
POST /api/webhooks/customers/data_request
Headers: 同上

Body:
{
  "shop_id": 123456789,
  "shop_domain": "example.myshopify.com",
  "customer": {
    "id": 987654321,
    "email": "customer@example.com"
  },
  "orders_requested": [111111, 222222, 333333]
}
```

#### 実装例
```csharp
[HttpPost("customers/data_request")]
public async Task<IActionResult> CustomersDataRequest(
    [FromHeader(Name = "X-Shopify-Hmac-Sha256")] string hmac,
    [FromBody] CustomerDataRequest request)
{
    // HMAC検証
    var body = await Request.GetRawBodyStringAsync();
    if (!VerifyWebhookRequest(body, hmac))
    {
        return Unauthorized();
    }
    
    // 即座に200 OKを返す
    Response.StatusCode = 200;
    await Response.CompleteAsync();
    
    // データエクスポート処理
    await _queueService.EnqueueAsync(new CustomerDataExportTask
    {
        ShopDomain = request.ShopDomain,
        CustomerId = request.Customer.Id,
        CustomerEmail = request.Customer.Email,
        OrderIds = request.OrdersRequested,
        DeadlineAt = DateTime.UtcNow.AddDays(10)
    });
    
    return Ok();
}
```

#### 提供データ形式
```json
{
  "customer": {
    "id": 987654321,
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "addresses": [...],
    "created_at": "2023-01-01T00:00:00Z"
  },
  "orders": [
    {
      "id": 111111,
      "created_at": "2024-01-01T00:00:00Z",
      "total_price": "100.00",
      "line_items": [...]
    }
  ],
  "analytics": {
    "total_spent": "1000.00",
    "order_count": 10,
    "last_order_date": "2025-07-01T00:00:00Z"
  }
}
```

## 4. 共通実装要件

### 4.1 HMAC検証
```csharp
public bool VerifyWebhookRequest(string requestBody, string hmacHeader)
{
    var secret = _configuration["Shopify:WebhookSecret"];
    var encoding = new UTF8Encoding();
    var keyBytes = encoding.GetBytes(secret);
    
    using (var hmac = new HMACSHA256(keyBytes))
    {
        var hash = hmac.ComputeHash(encoding.GetBytes(requestBody));
        var computedHmac = Convert.ToBase64String(hash);
        return hmacHeader == computedHmac;
    }
}
```

### 4.2 非同期処理パターン
```csharp
public class WebhookQueueService
{
    private readonly IServiceBusClient _serviceBus;
    
    public async Task EnqueueAsync<T>(T task) where T : IWebhookTask
    {
        var message = new ServiceBusMessage
        {
            Body = BinaryData.FromObjectAsJson(task),
            Subject = task.GetType().Name,
            ScheduledEnqueueTime = task.ScheduledAt
        };
        
        await _serviceBus.SendMessageAsync(message);
    }
}
```

### 4.3 エラーハンドリング
```csharp
[ApiController]
public class WebhookController : ControllerBase
{
    private readonly ILogger<WebhookController> _logger;
    
    protected async Task<IActionResult> HandleWebhook<T>(
        string hmac, 
        Func<T, Task> handler) where T : class
    {
        try
        {
            // 本文を取得
            var body = await Request.GetRawBodyStringAsync();
            
            // HMAC検証
            if (!VerifyWebhookRequest(body, hmac))
            {
                _logger.LogWarning("Invalid HMAC signature");
                return Unauthorized();
            }
            
            // デシリアライズ
            var data = JsonSerializer.Deserialize<T>(body);
            
            // 即座に200を返す
            Response.StatusCode = 200;
            await Response.CompleteAsync();
            
            // 非同期処理
            await handler(data);
            
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Webhook processing error");
            // エラーでも200を返す（Shopifyの仕様）
            return Ok();
        }
    }
}
```

## 5. データベース設計

### 5.1 Webhook履歴管理
```sql
CREATE TABLE WebhookEvents (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT FOREIGN KEY REFERENCES Stores(Id),
    Topic NVARCHAR(100) NOT NULL,
    ShopDomain NVARCHAR(255) NOT NULL,
    Payload NVARCHAR(MAX),
    HmacSignature NVARCHAR(500),
    ProcessedAt DATETIME2,
    Status NVARCHAR(50), -- 'received', 'processing', 'completed', 'failed'
    ErrorMessage NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    INDEX IX_WebhookEvents_Status (Status),
    INDEX IX_WebhookEvents_Topic (Topic)
);

CREATE TABLE DataDeletionTasks (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TaskType NVARCHAR(50), -- 'app', 'customer', 'shop'
    ShopDomain NVARCHAR(255),
    TargetId NVARCHAR(100), -- CustomerId or ShopId
    ScheduledAt DATETIME2,
    DeadlineAt DATETIME2,
    CompletedAt DATETIME2,
    Status NVARCHAR(50), -- 'pending', 'processing', 'completed'
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
```

## 6. テスト方法

### 6.1 Webhook通知テスト
```bash
# Shopify CLIを使用
shopify app generate webhook

# 手動テスト
curl -X POST https://your-app.com/api/webhooks/app/uninstalled \
  -H "X-Shopify-Topic: app/uninstalled" \
  -H "X-Shopify-Hmac-Sha256: {calculated_hmac}" \
  -H "X-Shopify-Shop-Domain: test-shop.myshopify.com" \
  -H "Content-Type: application/json" \
  -d '{"id":123456,"domain":"test-shop.myshopify.com"}'
```

### 6.2 タイムアウトテスト
```csharp
[Fact]
public async Task Webhook_ShouldRespondWithin5Seconds()
{
    var stopwatch = Stopwatch.StartNew();
    
    var response = await _client.PostAsJsonAsync(
        "/api/webhooks/app/uninstalled",
        new { id = 123, domain = "test.myshopify.com" });
    
    stopwatch.Stop();
    
    Assert.True(stopwatch.ElapsedMilliseconds < 5000);
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
}
```

## 7. 監視とアラート

### 7.1 Application Insights設定
```csharp
// Webhook処理時間の監視
_telemetryClient.TrackMetric("WebhookProcessingTime", 
    stopwatch.ElapsedMilliseconds,
    new Dictionary<string, string> 
    {
        { "Topic", webhookTopic },
        { "Shop", shopDomain }
    });

// エラー監視
_telemetryClient.TrackException(ex, 
    new Dictionary<string, string>
    {
        { "WebhookTopic", topic },
        { "ShopDomain", shopDomain }
    });
```

### 7.2 アラート設定
- Webhook処理時間 > 4秒：警告
- Webhook処理失敗：即座にアラート
- データ削除期限24時間前：リマインダー

## 8. チェックリスト

### 実装確認
- [ ] 4つの必須Webhookエンドポイント作成
- [ ] HMAC検証実装
- [ ] 5秒以内の応答保証
- [ ] 非同期処理の実装
- [ ] データ削除スケジューラー

### セキュリティ確認
- [ ] HTTPS通信のみ
- [ ] HMAC署名の検証
- [ ] エラー時も200 OK返却
- [ ] ログに個人情報を含まない

### テスト確認
- [ ] 各Webhookの疎通テスト
- [ ] タイムアウトテスト
- [ ] データ削除の動作確認
- [ ] エラーハンドリングテスト

---

**重要**: これらのWebhookは、Shopifyアプリ審査の必須要件です。実装漏れがあると審査に通りません。