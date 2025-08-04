# Shopifyデータ処理アーキテクチャ設計

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: リアルタイム処理とバッチ処理の使い分け設計

---

## 🎯 基本方針

### 推奨アプローチ：ハイブリッド型
**バッチ処理（事前計算）をメインとし、一部のみリアルタイム処理**

理由：
1. Shopify API のレート制限対策（2リクエスト/秒）
2. 応答速度の向上（事前計算済みデータ）
3. 開発の簡素化（複雑な集計処理を非同期化）

---

## 📊 画面別データ処理設計

### 1. 前年同月比分析【商品】

#### バッチ処理（毎日深夜2時実行）
```sql
-- 事前計算テーブル
CREATE TABLE ProductMonthlyStats (
    ProductId NVARCHAR(100),
    Year INT,
    Month INT,
    Revenue DECIMAL(18,2),
    Quantity INT,
    OrderCount INT,
    AverageOrderValue DECIMAL(18,2),
    LastUpdated DATETIME,
    PRIMARY KEY (ProductId, Year, Month)
);

-- 前年比較用ビュー
CREATE VIEW ProductYearOverYear AS
SELECT 
    curr.ProductId,
    curr.Year as CurrentYear,
    curr.Month,
    curr.Revenue as CurrentRevenue,
    prev.Revenue as PreviousRevenue,
    CASE 
        WHEN prev.Revenue > 0 
        THEN ((curr.Revenue - prev.Revenue) / prev.Revenue * 100)
        ELSE NULL 
    END as GrowthRate
FROM ProductMonthlyStats curr
LEFT JOIN ProductMonthlyStats prev 
    ON curr.ProductId = prev.ProductId 
    AND curr.Month = prev.Month 
    AND prev.Year = curr.Year - 1;
```

#### リアルタイム処理
- なし（全て事前計算）

#### API設計
```csharp
// フロントエンド用API（高速）
[HttpGet("api/products/year-over-year")]
public async Task<IActionResult> GetYearOverYearAnalysis(
    [FromQuery] int year,
    [FromQuery] int? month = null)
{
    // DBから事前計算済みデータを取得（数ミリ秒）
    var results = await _context.ProductYearOverYear
        .Where(p => p.CurrentYear == year)
        .Where(p => month == null || p.Month == month)
        .OrderByDescending(p => p.GrowthRate)
        .Take(50)
        .ToListAsync();
    
    return Ok(results);
}
```

### 2. 休眠顧客分析【顧客】

#### バッチ処理（毎日深夜3時実行）
```sql
-- 顧客サマリーテーブル
CREATE TABLE CustomerSummary (
    CustomerId NVARCHAR(100) PRIMARY KEY,
    Name NVARCHAR(255),
    Email NVARCHAR(255),
    LastPurchaseDate DATETIME,
    DaysSinceLastPurchase INT,
    TotalOrders INT,
    TotalSpent DECIMAL(18,2),
    AverageOrderValue DECIMAL(18,2),
    DormancySegment NVARCHAR(50), -- '90-180日', '180-365日', '365日以上'
    RiskLevel NVARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    LastUpdated DATETIME
);

-- インデックス作成（高速検索用）
CREATE INDEX IX_CustomerSummary_Dormancy 
ON CustomerSummary(DormancySegment, DaysSinceLastPurchase);
```

#### リアルタイム処理
- 個別顧客の詳細情報取得時のみ

#### API設計
```csharp
// フロントエンド用API（高速）
[HttpGet("api/customers/dormant")]
public async Task<IActionResult> GetDormantCustomers(
    [FromQuery] string segment = null)
{
    var query = _context.CustomerSummary
        .Where(c => c.DaysSinceLastPurchase >= 90);
    
    if (!string.IsNullOrEmpty(segment))
    {
        query = query.Where(c => c.DormancySegment == segment);
    }
    
    var results = await query
        .OrderByDescending(c => c.TotalSpent)
        .Take(100)
        .ToListAsync();
    
    return Ok(results);
}

// 個別顧客の詳細（リアルタイム）
[HttpGet("api/customers/{customerId}/details")]
public async Task<IActionResult> GetCustomerDetails(string customerId)
{
    // キャッシュチェック
    var cached = await _cache.GetAsync($"customer:{customerId}");
    if (cached != null) return Ok(cached);
    
    // Shopify APIから最新データ取得
    var customer = await _shopifyService.GetCustomerWithOrders(customerId);
    
    // 5分間キャッシュ
    await _cache.SetAsync($"customer:{customerId}", customer, 
        TimeSpan.FromMinutes(5));
    
    return Ok(customer);
}
```

