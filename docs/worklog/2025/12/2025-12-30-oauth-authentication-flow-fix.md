# 作業ログ: OAuth認証フロー修正（無限リダイレクトループ解消）

## 作業情報
- 開始日時: 2025-12-30 07:00:00
- 完了日時: 2025-12-30 22:14:22
- 所要時間: 約15時間（断続的な作業）
- 担当: 福田＋AI Assistant

## 作業概要

Shopify埋め込みアプリのOAuth認証フローにおいて発生していた複数の問題を修正しました。主な問題は以下の通りです：

1. **hostパラメータのBase64デコードエラー**: Shopifyのhostパラメータはパディング文字（=）が削除されたBase64形式
2. **EncryptionKeyの無効な値**: 開発環境で無効なBase64文字列が設定されていた
3. **UseFrontendProxy設定の問題**: 文字列からboolean変換が正しく行われていなかった
4. **無限リダイレクトループ**: `/auth/success` → Shopify管理画面 → `/install` → ... のループ
5. **localStorage制限**: サードパーティストレージの制限によりiframe内でlocalStorageが不安定

## 実施内容

### 1. バックエンド修正

#### DecodeHostメソッドの修正
- Base64パディングの動的追加（`mod = length % 4` で計算）
- URLデコード → Base64デコードの順序で処理
- フォールバックとしてURLデコードのみも対応

#### EncryptTokenメソッドの確認
- 空文字列の場合はBase64エンコードにフォールバック（開発環境用）

#### GetRedirectUriAsyncの修正
- `UseFrontendProxy` 設定を削除
- 常にフロントエンドプロキシ方式を使用
- データベースまたは環境変数からフロントエンドURLを取得

### 2. フロントエンド修正

#### AppBridgeProvider
- `/auth/success` と `/setup/initial` パスで `Redirect.toApp()` をスキップ
- URLパラメータが失われることを防止

#### AuthSuccessページ
- Shopify管理画面へのリダイレクトを削除
- 直接 `/setup/initial` にリダイレクト
- `storeId` をURLパラメータとして渡す
- sessionStorageフラグの設定タイミングを処理完了時に変更

#### InitialSetupページ
- URLパラメータから `storeId` を取得
- localStorageに保存（サードパーティストレージ制限の回避策）

#### AuthProvider
- `auth:error` イベントハンドラで `/auth/success` と `/setup/initial` パスではリダイレクトをスキップ
- OAuth認証フロー中の早期リダイレクト防止

## 成果物

### 修正ファイル一覧

| ファイル | 修正内容 |
|----------|----------|
| `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.Private.cs` | DecodeHost, GetRedirectUriAsync修正 |
| `backend/ShopifyAnalyticsApi/appsettings.*.json` | EncryptionKey, UseFrontendProxy設定変更 |
| `frontend/src/lib/shopify/app-bridge-provider.tsx` | Redirect.toApp()スキップロジック追加 |
| `frontend/src/app/auth/success/page.tsx` | リダイレクトロジック修正、storeIdパラメータ追加 |
| `frontend/src/app/setup/initial/page.tsx` | storeIdのURL→localStorage保存 |
| `frontend/src/components/providers/AuthProvider.tsx` | auth:errorハンドラのスキップロジック追加 |
| `frontend/src/app/install/page.tsx` | 認証状態監視の改善、useEffect分離 |
| `docs/05-development/09-認証・セキュリティ/EncryptionKey-設定ガイド.md` | 新規ドキュメント作成 |

## テスト結果

| # | 確認項目 | 結果 |
|---|----------|------|
| 1 | `/install` へのリダイレクトスキップ | ✅ 成功 |
| 2 | `/setup/initial` の表示 | ✅ 成功 |
| 3 | 最終画面（データ同期ダッシュボード） | ✅ 成功 |

## 課題・注意点

### 解決済み
- hostパラメータのBase64デコードエラー
- EncryptionKeyの設定問題
- UseFrontendProxy設定の読み込み問題
- 無限リダイレクトループ
- localStorage制限によるauth:errorリダイレクト

### 残課題（別タスク）
1. **画面のちらつき（UX改善）**: AppBridge/AuthProviderの初期化タイミング調整
2. **auth:errorイベント発火回数の制限**: エラーハンドリングの改善

## 技術的な学び

### Shopify iframe環境の制限
- サードパーティストレージの制限により、localStorageへの書き込みが無視される可能性がある
- 重要な情報はURLパラメータで渡すことを推奨
- `Redirect.toApp()` はURLパラメータを書き換えるため、認証コールバック後は使用を避ける

### OAuth認証フローのベストプラクティス
- Shopify埋め込みアプリでは `Redirect.toRemote()` を使用してトップレベルウィンドウでOAuth認証を行う
- コールバック後は直接アプリ内パスにリダイレクト（Shopify管理画面URLを経由しない）
- 認証状態の確認はAPIを使用し、localStorageのみに依存しない

## 関連ファイル
- `docs/05-development/09-認証・セキュリティ/EncryptionKey-設定ガイド.md`
- `docs/05-development/08-デバッグ・トラブル/04-troubleshooting/auth-success-sessionStorage-クリア方法.md`
