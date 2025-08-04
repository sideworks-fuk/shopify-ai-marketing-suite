# 休眠顧客分析パフォーマンス最適化 - 包括的改善計画

## 📋 概要

休眠顧客分析機能のパフォーマンス問題を解決するための包括的な改善計画です。短期的なQuick Winsから長期的な抜本的改善まで、段階的なアプローチを提案します。

**最終更新日**: 2025年7月27日  
**作成者**: AIアシスタントケンジ  
**対象**: Azure SQL Database Basic tier → Standard tier への移行も含めた最適化

---

## 🚨 現状の課題分析

### パフォーマンス問題
| 問題項目 | 現状 | 影響度 | 根本原因 |
|---------|------|--------|----------|
| **初期表示時間** | 15秒以上 | 🔴 致命的 | N+1クエリ、全件フェッチ |
| **タイムアウト頻発** | 28,062件処理で頻発 | 🔴 致命的 | Azure SQL Basic tier (5 DTU) |
| **メモリ使用量** | 500MB超 | 🟡 高 | 全顧客データのメモリ読み込み |
| **ユーザー体験** | 操作不能状態 | 🔴 致命的 | 応答性の欠如 |

### 技術的ボトルネック
1. **N+1クエリ問題**: 各顧客の最終注文日を個別クエリで取得
2. **全件フェッチ**: ページネーション適用前に全データ取得
3. **重複クエリ**: サマリー統計とセグメント分布で同じクエリを3回実行
4. **インメモリ処理**: すべての集計処理をアプリケーション側で実行
5. **インデックス不足**: 日付ベースクエリに適切なインデックスなし

---

## 🎯 改善方針

### Phase 1: Quick Wins（1週間以内）
即効性のある改善でユーザー体験を劇的改善

### Phase 2: 中期対策（1-2ヶ月）
構造的な改善で持続可能なパフォーマンス確保

### Phase 3: 長期対策（3-6ヶ月）
次世代アーキテクチャでスケーラブルなシステム構築

---

## ⚡ Phase 1: Quick Wins（即効改善）

### 1.1 データベースインデックス最適化
**実装時間**: 30分 | **効果**: クエリ実行時間50-70%削減

```sql
-- 1. 最終注文日の高速検索用インデックス
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice);

-- 2. 休眠顧客の効率的なフィルタリング用
CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt 
ON Orders(CreatedAt);

-- 3. 顧客の店舗別検索最適化
CREATE NONCLUSTERED INDEX IX_Customers_StoreId_TotalSpent 
ON Customers(StoreId, TotalSpent DESC);

-- 4. 複合インデックスでクエリカバー率向上
CREATE NONCLUSTERED INDEX IX_Customers_StoreId_Email_TotalSpent
ON Customers(StoreId, Email)
INCLUDE (TotalSpent, TotalOrders, FirstName, LastName, CreatedAt);
```

### 1.2 APIレスポンス最適化
**実装時間**: 10分 | **効果**: 初期ロード時間60%削減

```csharp
// DormantCustomerService.cs の修正
public async Task<ApiResponse<DormantCustomerAnalysisDto>> GetDormantCustomersAsync(
    DormantCustomerRequest request)
{
    // デフォルトページサイズを大幅削減
    request.PageSize = Math.Min(request.PageSize ?? 20, 50);  // 1000→20
    
    // 初期表示は最初の20件のみ
    // ユーザーが「もっと見る」をクリックしたら追加読み込み
    var query = BuildOptimizedQuery(request);
    
    // 非効率なIncludeを削除
    var customers = await query
        .Skip((request.PageNumber - 1) * request.PageSize.Value)
        .Take(request.PageSize.Value)
        .Select(c => new DormantCustomerDto  // 必要項目のみ射影
        {
            Id = c.Id,
            Name = c.Name,
            Email = c.Email,
            TotalSpent = c.TotalSpent,
            TotalOrders = c.TotalOrders,
            // 最終注文日はサブクエリで効率的取得
            LastOrderDate = _context.Orders
                .Where(o => o.CustomerId == c.Id)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => o.CreatedAt)
                .FirstOrDefault()
        })
        .ToListAsync();
}
```

