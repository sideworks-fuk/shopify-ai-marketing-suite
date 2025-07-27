# 休眠顧客分析パフォーマンス改善 - Quick Wins実装ガイド

## 概要
本ドキュメントは、休眠顧客分析のパフォーマンス問題に対して、**1週間以内に実装可能な即効性のある改善策**をまとめたものです。

## 現状の問題
- 初期表示に**15秒以上**かかる
- Azure SQL Database Basic tier (5 DTU) でタイムアウトが頻発
- 28,062件のデータ処理でメモリを大量消費

## Quick Wins一覧（優先度順）

### 1. データベースインデックスの追加（効果: 大）
**実装時間**: 30分
**効果**: クエリ実行時間を50-70%削減

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
```

### 2. APIレスポンスのページサイズ削減（効果: 大）
**実装時間**: 10分
**効果**: 初期ロード時間を60%削減

```csharp
// DormantCustomerService.cs の修正
public async Task<ApiResponse<DormantCustomerAnalysisDto>> GetDormantCustomersAsync(
    DormantCustomerRequest request)
{
    // デフォルトページサイズを1000から20に削減
    request.PageSize = Math.Min(request.PageSize ?? 20, 50);
    
    // 初期表示は最初の20件のみ
    // ユーザーが「もっと見る」をクリックしたら追加読み込み
}
```

### 3. 不要なIncludeの削除（効果: 中）
**実装時間**: 30分
**効果**: メモリ使用量を30%削減

```csharp
// 現在のコード（問題あり）
var query = from customer in _context.Customers
    .Include(c => c.Orders.OrderByDescending(o => o.CreatedAt).Take(1))
    where customer.StoreId == request.StoreId
    select customer;

// 改善後: 必要な情報のみを射影
var query = from customer in _context.Customers
    where customer.StoreId == request.StoreId
    select new 
    {
        CustomerId = customer.Id,
        CustomerName = customer.Name,
        CustomerEmail = customer.Email,
        TotalSpent = customer.TotalSpent,
        TotalOrders = customer.TotalOrders,
        // 最終注文日はサブクエリで取得
        LastOrderDate = _context.Orders
            .Where(o => o.CustomerId == customer.Id)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => o.CreatedAt)
            .FirstOrDefault()
    };
```

### 4. 非同期並列処理の導入（効果: 中）
**実装時間**: 1時間
**効果**: 処理時間を40%削減

```csharp
public async Task<DormantCustomerSummaryDto> GetSummaryAsync(int storeId)
{
    // 複数の集計を並列実行
    var tasks = new[]
    {
        GetTotalDormantCountAsync(storeId),
        GetSegmentDistributionAsync(storeId),
        GetRevenueBySegmentAsync(storeId)
    };
    
    await Task.WhenAll(tasks);
    
    return new DormantCustomerSummaryDto
    {
        TotalCount = tasks[0].Result,
        SegmentDistribution = tasks[1].Result,
        RevenueBySegment = tasks[2].Result
    };
}
```

### 5. フロントエンドの遅延読み込み（効果: 大）
**実装時間**: 2時間
**効果**: 体感速度を大幅改善

```typescript
// DormantCustomerAnalysis.tsx の修正
export function DormantCustomerAnalysis() {
  const [summaryData, setSummaryData] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  
  // Step 1: サマリーデータのみ先に取得（軽量）
  useEffect(() => {
    api.dormantSummary(1).then(response => {
      setSummaryData(response.data);
    });
  }, []);
  
  // Step 2: 顧客リストは表示が必要になってから取得
  const loadCustomerList = useCallback(async (segment?: string) => {
    setIsLoadingList(true);
    const response = await api.dormantCustomers({
      storeId: 1,
      segment,
      pageSize: 20, // 初期は20件のみ
    });
    setCustomerList(response.data.customers);
    setIsLoadingList(false);
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
        <DormantCustomerList customers={customerList} />
      )}
    </>
  );
}
```

### 6. キャッシュ時間の延長（効果: 小）
**実装時間**: 5分
**効果**: 2回目以降のアクセスを高速化

```csharp
// 現在: 5分
private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(5);

// 改善後: 30分（休眠顧客データは頻繁に変わらない）
private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);
```

### 7. SQLクエリの最適化（効果: 中）
**実装時間**: 1時間
**効果**: クエリ実行時間を30%削減

```sql
-- ストアドプロシージャの作成
CREATE PROCEDURE GetDormantCustomersSummary
    @StoreId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- CTEで一度に必要なデータを取得
    WITH DormantCTE AS (
        SELECT 
            c.Id,
            c.Name,
            c.Email,
            c.TotalSpent,
            c.TotalOrders,
            MAX(o.CreatedAt) as LastOrderDate,
            DATEDIFF(DAY, MAX(o.CreatedAt), GETUTCDATE()) as DaysSince
        FROM Customers c
        LEFT JOIN Orders o ON c.Id = o.CustomerId
        WHERE c.StoreId = @StoreId
        GROUP BY c.Id, c.Name, c.Email, c.TotalSpent, c.TotalOrders
        HAVING MAX(o.CreatedAt) < DATEADD(DAY, -90, GETUTCDATE()) 
            OR MAX(o.CreatedAt) IS NULL
    )
    SELECT 
        *,
        CASE 
            WHEN DaysSince BETWEEN 90 AND 180 THEN '90-180日'
            WHEN DaysSince BETWEEN 181 AND 365 THEN '180-365日'
            WHEN DaysSince > 365 THEN '365日以上'
            ELSE 'その他'
        END as Segment
    FROM DormantCTE
    ORDER BY DaysSince DESC;
END
```

## 実装手順

### Day 1: データベース最適化
1. **朝**: インデックス追加（メンテナンス時間に実施）
2. **午後**: クエリ実行計画の確認とパフォーマンス測定

### Day 2: バックエンド最適化
1. **朝**: 不要なIncludeの削除
2. **午後**: ページサイズの調整とテスト

### Day 3: フロントエンド最適化
1. **朝**: 遅延読み込みの実装
2. **午後**: UIテストとユーザビリティ確認

### Day 4-5: 統合テストと微調整
1. 全体的なパフォーマンステスト
2. 本番環境へのデプロイ準備

## 期待される成果

| 指標 | 現在 | 改善後 | 改善率 |
|------|------|--------|--------|
| 初期表示時間 | 15秒 | 3-4秒 | 73-80% |
| API応答時間 | 10秒 | 2秒 | 80% |
| メモリ使用量 | 500MB | 200MB | 60% |
| ユーザー体感速度 | 遅い | 快適 | - |

## 注意事項

1. **インデックス追加時の注意**
   - 大量データがある場合は、ONLINE = ON オプションを使用
   - メンテナンス時間に実施することを推奨

2. **キャッシュの考慮事項**
   - データの鮮度とパフォーマンスのトレードオフ
   - 管理画面でキャッシュクリア機能の提供を検討

3. **段階的な展開**
   - まず開発環境でテスト
   - ステージング環境で負荷テスト
   - 本番環境には段階的に適用

## モニタリング

実装後は以下の指標を監視：
- Application Insights でのAPI応答時間
- Azure SQL Database のDTU使用率
- エラーログの監視
- ユーザーフィードバック

---

これらのQuick Winsを実装することで、大規模な改修を行わずとも、ユーザー体験を大幅に改善できます。