# Shopify データ統合分析と設計書

## 📋 ドキュメント情報
- **作成日**: 2025年7月21日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: Shopify APIデータ取得可能性の検証と統合設計

---

## 🎯 概要

8機能の実装に必要なデータとShopify APIから取得可能なデータのギャップ分析を行い、データ取得戦略を策定します。

---

## 📊 機能別必要データとShopify API対応表

### 1. 月別売上統計【購買】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| 注文ID | Order.id | ✅ 可能 | |
| 注文日時 | Order.created_at | ✅ 可能 | |
| 商品ID | LineItem.product_id | ✅ 可能 | |
| 商品名 | LineItem.title | ✅ 可能 | |
| 商品ハンドル | LineItem.sku/Product.handle | ✅ 可能 | Product APIとの結合必要 |
| 数量 | LineItem.quantity | ✅ 可能 | |
| 金額 | LineItem.price | ✅ 可能 | |
| 顧客ID | Order.customer.id | ✅ 可能 | |

**GraphQL クエリ例**
```graphql
query GetOrders($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        createdAt
        customer {
          id
        }
        lineItems(first: 100) {
          edges {
            node {
              id
              title
              quantity
              originalUnitPrice
              product {
                id
                handle
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### 2. 前年同月比【商品】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| 商品別売上（月次） | Orders API | ✅ 可能 | 集計処理必要 |
| 商品カテゴリ | Product.product_type | ✅ 可能 | |
| 商品ステータス | Product.status | ✅ 可能 | |

### 3. 休眠顧客【顧客】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| 顧客ID | Customer.id | ✅ 可能 | |
| 顧客名 | Customer.first_name/last_name | ✅ 可能 | |
| メールアドレス | Customer.email | ✅ 可能 | |
| 電話番号 | Customer.phone | ✅ 可能 | |
| 最終購入日 | Customer.last_order.created_at | ✅ 可能 | |
| 総購入金額 | Customer.total_spent | ✅ 可能 | |
| 購入回数 | Customer.orders_count | ✅ 可能 | |
| タグ | Customer.tags | ✅ 可能 | |

**GraphQL クエリ例**
```graphql
query GetCustomers($first: Int!, $after: String) {
  customers(first: $first, after: $after) {
    edges {
      node {
        id
        firstName
        lastName
        email
        phone
        ordersCount
        totalSpent
        tags
        lastOrder {
          createdAt
        }
        createdAt
        updatedAt
      }
    }
  }
}
```

### 4. 購入頻度【商品】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| 顧客別商品購入履歴 | Orders API | ✅ 可能 | 集計処理必要 |
| 購入間隔 | - | ⚠️ 計算必要 | 注文日から算出 |
| 転換率 | - | ⚠️ 計算必要 | 集計後に算出 |

### 5. 購入回数【購買】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| 顧客別購入回数 | Customer.orders_count | ✅ 可能 | |
| 期間別購入回数 | Orders API | ✅ 可能 | 期間フィルタで取得 |
| 新規/リピート判定 | - | ⚠️ 計算必要 | 初回購入日から判定 |

### 6. 顧客購買【顧客】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| LTV | - | ⚠️ 計算必要 | 購買履歴から算出 |
| 購買頻度 | - | ⚠️ 計算必要 | 注文履歴から算出 |
| お気に入り商品 | - | ⚠️ 計算必要 | 購買履歴から分析 |
| 離脱リスクスコア | - | ❌ 不可 | 独自アルゴリズム必要 |

### 7. F階層傾向【購買】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| 月別購入頻度 | Orders API | ✅ 可能 | 月次集計必要 |
| F階層定義 | - | ❌ 不可 | 独自定義必要 |
| 階層推移 | - | ⚠️ 計算必要 | 履歴から算出 |

### 8. 組み合わせ商品【商品】

| 必要データ | Shopify API | 取得可否 | 備考 |
|-----------|-------------|----------|------|
| 同一注文内商品 | Order.line_items | ✅ 可能 | |
| アソシエーション分析 | - | ❌ 不可 | 独自実装必要 |
| 組み合わせ率 | - | ⚠️ 計算必要 | トランザクションから算出 |

---

## 🚨 取得不可能なデータと対策

### 1. 完全に取得不可能なデータ

| データ項目 | 理由 | 対策 |
|-----------|------|------|
| 離脱リスクスコア | Shopifyに概念なし | 購買履歴から独自算出 |
| F階層定義 | Shopifyに概念なし | 独自定義とルール設定 |
| アソシエーション分析結果 | 分析機能なし | 注文データから独自計算 |
| 顧客の嗜好・興味 | 直接データなし | 購買履歴から推定 |

### 2. 制限事項と回避策

| 制限事項 | 影響 | 回避策 |
|----------|------|--------|
| API レート制限 | 大量データ取得時に制限 | バッチ処理、増分更新 |
| 最大取得件数 | 1回250件まで | ページネーション実装 |
| 過去データ期限 | 店舗により異なる | 定期的なデータ保存 |
| リアルタイム性 | Webhook以外は遅延あり | 日次バッチ + Webhook併用 |

---

## 🏗️ Shopify データ取得アーキテクチャ

### 全体構成
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Shopify Store  │────▶│  Shopify API    │────▶│  Data Sync      │
│                 │     │  (GraphQL)      │     │  Service        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                                │
        │ Webhooks                                       ▼
        │                                        ┌─────────────────┐
        └───────────────────────────────────────▶│  Azure SQL DB   │
                                                 └─────────────────┘
```

