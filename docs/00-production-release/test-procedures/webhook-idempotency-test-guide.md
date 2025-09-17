# Webhook 冪等性・署名検証テスト手順

## 前提
- 環境変数
  - API_BASE: 例 `https://stg-api.ec-ranger.example.com`
  - SHOP_DOMAIN, HMAC（生成式）, WEBHOOK_ID など
- テスト資材
  - `backend/ShopifyAnalyticsApi/Tests/Webhook-Idempotency.http`

## シナリオ
1) customers-redact 正常 → 200、`GDPRRequests`作成、`WebhookEvents`1件（IdempotencyKey設定）
2) customers-redact 重複送信 → 200、`GDPRRequests`重複なし、`WebhookEvents`重複なし
3) app/uninstalled 正常 → 200、`StoreSubscriptions`が最終的に`cancelled`、Shopify側も取消
4) HMAC不正 → 403、副作用なし（DB不変）

## 観点
- 冪等性: `WebhookEvents.IdempotencyKey`ユニーク制約で重複抑止
- 監査: `WebhookEvents`に1回のみ記録
- セキュリティ: HMAC固定時間比較、失敗時403
- 非同期: GDPRはHangfireにより5分以内に処理

## 補足
- 順不同到達検証: `shop-redact`→`customers-redact`の順で送付し整合性が保たれること
- 負荷: `app/uninstalled`を連続10回送信して最終状態が正しく一致
