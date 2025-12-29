# ChunkLoadError 解消対応

## 作業情報
- 開始日時: 2025-12-29
- 完了日時: 2025-12-29
- 担当: 福田＋AI Assistant

## 問題概要

ngrok経由でNext.jsアプリケーションにアクセスした際、以下のエラーが発生：

```
ChunkLoadError: Loading chunk app/layout failed.
(timeout: https://unsavagely-repressive-terrance.ngrok-free.dev/_next/static/chunks/app/layout.js)
```

## 原因分析

1. **ngrokの警告ページ**: ngrokの無料プランでは、最初のリクエストで警告ページが表示されることがあり、それがJavaScriptの読み込みを妨げている
2. **チャンク読み込みのタイムアウト**: デフォルトのタイムアウト（30秒）が短すぎる可能性
3. **Next.js開発サーバーのバインド設定**: デフォルトでは`localhost`のみでバインドされており、外部アクセスが制限される可能性

## 対応内容

### 1. `next.config.js`の修正

**変更内容**:
- チャンク読み込みのタイムアウトを30秒から60秒に延長
- チャンク読み込みの安定性を向上させるための設定を追加

**変更箇所**:
```javascript
// チャンク読み込みのタイムアウトを延長（ngrok経由での読み込みを考慮）
config.output.chunkLoadTimeout = 60000 // 60秒に延長

// ngrok経由でのチャンク読み込みエラーを防ぐ設定
if (config.optimization) {
  config.optimization.moduleIds = 'deterministic'
  config.optimization.chunkIds = 'deterministic'
}
```

### 2. `package.json`の修正

**変更内容**:
- ngrok経由での開発用に、外部アクセス可能な開発サーバー起動スクリプトを追加

**追加したスクリプト**:
```json
"dev:ngrok": "next dev -H 0.0.0.0"
```

**使用方法**:
```powershell
# ngrok経由で開発する場合
npm run dev:ngrok
```

### 3. ngrok起動コマンドの改善

**変更内容**:
- ngrokの警告ページをスキップするオプションを追加

**推奨コマンド**:
```powershell
# 警告ページをスキップ（推奨）
ngrok http 3000 --host-header=rewrite --request-header-add="ngrok-skip-browser-warning: true"
```

**または、シンプルなコマンド**:
```powershell
ngrok http 3000 --host-header=rewrite
```

## 確認事項

### 1. Next.js開発サーバーの起動方法

**通常の開発**:
```powershell
npm run dev
```

**ngrok経由での開発**:
```powershell
npm run dev:ngrok
```

### 2. ngrokの起動方法

**推奨コマンド**:
```powershell
ngrok http 3000 --host-header=rewrite
```

**注意**: `--host-header=rewrite`オプションを使用することで、ngrokの警告ページをスキップし、チャンク読み込みエラーを防ぐことができます。

### 3. ブラウザでの確認

1. ngrok URLにアクセス（例: `https://unsavagely-repressive-terrance.ngrok-free.dev`）
2. 警告ページが表示されないことを確認
3. アプリケーションが正常に読み込まれることを確認
4. ブラウザのコンソールでエラーが発生していないことを確認

## トラブルシューティング

### 問題1: まだチャンク読み込みエラーが発生する

**解決方法**:
1. Next.js開発サーバーを再起動（`npm run dev:ngrok`）
2. ngrokトンネルを再起動（`--host-header=rewrite`オプション付き）
3. ブラウザのキャッシュをクリア
4. ブラウザの開発者ツールでネットワークタブを確認し、チャンクファイルが正しく読み込まれているか確認

### 問題2: ngrokの警告ページが表示される

**解決方法**:
1. ngrok起動時に`--host-header=rewrite`オプションを追加
2. または、`--request-header-add="ngrok-skip-browser-warning: true"`オプションを追加

### 問題3: 開発サーバーに接続できない

**解決方法**:
1. `npm run dev:ngrok`を使用して、外部アクセス可能な開発サーバーを起動
2. ファイアウォール設定を確認
3. ngrokトンネルが正しく起動しているか確認

## 関連ファイル

- `frontend/next.config.js`: Next.js設定ファイル（チャンク読み込みタイムアウト設定）
- `frontend/package.json`: 開発サーバー起動スクリプト
- `docs/05-development/01-環境構築/ngrok-ローカルテスト設定手順.md`: ngrok設定手順

## 参考情報

- [Next.js - Custom Webpack Config](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)
- [ngrok - Host Header Rewrite](https://ngrok.com/docs/ngrok-agent/config#host-header-rewrite)

## 更新履歴

- 2025-12-29: 初版作成
