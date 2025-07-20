# 前年同月比【商品】機能 - 詳細設計書

作成日: 2025年6月10日  
更新日: 2025年6月10日  
ステータス: 設計中  

## 📋 1. 機能概要と実装優先度評価

### 1.1 機能概要
商品別の売上を前年同月と比較し、成長率・金額差を可視化する機能です。季節性の把握と商品戦略の最適化に活用されます。

### 1.2 4機能の実装優先度比較

| 機能名 | 複雑度 | データ取得難易度 | UI複雑度 | バックエンド負荷 | 推奨順位 |
|--------|--------|------------------|----------|------------------|----------|
| **前年同月比【商品】** | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | **1位** |
| 休眠顧客【顧客】 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 2位 |
| 組み合わせ商品【商品】 | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 3位 |
| F階層傾向【購買】 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 4位 |

### 1.3 前年同月比機能が最適な理由
1. **データ構造がシンプル**: 商品×月×売上の3次元データのみ
2. **計算ロジックが明確**: 単純な前年比較演算
3. **Shopify APIの標準データ**: 追加のデータ変換が不要
4. **UI要件がシンプル**: 既存実装を活用可能
5. **基盤技術の確立**: 他機能の基盤となるパターンを構築

## 📊 2. 現在の実装状況分析

### 2.1 フロントエンド実装状況
- ✅ UI完成度: 90%（月別詳細表示、フィルタリング、CSV出力）
- 🟡 データ連携: 0%（モックデータ使用中）
- 🟡 エラーハンドリング: 30%（基本的な処理のみ）

### 2.2 バックエンド実装状況
- ❌ .NET Web API: 未実装
- ❌ Shopify API連携: 未実装
- ❌ データベース設計: 未実装
- ❌ データ集計処理: 未実装

### 2.3 現在の技術スタック
- **フロントエンド**: Next.js 15.1.0 + React 18.2.0 + TypeScript
- **バックエンド**: .NET 8 C#（予定）
- **データベース**: PostgreSQL（予定）
- **認証**: Clerk
- **外部API**: Shopify GraphQL Admin API

## 🏗️ 3. システム設計

### 3.1 アーキテクチャ概要
```
[Next.js Frontend] ↔ [.NET Web API] ↔ [PostgreSQL] ↔ [Shopify API]
```

### 3.2 データフロー設計
```
1. バッチ処理（日次）: Shopify API → データ集計 → PostgreSQL保存
2. リアルタイム表示: Frontend → .NET API → PostgreSQL → Frontend
3. 期間指定分析: Frontend → .NET API → 動的集計 → Frontend
```

## 💾 4. データベース設計

### 4.1 テーブル設計（PostgreSQL）

```sql
-- 商品マスタテーブル
CREATE TABLE products (
    product_id VARCHAR(50) PRIMARY KEY,
    shopify_product_id BIGINT UNIQUE NOT NULL,
    product_title VARCHAR(500) NOT NULL,
    product_type VARCHAR(100),
    vendor VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日次売上集計テーブル
CREATE TABLE daily_product_sales (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(product_id),
    sale_date DATE NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    total_sales DECIMAL(12,2) DEFAULT 0.00,
    order_count INTEGER DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, sale_date)
);

-- 月次集計テーブル（高速化用）
CREATE TABLE monthly_product_sales (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(product_id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    quantity_sold INTEGER DEFAULT 0,
    total_sales DECIMAL(12,2) DEFAULT 0.00,
    order_count INTEGER DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0.00,
    days_with_sales INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, year, month)
);

-- 前年同月比キャッシュテーブル
CREATE TABLE year_over_year_cache (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(product_id),
    current_year INTEGER NOT NULL,
    current_month INTEGER NOT NULL,
    current_sales DECIMAL(12,2) DEFAULT 0.00,
    previous_sales DECIMAL(12,2) DEFAULT 0.00,
    growth_rate DECIMAL(8,2) DEFAULT 0.00,
    growth_amount DECIMAL(12,2) DEFAULT 0.00,
    current_quantity INTEGER DEFAULT 0,
    previous_quantity INTEGER DEFAULT 0,
    quantity_growth_rate DECIMAL(8,2) DEFAULT 0.00,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, current_year, current_month)
);

-- インデックス作成
CREATE INDEX idx_daily_sales_date ON daily_product_sales(sale_date);
CREATE INDEX idx_daily_sales_product_date ON daily_product_sales(product_id, sale_date);
CREATE INDEX idx_monthly_sales_year_month ON monthly_product_sales(year, month);
CREATE INDEX idx_monthly_sales_product_year ON monthly_product_sales(product_id, year);
CREATE INDEX idx_yoy_cache_year_month ON year_over_year_cache(current_year, current_month);
```

