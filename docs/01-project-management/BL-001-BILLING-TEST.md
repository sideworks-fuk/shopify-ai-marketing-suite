# BL-001 課金機能テスト実施（進捗共有用）

- 作成日時: 2025-10-06 16:55:50 JST
- 更新日時: 2025-10-06 16:55:50 JST
- 目的: 非エンジニアと進捗・状況を共有（実装の詳細はエンジニア文書で管理）

## 概要
Shopifyアプリの課金機能（月額サブスクリプション）のテストを実施し、公開申請前に動作確認を完了させる。

## 背景
- 複数プランの実装完了（Free/Basic/Professional/Enterprise）
- 申請前に本番相当フローの確認が必要
- 開発ストアでの test:true によるE2E、審査通過後はUnlisted配布で実課金スモーク推奨

## 現在のステータス
🟡 実施中（Phase 1完了、Phase 2 実施中）

## 完了条件
- 本チケットのチェック項目が全て完了し、課金フローが正常動作であること

## 担当
- メイン: Takashi（バックエンド）
- サポート: Yuki（フロントエンド）

## 期限
- 申請の2日前（TBD）

## 進捗チェックリスト

### Phase 1: 開発ストアテスト ✅ 完了
- [x] テスト環境構築（開発ストア）
- [x] test:trueモードでの課金フロー確認（承認URL→成功遷移）
- [x] プラン切替テスト（複数プラン）
- [x] 無料トライアル機能の動作確認
- [x] Webhook受信確認（`/api/webhook/subscriptions-update` / `.../subscriptions-cancel`）

### Phase 2: 本番相当テスト 🔄 実施中
- [x] アプリ設定の確認（returnUrl → Backend `/api/subscription/confirm` → Front `/subscription/success`）
- [ ] 最小金額でのスモーク（$1.00 推奨、$0.01は通貨/地域で不可の可能性あり）
- [ ] Shopify管理画面での表示確認（承認・請求・キャンセル）
- [ ] 課金キャンセル処理の確認
- [ ] プランアップグレードのテスト
- [ ] テスト結果のドキュメント化（ログ/スクショ/AIクエリ）

### Phase 3: 最終確認 ⏳ 未着手
- [ ] 全機能の統合テスト
- [ ] エラーケースの確認（通信/重複/失敗時の復元）
- [ ] パフォーマンステスト（必要に応じて）
- [ ] 申請用スクリーンショット準備

## 備考
- 実課金テストは審査通過後、Unlisted配布で自社有料ストア1件に限定して実施推奨（最小額＋即キャンセル）
- interval表記の整合（Back: "EVERY_30_DAYS" → Frontで月表示に正規化）を合わせ込み
- TestMode設定は `Shopify:TestMode` を使用（ガイド/設定を統一）

## 関連ドキュメント
- 課金システム実装状況: `docs/00-production-release/billing-system/billing-implementation-status-2025-10-06.md`
- 課金機能テストガイド: `docs/00-production-release/billing-system/課金機能テストガイド.md`
- 実装: `backend/ShopifyAnalyticsApi/Controllers/BillingController.cs`, `SubscriptionController.cs`
- サービス: `backend/ShopifyAnalyticsApi/Services/ShopifySubscriptionService.cs`
- フロント: `frontend/src/app/billing/page.tsx`, `frontend/src/hooks/useSubscription.ts`
