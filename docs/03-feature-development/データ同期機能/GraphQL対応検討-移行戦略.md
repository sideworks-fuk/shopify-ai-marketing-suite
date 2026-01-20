# GraphQL対応検討 - 移行戦略

**作成日**: 2026-01-19  
**目的**: Shopify REST APIからGraphQL Admin APIへの移行の必要性と戦略を検討

---

## 📋 概要

Shopifyは2024年10月1日からREST Admin APIをレガシーAPIとして位置付け、GraphQL Admin APIへの移行を推奨しています。2025年4月1日より、新しく作成される公開アプリはGraphQLを使用することが必須となります。

本ドキュメントでは、現在のREST API実装からGraphQL Admin APIへの移行の必要性、メリット・デメリット、移行戦略を検討します。

---

## 🚨 ShopifyのAPI方針変更

### 重要なタイムライン

| 日付 | 変更内容 | 影響 |
|------|---------|------|
| **2024年10月1日** | REST Admin APIをレガシーAPIとして位置付け | 新機能はGraphQL優先 |
| **2025年4月1日** | 新規公開アプリはGraphQL必須 | 新規アプリ開発に影響 |
| **将来** | REST APIの段階的な非推奨化 | 既存アプリも移行が必要 |

### 現在の状況

- ✅ **現在の実装**: REST Admin API (`/admin/api/2024-01/customers.json`など)
- ⚠️ **推奨**: GraphQL Admin API (`/admin/api/2024-01/graphql.json`)
- 🔴 **リスク**: 新機能がREST APIで提供されない可能性

---

## ✅ GraphQL対応を検討すべき理由

### 1. APIの将来性とサポート保障

**現状**:
- REST Admin APIは今後非推奨（deprecated）APIとして扱われる機能が増加
- 新機能やAPIの改善はGraphQL優先で行われる
- 新規アプリでRESTを使うと公開アプリとしての承認に支障をきたす可能性

**影響**:
- 将来的に必要な機能がREST APIで提供されない可能性
- 既存機能のメンテナンスが停止される可能性

### 2. パフォーマンスと効率性の向上

**GraphQLの利点**:

| 項目 | REST API | GraphQL API |
|------|----------|-------------|
| **データ取得** | 固定のエンドポイントごとに全フィールド | 必要なフィールドのみを指定可能 |
| **複数リソース** | 複数のHTTPリクエストが必要 | 1回のリクエストで複数リソース取得可能 |
| **オーバーフェッチ** | 不要なデータも取得 | 必要なデータのみ取得 |
| **アンダーフェッチ** | 追加リクエストが必要 | 1回のクエリで必要なデータを取得 |

**例: 注文データ取得**

**REST API** (現在の実装):
```csharp
// 1. 注文一覧を取得
GET /admin/api/2024-01/orders.json?limit=250

// 2. 各注文の顧客情報を取得（必要に応じて）
GET /admin/api/2024-01/customers/{customerId}.json

// 3. 各注文の商品情報を取得（必要に応じて）
GET /admin/api/2024-01/products/{productId}.json
```