### 1.3 フロントエンド遅延読み込み
**実装時間**: 2時間 | **効果**: 体感速度大幅改善

```typescript
// DormantCustomerAnalysis.tsx の最適化
export function DormantCustomerAnalysis() {
  const [summaryData, setSummaryData] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  
  // Step 1: サマリーデータのみ先に取得（軽量・高速）
  useEffect(() => {
    api.dormantSummary(1).then(response => {
      setSummaryData(response.data);
    });
  }, []);
  
  // Step 2: 顧客リストは必要時のみ取得
  const loadCustomerList = useCallback(async (segment?: string) => {
    setIsLoadingList(true);
    try {
      const response = await api.dormantCustomers({
        storeId: 1,
        segment,
        pageSize: 20, // 初期は20件のみ
      });
      setCustomerList(response.data.customers);
    } finally {
      setIsLoadingList(false);
    }
  }, []);
  
  return (
    <>
      {/* サマリーカードは即座に表示 */}
      {summaryData && <DormantKPICards summary={summaryData} />}
      
      {/* セグメントフィルター */}
      <DormantPeriodFilter 
        onSegmentSelect={loadCustomerList}
        summary={summaryData}
      />
      
      {/* 顧客リストは選択後に表示 */}
      {isLoadingList ? (
        <LoadingSpinner />
      ) : (
        <VirtualizedCustomerList customers={customerList} />  // 仮想化リスト
      )}
    </>
  );
}
```

### 1.4 並列処理の導入
**実装時間**: 1時間 | **効果**: 処理時間40%削減

```csharp
public async Task<DormantCustomerSummaryDto> GetSummaryAsync(int storeId)
{
    // 複数の集計を並列実行で高速化
    var tasks = new[]
    {
        GetTotalDormantCountAsync(storeId),           // 総件数
        GetSegmentDistributionAsync(storeId),         // セグメント分布
        GetRevenueBySegmentAsync(storeId),           // セグメント別売上
        GetTopDormantCustomersAsync(storeId),        // 上位顧客
        GetChurnRiskAnalysisAsync(storeId)           // チャーンリスク分析
    };
    
    await Task.WhenAll(tasks);
    
    return new DormantCustomerSummaryDto
    {
        TotalCount = tasks[0].Result,
        SegmentDistribution = tasks[1].Result,
        RevenueBySegment = tasks[2].Result,
        TopCustomers = tasks[3].Result,
        ChurnRiskAnalysis = tasks[4].Result
    };
}
```

### 1.5 キャッシュ戦略改善
**実装時間**: 30分 | **効果**: 2回目以降アクセス90%高速化

```csharp
// キャッシュ時間を戦略的に延長
private readonly Dictionary<string, TimeSpan> _cacheStrategies = new()
{
    ["summary"] = TimeSpan.FromMinutes(30),      // サマリー: 30分
    ["segments"] = TimeSpan.FromMinutes(60),     // セグメント: 1時間
    ["customers"] = TimeSpan.FromMinutes(15),    // 顧客リスト: 15分
};

public async Task<T> GetWithCacheAsync<T>(string cacheKey, string category, Func<Task<T>> factory)
{
    var fullKey = $"dormant_v2_{category}_{cacheKey}";
    
    if (_cache.TryGetValue(fullKey, out T cachedResult))
    {
        return cachedResult;
    }
    
    var result = await factory();
    var expiration = _cacheStrategies.GetValueOrDefault(category, TimeSpan.FromMinutes(15));
    
    _cache.Set(fullKey, result, expiration);
    return result;
}
```

