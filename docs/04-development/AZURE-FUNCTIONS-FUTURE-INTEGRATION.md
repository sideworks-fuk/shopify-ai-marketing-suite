# Azure Functions - 将来統合用ドキュメント

## 📋 概要

このドキュメントは、将来的な**Shopifyデータ取得・DB登録機能**の実装時にAzure Functionsを使用する場合の参考情報をまとめたものです。

> **現在の状況**: 現在は.NET Web APIでの実装を進めていますが、バッチ処理やデータ同期機能でAzure Functionsが有効な可能性があります。

## 🎯 想定される利用ケース

### 1. **定期データ同期**
- **機能**: Shopify API → Azure SQL Database への定期同期
- **頻度**: 毎日深夜、または1時間ごと
- **データ**: Orders, Customers, Products

### 2. **Webhookイベント処理**
- **機能**: Shopify Webhook → リアルタイムデータ更新
- **トリガー**: 注文作成、顧客登録、商品更新
- **処理**: 即座にデータベース反映

### 3. **重い分析処理**
- **機能**: 大量データの集計・分析処理
- **タイミング**: 夜間バッチ処理
- **出力**: 事前計算済み分析結果

## 🏗️ アーキテクチャ案

```
Shopify API
    ↓
Azure Functions (データ取得・変換)
    ↓
Azure SQL Database
    ↓
.NET Web API (分析・表示)
    ↓
Next.js Frontend
```

## 📁 実装参考情報

### プロジェクト構成
```
ShopifyDataSync/                   # Azure Functions プロジェクト
├── Functions/
│   ├── ShopifyDataSync.cs        # 定期同期 (Timer Trigger)
│   ├── WebhookHandler.cs         # Webhook処理 (HTTP Trigger)
│   └── AnalyticsProcessor.cs     # 分析処理 (Queue Trigger)
├── Models/
│   ├── ShopifyModels.cs          # Shopify API レスポンス型
│   └── DatabaseModels.cs         # データベースエンティティ
├── Services/
│   ├── ShopifyApiService.cs      # Shopify API 呼び出し
│   └── DatabaseService.cs        # データベース操作
└── host.json                     # Functions 設定
```

### 必要なNuGetパッケージ
```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.19.0" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.16.4" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Timer" Version="4.3.0" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.1.0" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.ServiceBus" Version="5.12.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
<PackageReference Include="System.Text.Json" Version="8.0.0" />
```

### サンプル実装

#### 定期データ同期
```csharp
[Function("ShopifyDataSync")]
public async Task RunAsync([TimerTrigger("0 0 2 * * *")] TimerInfo timer)
{
    _logger.LogInformation("Shopify データ同期開始: {time}", DateTime.Now);
    
    try
    {
        // 1. Shopify APIからデータ取得
        var orders = await _shopifyApiService.GetOrdersAsync();
        var customers = await _shopifyApiService.GetCustomersAsync();
        var products = await _shopifyApiService.GetProductsAsync();
        
        // 2. データベースに保存
        await _databaseService.SaveOrdersAsync(orders);
        await _databaseService.SaveCustomersAsync(customers);
        await _databaseService.SaveProductsAsync(products);
        
        _logger.LogInformation("同期完了 - Orders: {orderCount}, Customers: {customerCount}", 
            orders.Count, customers.Count);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "データ同期中にエラーが発生しました");
        throw;
    }
}
```

#### Webhook ハンドラー
```csharp
[Function("ShopifyWebhook")]
public async Task<HttpResponseData> RunAsync(
    [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req)
{
    _logger.LogInformation("Shopify Webhook受信");
    
    // 1. Webhook署名検証
    if (!await ValidateWebhookSignature(req))
    {
        return req.CreateResponse(HttpStatusCode.Unauthorized);
    }
    
    // 2. イベントタイプ判定
    var topic = req.Headers.GetValues("X-Shopify-Topic").FirstOrDefault();
    var requestBody = await req.ReadAsStringAsync();
    
    switch (topic)
    {
        case "orders/create":
            await ProcessOrderCreated(requestBody);
            break;
        case "customers/create":
            await ProcessCustomerCreated(requestBody);
            break;
        // 他のイベント処理...
    }
    
    return req.CreateResponse(HttpStatusCode.OK);
}
```