## 🔧 5. .NET Web API設計

### 5.1 プロジェクト構造
```
ShopifyAnalytics.API/
├── Controllers/
│   └── YearOverYearController.cs
├── Services/
│   ├── IShopifyService.cs
│   ├── ShopifyService.cs
│   ├── IAnalyticsService.cs
│   └── AnalyticsService.cs
├── Models/
│   ├── DTOs/
│   │   ├── YearOverYearRequestDto.cs
│   │   └── YearOverYearResponseDto.cs
│   └── Entities/
│       ├── Product.cs
│       ├── DailyProductSales.cs
│       └── MonthlyProductSales.cs
├── Data/
│   ├── AnalyticsDbContext.cs
│   └── Repositories/
│       ├── IProductRepository.cs
│       └── ProductRepository.cs
└── Background/
    └── DataAggregationService.cs
```

### 5.2 APIエンドポイント設計

```csharp
// Controllers/YearOverYearController.cs
[ApiController]
[Route("api/analytics/year-over-year")]
public class YearOverYearController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    [HttpGet("products")]
    public async Task<ActionResult<YearOverYearResponse>> GetYearOverYearProducts(
        [FromQuery] YearOverYearRequest request)
    {
        var result = await _analyticsService.GetYearOverYearAnalysisAsync(request);
        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult> RefreshData([FromBody] RefreshRequest request)
    {
        await _analyticsService.RefreshYearOverYearDataAsync(request);
        return Ok(new { message = "データ更新を開始しました" });
    }
}
```

### 5.3 DTOクラス設計

```csharp
// Models/DTOs/YearOverYearRequestDto.cs
public class YearOverYearRequest
{
    public int Year { get; set; } = DateTime.Now.Year;
    public int? StartMonth { get; set; } = 1;
    public int? EndMonth { get; set; } = 12;
    public List<string>? ProductTypes { get; set; }
    public string? SortBy { get; set; } = "growth_rate";
    public string? SortOrder { get; set; } = "desc";
    public int? Limit { get; set; } = 50;
    public int? Offset { get; set; } = 0;
    public string? SearchTerm { get; set; }
    public string? GrowthFilter { get; set; } = "all";
}

// Models/DTOs/YearOverYearResponseDto.cs
public class YearOverYearResponse
{
    public List<YearOverYearProductData> Products { get; set; } = new();
    public YearOverYearSummary Summary { get; set; } = new();
    public YearOverYearMetadata Metadata { get; set; } = new();
}

public class YearOverYearProductData
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductTitle { get; set; } = string.Empty;
    public string ProductType { get; set; } = string.Empty;
    public decimal CurrentYearSales { get; set; }
    public decimal PreviousYearSales { get; set; }
    public decimal GrowthRate { get; set; }
    public decimal GrowthAmount { get; set; }
    public List<MonthlyComparisonData> MonthlyData { get; set; } = new();
}

public class MonthlyComparisonData
{
    public int Month { get; set; }
    public decimal CurrentSales { get; set; }
    public decimal PreviousSales { get; set; }
    public decimal GrowthRate { get; set; }
    public int CurrentQuantity { get; set; }
    public int PreviousQuantity { get; set; }
}
```

## 🔄 6. バッチ処理設計

### 6.1 データ集計戦略

