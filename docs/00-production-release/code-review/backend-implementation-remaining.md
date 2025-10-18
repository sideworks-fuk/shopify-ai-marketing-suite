# バックエンド実装残リスト

作成日: 2025-09-04  
対象: Backend (C# ASP.NET Core)

## 🔴 クリティカル - 本番リリースブロッカー

### 1. Shopify OAuth認証の完全実装

**ファイル**: `/backend/ShopifyAnalyticsApi/Controllers/AuthController.cs`

#### Line 39-40: OAuth実装
```csharp
// 現在
// TODO: Implement actual OAuth flow
return Ok(new { success = true });

// 必要な実装
var authUrl = shopifyService.GetAuthorizationUrl(shop, redirectUri);
return Redirect(authUrl);
```

#### Line 69-70: リフレッシュトークン検証
```csharp
// 現在
// TODO: Validate refresh token against database

// 必要な実装
var storedToken = await dbContext.RefreshTokens
    .FirstOrDefaultAsync(rt => rt.Token == refreshToken);
if (storedToken == null || storedToken.ExpiresAt < DateTime.UtcNow)
    return Unauthorized();
```

#### Line 132: Shopify認証コード検証
```csharp
// 現在
// Validate the authorization code with Shopify

// 必要な実装
var accessToken = await shopifyService.ExchangeAuthorizationCode(code, shop);
await storeService.SaveAccessToken(shop, accessToken);
```

### 2. セキュリティ設定の本番対応

**ファイル**: `/backend/ShopifyAnalyticsApi/Program.cs`

#### Lines 241-249: CORS設定
```csharp
// 現在 - 開発環境
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCors", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 必要 - 本番環境
builder.Services.AddCors(options =>
{
    options.AddPolicy("ProductionCors", policy =>
    {
        policy.WithOrigins(configuration["AllowedOrigins"])
              .AllowCredentials()
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Content-Type", "Authorization");
    });
});
```

#### Line 313: Hangfireダッシュボード認証
```csharp
// 現在
// Authorization filter needs review

// 必要な実装
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() }
});
```

### 3. Azure Blob Storage統合（GDPR）

**ファイル**: `/backend/ShopifyAnalyticsApi/Services/GDPRService.cs`

#### Line 215: データエクスポートのストレージ
```csharp
// 現在
// TODO: Upload to Azure Blob Storage
var filePath = Path.Combine(Path.GetTempPath(), fileName);

// 必要な実装
var blobClient = new BlobServiceClient(connectionString);
var containerClient = blobClient.GetBlobContainerClient("gdpr-exports");
var blobClient = containerClient.GetBlobClient(fileName);
await blobClient.UploadAsync(stream);
```

#### Line 476: レポート配信
```csharp
// 現在
// TODO: Implement actual delivery mechanism

// 必要な実装
var sasUri = GenerateSasUri(blobName, TimeSpan.FromDays(7));
await emailService.SendDataExportEmail(customerEmail, sasUri);
```

## 🟡 重要 - 機能制限の原因

### 1. Webhookジョブスケジューリング

**ファイル**: `/backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs`

#### Lines 509, 534, 544, 557: Hangfireジョブ
```csharp
// 現在
// TODO: Schedule deletion job with Hangfire in production

// 必要な実装
BackgroundJob.Schedule(
    () => gdprService.DeleteCustomerData(shopDomain, customerId),
    TimeSpan.FromHours(48));
```

### 2. Shopify API同期ジョブ

**ディレクトリ**: `/backend/ShopifyAnalyticsApi/Jobs/`

各同期ジョブにTODOコメント:
- CustomerSyncJob.cs
- OrderSyncJob.cs  
- ProductSyncJob.cs

```csharp
// 現在
// TODO: Implement Shopify API call

// 必要な実装例（CustomerSyncJob）
var shopifyClient = new ShopifyClient(store.AccessToken, store.ShopDomain);
var customers = await shopifyClient.Customer.ListAsync(new CustomerListFilter
{
    UpdatedAtMin = lastSyncDate,
    Limit = 250
});
```

### 3. データベースシードデータ

**ファイル**: `/backend/ShopifyAnalyticsApi/Data/ShopifyDbContext.cs`

テストデータの削除が必要:
```csharp
// 現在 - テストデータ
modelBuilder.Entity<Store>().HasData(
    new Store { Id = 1, ShopDomain = "test-store.myshopify.com" }
);

// 必要 - 本番では削除またはコメントアウト
// シードデータは開発環境のみ
```

## 🟠 改善必要 - 品質向上

### 1. 入力検証の強化

全コントローラーで一貫した検証パターン:
```csharp
// 現在 - 検証が不足
public async Task<IActionResult> CreatePlan(PlanDto plan)
{
    // 直接処理
}

// 必要
public async Task<IActionResult> CreatePlan([FromBody] PlanDto plan)
{
    if (!ModelState.IsValid)
        return BadRequest(ModelState);
        
    // バリデーション属性の追加
}
```

### 2. エラーハンドリングの統一

```csharp
// 現在 - 不統一なエラーハンドリング
catch (Exception ex)
{
    return StatusCode(500);
}

// 必要 - 統一されたエラーレスポンス
catch (Exception ex)
{
    logger.LogError(ex, "Error in {Method}", nameof(MethodName));
    return StatusCode(500, new ErrorResponse
    {
        Message = "An error occurred",
        TraceId = HttpContext.TraceIdentifier
    });
}
```

### 3. Rate Limiting実装

```csharp
// Program.csに追加
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", options =>
    {
        options.Window = TimeSpan.FromMinutes(1);
        options.PermitLimit = 60;
    });
});
```

## 📋 実装チェックリスト

### Phase 1: クリティカル（1週間）
- [ ] Shopify OAuth完全実装
- [ ] CORS本番設定
- [ ] Hangfireダッシュボード認証
- [ ] Azure Blob Storage統合
- [ ] セキュリティヘッダー追加

### Phase 2: 重要（1週間）
- [ ] Webhookジョブスケジューリング
- [ ] Shopify API同期実装
- [ ] シードデータクリーンアップ
- [ ] Rate Limiting実装

### Phase 3: 品質向上（1週間）
- [ ] 入力検証強化
- [ ] エラーハンドリング統一
- [ ] ロギング改善
- [ ] パフォーマンス最適化

## TODOコメント一覧（優先順位付き）

### 高優先度
1. AuthController.cs (3箇所) - OAuth実装
2. GDPRService.cs (2箇所) - Azure Storage統合
3. WebhookController.cs (4箇所) - ジョブスケジューリング

### 中優先度
4. 各SyncJob (3ファイル) - Shopify API実装
5. Program.cs - セキュリティ設定

### 低優先度
6. 各種サービス - 最適化とリファクタリング

## セキュリティ脆弱性対応

| 脆弱性 | 深刻度 | 対応方法 | 工数 |
|--------|--------|----------|------|
| OAuth未実装 | 高 | 完全実装 | 2日 |
| CORS設定 | 高 | 本番用設定 | 0.5日 |
| 入力検証不足 | 中 | バリデーション追加 | 1日 |
| Rate Limiting未実装 | 中 | ミドルウェア追加 | 0.5日 |
| ロギング不足 | 低 | 構造化ロギング | 1日 |

## 見積もり工数

| タスク | 工数 | 優先度 |
|--------|------|--------|
| OAuth実装 | 2日 | クリティカル |
| セキュリティ設定 | 1日 | クリティカル |
| Azure Storage統合 | 1日 | クリティカル |
| ジョブ実装 | 2日 | 高 |
| Shopify API同期 | 2日 | 高 |
| 検証・エラー処理 | 1日 | 中 |
| テスト実装 | 2日 | 中 |
| **合計** | **11日** | - |

## 実装順序の推奨

1. **認証とセキュリティ** (3日)
   - Shopify OAuth
   - セキュリティ設定
   - Rate Limiting

2. **GDPR機能完成** (2日)
   - Azure Storage統合
   - ジョブスケジューリング

3. **Shopify統合** (3日)
   - API同期実装
   - Webhook処理

4. **品質向上** (3日)
   - エラーハンドリング
   - ロギング
   - テスト