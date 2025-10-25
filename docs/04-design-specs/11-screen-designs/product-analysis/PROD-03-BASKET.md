# PROD-03-BASKET - 組み合わせ商品【商品】詳細設計書

## ドキュメント情報
- **画面ID**: PROD-03-BASKET
- **画面名**: 組み合わせ商品【商品】(Market Basket Analysis)
- **作成日**: 2025-07-24
- **バージョン**: 1.0
- **ステータス**: Phase 1（初期リリース対象）

## 1. ビジネス概要

### 1.1 機能概要
商品の同時購入パターンを分析し、クロスセル機会の発見と商品レコメンデーション戦略の立案を支援する機能。

### 1.2 主要機能
- 商品の同時購入頻度分析
- 信頼度（Confidence）とリフト値（Lift）の計算
- 売上貢献度の可視化
- クロスセル商品のランキング表示

### 1.3 ビジネス価値
- クロスセル機会の発見による売上向上
- 商品陳列や在庫管理の最適化
- 効果的な商品レコメンデーション戦略の立案
- バンドル商品企画の支援

## 2. データベース設計

### 2.1 テーブル定義

```sql
-- マーケットバスケット分析結果テーブル
CREATE TABLE MarketBasketAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    ProductId NVARCHAR(100) NOT NULL,
    ProductName NVARCHAR(500) NOT NULL,
    ProductHandle NVARCHAR(500),
    Category NVARCHAR(255),
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    SoloCount INT NOT NULL DEFAULT 0,              -- 単体購入件数
    SoloAmount DECIMAL(18,2) NOT NULL DEFAULT 0,   -- 単体購入金額
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,  -- 売上総金額（取引全体）
    SalesRatio DECIMAL(5,2) NOT NULL DEFAULT 0,    -- 売上構成比（%）
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_MarketBasket_Shop_Period (ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd),
    INDEX IX_MarketBasket_Product (ShopDomain, ProductId),
    INDEX IX_MarketBasket_TotalAmount (TotalAmount DESC)
);

-- 商品組み合わせテーブル
CREATE TABLE ProductCombinations (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    BaseProductId NVARCHAR(100) NOT NULL,
    CombinedProductId NVARCHAR(100) NOT NULL,
    CombinedProductName NVARCHAR(500) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    CoOccurrenceCount INT NOT NULL DEFAULT 0,      -- 同時購入回数
    Support DECIMAL(10,6) NOT NULL DEFAULT 0,       -- 支持度
    Confidence DECIMAL(10,6) NOT NULL DEFAULT 0,    -- 信頼度
    Lift DECIMAL(10,4) NOT NULL DEFAULT 0,          -- リフト値
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_Combinations_Base (ShopDomain, BaseProductId, AnalysisPeriodStart),
    INDEX IX_Combinations_Combined (ShopDomain, CombinedProductId),
    INDEX IX_Combinations_Metrics (Confidence DESC, Lift DESC)
);

-- 分析パラメータ履歴テーブル
CREATE TABLE MarketBasketAnalysisHistory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    MinSupport DECIMAL(5,4) NOT NULL,              -- 最小支持度
    MinConfidence DECIMAL(5,4) NOT NULL,           -- 最小信頼度
    TotalTransactions INT NOT NULL,
    UniqueProducts INT NOT NULL,
    ExecutedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    ExecutionTimeMs INT,
    Status NVARCHAR(50) NOT NULL,                  -- 'Completed', 'Failed', 'Processing'
    ErrorMessage NVARCHAR(MAX),
    INDEX IX_History_Shop_Date (ShopDomain, ExecutedAt DESC)
);
```

### 2.2 インデックス戦略
- 高頻度アクセスパターンに基づくインデックス設計
- 期間指定検索の最適化
- 商品ID検索の高速化
- メトリクス（信頼度、リフト値）によるソートの最適化

## 3. API設計

### 3.1 コントローラー定義