## ⚙️ 設定情報

### local.settings.json
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "ShopifyApiKey": "your-api-key",
    "ShopifyApiSecret": "your-api-secret",
    "ShopifyAccessToken": "your-access-token",
    "ShopifyStoreUrl": "your-store.myshopify.com",
    "DatabaseConnectionString": "your-connection-string"
  }
}
```

### host.json
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "functionTimeout": "00:10:00",
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  }
}
```

## 🚀 デプロイ手順

### Azure リソース作成
```bash
# Azure CLI でリソース作成
az group create --name shopify-analytics-rg --location japaneast

az functionapp create \
  --resource-group shopify-analytics-rg \
  --consumption-plan-location japaneast \
  --runtime dotnet-isolated \
  --functions-version 4 \
  --name shopify-data-sync-func \
  --storage-account shopifyanalyticsstore
```

### デプロイ実行
```bash
# Functions Core Tools でデプロイ
func azure functionapp publish shopify-data-sync-func
```

## 📊 監視・運用

### Application Insights
- **メトリクス**: 実行時間、成功/失敗率、リクエスト数
- **ログ**: 詳細な実行ログとエラー情報
- **アラート**: 失敗時の通知設定

### 想定される監視項目
```csharp
// カスタムメトリクス例
_telemetryClient.TrackMetric("ShopifyApi.ResponseTime", responseTime);
_telemetryClient.TrackMetric("DataSync.ProcessedOrders", processedCount);
_telemetryClient.TrackEvent("DataSync.Completed", new Dictionary<string, string>
{
    {"Duration", duration.ToString()},
    {"RecordsProcessed", recordCount.ToString()}
});
```

## 💰 コスト考慮事項

### 消費プラン（推奨）
- **コスト**: 実行時間とメモリ使用量に基づく従量課金
- **無料枠**: 月1,000,000リクエスト + 400,000 GB-s
- **スケール**: 自動スケールアウト

### 想定コスト（月次）
```
データ同期 (1日1回, 5分実行):
- 実行回数: 30回/月
- 実行時間: 5分 × 30回 = 150分
- メモリ: 512MB
- 推定コスト: $2-5/月

Webhook処理 (1日100回, 30秒実行):
- 実行回数: 3,000回/月  
- 実行時間: 30秒 × 3,000回 = 25時間
- メモリ: 256MB
- 推定コスト: $3-8/月
```

## 🔗 参考リンク

### Azure Functions
- [Azure Functions ドキュメント](https://docs.microsoft.com/ja-jp/azure/azure-functions/)
- [.NET 8 Isolated Worker](https://docs.microsoft.com/ja-jp/azure/azure-functions/dotnet-isolated-process-guide)
- [Functions Core Tools](https://docs.microsoft.com/ja-jp/azure/azure-functions/functions-run-local)

### Shopify Integration
- [Shopify Webhook ガイド](https://shopify.dev/apps/webhooks)
- [Shopify Admin API](https://shopify.dev/api/admin)
- [レート制限対策](https://shopify.dev/api/usage/rate-limits)

## ⚠️ 実装時の注意事項

### 1. **レート制限対策**
- Shopify APIのレート制限を考慮した実装
- Pollyライブラリでリトライポリシー設定

### 2. **データ整合性**
- 冪等性の確保（重複実行対策）
- エラー時のロールバック処理

### 3. **セキュリティ**
- Webhook署名検証の実装
- 機密情報の適切な管理（Key Vault使用）

### 4. **パフォーマンス**
- 大量データ処理時のバッチサイズ調整
- メモリ使用量の最適化

## 📝 実装判断基準

### Azure Functions が適している場合
- ✅ 定期的なバッチ処理
- ✅ イベント駆動処理（Webhook）
- ✅ サーバーレスでコスト効率重視
- ✅ 独立性が高い処理

### .NET Web API が適している場合  
- ✅ リアルタイム API応答
- ✅ 複雑なビジネスロジック
- ✅ フロントエンドとの密結合
- ✅ 継続的なサービス提供

---

**作成日**: 2025年1月26日  
**作成者**: レイ（Claude Code AI）  
**用途**: 将来のShopifyデータ統合時の参考資料  
**ステータス**: 参考情報（実装時に詳細設計要）