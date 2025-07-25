# 休眠顧客分析パフォーマンス改善設計書

## 1. 現状の課題

### 1.1 パフォーマンス問題
- **初期表示時間**: 15秒以上（Azure SQL Basic tier環境）
- **タイムアウト頻発**: 28,062件のデータ処理で頻繁にタイムアウト
- **メモリ使用量**: 全顧客の注文データをメモリに読み込むため大量のメモリを消費

### 1.2 技術的ボトルネック
1. **N+1クエリ問題**: 各顧客の最終注文日を取得するため複数のクエリが実行される
2. **全件フェッチ**: ページネーション適用前に全データを取得している
3. **重複クエリ**: サマリー統計とセグメント分布で同じクエリを3回実行
4. **インメモリ処理**: すべての集計処理をアプリケーション側で実行
5. **インデックス不足**: 日付ベースのクエリに適切なインデックスがない

## 2. 改善方針

### 2.1 短期対策（1-2週間）
1. **インデックス追加による即効性のある改善**
2. **クエリ最適化とN+1問題の解消**
3. **キャッシュ戦略の改善**

### 2.2 中期対策（1-2ヶ月）
1. **集計テーブルの導入**
2. **バックグラウンドジョブによる事前集計**
3. **段階的なデータ読み込み**

### 2.3 長期対策（3-6ヶ月）
1. **Azure Functionsによる非同期処理**
2. **Azure Cosmos DBやRedisキャッシュの活用**
3. **リアルタイムストリーム処理**

## 3. 詳細設計

### 3.1 データベース最適化

#### 3.1.1 インデックス追加
```sql
-- 最終注文日の効率的な検索用
CREATE INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice, ShippingPrice, TaxPrice);

-- 日付範囲検索用
CREATE INDEX IX_Orders_CreatedAt 
ON Orders(CreatedAt) 
WHERE CreatedAt IS NOT NULL;

-- 顧客の総購入金額フィルタリング用
CREATE INDEX IX_Customers_StoreId_TotalSpent 
ON Customers(StoreId, TotalSpent DESC)
WHERE TotalSpent > 0;
```

#### 3.1.2 集計テーブル設計
```sql
-- 休眠顧客サマリーテーブル
CREATE TABLE DormantCustomerSummary (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    CustomerId INT NOT NULL,
    LastPurchaseDate DATETIME2,
    DaysSinceLastPurchase INT,
    DormancySegment NVARCHAR(50),
    RiskLevel NVARCHAR(20),
    ChurnProbability DECIMAL(5,2),
    TotalSpent DECIMAL(19,4),
    TotalOrders INT,
    AverageOrderValue DECIMAL(19,4),
    LastUpdated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    INDEX IX_DormantCustomerSummary_StoreId_Segment 
        (StoreId, DormancySegment) INCLUDE (CustomerId, RiskLevel),
    INDEX IX_DormantCustomerSummary_StoreId_LastPurchase 
        (StoreId, DaysSinceLastPurchase),
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
    LastUpdated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    INDEX IX_DormantSegmentStats_StoreId_Segment 
        UNIQUE (StoreId, SegmentName)
);
```

### 3.2 バックグラウンドジョブ設計

#### 3.2.1 Azure Functions実装
```csharp
// 定期実行（毎日深夜2時）
[FunctionName("UpdateDormantCustomerSummary")]
public static async Task Run(
    [TimerTrigger("0 0 2 * * *")] TimerInfo timer,
    ILogger log)
{
    log.LogInformation("休眠顧客サマリー更新開始");
    
    // バッチ処理で効率的に更新
    await UpdateDormantCustomerSummaryBatch();
    await UpdateSegmentStatistics();
}
```