```csharp
[ApiController]
[Route("api/analysis/market-basket")]
public class MarketBasketAnalysisController : ControllerBase
{
    private readonly IMarketBasketAnalysisService _analysisService;
    private readonly ILogger<MarketBasketAnalysisController> _logger;

    [HttpGet]
    public async Task<IActionResult> GetMarketBasketAnalysis(
        [FromQuery] MarketBasketAnalysisRequest request)
    {
        // 実装詳細は後述
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateMarketBasketAnalysis(
        [FromBody] CalculateMarketBasketRequest request)
    {
        // 実装詳細は後述
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportMarketBasketAnalysis(
        [FromQuery] MarketBasketAnalysisRequest request)
    {
        // CSV/Excel エクスポート
    }
}
```

### 3.2 リクエスト/レスポンスDTO

```csharp
// リクエストDTO
public class MarketBasketAnalysisRequest
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal MinSupport { get; set; } = 0.01m;      // デフォルト1%
    public decimal MinConfidence { get; set; } = 0.1m;    // デフォルト10%
    public string SortBy { get; set; } = "totalAmount";   // totalAmount|salesRatio|soloCount|combinations
    public string SortDirection { get; set; } = "desc";
    public int? TopN { get; set; } = 50;                  // 上位N件表示
}

// レスポンスDTO
public class MarketBasketAnalysisResponse
{
    public List<MarketBasketItem> Items { get; set; }
    public AnalysisSummary Summary { get; set; }
    public DateTime AnalysisDate { get; set; }
}

public class MarketBasketItem
{
    public string ProductId { get; set; }
    public string ProductName { get; set; }
    public string ProductHandle { get; set; }
    public string Category { get; set; }
    public int SoloCount { get; set; }                    // 単体購入件数
    public decimal SoloAmount { get; set; }               // 単体購入金額
    public decimal TotalAmount { get; set; }              // 売上総金額
    public decimal SalesRatio { get; set; }               // 売上構成比（%）
    public List<ProductCombination> Combinations { get; set; }
}

public class ProductCombination
{
    public int Rank { get; set; }
    public string ProductId { get; set; }
    public string ProductName { get; set; }
    public int CoOccurrenceCount { get; set; }           // 同時購入回数
    public decimal Confidence { get; set; }               // 信頼度（%）
    public decimal Lift { get; set; }                     // リフト値
}

public class AnalysisSummary
{
    public int TotalTransactions { get; set; }
    public int UniqueProducts { get; set; }
    public int SignificantCombinations { get; set; }     // 有意な組み合わせ数
    public decimal AverageBasketSize { get; set; }
    public decimal AverageBasketValue { get; set; }
}
```

### 3.3 サービス層インターフェース

```csharp
public interface IMarketBasketAnalysisService
{
    Task<MarketBasketAnalysisResponse> AnalyzeMarketBasketAsync(
        string shopDomain,
        MarketBasketAnalysisRequest request);

    Task<Guid> StartAnalysisCalculationAsync(
        string shopDomain,
        CalculateMarketBasketRequest request);

    Task<AnalysisStatus> GetAnalysisStatusAsync(
        string shopDomain,
        Guid analysisId);

    Task<byte[]> ExportAnalysisResultsAsync(
        string shopDomain,
        MarketBasketAnalysisRequest request,
        ExportFormat format);
}
```

## 4. ビジネスロジック実装

### 4.1 マーケットバスケット分析アルゴリズム