**GraphQL API** (移行後):
```graphql
query GetOrders($first: Int!, $after: String) {
  orders(first: $first, after: $after) {
    edges {
      node {
        id
        name
        createdAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          firstName
          lastName
          email
        }
        lineItems(first: 100) {
          edges {
            node {
              id
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                }
              }
              product {
                id
                title
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

**メリット**:
- 1回のリクエストで注文、顧客、商品情報を取得
- 必要なフィールドのみを指定（レスポンスサイズ削減）
- HTTPラウンドトリップの削減

### 3. レート制限とAPIコスト管理の改善

**REST API** (現在):
- 固定のレート制限（例: 40リクエスト/秒）
- リクエスト数ベースの制限

**GraphQL API**:
- **Calculated Query Cost（クエリの複雑さに応じたコスト）**方式
- 1回のクエリあたり最大1000ポイント
- 複雑なクエリにはより高コストがかかる
- より柔軟かつ透明性のある制御が可能

**例**:
- シンプルなクエリ: 1-10ポイント
- 中程度のクエリ: 50-100ポイント
- 複雑なクエリ: 500-1000ポイント

### 4. 型安全性と開発効率の向上

**GraphQLの利点**:
- スキーマ型で設計されており、強い型付け
- 誤った型やレスポンス構造によるバグを減らせる
- ドキュメントやAPI仕様がスキーマに密に結びついている
- Introspection機能で利用可能フィールドを探索可能
- 変更の影響範囲が把握しやすい

---

## ⚠️ GraphQL移行の課題とデメリット

### 1. 学習コスト

**課題**:
- GraphQLのクエリ構文の学習が必要
- ページネーション（カーソルベース）の理解
- Query Costの概念の理解

**対策**:
- 段階的な移行で学習コストを分散
- 既存のREST API実装を参考にしながら移行

### 2. 実装コスト

**課題**:
- 既存のREST API実装をGraphQLに書き換える必要がある
- テストコードの書き換え
- エラーハンドリングの変更

**対策**:
- 部分的移行とフェーズ分け
- REST APIとGraphQL APIの併用期間を設ける

### 3. Query Cost管理の複雑さ

**課題**:
- クエリの複雑さに応じたコスト計算が必要
- コストが1000ポイントを超えるとエラー
- クエリの最適化が必要

**対策**:
- クエリをシンプルに設計
- Bulk Operationsを活用
- コスト監視とアラート設定

### 4. ページネーションの違い

**REST API** (現在):
- `page_info`パラメータを使用
- 比較的シンプル

**GraphQL API**:
- カーソルベースのページネーション
- `edges`と`pageInfo`を使用
- 実装がやや複雑

---

## 🎯 移行戦略

### フェーズ1: 準備・検証フェーズ（1-2週間）

#### 1.1 GraphQLクライアントライブラリの選定

**候補**:
- **GraphQL.Client** (推奨)
  - .NET向けのGraphQLクライアント
  - NuGetパッケージ: `GraphQL.Client`
- **HotChocolate.Client**
  - .NET向けのGraphQLクライアント
  - より高度な機能

**推奨**: `GraphQL.Client`（シンプルで使いやすい）

#### 1.2 既存実装の調査

- 現在のREST API使用箇所の洗い出し
- 取得しているデータフィールドの確認
- エラーハンドリングの確認

#### 1.3 テスト環境での検証

- GraphQLクライアントのセットアップ
- 簡単なクエリのテスト
- Query Costの確認

### フェーズ2: 部分的移行フェーズ（2-4週間）

#### 2.1 商品データ同期の移行（優先度: 高）

**理由**:
- 比較的シンプルなデータ構造
- テストが容易
- 影響範囲が限定的

**実装内容**:
- `ShopifyProductSyncJob`をGraphQL対応に変更
- REST APIとGraphQL APIの併用期間を設ける
- 設定で切り替え可能にする

#### 2.2 注文データ同期の移行（優先度: 中）

**理由**:
- 顧客情報や商品情報を含む複雑な構造
- GraphQLの利点（1回のリクエストで複数リソース取得）を活かせる

**実装内容**:
- `ShopifyOrderSyncJob`をGraphQL対応に変更
- 顧客情報と商品情報を同時に取得

#### 2.3 顧客データ同期の移行（優先度: 低）

**理由**:
- Protected Customer Dataの問題がある
- GraphQLでも同様の問題が発生する可能性

**実装内容**:
- `ShopifyCustomerSyncJob`をGraphQL対応に変更
- Protected Customer Dataエラーのハンドリング

### フェーズ3: 完全移行フェーズ（1-2週間）

#### 3.1 REST API実装の削除

- `ShopifyApiService`のREST API実装を削除
- GraphQL実装のみに統一

#### 3.2 テストと検証

- 全機能のテスト
- パフォーマンステスト
- Query Costの監視

---

## 📝 実装例

### GraphQLクライアントのセットアップ

```csharp
// Program.cs
builder.Services.AddScoped<IShopifyGraphQLService, ShopifyGraphQLService>();

// ShopifyGraphQLService.cs
public class ShopifyGraphQLService
{
    private readonly GraphQLHttpClient _graphQLClient;
    private readonly ILogger<ShopifyGraphQLService> _logger;
    