### データ同期戦略

#### 1. 初期データ移行
```csharp
public class InitialDataMigrationService
{
    public async Task MigrateHistoricalData(int storeId, DateTime startDate)
    {
        // 1. 商品マスタの同期
        await SyncProducts(storeId);
        
        // 2. 顧客マスタの同期
        await SyncCustomers(storeId);
        
        // 3. 注文履歴の同期（過去2年分）
        await SyncOrders(storeId, startDate);
        
        // 4. 初期集計処理
        await RunInitialAggregations(storeId);
    }
}
```

#### 2. 増分更新（日次バッチ）
```csharp
public class DailyIncrementalSync : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 前回同期時刻から現在までの差分を取得
        var lastSyncTime = await GetLastSyncTime();
        var orders = await GetOrdersSince(lastSyncTime);
        
        // 新規/更新された注文を処理
        await ProcessOrders(orders);
        
        // 集計テーブルを更新
        await UpdateAggregations();
    }
}
```

#### 3. リアルタイム更新（Webhook）
```csharp
[ApiController]
[Route("api/webhooks/shopify")]
public class ShopifyWebhookController : ControllerBase
{
    [HttpPost("orders/create")]
    public async Task<IActionResult> OrderCreated([FromBody] ShopifyWebhook<Order> webhook)
    {
        // 注文作成時の処理
        await ProcessNewOrder(webhook.Data);
        return Ok();
    }
    
    [HttpPost("customers/update")]
    public async Task<IActionResult> CustomerUpdated([FromBody] ShopifyWebhook<Customer> webhook)
    {
        // 顧客更新時の処理
        await UpdateCustomer(webhook.Data);
        return Ok();
    }
}
```

---

## 📊 データ取得実装計画

### Phase 0: Shopify連携基盤（Day 0 - 開発前準備）

1. **Shopify Partner アカウント設定**
   - Private App 作成
   - 必要なスコープ設定
   - Webhook 設定

2. **必要なAPIスコープ**
   ```
   read_orders
   read_customers  
   read_products
   read_inventory (在庫分析が必要な場合)
   read_reports (レポートAPI使用時)
   ```

3. **GraphQL スキーマ確認**
   - 最新のAPI仕様確認
   - 非推奨フィールドの確認