### 📊 Quick Wins期待成果
| 指標 | 現在 | 改善後 | 改善率 |
|------|------|--------|--------|
| **初期表示時間** | 15秒 | 3-4秒 | 📈 73-80% |
| **API応答時間** | 10秒 | 2秒 | 📈 80% |
| **メモリ使用量** | 500MB | 200MB | 📈 60% |
| **ユーザー体感速度** | 遅い | 快適 | 📈 劇的改善 |

---

## 🏗️ Phase 2: 構造的改善（中期対策）

### 2.1 集計テーブル設計・導入
**実装時間**: 1-2週間 | **効果**: 根本的なパフォーマンス改善

```sql
-- 休眠顧客サマリーテーブル
CREATE TABLE DormantCustomerSummary (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    CustomerId INT NOT NULL,
    LastPurchaseDate DATETIME2,
    DaysSinceLastPurchase INT,
    DormancySegment NVARCHAR(50),               -- '90-180日', '180-365日', '365日以上'
    RiskLevel NVARCHAR(20),                     -- 'low', 'medium', 'high', 'critical'
    ChurnProbability DECIMAL(5,2),              -- 0.00-1.00
    TotalSpent DECIMAL(19,4),
    TotalOrders INT,
    AverageOrderValue DECIMAL(19,4),
    LastUpdated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- 高性能インデックス
    INDEX IX_DormantCustomerSummary_StoreId_Segment 
        (StoreId, DormancySegment) INCLUDE (CustomerId, RiskLevel, TotalSpent),
    INDEX IX_DormantCustomerSummary_StoreId_LastPurchase 
        (StoreId, DaysSinceLastPurchase) INCLUDE (CustomerId, TotalSpent),
    INDEX IX_DormantCustomerSummary_CustomerId UNIQUE (CustomerId)
);

-- セグメント別統計テーブル
CREATE TABLE DormantSegmentStatistics (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    SegmentName NVARCHAR(50) NOT NULL,
    CustomerCount INT NOT NULL,
    TotalRevenue DECIMAL(19,4) NOT NULL,
    AverageRevenue DECIMAL(19,4) NOT NULL,
    MedianRevenue DECIMAL(19,4) NOT NULL,
    ChurnRiskDistribution NVARCHAR(MAX) NOT NULL,  -- JSON format
    LastUpdated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    INDEX IX_DormantSegmentStats_StoreId_Segment 
        UNIQUE (StoreId, SegmentName)
);
```

### 2.2 バックグラウンドジョブによる事前集計
**実装時間**: 1週間 | **効果**: リアルタイム性とパフォーマンスの両立

```csharp
// Azure Functions での定期更新
[FunctionName("UpdateDormantCustomerSummary")]
public static async Task Run(
    [TimerTrigger("0 0 2 * * *")] TimerInfo timer,  // 毎日深夜2時
    ILogger log)
{
    log.LogInformation("休眠顧客サマリー更新開始: {Time}", DateTime.UtcNow);
    
    try
    {
        // ステップ1: バッチ処理で効率的にサマリー更新
        await UpdateDormantCustomerSummaryBatch();
        
        // ステップ2: セグメント統計の更新
        await UpdateSegmentStatistics();
        
        // ステップ3: チャーンリスク予測の更新（AI/ML）
        await UpdateChurnPredictions();
        
        log.LogInformation("休眠顧客サマリー更新完了: {Time}", DateTime.UtcNow);
    }
    catch (Exception ex)
    {
        log.LogError(ex, "休眠顧客サマリー更新でエラーが発生");
        throw;
    }
}
```