---

## 🔄 バッチ処理の実装

### 1. データ同期ジョブ
```csharp
public class ShopifyDataSyncJob : IHostedService
{
    private Timer _timer;
    private readonly IServiceProvider _serviceProvider;
    
    public Task StartAsync(CancellationToken cancellationToken)
    {
        // 毎日深夜2時に実行
        var now = DateTime.Now;
        var nextRun = now.Date.AddDays(1).AddHours(2);
        var delay = nextRun - now;
        
        _timer = new Timer(ExecuteSync, null, delay, 
            TimeSpan.FromHours(24));
        
        return Task.CompletedTask;
    }
    
    private async void ExecuteSync(object state)
    {
        using var scope = _serviceProvider.CreateScope();
        var syncService = scope.ServiceProvider
            .GetRequiredService<IShopifySyncService>();
        
        try
        {
            // 1. 商品売上データ同期
            await syncService.SyncProductSales();
            
            // 2. 顧客データ同期
            await syncService.SyncCustomerData();
            
            // 3. 集計処理実行
            await syncService.CalculateMonthlyStats();
            await syncService.UpdateDormancySegments();
        }
        catch (Exception ex)
        {
            // エラーログ記録
            _logger.LogError(ex, "Sync failed");
        }
    }
}
```

### 2. Shopifyデータ取得処理
```csharp
public async Task SyncProductSales()
{
    var startDate = DateTime.Now.AddMonths(-24); // 2年分
    var endDate = DateTime.Now;
    
    // Shopify GraphQL クエリ実行
    var query = @"
    {
        orders(first: 250, query: ""created_at:>='2023-07-01'"") {
            edges {
                node {
                    id
                    createdAt
                    lineItems(first: 100) {
                        edges {
                            node {
                                product { id, title }
                                quantity
                                originalTotalSet {
                                    shopMoney { amount }
                                }
                            }
                        }
                    }
                }
            }
            pageInfo { hasNextPage, endCursor }
        }
    }";
    
    // ページング処理
    string cursor = null;
    do
    {
        var result = await _shopifyClient.ExecuteQuery(query, cursor);
        await ProcessOrders(result.Orders);
        cursor = result.PageInfo.EndCursor;
    } 
    while (result.PageInfo.HasNextPage);
}
```

---

## 📈 パフォーマンス比較

| 処理方式 | 応答時間 | API負荷 | 実装複雑度 |
|---------|---------|---------|-----------|
| 完全リアルタイム | 3-5秒 | 高（毎回10-20コール） | 中 |
| 完全バッチ | 10-50ms | 低（深夜のみ） | 低 |
| **ハイブリッド（推奨）** | **50-100ms** | **低** | **中** |

---

## 🚀 段階的実装計画

### Phase 1: MVP（1週目）
1. 基本的なDBテーブル作成
2. 手動実行のデータ同期スクリプト
3. シンプルなAPI実装

### Phase 2: 自動化（2週目）
1. バッチジョブの実装
2. エラーハンドリング追加
3. 基本的なキャッシュ実装

### Phase 3: 最適化（リリース後）
1. インクリメンタル更新
2. 高度なキャッシング
3. リアルタイム更新通知

---

## 💡 80点実装のポイント

### やること
- ✅ 深夜バッチで全データ更新（シンプル）
- ✅ 事前計算結果をDBに保存
- ✅ フロントエンドは保存済みデータを表示
- ✅ 基本的なエラーハンドリング

### やらないこと
- ❌ リアルタイムデータ更新
- ❌ 複雑なキャッシュ戦略
- ❌ インクリメンタル更新
- ❌ Webhook連携

---

## 🔧 必要なNuGetパッケージ

```xml
<ItemGroup>
  <!-- Shopify API -->
  <PackageReference Include="ShopifySharp" Version="6.4.0" />
  
  <!-- バックグラウンドジョブ -->
  <PackageReference Include="Hangfire.AspNetCore" Version="1.8.5" />
  <PackageReference Include="Hangfire.SqlServer" Version="1.8.5" />
  
  <!-- キャッシュ -->
  <PackageReference Include="Microsoft.Extensions.Caching.Memory" Version="8.0.0" />
</ItemGroup>
``` 