```csharp
// Background/DataAggregationService.cs
public class DataAggregationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DataAggregationService> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var shopifyService = scope.ServiceProvider.GetRequiredService<IShopifyService>();
                var analyticsService = scope.ServiceProvider.GetRequiredService<IAnalyticsService>();

                // 毎日午前2時に前日データを処理
                var now = DateTime.Now;
                var targetDate = now.Date.AddDays(-1);

                // 1. Shopifyから注文データを取得
                var orders = await shopifyService.GetOrdersAsync(targetDate, targetDate.AddDays(1));

                // 2. 商品別集計を実行
                await analyticsService.AggregateProductSalesAsync(orders, targetDate);

                // 3. 月次集計を更新
                if (targetDate.Day == DateTime.DaysInMonth(targetDate.Year, targetDate.Month))
                {
                    await analyticsService.UpdateMonthlyAggregationAsync(targetDate);
                }

                // 4. 前年同月比キャッシュを更新
                await analyticsService.UpdateYearOverYearCacheAsync(targetDate);

                _logger.LogInformation($"データ集計完了: {targetDate:yyyy-MM-dd}");

                // 24時間待機
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データ集計中にエラーが発生しました");
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }
    }
}
```

### 6.2 Shopify API連携

```csharp
// Services/ShopifyService.cs
public class ShopifyService : IShopifyService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public async Task<List<ShopifyOrder>> GetOrdersAsync(DateTime startDate, DateTime endDate)
    {
        var query = $@"
        {{
          orders(
            first: 250
            query: ""created_at:>={startDate:yyyy-MM-dd} AND created_at:<{endDate:yyyy-MM-dd}""
            sortKey: CREATED_AT
          ) {{
            edges {{
              node {{
                id
                createdAt
                totalPriceSet {{
                  shopMoney {{
                    amount
                    currencyCode
                  }}
                }}
                lineItems(first: 100) {{
                  edges {{
                    node {{
                      id
                      product {{
                        id
                        title
                        productType
                        vendor
                      }}
                      quantity
                      originalTotalSet {{
                        shopMoney {{
                          amount
                        }}
                      }}
                    }}
                  }}
                }}
              }}
            }}
            pageInfo {{
              hasNextPage
              endCursor
            }}
          }}
        }}";

        var response = await ExecuteGraphQLQuery(query);
        return ParseOrdersResponse(response);
    }

    private async Task<string> ExecuteGraphQLQuery(string query)
    {
        var shopifyUrl = _configuration["Shopify:AdminApiUrl"];
        var accessToken = _configuration["Shopify:AccessToken"];

        var request = new HttpRequestMessage(HttpMethod.Post, shopifyUrl)
        {
            Headers = { { "X-Shopify-Access-Token", accessToken } },
            Content = new StringContent(
                JsonSerializer.Serialize(new { query }),
                Encoding.UTF8,
                "application/json"
            )
        };

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        
        return await response.Content.ReadAsStringAsync();
    }
}
```

## 🚀 7. 実装計画

### 7.1 Phase 1: バックエンド基盤構築（1週間）
- [ ] .NET Web APIプロジェクト作成
- [ ] PostgreSQLデータベース設定
- [ ] Entity Framework Core設定
- [ ] 基本的なCRUD操作実装
- [ ] Shopify API連携基盤実装

### 7.2 Phase 2: データ集計機能実装（1週間）
- [ ] 日次データ集計バッチ処理
- [ ] 月次集計処理
- [ ] 前年同月比計算ロジック
- [ ] エラーハンドリング・リトライ機能
- [ ] ログ機能・監視設定

### 7.3 Phase 3: API実装とフロントエンド連携（1週間）
- [ ] YearOverYearControllerの実装
- [ ] AnalyticsServiceの実装
- [ ] フロントエンドのAPI連携修正
- [ ] エラーハンドリング改善
- [ ] パフォーマンス最適化

### 7.4 Phase 4: テストと最適化（1週間）
- [ ] 単体テスト作成
- [ ] 統合テスト実装
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] デプロイ準備

## 📋 8. 技術的考慮事項

### 8.1 パフォーマンス最適化
- **インデックス戦略**: 日付・商品IDでの複合インデックス
- **キャッシュ戦略**: 前年同月比データの事前計算
- **バッチ処理**: 大量データの効率的な集計
- **ページネーション**: 大量商品への対応

### 8.2 エラーハンドリング
- **Shopify APIレート制限**: 指数バックオフリトライ
- **データ不整合**: 自動修復機能
- **部分的失敗**: 継続可能な処理設計
- **監視・アラート**: 失敗時の自動通知

### 8.3 セキュリティ
- **API認証**: JWTトークンベース認証
- **データ暗号化**: 機密データの暗号化保存
- **入力値検証**: SQLインジェクション対策
- **監査ログ**: 全操作の追跡可能性

## 🎯 9. 受け入れ条件

