# 休眠顧客分析画面 パフォーマンス改善実装計画

担当: Takashi (AI Assistant)  
作成日: 2025年7月27日  
対象画面: CUST-01-DORMANT（休眠顧客分析画面）

## 現状の問題詳細

### 最重要問題
1. **365日以上セグメントでの画面フリーズ**
   - 症状: 10-30秒間の完全フリーズ
   - 原因: 大量データの同期的処理
   - 影響: ユーザビリティの著しい低下

2. **初期ロード時間の長さ**
   - 現状: 15秒以上
   - 原因: 全データフェッチ後のページネーション
   - 影響: ユーザーの離脱率上昇

3. **N+1クエリ問題**
   - 発生箇所: 各顧客の最終注文日取得時
   - クエリ数: 顧客数 × 2回のクエリ
   - 影響: データベース負荷の増大

## 実装スケジュール

### 本日（2025年7月27日）実施予定

#### 1. データベースインデックスの追加【実施中】

**作業時間**: 30分  
**期待効果**: クエリパフォーマンス50-70%改善

```sql
-- 休眠顧客分析専用インデックス
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice, FinancialStatus, FulfillmentStatus);

-- 顧客検索最適化インデックス
CREATE NONCLUSTERED INDEX IX_Customers_CreatedAt_StoreId
ON Customers(CreatedAt, StoreId) 
INCLUDE (Email, FirstName, LastName, TotalSpent);

-- 統計情報の更新
UPDATE STATISTICS Orders WITH FULLSCAN;
UPDATE STATISTICS Customers WITH FULLSCAN;
```

#### 2. 初期ページサイズの削減

**作業時間**: 2時間  
**期待効果**: 初期ロード60%改善

**変更ファイル**:
- `frontend/src/app/customer-analysis/dormant-customers/page.tsx`
- `backend/ShopifyAnalyticsApi/Controllers/CustomerController.cs`

### 今週（7月28日-31日）実施予定

#### 3. スケルトンローダーの実装

**作業時間**: 4時間  
**実装内容**:
```typescript
// components/dormant-customers/DormantCustomerTableSkeleton.tsx
export const DormantCustomerTableSkeleton = () => {
  return (
    <div className="space-y-3">
      <div className="animate-pulse">
        {/* ヘッダー */}
        <div className="h-12 bg-gray-200 rounded mb-4" />
        
        {/* 行 */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex space-x-4 mb-2">
            <div className="h-10 bg-gray-200 rounded flex-1" />
            <div className="h-10 bg-gray-100 rounded w-32" />
            <div className="h-10 bg-gray-100 rounded w-24" />
            <div className="h-10 bg-gray-100 rounded w-28" />
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 4. 365日以上セグメントのストリーミング処理

**作業時間**: 8時間  
**実装内容**:

```csharp
// DormantCustomerQueryService.cs の改善
public async IAsyncEnumerable<DormantCustomerBatch> StreamLargeSegmentAsync(
    int daysSinceLastOrder,
    int storeId,
    [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    const int batchSize = 50;
    var processedCount = 0;
    
    // 総件数を先に取得
    var totalCount = await GetTotalCountAsync(daysSinceLastOrder, storeId);
    
    yield return new DormantCustomerBatch
    {
        Type = BatchType.TotalCount,
        TotalCount = totalCount
    };
    
    // バッチ処理でデータを取得
    await foreach (var batch in GetBatchesAsync(daysSinceLastOrder, storeId, batchSize, cancellationToken))
    {
        processedCount += batch.Customers.Count;
        
        yield return new DormantCustomerBatch
        {
            Type = BatchType.Data,
            Customers = batch.Customers,
            ProcessedCount = processedCount,
            TotalCount = totalCount
        };
    }
}
```

### 来週（8月1日-7日）実施予定

#### 5. React.memoとuseMemoの適用

**作業時間**: 6時間  
**対象コンポーネント**:
- DormantCustomerRow
- DormantCustomerFilters
- DormantCustomerStats

#### 6. 仮想スクロールの実装

**作業時間**: 12時間  
**使用ライブラリ**: react-window
**期待効果**: メモリ使用量80%削減

## パフォーマンス測定計画

### 測定指標
1. **初期ロード時間**
   - 現状: 15秒
   - 目標: 3秒以下

2. **365日以上セグメントの応答時間**
   - 現状: 10-30秒（フリーズ）
   - 目標: プログレッシブ表示で即座に応答

3. **メモリ使用量**
   - 現状: 1000件で200-500MB
   - 目標: 50MB以下

### 測定方法
```typescript
// utils/performanceMeasurement.ts
export const measureDormantCustomerPerformance = {
  startMeasurement: (segmentDays: number) => {
    performance.mark(`dormant-start-${segmentDays}`);
    console.log(`[Performance] 休眠顧客分析開始: ${segmentDays}日セグメント`);
  },
  
  endMeasurement: (segmentDays: number, recordCount: number) => {
    performance.mark(`dormant-end-${segmentDays}`);
    performance.measure(
      `dormant-${segmentDays}`,
      `dormant-start-${segmentDays}`,
      `dormant-end-${segmentDays}`
    );
    
    const measure = performance.getEntriesByName(`dormant-${segmentDays}`)[0];
    console.log(`[Performance] 休眠顧客分析完了:`, {
      segmentDays,
      recordCount,
      duration: `${measure.duration.toFixed(2)}ms`,
      memory: `${(performance.memory?.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
    });
  }
};
```

## 進捗報告

### 日次報告フォーマット
```markdown
## 休眠顧客分析画面 パフォーマンス改善進捗報告
日付: 2025年7月XX日
担当: Takashi

### 本日の実施内容
- [ ] タスク名（作業時間）

### 測定結果
- 初期ロード時間: XX秒 → XX秒
- 365日セグメント: XX秒 → XX秒
- メモリ使用量: XXMB → XXMB

### 課題・気づき
- 

### 明日の予定
- 
```

## リスクと対策

### リスク1: インデックス追加による書き込みパフォーマンスの低下
**対策**: 
- 書き込み頻度の監視
- 必要に応じてインデックスの調整

### リスク2: ストリーミング処理の実装複雑性
**対策**:
- 段階的な実装（まずは単純なバッチ処理から）
- エラーハンドリングの強化

### リスク3: 既存機能への影響
**対策**:
- 機能フラグによる段階的リリース
- 十分なテストカバレッジの確保

## 成功基準

1. **必須達成項目**
   - 365日以上セグメントのフリーズ解消
   - 初期ロード時間を5秒以下に短縮

2. **目標達成項目**
   - 全セグメントで3秒以下の応答時間
   - メモリ使用量を現状の20%に削減

3. **ストレッチ目標**
   - 10万件のデータでも快適に動作
   - リアルタイム更新機能の追加

---

## 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025年7月27日 | Takashi (AI Assistant) | 初版作成 |

ステータス: 実装開始