### 2.3 高性能バッチ更新ストアドプロシージャ
```sql
CREATE PROCEDURE UpdateDormantCustomerSummaryBatch
    @StoreId INT,
    @BatchSize INT = 1000
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 高性能CTEで最終購入情報を事前計算
    WITH LastOrderCTE AS (
        SELECT 
            c.Id AS CustomerId,
            c.StoreId,
            c.Name,
            c.Email,
            c.TotalSpent,
            c.TotalOrders,
            MAX(o.CreatedAt) AS LastPurchaseDate,
            DATEDIFF(DAY, MAX(o.CreatedAt), GETUTCDATE()) AS DaysSinceLastPurchase,
            COUNT(DISTINCT o.Id) AS OrderCount,
            AVG(CAST(o.TotalPrice AS FLOAT)) AS AvgOrderValue
        FROM Customers c
        LEFT JOIN Orders o ON c.Id = o.CustomerId
        WHERE c.StoreId = @StoreId
        GROUP BY c.Id, c.StoreId, c.Name, c.Email, c.TotalSpent, c.TotalOrders
    ),
    DormantCustomersCTE AS (
        SELECT 
            *,
            -- セグメント分類
            CASE 
                WHEN DaysSinceLastPurchase BETWEEN 90 AND 180 THEN '90-180日'
                WHEN DaysSinceLastPurchase BETWEEN 181 AND 365 THEN '180-365日'
                WHEN DaysSinceLastPurchase > 365 THEN '365日以上'
                WHEN LastPurchaseDate IS NULL THEN '未購入'
                ELSE '90日未満'
            END AS DormancySegment,
            -- リスクレベル計算
            CASE 
                WHEN TotalSpent > 100000 AND DaysSinceLastPurchase > 365 THEN 'critical'
                WHEN TotalSpent > 50000 AND DaysSinceLastPurchase > 365 THEN 'high'
                WHEN DaysSinceLastPurchase > 365 THEN 'high'
                WHEN DaysSinceLastPurchase > 180 THEN 'medium'
                ELSE 'low'
            END AS RiskLevel,
            -- チャーン確率（簡易計算、将来的にはML予測に置換）
            CASE 
                WHEN DaysSinceLastPurchase > 730 THEN 0.90
                WHEN DaysSinceLastPurchase > 365 THEN 0.75
                WHEN DaysSinceLastPurchase > 180 THEN 0.50
                WHEN DaysSinceLastPurchase > 90 THEN 0.25
                ELSE 0.10
            END AS ChurnProbability
        FROM LastOrderCTE
        WHERE DaysSinceLastPurchase >= 90 OR LastPurchaseDate IS NULL
    )
    -- MERGE文で高効率なUpsert処理
    MERGE DormantCustomerSummary AS target
    USING DormantCustomersCTE AS source ON target.CustomerId = source.CustomerId
    WHEN MATCHED THEN
        UPDATE SET 
            LastPurchaseDate = source.LastPurchaseDate,
            DaysSinceLastPurchase = source.DaysSinceLastPurchase,
            DormancySegment = source.DormancySegment,
            RiskLevel = source.RiskLevel,
            ChurnProbability = source.ChurnProbability,
            TotalSpent = source.TotalSpent,
            TotalOrders = source.TotalOrders,
            AverageOrderValue = source.AvgOrderValue,
            LastUpdated = GETUTCDATE()
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (StoreId, CustomerId, LastPurchaseDate, DaysSinceLastPurchase, 
                DormancySegment, RiskLevel, ChurnProbability, TotalSpent, 
                TotalOrders, AverageOrderValue)
        VALUES (source.StoreId, source.CustomerId, source.LastPurchaseDate, 
                source.DaysSinceLastPurchase, source.DormancySegment, source.RiskLevel,
                source.ChurnProbability, source.TotalSpent, source.TotalOrders, 
                source.AvgOrderValue);
                
    -- パフォーマンス統計出力
    SELECT 
        @@ROWCOUNT AS ProcessedRows,
        GETUTCDATE() AS CompletedAt;
END
```