### Phase 1: 基本データ同期（Day 1-2）

```csharp
// Shopify GraphQL クライアント実装
public class ShopifyGraphQLClient
{
    private readonly HttpClient _httpClient;
    private readonly string _shopDomain;
    private readonly string _accessToken;
    
    public async Task<T> ExecuteQuery<T>(string query, object variables = null)
    {
        var request = new
        {
            query = query,
            variables = variables
        };
        
        // レート制限対応
        await HandleRateLimit();
        
        var response = await _httpClient.PostAsJsonAsync(
            $"https://{_shopDomain}/admin/api/2024-01/graphql.json",
            request
        );
        
        return await ParseResponse<T>(response);
    }
}
```

### Phase 2: バッチ処理実装（Day 3-4）

```csharp
// 商品データ同期
public async Task SyncProducts(int storeId)
{
    var hasNextPage = true;
    var cursor = (string)null;
    
    while (hasNextPage)
    {
        var query = @"
            query GetProducts($first: Int!, $after: String) {
                products(first: $first, after: $after) {
                    edges {
                        node {
                            id
                            title
                            handle
                            productType
                            vendor
                            status
                            createdAt
                            updatedAt
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }";
        
        var result = await _shopifyClient.ExecuteQuery<ProductsResponse>(
            query,
            new { first = 250, after = cursor }
        );
        
        await SaveProducts(storeId, result.Products);
        
        hasNextPage = result.PageInfo.HasNextPage;
        cursor = result.PageInfo.EndCursor;
    }
}
```

### Phase 3: リアルタイム連携（Day 5）

```csharp
// Webhook登録
public async Task RegisterWebhooks()
{
    var webhooks = new[]
    {
        new { topic = "orders/create", address = $"{_baseUrl}/api/webhooks/shopify/orders/create" },
        new { topic = "orders/updated", address = $"{_baseUrl}/api/webhooks/shopify/orders/update" },
        new { topic = "customers/create", address = $"{_baseUrl}/api/webhooks/shopify/customers/create" },
        new { topic = "customers/update", address = $"{_baseUrl}/api/webhooks/shopify/customers/update" },
        new { topic = "products/update", address = $"{_baseUrl}/api/webhooks/shopify/products/update" }
    };
    
    foreach (var webhook in webhooks)
    {
        await _shopifyClient.CreateWebhook(webhook);
    }
}
```

---

## 🔧 技術的考慮事項

### 1. パフォーマンス最適化
- **並列処理**: 複数リソースの同時取得
- **キャッシング**: 商品マスタなどの静的データ
- **差分更新**: updated_at を利用した増分同期

### 2. エラーハンドリング
- **リトライ機構**: 一時的なエラーへの対応
- **エラーログ**: 詳細なエラー情報の記録
- **アラート**: 同期失敗時の通知

### 3. データ整合性
- **トランザクション**: 関連データの一括更新
- **冪等性**: 重複実行時の安全性確保
- **監査ログ**: データ変更履歴の記録

---

## 📈 実装優先順位

1. **必須（Phase 1で実装）**
   - Orders API 連携
   - Products API 連携
   - Customers API 連携
   - 基本的なバッチ同期

2. **重要（Phase 2で実装）**
   - Webhook 連携
   - 差分更新最適化
   - エラーリカバリ

3. **オプション（Phase 3以降）**
   - リアルタイム分析
   - 高度なキャッシング
   - 並列処理最適化

---

## 🎯 結論

**8機能すべてのデータはShopify APIから取得可能**ですが、以下の対応が必要です：

1. **直接取得可能**: 60%のデータ
2. **集計処理必要**: 30%のデータ  
3. **独自実装必要**: 10%のデータ（分析ロジック）

初期実装では日次バッチ処理で十分対応可能で、将来的にWebhookでリアルタイム性を向上させる戦略が最適です。

---

*最終更新: 2025年7月21日* 