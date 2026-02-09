# T5: UI/UX不具合修正

## 概要
複数のUI/UX不具合を一括で修正する。

---

## 5a. CSV金額カンマ問題

### 事象
CSVダウンロード時に金額のカンマ区切り（例: `¥1,234,567`）がCSVのカラム区切りと干渉し、データが正しくパースできない。

### 対象ファイル
**ファイル**: `frontend/src/components/dashboards/YearOverYearProductAnalysis.tsx`

**401-436行目付近**: CSV生成ロジック
```typescript
const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
```

金額フォーマット（`formatValue`関数）で `¥${value.toLocaleString()}` が返され、カンマを含む値がCSVに直接挿入される。

### 対応内容
1. CSV出力時は金額をダブルクォートで囲む: `"¥1,234,567"`
2. もしくはCSV出力時は通貨記号・カンマを除去して数値のみにする: `1234567`
3. `PurchaseCountAnalysis.tsx` のCSV出力（107-129行目）は数値のみなので問題なし

---

## 5a-2. CSVダウンロード時の年表記の違和感

### 事象
CSVダウンロード時のヘッダーで年月の表記が「4月2025」のようになっており、日本語として不自然。「2025年4月」が自然。

### 対象ファイル
**ファイル**: `frontend/src/components/dashboards/YearOverYearProductAnalysis.tsx`

**403行目**: CSVヘッダー生成
```typescript
const headers = ['商品名', 'カテゴリ', ...months.map(m => `${m}${selectedYear}`), ...months.map(m => `${m}${previousYear}`), ...months.map(m => `${m}成長率`)]
```

現在: `4月2025`, `5月2025` ...
期待: `2025年4月`, `2025年5月` ...

### 対応内容
ヘッダー生成のテンプレートリテラルを修正:
```typescript
months.map(m => `${selectedYear}年${m}`)
```

成長率のヘッダーも同様に修正が必要か確認:
```typescript
months.map(m => `${m}成長率`)  // こちらは年なしなので問題なし
```

---

## 5b. Excelダウンロード拡張子問題

### 事象
Excel形式でダウンロードした時に拡張子が `.xlsx` ではなく不正な拡張子になり、Excelファイルとして認識されない。

### 対象ファイル
**ファイル**: `frontend/src/components/dashboards/YearOverYearProductAnalysis.tsx`

**431行目付近**: ダウンロードファイル名の設定
```typescript
link.setAttribute('download',
  `前年同月比月別分析_${selectedYear}vs${previousYear}_${new Date().toISOString().slice(0, 10)}.${format}`)
```

### 調査が必要な点
1. `format` 変数の値が何か（`excel`? `xlsx`?）
2. 実際に生成されるファイルの中身がCSVのままになっていないか
3. 本当のXLSX形式で出力するには `xlsx` ライブラリ等の導入が必要

### 対応内容
- `format` が `excel` の場合、拡張子を `.xlsx` に変換する
- ファイルの中身がCSVのままの場合:
  - 方針A: `.csv` に統一して「Excel形式」オプションを削除
  - 方針B: `xlsx` ライブラリを導入して本当のExcel形式で出力

---

## 5c. 前年比が常に0%表示

### 事象
購入回数分析画面の総顧客数・売上の前年比が常に「+0.0%」と表示される。

### 対象ファイル
**ファイル**: `frontend/src/components/dashboards/PurchaseCountAnalysis.tsx`

**168行目**: 顧客数の前年比
```typescript
前年比 {formatPercentage(analysisData.summary.comparison.customerGrowthRate)}
```

**215行目**: 売上の前年比
```typescript
前年比 {formatPercentage(analysisData.summary.comparison.revenueGrowthRate)}
```

### 調査が必要な点
1. APIレスポンスの `comparison.customerGrowthRate` と `comparison.revenueGrowthRate` の値を確認
2. バックエンドで前年比を計算するロジックが実装されているか確認
3. ハードコード値（0固定）なのか、計算ロジックの不具合なのかを判別

### 対応内容
- APIレスポンスが0を返している場合 → バックエンドの計算ロジックを修正
- フロントエンドでハードコードされている場合 → APIの値を使用するように修正
- 前年データが存在しない場合 → 「前年比」の表示自体を非表示にする、または「データなし」と表示

---

## 5d. 構成費のプラス記号

### 事象
購入回数分析画面の構成費（パーセント表示）に不要なプラス記号（+）が表示されている。
例: `+25.3%` → 正しくは `25.3%`（構成費は合計100%になるもので、増減を表すものではない）

### 対象ファイル

**ファイル**: `frontend/src/lib/format.ts` 16-18行目
```typescript
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}
```

**ファイル**: `frontend/src/components/dashboards/PurchaseCountAnalysis.tsx`
- **287行目**: 顧客構成比 `formatPercentage(detail.percentage.customerPercentage)`
- **300行目**: 売上構成比 `formatPercentage(detail.percentage.amountPercentage)`

### 対応内容

#### 方針A: 構成費専用のフォーマット関数を追加（推奨）
`format.ts` に構成費用の関数を追加:
```typescript
export function formatCompositionPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
```
`PurchaseCountAnalysis.tsx` の構成費表示でこの関数を使用。

#### 方針B: formatPercentageにオプション引数を追加
```typescript
export function formatPercentage(value: number, showSign = true): string {
  const sign = showSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
```
構成費の箇所で `formatPercentage(value, false)` を呼び出す。

---

## 確認チェックリスト
- [ ] 5a: CSVダウンロードした金額がExcelやテキストエディタで正しく表示されること
- [ ] 5a-2: CSVヘッダーの年月表記が「2025年4月」の形式になっていること
- [ ] 5b: Excelダウンロードしたファイルが正しい拡張子で保存されること
- [ ] 5c: 前年比が正しい値で表示される、または前年データなしの場合は適切に非表示になること
- [ ] 5d: 構成費のパーセント表示にプラス記号がないこと
- [ ] 5d: 前年比など増減を表す箇所では従来通りプラス記号が表示されること