### 2.4 新API設計（事前集計テーブル活用）
```csharp
public class OptimizedDormantCustomerService : IDormantCustomerService
{
    public async Task<DormantCustomerResponse> GetDormantCustomersOptimized(
        DormantCustomerRequest request)
    {
        // Step 1: キャッシュチェック
        var cacheKey = $"dormant_v2_{request.StoreId}_{request.Segment}_{request.PageNumber}";
        if (_cache.TryGetValue(cacheKey, out DormantCustomerResponse cachedResult))
        {
            return cachedResult;
        }
        
        // Step 2: 事前集計テーブルから高速取得
        var query = _context.DormantCustomerSummary
            .Where(d => d.StoreId == request.StoreId);
        
        // Step 3: セグメントフィルタ適用
        if (!string.IsNullOrEmpty(request.Segment))
        {
            query = query.Where(d => d.DormancySegment == request.Segment);
        }
        
        // Step 4: ソート・ページング（インデックス活用）
        var pagedData = await query
            .OrderByDescending(d => d.DaysSinceLastPurchase)
            .ThenByDescending(d => d.TotalSpent)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(d => d.Customer)  // 必要な顧客情報のみJOIN
            .ToListAsync();
        
        // Step 5: レスポンス構築
        var response = new DormantCustomerResponse
        {
            Customers = pagedData.Select(MapToDto).ToList(),
            TotalCount = await GetTotalCountAsync(request.StoreId, request.Segment),
            PageInfo = BuildPageInfo(request, pagedData.Count)
        };
        
        // Step 6: キャッシュ保存
        _cache.Set(cacheKey, response, TimeSpan.FromMinutes(15));
        
        return response;
    }
    
    // 総件数も集計テーブルから高速取得
    private async Task<int> GetTotalCountAsync(int storeId, string? segment)
    {
        var query = _context.DormantCustomerSummary
            .Where(d => d.StoreId == storeId);
            
        if (!string.IsNullOrEmpty(segment))
        {
            query = query.Where(d => d.DormancySegment == segment);
        }
        
        return await query.CountAsync();
    }
}
```

---

## 🚀 Phase 3: 次世代アーキテクチャ（長期対策）

### 3.1 Azure Cosmos DB + Redis キャッシュレイヤー
**実装時間**: 1-2ヶ月 | **効果**: 大規模データ対応・グローバルスケール

```csharp
// ハイブリッドデータアクセス層
public class HybridDormantCustomerService
{
    private readonly ShopifyDbContext _sqlContext;           // SQL Server (トランザクション)
    private readonly CosmosClient _cosmosClient;             // Cosmos DB (分析・集計)
    private readonly IDistributedCache _redisCache;          // Redis (高速キャッシュ)
    
    public async Task<DormantCustomerResponse> GetDormantCustomersAsync(
        DormantCustomerRequest request)
    {
        // Layer 1: Redis キャッシュ
        var cacheKey = GenerateCacheKey(request);
        var cached = await _redisCache.GetStringAsync(cacheKey);
        if (cached != null)
        {
            return JsonSerializer.Deserialize<DormantCustomerResponse>(cached);
        }
        
        // Layer 2: Cosmos DB 集計データ
        var cosmosResult = await QueryCosmosAggregatedData(request);
        if (cosmosResult != null)
        {
            await CacheResult(cacheKey, cosmosResult, TimeSpan.FromMinutes(30));
            return cosmosResult;
        }
        
        // Layer 3: SQL Server フォールバック
        var sqlResult = await QuerySqlServerData(request);
        await CacheResult(cacheKey, sqlResult, TimeSpan.FromMinutes(5));
        return sqlResult;
    }
}
```

### 3.2 機械学習予測モデル統合
```python
# Azure Machine Learning でチャーン予測
import azureml.core
from azureml.core import Workspace, Experiment
from sklearn.ensemble import RandomForestClassifier

class ChurnPredictionModel:
    def predict_churn_probability(self, customer_features):
        """
        顧客特徴量からチャーン確率を予測
        - 最終購入日からの経過日数
        - 総購入金額
        - 購入頻度
        - 季節性パターン
        - 商品カテゴリの偏好
        """
        # MLモデルでの予測
        probability = self.model.predict_proba(customer_features)
        return probability[0][1]  # チャーン確率
```

