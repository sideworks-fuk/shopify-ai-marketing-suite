# Takashiへの依頼事項（2025-09-17）

## 21:40 指示（GDPR/マイグレーション/課金）

### 1) GDPR Webhook 実装/再検証（最優先）
- エンドポイント
  - POST `/api/webhooks/customers/data_request`
  - POST `/api/webhooks/customers/redact`
  - POST `/api/webhooks/shop/redact`
  - POST `/api/webhooks/app/uninstalled`（サブスクリプションキャンセル必須）
- 必須事項
  - HMAC署名検証、Idempotency、監査ログ（WebhookEvents 記録）
  - リトライ/順不同到達の耐性、冪等処理、5秒以内の応答

### 2) DBマイグレーション（支援/検証）
- 福田さんがStaging適用を担当。Takashiは手順確認・適用後の検証・問題切り分けを支援。
- `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md` の更新点レビュー。

### 3) 課金/BillingController 最終統合
- 課金作成/キャンセル/更新フローの通し確認
- Postman/Insomnia コレクション更新（共有可能な形）

### 期限/報告
- 期限: 9/18 AM（E2E開始前）
- 報告: `ai-team/conversations/report_takashi.md`

## 21:58 開始合図
- 指示どおり、GDPR→app_uninstalled課金キャンセル→Billing統合の順で着手。
- 進捗は`report_takashi.md`へ、ブロッカーは`to_kenji.md`へ。

## 2025-09-17 23:14 Kenji → Takashi 回答（GDPR/課金/DB）

- 【app/uninstalled連動】
  - 了承。`WebhookController`経由で `ShopifySubscriptionService.CancelSubscriptionAsync` を必ず呼ぶ実装にしてください。ローカルDBのCANCELLED更新とShopify側キャンセルの双方を必須（順不同到達を考慮し冪等に）。

- 【Webhook監査の冪等性】
  - 了承。`IdempotencyKey = hash(StoreDomain + Topic + created_at + X-Shopify-Webhook-Id)` を推奨。`WebhookEvents(IdempotencyKey)` にユニーク制約を設定し、重複はUPSERTで無視。

- 【GDPRの非同期化】
  - 了承。Hangfireジョブ名「GDPR:ProcessPendingRequests」、CRON「*/5 * * * *」で進めてください。5秒応答要件は受付ACKで満たし、実処理は非同期。

- 【セキュリティ】
  - 了承。HMAC比較は`FixedTimeEquals`へ切替。ヘッダ未在/不正時は即403、検証OK後のみ処理。

- 【DBマイグレーション検証観点】
  - 合意。「Subscription/Feature/GDPR/Indices」。加えて`WebhookEvents.IdempotencyKey`のユニーク制約確認も含めてください。

- 【E2E前提（値確認）】
  - Frontend: `NEXT_PUBLIC_API_URL` = https://stg-api.ec-ranger.example.com
  - Backend: `AppUrl` = https://stg-api.ec-ranger.example.com
  - Shopify: `WebhookSecret` = （Staging値。to_fukuda.mdに記載のもの）
  - 上記で問題なければ明日のE2Eで固定使用。値差異があれば`to_kenji.md`で指摘お願いします。

## 2025-09-17 23:18 Kenji → Takashi 指示（提案承認と実装順）

- 提案1) app/uninstalledでの`CancelSubscriptionAsync`呼び出し: 承認。PR#1で実装。
- 提案2) `LogWebhookEvent`への`IdempotencyKey`設定＋ユニーク制約: 承認。PR#2。
- 提案3) GDPR pending処理のHangfire定期実行（*/5分）: 承認。PR#3。
- 提案4) HMAC比較の固定時間比較: 承認。PR#4（セキュリティ改善）。

実装順: 1 → 2 → 4 → 3（E2E準備の都合でキャンセル→冪等→セキュリティ→非同期の順）

テスト: Postman/Insomniaのコレクション更新、監査ログの重複抑止確認、app/uninstalledの再送冪等確認を含めること。

## 2025-09-17 23:41 指示（短期実装と受け入れ基準）

### 実装タスク（PRを分割）
1) app/uninstalledでのサブスクリプション取消
   - `WebhookController`から`ShopifySubscriptionService.CancelSubscriptionAsync`を必ず呼ぶ
   - ローカルDB更新とShopify側取消の冪等を担保（重複/順不同）
2) 監査ログのIdempotencyKey対応
   - `IdempotencyKey = hash(StoreDomain + Topic + created_at + X-Shopify-Webhook-Id)`
   - `WebhookEvents(IdempotencyKey)`にユニーク制約、重複UPSERT無視
3) HMAC固定時間比較
   - `CryptographicOperations.FixedTimeEquals`へ切替、失敗時は403で副作用なし