```csharp
public class MarketBasketAnalysisService : IMarketBasketAnalysisService
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<MarketBasketAnalysisService> _logger;

    public async Task<MarketBasketAnalysisResponse> AnalyzeMarketBasketAsync(
        string shopDomain,
        MarketBasketAnalysisRequest request)
    {
        // 1. キャッシュチェック
        var cachedResult = await GetCachedAnalysisAsync(shopDomain, request);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        // 2. トランザクションデータの取得
        var transactions = await GetTransactionsAsync(shopDomain, request.StartDate, request.EndDate);

        // 3. 商品ごとの売上集計
        var productStats = CalculateProductStatistics(transactions);

        // 4. アソシエーションルールの計算
        var associations = CalculateAssociationRules(
            transactions,
            request.MinSupport,
            request.MinConfidence);

        // 5. 結果の整形とソート
        var result = FormatAnalysisResults(
            productStats,
            associations,
            request.SortBy,
            request.TopN);

        // 6. キャッシュに保存
        await CacheAnalysisResultAsync(shopDomain, request, result);

        return result;
    }

    private List<AssociationRule> CalculateAssociationRules(
        List<Transaction> transactions,
        decimal minSupport,
        decimal minConfidence)
    {
        var totalTransactions = transactions.Count;
        var itemSets = new Dictionary<string, int>();
        var pairSets = new Dictionary<(string, string), int>();

        // アイテムセットの頻度計算
        foreach (var transaction in transactions)
        {
            var products = transaction.Items.Select(i => i.ProductId).Distinct().ToList();
            
            // 単一アイテムの頻度
            foreach (var product in products)
            {
                itemSets.TryGetValue(product, out var count);
                itemSets[product] = count + 1;
            }

            // ペアの頻度
            for (int i = 0; i < products.Count; i++)
            {
                for (int j = i + 1; j < products.Count; j++)
                {
                    var pair = (products[i], products[j]);
                    pairSets.TryGetValue(pair, out var count);
                    pairSets[pair] = count + 1;
                }
            }
        }

        // アソシエーションルールの生成
        var rules = new List<AssociationRule>();
        foreach (var pair in pairSets)
        {
            var support = (decimal)pair.Value / totalTransactions;
            if (support < minSupport) continue;

            // A → B のルール
            var confidenceAtoB = (decimal)pair.Value / itemSets[pair.Key.Item1];
            if (confidenceAtoB >= minConfidence)
            {
                var liftAtoB = confidenceAtoB / ((decimal)itemSets[pair.Key.Item2] / totalTransactions);
                rules.Add(new AssociationRule
                {
                    Antecedent = pair.Key.Item1,
                    Consequent = pair.Key.Item2,
                    Support = support,
                    Confidence = confidenceAtoB,
                    Lift = liftAtoB,
                    Count = pair.Value
                });
            }

            // B → A のルール
            var confidenceBtoA = (decimal)pair.Value / itemSets[pair.Key.Item2];
            if (confidenceBtoA >= minConfidence)
            {
                var liftBtoA = confidenceBtoA / ((decimal)itemSets[pair.Key.Item1] / totalTransactions);
                rules.Add(new AssociationRule
                {
                    Antecedent = pair.Key.Item2,
                    Consequent = pair.Key.Item1,
                    Support = support,
                    Confidence = confidenceBtoA,
                    Lift = liftBtoA,
                    Count = pair.Value
                });
            }
        }

        return rules.OrderByDescending(r => r.Lift).ToList();
    }
}
```

### 4.2 パフォーマンス最適化

```csharp
public class OptimizedMarketBasketAnalysis
{
    // メモリ効率を考慮したストリーミング処理
    public async IAsyncEnumerable<MarketBasketItem> AnalyzeStreamingAsync(
        string shopDomain,
        MarketBasketAnalysisRequest request)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        // バッチ処理でデータを取得
        const int batchSize = 1000;
        var offset = 0;

        while (true)
        {
            var batch = await GetTransactionBatchAsync(
                connection, shopDomain, request, offset, batchSize);
            
            if (!batch.Any()) break;

            // バッチごとに分析を実行
            var batchResults = ProcessBatch(batch, request);
            
            foreach (var result in batchResults)
            {
                yield return result;
            }

            offset += batchSize;
        }
    }
}
```

## 5. Shopify連携

### 5.1 データ同期戦略

```csharp
public class ShopifyMarketBasketSync
{
    private readonly IShopifyService _shopifyService;
    private readonly ShopifyDbContext _context;

    public async Task SyncOrderDataForAnalysisAsync(
        string shopDomain,
        DateTime startDate,
        DateTime endDate)
    {
        // Shopify APIから注文データを取得
        var orders = await _shopifyService.GetOrdersAsync(
            shopDomain,
            startDate,
            endDate,
            includeLineItems: true);

        // トランザクションデータに変換して保存
        var transactions = ConvertToTransactions(orders);
        await SaveTransactionsAsync(transactions);

        // 分析の事前計算を実行（オプション）
        await PreCalculateFrequentItemsetsAsync(shopDomain, startDate, endDate);
    }
}
```

## 6. エラーハンドリング