### 3.3 リアルタイムストリーム処理
```csharp
// Azure Event Hubs + Stream Analytics
public class RealTimeDormantCustomerProcessor
{
    public async Task ProcessOrderEvent(OrderCreatedEvent orderEvent)
    {
        // リアルタイムで休眠顧客ステータス更新
        var customer = await _context.DormantCustomerSummary
            .FirstOrDefaultAsync(d => d.CustomerId == orderEvent.CustomerId);
            
        if (customer != null)
        {
            // 休眠顧客が復帰 → 即座にステータス更新
            customer.LastPurchaseDate = orderEvent.CreatedAt;
            customer.DaysSinceLastPurchase = 0;
            customer.DormancySegment = "Active";
            
            await _context.SaveChangesAsync();
            
            // Redis キャッシュも即座に更新
            await InvalidateCustomerCache(orderEvent.CustomerId);
        }
    }
}
```

---

## 📊 総合的な期待効果

### パフォーマンス改善
| フェーズ | 実装期間 | 初期表示時間 | API応答時間 | 同時接続数 | データ量対応 |
|---------|----------|--------------|------------|------------|-------------|
| **現在** | - | 15秒 | 10秒 | 10 | 30K件 |
| **Phase 1** | 1週間 | 3-4秒 | 2秒 | 50 | 50K件 |
| **Phase 2** | 1-2ヶ月 | 1-2秒 | 0.5秒 | 200 | 500K件 |
| **Phase 3** | 3-6ヶ月 | <1秒 | <0.2秒 | 1000+ | 10M件+ |

### ユーザー体験改善
- **即座の情報表示**: サマリー情報が3秒以内で表示
- **段階的ロード**: 必要な情報から順次表示
- **レスポンシブUI**: 操作中断のないスムーズな体験
- **リアルタイム更新**: 最新データの自動反映

### 運用・保守性向上
- **監視体制**: Application Insights での詳細監視
- **自動化**: バックグラウンドでの事前集計
- **スケーラビリティ**: 大規模データにも対応可能
- **コスト最適化**: 適切な Azure サービス選択でコスト削減

---

## 🛠️ 実装ロードマップ

### Week 1: Quick Wins
- **Day 1**: データベースインデックス追加
- **Day 2**: API最適化・ページサイズ調整
- **Day 3**: フロントエンド遅延読み込み実装
- **Day 4**: 並列処理・キャッシュ改善
- **Day 5**: 統合テスト・パフォーマンス測定

### Month 1-2: 構造的改善
- **Week 2-3**: 集計テーブル設計・実装
- **Week 4-5**: バックグラウンドジョブ開発
- **Week 6-7**: 新API実装・テスト
- **Week 8**: 本番デプロイ・監視設定

### Month 3-6: 次世代アーキテクチャ
- **Month 3**: Azure Cosmos DB 検証・設計
- **Month 4**: 機械学習モデル開発
- **Month 5**: リアルタイムストリーム処理実装
- **Month 6**: 統合テスト・本番移行

---

## 📈 監視・メトリクス

### Key Performance Indicators
```yaml
Performance Metrics:
  - Initial Load Time: <2秒 (Target)
  - API Response Time: <500ms (Target)
  - Memory Usage: <100MB (Target)
  - Cache Hit Rate: >90% (Target)

Business Metrics:
  - User Session Duration: +50%
  - Feature Usage Rate: +200%
  - Customer Insight Accuracy: +30%
  - Operational Cost: -20%
```

### 監視ダッシュボード
- **Real-time Performance**: Application Insights
- **Database Performance**: Azure SQL Analytics
- **Cache Performance**: Redis monitoring
- **User Experience**: Frontend performance monitoring

---

**改善計画準備完了** 🚀  
段階的実装により、ユーザー体験を継続的に改善し、スケーラブルなシステムを構築します。