4) GDPR非同期化（Hangfire）
   - ジョブ名: `GDPR:ProcessPendingRequests`、CRON: `*/5 * * * *`
   - 受付ACKで5秒応答、実処理は非同期

### 受け入れ基準（抜粋）
- app/uninstalled: 再送/順不同でもDBとShopifyの状態が正しく最終一致
- 監査ログ: 重複登録が発生しない（ユニーク制約で抑止）
- HMAC: 署名不正時は403・副作用なし、正当時のみ処理
- GDPR: pendingが5分以内に処理され、Overdue警告が出ない

### 提出物
- 分割PRリンク、Postman/Insomniaコレクション更新、簡易テスト結果

ブロッカーがあれば即 `to_kenji.md` へ。

## 2025-09-17 23:52 Kenji → Takashi 受領・次アクション

- 受領: HMAC固定時間比較、app/uninstalledのShopify側キャンセル呼出し、監査ログIdempotencyKey、Hangfire登録の実装を確認しました。ありがとうございます。

### 次アクション（検証重点）
1) 冪等性検証
   - app/uninstalled 再送/順不同ケースで最終状態一致を確認（DB/Shopify双方）。
2) 監査ログ重複抑止
   - `WebhookEvents(IdempotencyKey)`ユニーク制約で重複無しを確認（意図的重送テスト）。
3) コレクション更新
   - Postman/Insomnia に 正常/重複/順不同/403 のケースを追加し共有。
4) PR提出
   - 分割PR（1→2→4→3の順）を作成し、`report_takashi.md`へリンク貼付。

ブロッカーは `to_kenji.md` へ。

## 2025-09-17 23:56 追加指示（検証強化/テスト/運用準備）

### 検証強化
- 署名不正/HMAC欠落ヘッダ時の403応答・副作用ゼロの確認
- Webhook受信の順不同（shop.redact → customers.redact など）でも整合が崩れないこと
- Hangfire停止時の挙動（キュー滞留）と再起動後の追従処理確認

### テスト
- Postman/Insomnia: シナリオフォルダを作成（正常/重複/順不同/403）し、環境変数でURL/シークレット差し替え可能に
- 監査ログ: 重複キー投入テスト（ユニーク制約/UPSERT）
- 負荷: app/uninstalledを連続10回送信した際の冪等確認

### 運用準備
- `database-migration-tracking.md`の更新レビュー（福田作業）
- 例外時のアラート設計（Application Insights/LogAnalyticsのクエリとダッシュボード雛形）
- Readmeに「GDPR5秒応答/非同期化/監査ログ/IdempotencyKey」方針を追記

完了したら`report_takashi.md`に結果とPRリンクを記載してください。

## 2025-09-18 00:14 指示（Staging検証の受け入れ基準/提出物）

### 受け入れ基準（Staging）
- Webhook
  - 正常（customers/data_request, customers/redact, shop/redact, app/uninstalled）: 200応答、監査ログ記録
  - 重複/順不同: 最終状態の整合（DB/Shopify）と監査ログ重複なし
  - 403（HMAC不正/欠落）: 副作用ゼロ
- Billing
  - `subscribe|upgrade`→`confirmationUrl`→承認→`/api/subscription/confirm`→status/history更新
  - app/uninstalledでキャンセル→Shopify/DBともにCANCELLED
- GDPR非同期
  - pendingが5分以内に処理、停止→再起動後も追従

### 提出物
- Postman/Insomniaコレクション（環境付き）
- 実行ログ/監査ログの抜粋（IdempotencyKey確認）
- 分割PRリンク（#1, #2, #4, #3）
- 検証結果サマリを`report_takashi.md`へ

## 2025-09-18 00:16 追加指示（監視/耐障害/セキュリティ強化）

### 監視/ログ
- 構造化ログに必須フィールドを追加: `store`, `topic`, `webhookId`, `idempotencyKey`, `result`, `latencyMs`, `correlationId`
- Application Insights: 403/5xx 監視用のKQLクエリとアラート（5分間に>=3件で通知）

### 耐障害
- Hangfire: GDPRジョブのワーカー/再試行設定を安全側に（並列1、指数バックオフ）
- リプレイ手順: 監査ログからの再処理手順を手順mdに1章追加（Webhook再送、GDPR再実行）

### セキュリティ
- Topic許可リスト（4種+必要な課金系）のみ受理、それ以外は早期403
- リクエストサイズ上限の確認と設定（過大ペイロード拒否）
- 署名検証前に`X-Shopify-Topic`/`X-Shopify-Shop-Domain`/`X-Shopify-Webhook-Id` の存在チェック

提出: 変更PRリンクとアラートKQL、手順mdの該当章を`report_takashi.md`へ。