    public ShopifyGraphQLService(
        IConfiguration configuration,
        ILogger<ShopifyGraphQLService> logger)
    {
        _logger = logger;
        
        var shopUrl = configuration["Shopify:ShopUrl"];
        var accessToken = configuration["Shopify:AccessToken"];
        
        _graphQLClient = new GraphQLHttpClient(
            $"https://{shopUrl}/admin/api/2024-01/graphql.json",
            new NewtonsoftJsonSerializer()
        );
        
        _graphQLClient.HttpClient.DefaultRequestHeaders.Add(
            "X-Shopify-Access-Token", accessToken
        );
    }
}
```

### 商品データ取得の例

```csharp
public async Task<(List<ShopifyProduct> Products, string? NextCursor)> FetchProductsPageAsync(
    int storeId, DateTime? sinceDate = null, string? cursor = null)
{
    var query = new GraphQLRequest
    {
        Query = @"
            query GetProducts($first: Int!, $after: String, $query: String) {
              products(first: $first, after: $after, query: $query) {
                edges {
                  node {
                    id
                    title
                    handle
                    productType
                    vendor
                    createdAt
                    updatedAt
                    variants(first: 100) {
                      edges {
                        node {
                          id
                          title
                          price
                          sku
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
            }",
        Variables = new
        {
            first = 250,
            after = cursor,
            query = sinceDate.HasValue 
                ? $"updated_at:>={sinceDate.Value:yyyy-MM-ddTHH:mm:ssZ}" 
                : null
        }
    };
    
    var response = await _graphQLClient.SendQueryAsync<ProductsResponse>(query);
    
    if (response.Errors != null && response.Errors.Any())
    {
        _logger.LogError("GraphQL errors: {Errors}", 
            string.Join(", ", response.Errors.Select(e => e.Message)));
        throw new Exception($"GraphQL query failed: {response.Errors.First().Message}");
    }
    
    var products = response.Data.Products.Edges
        .Select(e => ConvertToShopifyProduct(e.Node))
        .ToList();
    
    var nextCursor = response.Data.Products.PageInfo.HasNextPage 
        ? response.Data.Products.PageInfo.EndCursor 
        : null;
    
    return (products, nextCursor);
}
```

### 注文データ取得の例（複数リソースを同時取得）

```graphql
query GetOrders($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          firstName
          lastName
          email
        }
        lineItems(first: 100) {
          edges {
            node {
              id
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                }
              }
              product {
                id
                title
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

**メリット**:
- 1回のリクエストで注文、顧客、商品情報を取得
- REST APIでは3回のリクエストが必要だったが、GraphQLでは1回で済む

---

## 🔧 移行時の注意事項

### 1. データフィールドのマッピング

**REST API**:
```json
{
  "id": 123456789,
  "total_price": "100.00",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**GraphQL API**:
```json
{
  "id": "gid://shopify/Order/123456789",
  "totalPriceSet": {
    "shopMoney": {
      "amount": "100.00",
      "currencyCode": "JPY"
    }
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**注意点**:
- IDの形式が異なる（数値 → GID形式）
- 金額の構造が異なる（文字列 → オブジェクト）
- フィールド名が異なる（snake_case → camelCase）

### 2. エラーハンドリング

**REST API**:
```csharp
if (response.StatusCode == HttpStatusCode.Forbidden)
{
    // エラー処理
}
```

**GraphQL API**:
```csharp
if (response.Errors != null && response.Errors.Any())
{
    var error = response.Errors.First();
    if (error.Message.Contains("Protected customer data"))
    {
        // エラー処理
    }
}
```

### 3. Query Cost管理

```csharp
// Query Costを確認
var cost = response.Extensions?["cost"]?.ToObject<QueryCost>();
if (cost != null)
{
    _logger.LogInformation("Query cost: {RequestedQueryCost}/{ActualQueryCost}, ThrottleStatus: {ThrottleStatus}",
        cost.RequestedQueryCost, cost.ActualQueryCost, cost.ThrottleStatus);
    
    if (cost.ThrottleStatus.CurrentlyThrottled)
    {
        // レート制限に達している場合の処理
    }
}
```

---

## 📊 移行の優先順位

### 優先度: 高

1. **商品データ同期**
   - 比較的シンプル
   - テストが容易
   - 影響範囲が限定的

### 優先度: 中

2. **注文データ同期**
   - GraphQLの利点を活かせる（複数リソースを同時取得）
   - パフォーマンス向上が期待できる

### 優先度: 低

3. **顧客データ同期**
   - Protected Customer Dataの問題がある
   - GraphQLでも同様の問題が発生する可能性

---

## 🎯 推奨される移行計画

### 短期（1-2ヶ月）

1. GraphQLクライアントのセットアップ
2. 商品データ同期の移行
3. テストと検証

### 中期（3-6ヶ月）

1. 注文データ同期の移行
2. 顧客データ同期の移行
3. REST API実装の削除

### 長期（6ヶ月以上）

1. 新機能のGraphQL実装
2. パフォーマンス最適化
3. Query Costの最適化

---

## 📚 参考資料

- [Shopify GraphQL Admin API ドキュメント](https://shopify.dev/docs/api/admin-graphql)
- [GraphQL.Client NuGetパッケージ](https://www.nuget.org/packages/GraphQL.Client/)
- [Shopify GraphQL API レート制限](https://shopify.dev/docs/api/usage/rate-limits)
- [REST APIからGraphQLへの移行ガイド](https://shopify.dev/docs/apps/build/graphql)

---

## ✅ 結論

### GraphQL対応は**必須**です

**理由**:
1. ShopifyがREST APIをレガシーAPIとして位置付け
2. 新規公開アプリはGraphQL必須（2025年4月1日より）
3. 新機能はGraphQL優先で提供される
4. パフォーマンスと効率性の向上

### 推奨されるアプローチ

1. **段階的な移行**: 一気に全てを変えるのではなく、部分的に移行
2. **併用期間**: REST APIとGraphQL APIの併用期間を設ける
3. **設定で切り替え**: 設定でREST/GraphQLを切り替え可能にする
4. **テスト重視**: 各フェーズで十分なテストを実施

---

**最終更新**: 2026年1月19日  
**作成者**: AI Assistant
