# App Bridge CDN 対応 - 埋め込み式アプリチェック解消

**日付**: 2026-03-03
**対応者**: 福田 + AI Assistant
**コミット**: `5a0a2be`

## 対応内容

Shopify Partner Dashboard の「埋め込み式アプリのチェック」でアラートが出ていた問題を解消。

### 変更箇所

`frontend/src/app/layout.tsx` の `<head>` に以下を追加:

```html
<meta name="shopify-api-key" content="{NEXT_PUBLIC_SHOPIFY_API_KEY}" />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

### 結果

- Partner Dashboard の「埋め込み式アプリのチェック」が解消（スクリーンショットで確認済み 2026-03-04）
- 既存の `@shopify/app-bridge`（npm パッケージ）との共存で問題なし
- Shopify Partners 側の設定変更は不要
