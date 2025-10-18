# 前年同月比【商品】画面 - 条件設定→分析実行パターンの導入

**作成者**: AIアシスタント YUKI  
**レビュー**: ケンジ（テクニカルアドバイザー）  
**作成日**: 2025-07-27  
**ステータス**: 実装計画策定中

## 📋 概要

現在の「画面表示時に全データ自動取得」から「条件設定→分析実行」パターンへの転換により、パフォーマンスとUXを劇的に改善します。

## 🎯 改善の狙い

### 現在の問題
- 画面表示時に1000商品×24ヶ月分のデータを自動取得
- 初期表示に5-8秒かかる
- ユーザーが必要としないデータも取得

### 新しいアプローチ
- 条件設定画面を最初に表示（即座に表示）
- ユーザーが条件を設定して「分析実行」
- 必要なデータのみを取得・表示

## 💡 実装設計

### 1. 初期表示（条件設定画面）

```tsx
// YearOverYearProductAnalysis.tsx の初期状態
const YearOverYearProductAnalysis = () => {
  const [analysisExecuted, setAnalysisExecuted] = useState(false)
  const [analysisConditions, setAnalysisConditions] = useState({
    dateRange: 'last12months',
    categories: [],
    minSales: 0,
    comparisonType: 'yearOverYear'
  })
  
  if (!analysisExecuted) {
    return <AnalysisConditionPanel 
      conditions={analysisConditions}
      onExecute={executeAnalysis}
    />
  }
  
  // 分析結果の表示
  return <AnalysisResults data={analysisData} />
}
```

### 2. 条件設定コンポーネント

```tsx
const AnalysisConditionPanel = ({ conditions, onExecute }) => {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          前年同月比【商品】分析 - 条件設定
        </CardTitle>
        <CardDescription>
          分析条件を設定して、必要なデータのみを効率的に取得します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 分析期間 */}
        <div>
          <label className="text-sm font-medium">分析期間</label>
          <Select defaultValue="last12months">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last12months">過去12ヶ月</SelectItem>
              <SelectItem value="last6months">過去6ヶ月</SelectItem>
              <SelectItem value="last3months">過去3ヶ月</SelectItem>
              <SelectItem value="custom">カスタム期間</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* カテゴリフィルター */}
        <div>
          <label className="text-sm font-medium">商品カテゴリ（複数選択可）</label>
          <CategoryMultiSelect />
        </div>
        
        {/* 最小売上閾値 */}
        <div>
          <label className="text-sm font-medium">最小売上閾値</label>
          <Input 
            type="number" 
            placeholder="例: 10,000円以上の商品のみ"
          />
        </div>
        
        {/* プリセット */}
        <div>
          <label className="text-sm font-medium">分析プリセット</label>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm">売れ筋商品</Button>
            <Button variant="outline" size="sm">季節商品</Button>
            <Button variant="outline" size="sm">新商品</Button>
          </div>
        </div>
        
        {/* 実行ボタン */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={onExecute}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          分析を実行
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 3. 段階的データ取得

```tsx
const executeAnalysis = async () => {
  setIsAnalyzing(true)
  
  try {
    // Step 1: サマリーデータ取得（軽量）
    const summary = await yearOverYearApi.getSummary({
      storeId: 1,
      ...analysisConditions
    })
    
    setSummaryData(summary)
    setAnalysisExecuted(true)
    
    // Step 2: 詳細データは遅延取得
    if (summary.totalProducts > 100) {
      // 100件超の場合は段階的に取得
      loadDataIncrementally(summary.productIds)
    } else {
      // 100件以下なら一括取得
      const details = await yearOverYearApi.getDetails({
        productIds: summary.productIds
      })
      setDetailData(details)
    }
  } finally {
    setIsAnalyzing(false)
  }
}
```

## 📊 実装スケジュール修正案

### Phase 1 修正版（7/29-8/2）

#### 月曜日（7/29）
- ✅ 条件設定UIの実装
- ✅ 分析実行ボタンの実装

#### 火曜日（7/30）
- ✅ APIの分離（サマリー/詳細）
- ✅ 段階的データ取得の実装

#### 水曜日（7/31）
- ✅ スケルトンローダー実装（分析実行後）
- ✅ プログレス表示の実装

#### 木曜日（8/1）
- ✅ プリセット機能の実装
- ✅ 条件保存機能

#### 金曜日（8/2）
- ✅ テスト・調整
- ✅ パフォーマンス測定

### 既存の改善との統合

1. **スケルトンローダー**: 分析実行後の表示に使用
2. **初期表示制限**: 条件により自動的に実現
3. **コンポーネント分割**: 条件設定と結果表示を分離
4. **仮想スクロール**: 大量データ時のみ適用

## 🎯 期待される効果

### パフォーマンス改善
| 項目 | 現在 | 改善後 | 改善率 |
|------|------|--------|--------|
| 初期表示 | 5-8秒 | 0.5秒以下 | 95% |
| メモリ使用量 | 300-500MB | 50-100MB | 80% |
| API負荷 | 全データ取得 | 条件付き取得 | 70%削減 |

### UX改善
- 明確な操作フロー
- 待ち時間の予測可能性
- 不要なデータ表示の回避

## 🔄 購入回数分析画面との統一性

### 共通コンポーネント
```tsx
// shared/AnalysisConditionBase.tsx
export const AnalysisConditionBase = ({ 
  title,
  children,
  onExecute,
  isExecuting 
}) => {
  // 共通レイアウトとスタイリング
}
```

### 統一された操作パターン
1. 条件設定
2. 分析実行
3. 結果表示
4. 詳細ドリルダウン

## 🚀 実装優先度

1. **最優先**: 条件設定→実行パターンの基本実装
2. **高優先**: 段階的データ取得
3. **中優先**: プリセット機能
4. **低優先**: 履歴機能（Phase 2へ）

---

**YUKI**: この方向で実装を進めます！  
**ケンジ**: 素晴らしい計画です。全面的にサポートします！