### 9.1 機能要件
- [ ] 2年間の月別売上比較が正確に表示できる
- [ ] 成長率計算が正確である（小数点第1位まで）
- [ ] 商品検索・フィルタリングが正常に動作する
- [ ] CSV/Excel出力が正常に動作する
- [ ] 1000商品以上でも2秒以内にレスポンスを返す

### 9.2 非機能要件
- [ ] 99.9%以上の稼働率を維持する
- [ ] データ更新の遅延は24時間以内
- [ ] セキュリティ脆弱性がない
- [ ] 同時アクセス100ユーザーまで対応

### 9.3 運用要件
- [ ] バッチ処理の失敗を自動検知・通知
- [ ] データ整合性の定期チェック
- [ ] パフォーマンス監視ダッシュボード
- [ ] 障害時の自動復旧機能

## 📈 10. 成功指標（KPI）

### 10.1 技術KPI
- **API レスポンス時間**: 平均1.5秒以内
- **データ精度**: 99.9%以上
- **システム稼働率**: 99.9%以上
- **バッチ処理成功率**: 99.5%以上

### 10.2 ビジネスKPI
- **機能利用率**: 月次80%以上
- **ユーザー満足度**: 4.5/5.0以上
- **分析精度**: 予測と実績の差異10%以内
- **意思決定効率**: 分析時間50%短縮

## 💡 11. 結論と推奨事項

### 11.1 実装推奨理由
1. **技術的シンプルさ**: 他機能の基盤となるパターンを確立
2. **ビジネス価値**: 直接的な売上分析による高い利用価値
3. **拡張性**: 他の商品分析機能への応用可能
4. **リスク**: 最も実装リスクが低い

### 11.2 次のステップ
1. **即座に開始**: 前年同月比機能から実装開始
2. **基盤確立**: この機能で技術基盤を完成
3. **段階的拡張**: 成功パターンを他機能に適用
4. **継続的改善**: ユーザーフィードバックに基づく機能向上

この設計により、スケーラブルで高速な前年同月比分析機能を実装し、プロジェクト全体の成功基盤を構築できます。

## ⚠️ 3. Shopify アプリ分類と配布制約（重要更新）

### 3.1 現在のShopifyアプリ分類（2025年確認済み）

#### **正確なアプリタイプ分類**
| アプリタイプ | 作成場所 | 配布範囲 | 審査 | read_all_orders | 推奨度 |
|-------------|----------|----------|------|-----------------|--------|
| **Public Apps** | Partner Dashboard | 複数ストア（無制限） | 必要 | 申請・審査必要 | ⭐ |
| **Custom Apps** | Partner Dashboard | 単一ストア（Plus組織内は複数可） | 不要 | 自動付与 | ⭐⭐⭐ |
| **Admin Custom Apps** | Shopify Admin | 単一ストア | 不要 | 自動付与 | ⭐⭐ |

#### **重要な事実確認**
```typescript
// 重要：Private Appsは2022年1月に廃止済み
interface ShopifyAppTypeHistory {
  private_apps: {
    status: 'DEPRECATED';
    deprecated_date: '2022-01-01';
    migration_date: '2023-01-20';
    migrated_to: 'Custom Apps';
  };
  
  current_types: ['Public Apps', 'Custom Apps', 'Admin Custom Apps'];
  // 「Private App」と呼ばれているものは実際には「Custom Apps」
}
```

### 3.2 カスタムアプリ配布の技術的制約

#### **重大な制約事項**
```typescript
interface CustomAppLimitations {
  app_creation: {
    method: 'Manual only (Partner Dashboard)';
    automation_api: 'NOT AVAILABLE';
    per_customer_creation: 'Required manually';
  };
  
  installation_link: {
    generation: 'OAuth 2.0 dynamic generation possible';
    prerequisite: 'Existing app (API Key/Secret) required';
    format: 'https://{shop}.myshopify.com/admin/oauth/authorize?client_id={api_key}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}';
  };
  
  multi_customer_distribution: {
    single_custom_app: 'Single store only';
    multiple_customers: 'Requires separate Custom App per customer';
    plus_organization: 'Multiple stores within same Plus org allowed';
  };
}
```

