# 作業ログ: 前年同月比分析画面のストアID取得エラー修正

## 作業情報
- 開始日時: 2026-01-07 02:00:00
- 完了日時: 2026-01-07 02:20:46
- 所要時間: 約20分
- 担当: 福田＋AI Assistant

## 作業概要
前年同月比分析【商品】画面で発生していた「ストア情報が取得できません」エラーを解消するため、ストアID取得ロジックを改善しました。

## 問題の詳細

### 発生していたエラー
- コンソールに`Store ID not found or invalid in localStorage: null`が表示
- `401 Unauthorized`エラーが複数回発生
- UIに「ストア情報が取得できません。Shopify管理画面からアプリを起動し直してください。」というエラーメッセージが表示

### 原因
1. **`resolveStoreId`関数の問題**:
   - `sessionStorage`を確認していない（`localStorage`のみ）
   - `getCurrentStoreId()`関数を使用していない（`api-config.ts`の関数は`sessionStorage`も確認）
   - Shopify埋め込みアプリでは`localStorage`へのアクセスが制限される可能性がある

2. **ページマウント時のストアID復元処理がない**:
   - ページ遷移時に`currentStoreId`が失われる可能性がある
   - `AuthProvider`の`currentStoreId`が未設定のままAPIリクエストが実行される

## 実施内容

### 1. インポートの追加
- `getCurrentStoreId`関数を`@/lib/api-config`からインポート

### 2. `useAuth`フックの改善
- `currentStoreId`を`authCurrentStoreId`として取得（名前の明確化）
- `setCurrentStoreId`も取得（ページマウント時の復元処理で使用）

### 3. ページマウント時のストアID復元処理を追加
- `useEffect`を追加して、ページマウント時に`localStorage`/`sessionStorage`から`currentStoreId`を復元
- `sessionStorage`にあった場合は`localStorage`にも保存（次回以降のため）
- `AuthProvider`の`currentStoreId`が未設定または異なる場合のみ更新

### 4. `resolveStoreId`関数の改善
- `AuthProvider`の`currentStoreId`を優先的に使用
- `AuthProvider`にない場合は`getCurrentStoreId()`を使用（`localStorage`と`sessionStorage`の両方を確認）
- デバッグログを追加して、どの方法でストアIDを取得したかを追跡可能に

### 5. 依存配列の修正
- `fetchYearOverYearData`の依存配列に`authCurrentStoreId`を追加
- `authCurrentStoreId`が変更されたときに再実行されるように

## 成果物

### 修正ファイル
- `frontend/src/components/dashboards/YearOverYearProductAnalysis.tsx`

### 主な変更点
1. `getCurrentStoreId`関数のインポート追加
2. `useAuth`から`setCurrentStoreId`も取得
3. ページマウント時に`currentStoreId`を復元する`useEffect`を追加（約40行）
4. `resolveStoreId`関数を改善（`getCurrentStoreId()`を使用、`sessionStorage`も確認）
5. `fetchYearOverYearData`の依存配列に`authCurrentStoreId`を追加

## 課題・注意点

### 解決した問題
- ✅ Shopify埋め込みアプリでの`localStorage`制限に対応
- ✅ ページ遷移時に`currentStoreId`が失われる問題を解消
- ✅ 他の分析画面（休眠顧客分析など）と同様の実装パターンに統一

### 今後の注意点
- 他の分析画面でも同様の問題が発生する可能性があるため、同様の修正パターンを適用する必要がある
- Shopify埋め込みアプリ環境での動作確認が必要

## 関連ファイル
- `frontend/src/components/dashboards/YearOverYearProductAnalysis.tsx`（修正）
- `frontend/src/lib/api-config.ts`（参照：`getCurrentStoreId`関数）
- `frontend/src/components/providers/AuthProvider.tsx`（参照：`setCurrentStoreId`関数）
- `frontend/src/components/dashboards/DormantCustomerAnalysis.tsx`（参考：同様の実装パターン）

## テスト項目

### 確認すべき動作
- [ ] Shopify埋め込みアプリ環境で前年同月比分析画面が正常に動作する
- [ ] ページ遷移時にストアIDが失われない
- [ ] `localStorage`にストアIDがない場合でも`sessionStorage`から取得できる
- [ ] エラーメッセージが表示されない
- [ ] APIリクエストが正常に実行される

## 参考情報
- 休眠顧客分析画面（`DormantCustomerAnalysis.tsx`）で同様の修正を実施済み
- `api-config.ts`の`getCurrentStoreId()`関数は`sessionStorage`も確認する実装になっている