### 6.1 エラー種別と対処

```csharp
public enum MarketBasketAnalysisError
{
    InsufficientData,        // データ不足
    InvalidDateRange,        // 無効な期間指定
    CalculationTimeout,      // 計算タイムアウト
    MemoryLimitExceeded     // メモリ制限超過
}

public class MarketBasketAnalysisException : Exception
{
    public MarketBasketAnalysisError ErrorType { get; set; }
    public Dictionary<string, object> ErrorContext { get; set; }
}
```

## 7. パフォーマンス考慮事項

### 7.1 キャッシュ戦略
- Redis/MemoryCacheを使用した分析結果のキャッシュ
- キャッシュキー: `market-basket:{shopDomain}:{startDate}:{endDate}:{minSupport}:{minConfidence}`
- 有効期限: 24時間（日次更新を想定）

### 7.2 クエリ最適化
- 期間指定によるパーティショニング
- 頻出アイテムセットの事前計算
- インデックスの適切な配置

### 7.3 スケーラビリティ
- 大規模データセットに対する分散処理
- 非同期バックグラウンド処理
- 結果のページング対応

## 8. セキュリティ考慮事項

- ショップドメインによるデータ分離
- APIレート制限
- 結果データのサニタイゼーション

## 9. 今後の拡張予定

### Phase 2での機能追加
- 3つ以上の商品組み合わせ分析
- 時系列でのトレンド分析
- カテゴリレベルでの分析
- AI/MLを活用した予測的レコメンデーション

### Phase 3での機能追加
- リアルタイム分析
- パーソナライズされた商品推薦
- A/Bテスト機能の統合

## ⚠️ 10. 設計上の注意事項・制約

### 10.1 実装難易度の警告 🔥 **最高難易度**

#### **計算複雑度の問題**
- **アソシエーションルール計算**: O(n²)の計算量で、1000商品以上では性能劣化必至
- **メモリ消費**: 全商品組み合わせの一時保存で大量メモリ使用
- **リアルタイム処理の限界**: 2秒以内のレスポンス目標達成困難

```csharp
// 警告: 計算量の爆発的増加
// 1000商品 × 1000商品 = 100万組み合わせの処理
// メモリ使用量: 推定2-4GB（大規模データセット時）
```

#### **推奨される実装アプローチ**
1. **Phase 1**: 上位100商品に限定した実装
2. **Phase 2**: バッチ処理による事前計算
3. **Phase 3**: 機械学習アルゴリズムの導入

### 10.2 データ制約

#### **現在のデータ構造の制約**
- **商品マスタ不在**: OrderItemのスナップショットデータのみ
- **商品名の表記ゆれ**: 同一商品の異なる表記による分析精度低下
- **カテゴリ階層なし**: フラットなProductTypeのみで詳細分析困難

### 10.3 他機能との重複

#### **類似機能との整理が必要**
- **PROD-02-FREQ**: 商品購入頻度分析との計算ロジック重複
- **PURCH-02-COUNT**: 購入回数分析との基礎データ共通

#### **共通化推奨事項**
```csharp
// 共通サービスの実装を推奨
public interface IProductAnalysisCommonService
{
    Task<List<ProductPurchaseData>> GetProductPurchaseDataAsync(DateRange period);
    Task<Dictionary<string, List<string>>> GetFrequentItemsetsAsync(decimal minSupport);
}
```

### 10.4 パフォーマンス制約

#### **スケーラビリティの限界**
- **推奨最大商品数**: 500商品以下
- **推奨データ期間**: 12ヶ月以下
- **同時ユーザー数**: 10名以下（リアルタイム計算時）

#### **必須の最適化対策**
1. **インデックス最適化**: 商品・期間・顧客の複合インデックス
2. **結果キャッシュ**: 24時間キャッシュによる計算回避
3. **バッチ処理**: 夜間バッチでの事前計算

### 10.5 実装優先度の修正推奨

#### **元の計画**: Phase 1（初期リリース対象）
#### **修正推奨**: Phase 2（パフォーマンス最適化後）

**理由**: 計算複雑度とメモリ使用量を考慮すると、他の簡易機能（PROD-01-YOY）の安定稼働後の実装が適切