#### **実装可能な自動化範囲**
```typescript
// 可能な自動化
interface PossibleAutomation {
  oauth_link_generation: 'Fully automatable';
  installation_process: 'Merchant interaction required';
  app_configuration: 'Automatable via API after installation';
}

// 不可能な自動化
interface ImpossibleAutomation {
  custom_app_creation: 'Manual Partner Dashboard operation required';
  bulk_app_distribution: 'No API for Custom App creation';
  silent_installation: 'Merchant consent required by Shopify policy';
}
```

### 3.3 複数顧客配布の実装戦略

#### **戦略A: マルチテナント Custom App（推奨）**
```csharp
// 同一コードベース・複数Custom App管理
public class MultiTenantCustomAppManager
{
    public class CustomAppConfig
    {
        public string CustomerId { get; set; }
        public string ShopDomain { get; set; }
        public string ApiKey { get; set; }        // 顧客別Custom App
        public string ApiSecret { get; set; }    // 顧客別Custom App
        public string AccessToken { get; set; }  // インストール後取得
    }
    
    // 顧客別設定管理
    public Dictionary<string, CustomAppConfig> CustomerConfigs { get; set; }
    
    // 動的インストールリンク生成
    public string GenerateInstallationLink(string customerId, string shopDomain)
    {
        var config = CustomerConfigs[customerId];
        var scopes = "read_orders,read_products,read_customers";
        var redirectUri = $"https://our-backend.com/oauth/callback/{customerId}";
        var nonce = GenerateSecureNonce();
        
        return $"https://{shopDomain}.myshopify.com/admin/oauth/authorize" +
               $"?client_id={config.ApiKey}" +
               $"&scope={scopes}" +
               $"&redirect_uri={redirectUri}" +
               $"&state={nonce}";
    }
}
```

#### **戦略B: Plus組織活用（大企業顧客向け）**
```typescript
interface PlusOrganizationStrategy {
  target_customers: 'Enterprise customers with Shopify Plus';
  distribution_scope: 'Multiple stores within same Plus organization';
  setup_process: 'Contact Shopify support for multi-store enablement';
  advantages: ['Single Custom App for multiple stores', 'Simplified management'];
  limitations: ['Plus customers only', 'Shopify approval required'];
}
```

### 3.4 インストールリンク自動生成実装

#### **OAuth 2.0フロー自動化**
```csharp
public class ShopifyOAuthService
{
    public async Task<string> HandleOAuthCallback(string customerId, string code, string shop)
    {
        var config = GetCustomerConfig(customerId);
        
        // Step 1: Exchange authorization code for access token
        var tokenRequest = new
        {
            client_id = config.ApiKey,
            client_secret = config.ApiSecret,
            code = code
        };
        
        var response = await HttpClient.PostAsync(
            $"https://{shop}.myshopify.com/admin/oauth/access_token",
            JsonContent.Create(tokenRequest)
        );
        
        var tokenResponse = await response.Content.ReadFromJsonAsync<TokenResponse>();
        
        // Step 2: Store access token for customer
        await StoreAccessToken(customerId, shop, tokenResponse.AccessToken);
        
        return tokenResponse.AccessToken;
    }
    
    public async Task<bool> ValidateInstallation(string customerId, string shop)
    {
        var config = GetCustomerConfig(customerId);
        // Shopify API call to verify app installation
        return await VerifyAppInstalled(config.AccessToken, shop);
    }
}
```

### 3.5 実装計画への影響

#### **修正された実装アプローチ**
```typescript
interface RevisedImplementationPlan {
  phase_0: {
    title: 'Customer Onboarding Setup';
    duration: '1 week';
    tasks: [
      'Partner Dashboard: Manual Custom App creation per customer',
      'OAuth configuration and callback endpoint setup',
      'Customer-specific configuration database design'
    ];
  };
  
  phase_1: {
    title: 'Automated Installation System';
    duration: '2 weeks';
    tasks: [
      'OAuth link generation API implementation',
      'Installation callback handling',
      'Customer configuration management system'
    ];
  };
  
  scaling_strategy: {
    initial: 'Manual Custom App creation (acceptable for early customers)';
    growth: 'Standardized process with customer self-service portal';
    enterprise: 'Plus organization multi-store approach';
  };
}
```

この制約を踏まえると、**真の自動化は技術的に不可能**ですが、OAuth部分の自動化により運用負荷は大幅に軽減できます。 