#### 3.2.2 バッチ更新ストアドプロシージャ
```sql
CREATE PROCEDURE UpdateDormantCustomerSummaryBatch
    @StoreId INT,
    @BatchSize INT = 1000
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 一時テーブルで最終購入情報を事前計算
    WITH LastOrderCTE AS (
        SELECT 
            c.Id AS CustomerId,
            MAX(o.CreatedAt) AS LastPurchaseDate,
            COUNT(o.Id) AS TotalOrders,
            SUM(o.TotalPrice) AS TotalSpent
        FROM Customers c
        LEFT JOIN Orders o ON c.Id = o.CustomerId
        WHERE c.StoreId = @StoreId
        GROUP BY c.Id
    )
    MERGE DormantCustomerSummary AS target
    USING (
        SELECT 
            @StoreId AS StoreId,
            lo.CustomerId,
            lo.LastPurchaseDate,
            DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) AS DaysSinceLastPurchase,
            CASE 
                WHEN DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) BETWEEN 90 AND 180 THEN '90-180日'
                WHEN DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) BETWEEN 181 AND 365 THEN '180-365日'
                WHEN DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) > 365 THEN '365日以上'
                ELSE '90日未満'
            END AS DormancySegment,
            -- リスクレベル計算ロジック
            CASE 
                WHEN lo.TotalSpent > 100000 AND DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) > 365 THEN 'critical'
                WHEN DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) > 365 THEN 'high'
                WHEN DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) > 180 THEN 'medium'
                ELSE 'low'
            END AS RiskLevel,
            lo.TotalSpent,
            lo.TotalOrders,
            CASE WHEN lo.TotalOrders > 0 THEN lo.TotalSpent / lo.TotalOrders ELSE 0 END AS AverageOrderValue
        FROM LastOrderCTE lo
        WHERE DATEDIFF(DAY, lo.LastPurchaseDate, GETUTCDATE()) >= 90
           OR lo.LastPurchaseDate IS NULL
    ) AS source ON target.CustomerId = source.CustomerId
    WHEN MATCHED THEN
        UPDATE SET 
            LastPurchaseDate = source.LastPurchaseDate,
            DaysSinceLastPurchase = source.DaysSinceLastPurchase,
            DormancySegment = source.DormancySegment,
            RiskLevel = source.RiskLevel,
            TotalSpent = source.TotalSpent,
            TotalOrders = source.TotalOrders,
            AverageOrderValue = source.AverageOrderValue,
            LastUpdated = GETUTCDATE()
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (StoreId, CustomerId, LastPurchaseDate, DaysSinceLastPurchase, 
                DormancySegment, RiskLevel, TotalSpent, TotalOrders, AverageOrderValue)
        VALUES (source.StoreId, source.CustomerId, source.LastPurchaseDate, 
                source.DaysSinceLastPurchase, source.DormancySegment, source.RiskLevel,
                source.TotalSpent, source.TotalOrders, source.AverageOrderValue);
END
```

### 3.3 API最適化

#### 3.3.1 新しいサービスメソッド
```csharp
public async Task<DormantCustomerResponse> GetDormantCustomersOptimized(
    DormantCustomerRequest request)
{
    // キャッシュチェック
    var cacheKey = $"dormant_v2_{request.StoreId}_{request.Segment}_{request.PageNumber}";
    if (_cache.TryGetValue(cacheKey, out DormantCustomerResponse cachedResult))
    {
        return cachedResult;
    }
    
    // 集計テーブルから高速取得
    var query = _context.DormantCustomerSummary
        .Where(d => d.StoreId == request.StoreId);
    
    // セグメントフィルタ
    if (!string.IsNullOrEmpty(request.Segment))
    {
        query = query.Where(d => d.DormancySegment == request.Segment);
    }
    
    // ページネーション（カウントも高速化）
    var totalCount = await query.CountAsync();
    
    var customers = await query
        .OrderByDescending(d => d.DaysSinceLastPurchase)
        .Skip((request.PageNumber - 1) * request.PageSize)
        .Take(request.PageSize)
        .Select(d => new DormantCustomerDto
        {
            CustomerId = d.CustomerId,
            // 必要に応じて顧客詳細をJOIN
            Customer = _context.Customers
                .Where(c => c.Id == d.CustomerId)
                .Select(c => new CustomerBasicInfo
                {
                    Name = c.Name,
                    Email = c.Email
                })
                .FirstOrDefault(),
            LastPurchaseDate = d.LastPurchaseDate,
            DaysSinceLastPurchase = d.DaysSinceLastPurchase,
            DormancySegment = d.DormancySegment,
            RiskLevel = d.RiskLevel,
            ChurnProbability = d.ChurnProbability,
            TotalSpent = d.TotalSpent,
            TotalOrders = d.TotalOrders,
            AverageOrderValue = d.AverageOrderValue
        })
        .ToListAsync();
    
    // セグメント統計は事前集計テーブルから取得
    var segmentStats = await _context.DormantSegmentStatistics
        .Where(s => s.StoreId == request.StoreId)
        .ToDictionaryAsync(s => s.SegmentName, s => new SegmentStat
        {
            Count = s.CustomerCount,
            Revenue = s.TotalRevenue
        });
    
    var response = new DormantCustomerResponse
    {
        Customers = customers,
        TotalCount = totalCount,
        SegmentStatistics = segmentStats
    };
    
    // キャッシュに保存（15分）
    _cache.Set(cacheKey, response, TimeSpan.FromMinutes(15));
    
    return response;
}
```

