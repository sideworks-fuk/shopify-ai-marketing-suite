# YearOverYearコンポーネント統合設計案

作成日: 2025年8月2日  
作成者: YUKI

## 1. 現状分析

### 問題点
- 15個以上のYearOverYearコンポーネントが重複して存在
- 合計約6,000行のコードが散在
- どのコンポーネントを使用すべきか不明確
- バンドルサイズへの悪影響
- 保守性の低下

### 現在使用中のコンポーネント
- `YearOverYearProductAnalysis.tsx` (1,079行) - `/sales/year-over-year`で使用

## 2. 統合設計案

### 2.1 アーキテクチャ

```
YearOverYearProductAnalysis/
├── index.tsx                    # メインコンポーネント（設定可能）
├── components/
│   ├── YearOverYearTable.tsx   # テーブル表示
│   ├── YearOverYearChart.tsx   # グラフ表示
│   ├── YearOverYearFilters.tsx # フィルターUI
│   ├── YearOverYearSummary.tsx # サマリーカード
│   └── YearOverYearSkeleton.tsx # ローディング状態
├── hooks/
│   ├── useYearOverYearData.ts  # データフェッチング
│   └── useYearOverYearFilters.ts # フィルター管理
├── types/
│   └── index.ts                 # 型定義
└── utils/
    ├── calculations.ts          # 計算ロジック
    └── formatters.ts           # フォーマッター
```

### 2.2 メインコンポーネントの設計

```typescript
interface YearOverYearProductAnalysisProps {
  // 基本設定
  viewMode?: 'full' | 'summary' | 'table' | 'chart';
  
  // 機能フラグ
  features?: {
    multiYear?: boolean;        // 複数年比較
    export?: boolean;          // エクスポート機能
    virtualScroll?: boolean;   // 仮想スクロール
    advancedFilters?: boolean; // 高度なフィルター
  };
  
  // パフォーマンス設定
  performance?: {
    lazyLoad?: boolean;        // 遅延ロード
    paginate?: boolean;        // ページネーション
    itemsPerPage?: number;     // ページあたりアイテム数
  };
  
  // カスタマイズ
  customStyles?: {
    containerClass?: string;
    tableClass?: string;
    chartHeight?: number;
  };
}
```

### 2.3 ベースコンポーネントの選定

**選定: `YearOverYearProductAnalysisOptimized.tsx`**

理由:
- クリーンなアーキテクチャ（396行）
- 最新の実装パターン（2025-07-27作成）
- パフォーマンス最適化済み
- 適切なAPI分離

## 3. 実装計画

### Phase 1: 準備（2時間）
1. 新しいディレクトリ構造の作成
2. 共通型定義の整理
3. ユーティリティ関数の抽出

### Phase 2: コンポーネント分割（3時間）
1. `YearOverYearProductAnalysisOptimized`をベースに分解
2. 各サブコンポーネントの作成
   - Table（既存の活用）
   - Chart（Rechartsロジック抽出）
   - Filters（フィルターUI分離）
   - Summary（サマリーカード）
3. カスタムフックの実装

### Phase 3: 機能統合（2時間）
1. 複数年比較機能の追加（Enhancedから）
2. エクスポート機能の追加（Enhancedから）
3. 仮想スクロールオプション（TableVirtualから）
4. エラーハンドリング強化（ErrorHandlingから）

### Phase 4: テストと移行（1時間）
1. 統合コンポーネントのテスト
2. 既存の使用箇所を新コンポーネントに置き換え
3. 動作確認

### Phase 5: クリーンアップ（0.5時間）
1. 旧コンポーネントの削除
2. インポートパスの更新
3. ドキュメント更新

**総作業時間見積もり: 8.5時間**

## 4. 移行戦略

### 4.1 段階的移行
1. 新コンポーネントを並行開発
2. フィーチャーフラグで切り替え可能に
3. 本番環境で段階的にロールアウト
4. 問題なければ旧コンポーネント削除

### 4.2 後方互換性
- 既存のpropsインターフェースを維持
- デフォルト設定で現在の動作を再現
- 段階的な機能追加

## 5. 期待効果

### 定量的効果
- コード行数: 約6,000行 → 約1,500行（75%削減）
- バンドルサイズ: 推定30-40%削減
- ビルド時間: 改善見込み

### 定性的効果
- コードの重複排除
- 保守性の向上
- 新機能追加の容易化
- チーム内での混乱解消

## 6. リスクと対策

### リスク
1. 既存機能の漏れ
2. パフォーマンス劣化
3. 予期しないバグ

### 対策
1. 機能マッピング表の作成
2. パフォーマンステストの実施
3. 段階的なロールアウト

## 7. 次のステップ

1. この設計案のレビューと承認
2. 実装スケジュールの確定
3. 開発環境での実装開始

## 付録: コンポーネント機能マッピング

| 機能 | 現在のコンポーネント | 統合後の実装場所 |
|------|---------------------|-----------------|
| 基本的な表表示 | YearOverYearProductTable | components/YearOverYearTable |
| 仮想スクロール | YearOverYearProductTableVirtual | components/YearOverYearTable (オプション) |
| グラフ表示 | YearOverYearProductAnalysis | components/YearOverYearChart |
| 複数年比較 | YearOverYearProductAnalysisEnhanced | メインコンポーネント (オプション) |
| エクスポート | YearOverYearProductAnalysisEnhanced | utils/export |
| エラーハンドリング | YearOverYearProductErrorHandling | hooks/useYearOverYearData |
| ローディング | YearOverYearProductSkeleton | components/YearOverYearSkeleton |