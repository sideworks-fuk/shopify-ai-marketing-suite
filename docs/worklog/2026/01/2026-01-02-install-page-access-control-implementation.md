# 作業ログ: /install ページ アクセス制御実装

## 作業情報
- 開始日時: 2026-01-02 22:30:00
- 完了日時: 2026-01-02 22:40:54
- 所要時間: 約10分
- 担当: 福田＋AI Assistant

## 作業概要

Shopify公開アプリとして、正規のインストール経路（App Store経由）以外からの不正なインストールを防止する機能を実装しました。

## 実施内容

### 1. 新規ファイル作成

#### `frontend/src/constants/shopify.ts`
- Shopify App Store URL定数（`SHOPIFY_APP_STORE_URL`）を定義
- アプリタイプ定数（`SHOPIFY_APP_TYPE`）を定義
- 環境変数で設定可能、未設定時はフォールバック値を使用

### 2. `frontend/src/app/install/page.tsx` の修正

#### 2.1 import追加
- `getCurrentEnvironment` を `@/lib/config/environments` から追加
- `SHOPIFY_APP_STORE_URL`, `SHOPIFY_APP_TYPE` を `@/constants/shopify` から追加

#### 2.2 判定ロジック追加
- 正規アクセス経路の判定ロジックを追加
  - `isEmbedded`: 埋め込みモード
  - `hasShopParam`: App Store経由（`shop`パラメータ）
  - `hasAuthSuccess`: OAuth成功後（`auth_success=true`パラメータ）
  - `hasStoreId`: ストアID付き（認証済みアクセス）
  - `isDevelopment`: 開発環境
- `shouldBlockManualInput` フラグを追加（公開アプリの場合のみブロック）

#### 2.3 ログ記録用useEffect追加
- 非正規アクセス検出時にコンソールに警告ログを出力

#### 2.4 警告バナー追加
- 直接アクセス時に警告バナーを表示
- App Storeへのリンクボタンを表示（URLが設定されている場合）

#### 2.5 TextField の disabled 条件更新
- `shouldBlockManualInput` を条件に追加
- `helpText` を条件に応じて変更

#### 2.6 Button の disabled 条件更新
- `shouldBlockManualInput` を条件に追加

### 3. 環境変数の設定

#### `frontend/env.sample` に追加
- `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL`: App Store URL
- `NEXT_PUBLIC_SHOPIFY_APP_TYPE`: アプリタイプ（Public/Custom）

## 成果物

### 作成・修正したファイル
- `frontend/src/constants/shopify.ts`（新規作成）
- `frontend/src/app/install/page.tsx`（修正）
- `frontend/env.sample`（更新）

### 主要な変更点

1. **アクセス制御ロジック**
   - 正規アクセス経路の判定（埋め込みモード、App Store経由、OAuth成功後、認証済み、開発環境）
   - 公開アプリの場合のみ直接アクセスをブロック

2. **UI変更**
   - 警告バナーの追加（直接アクセス時）
   - 入力フィールドとボタンの無効化（直接アクセス時）

3. **ログ記録**
   - 非正規アクセス検出時の警告ログ出力

## テスト項目

以下のテストケースを実施する必要があります：

| # | テスト内容 | 期待結果 |
|---|-----------|---------|
| 1 | 開発環境で `/install` に直接アクセス | ✅ ボタン有効（開発環境は許可） |
| 2 | 本番環境で `/install` に直接アクセス | ❌ 警告バナー表示、ボタン無効 |
| 3 | `?shop=xxx` パラメータ付きアクセス | ✅ ボタン有効、自動リダイレクト |
| 4 | `?auth_success=true` パラメータ付き | ✅ ボタン有効（OAuth成功後） |
| 5 | 埋め込みモードでアクセス | ✅ ボタン有効 |

## 課題・注意点

1. **環境変数の設定**
   - 本番環境では `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` を実際のApp Store URLに設定する必要がある
   - 各環境で `NEXT_PUBLIC_SHOPIFY_APP_TYPE` を適切に設定する必要がある

2. **既存機能への影響**
   - OAuth成功後のフロー（`auth_success=true`）は正規アクセスとして扱われ、影響なし
   - 埋め込みモードでのアクセスは影響なし
   - 開発環境でのテストは影響なし

3. **カスタムアプリへの対応**
   - `SHOPIFY_APP_TYPE` が `'Custom'` の場合は、直接アクセスが許可される

## 関連ファイル

- 仕様書: `docs/08-shopify/01-申請関連/仕様書-直接アクセス制御-v2.0.md`
- 作業指示書: `docs/08-shopify/01-申請関連/作業指示書-直接アクセス制御実装.md`
- 検討ドキュメント: `docs/08-shopify/01-申請関連/検討-直接アクセス時の接続ボタン制御.md`

## 次のステップ

1. [ ] ローカル環境でテスト実施
2. [ ] ステージング環境でテスト実施
3. [ ] 本番環境でテスト実施
4. [ ] 環境変数の設定確認（各環境）
5. [ ] コードレビュー