### 3.4 フロントエンド最適化

#### 3.4.1 段階的データ読み込み
```typescript
// 初期表示は集計データのみ
const DormantCustomerAnalysis = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [customerList, setCustomerList] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  
  // 1. 最初にサマリーデータのみ取得（高速）
  useEffect(() => {
    fetchDormantSummary().then(setSummaryData);
  }, []);
  
  // 2. ユーザーがフィルターを選択したら詳細リストを取得
  const handleSegmentSelect = async (segment) => {
    setIsLoadingList(true);
    const list = await fetchDormantCustomers({ segment });
    setCustomerList(list);
    setIsLoadingList(false);
  };
  
  return (
    <>
      {/* サマリー表示（即座に表示） */}
      <DormantSummaryCards data={summaryData} />
      
      {/* リストは選択後に遅延読み込み */}
      {isLoadingList ? (
        <LoadingSpinner />
      ) : (
        <DormantCustomerList customers={customerList} />
      )}
    </>
  );
};
```

#### 3.4.2 仮想スクロール実装
```typescript
import { VirtualList } from '@tanstack/react-virtual';

const DormantCustomerList = ({ customers }) => {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 各行の推定高さ
    overscan: 5, // ビューポート外の余分な行数
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <CustomerRow customer={customers[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 4. 実装計画

### Phase 1: 即効性のある改善（1週間）
1. **Day 1-2**: インデックス追加とクエリ最適化
   - 本番環境への影響を最小限にするため、メンテナンス時間に実施
   - 実施前後でパフォーマンス測定

2. **Day 3-4**: キャッシュ戦略の改善
   - キャッシュキーの最適化
   - キャッシュ有効期限の調整

3. **Day 5-7**: フロントエンド最適化
   - 段階的データ読み込みの実装
   - ローディング状態の改善

### Phase 2: 集計テーブル導入（2-3週間）
1. **Week 1**: 
   - 集計テーブルの作成
   - バッチ更新ストアドプロシージャの実装
   - 初期データ移行

2. **Week 2**: 
   - Azure Functions の実装
   - 定期実行ジョブの設定
   - モニタリング設定

3. **Week 3**: 
   - APIの切り替え
   - パフォーマンステスト
   - 本番環境への段階的展開

### Phase 3: 長期的な最適化（1-2ヶ月）
1. **Month 1**: 
   - Azure Redis Cache の導入検討
   - リアルタイム更新の設計

2. **Month 2**: 
   - 実装とテスト
   - パフォーマンスチューニング

## 5. 期待される効果

### 5.1 パフォーマンス改善
- **初期表示時間**: 15秒 → 2-3秒（80-85%改善）
- **API応答時間**: 10秒 → 500ms以下（95%改善）
- **メモリ使用量**: 50-70%削減

### 5.2 スケーラビリティ
- 10万件以上のデータでも安定動作
- 同時アクセス数の増加に対応

### 5.3 ユーザビリティ
- ページ遷移のストレスフリー化
- リアルタイムに近いデータ更新

## 6. リスクと対策

### 6.1 データ整合性
- **リスク**: 集計テーブルと実データの不整合
- **対策**: 
  - 定期的な整合性チェック
  - 差分更新の実装
  - 監視アラートの設定

### 6.2 コスト増加
- **リスク**: Azure Functions、追加ストレージのコスト
- **対策**: 
  - 段階的な導入
  - コスト監視の強化
  - 不要なデータの定期削除

### 6.3 実装の複雑性
- **リスク**: システムの複雑化による保守性低下
- **対策**: 
  - 十分なドキュメント作成
  - 段階的な実装
  - 包括的なテスト

## 7. 成功指標（KPI）

1. **API応答時間**: 95パーセンタイルで1秒以下
2. **初期表示時間**: 3秒以内
3. **エラー率**: 0.1%以下
4. **ユーザー満足度**: 画面の応答性に関する苦情ゼロ
5. **システム稼働率**: 99.9%以上

## 8. 次のステップ

1. **承認取得**: ステークホルダーとの設計レビュー
2. **詳細見積もり**: 各フェーズの工数とコスト算出
3. **環境準備**: 開発・テスト環境の構築
4. **Phase 1開始**: インデックス追加から着手

---

作成日: 2025-07-25
作成者: AI Marketing Suite 開発チーム
バージョン: 1.0