# Webhook/GDPR 再処理（リプレイ）手順

## 目的
- 障害時にWebhookイベント/GDPRリクエストを安全に再処理する手順を示す

## 前提
- `WebhookEvents` と `GDPRRequests` に監査・冪等性キーが記録されている
- Hangfireダッシュボード `/hangfire` にアクセス可能

## 手順
1) 影響範囲の特定
   - 期間/ShopDomain/Topic を条件に監査ログを抽出
2) Webhookイベントの再送
   - `WebhookEvents.Payload` を取得 → 管理者端末から `/api/webhook/*` へ再送
   - 署名ヘッダはテスト用に無効化できないため、管理API経由の内部再処理を検討（将来対応）
3) GDPRの再実行
   - 対象`GDPRRequests`の`Status`を`pending`に変更
   - Hangfireの`GDPR:ProcessPendingRequests`を`Trigger`
4) 検証
   - 監査ログの重複なし（IdempotencyKey）
   - 最終状態の整合（DB/Shopify）

## 注意
- 本番では必ず事前に監査ログを保存し、作業後に差分確認を行う
- 大量再処理は段階的に実施








