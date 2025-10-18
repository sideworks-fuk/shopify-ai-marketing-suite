# ドキュメント監査チェックリスト（作業版）

（元: document-audit-checklist-2025-10-18.md）

## 判定ルール
- 正本: 最も信頼すべき保守対象。単一箇所を維持
- 重複: 同内容が複数箇所に存在。正本に統合し他はアーカイブ
- 旧版: 以前の計画・設計。参照価値が低ければアーカイブ
- 誤情報: 実装と乖離/誤り。修正またはアーカイブ

## チェック観点
- 最新性（更新日/内容）
- 整合性（実装/他文書との一致）
- 一意性（重複の有無）
- 参照性（リンク/索引の有無）
- 追跡性（証跡/チケット/PR紐付け）

## スコアリング（例）
- 最新性: 0-2
- 整合性: 0-3
- 一意性: 0-2
- 参照性: 0-1
- 追跡性: 0-2
- 合計 0-10（7以上: 正本維持、4-6: 要更新、3以下: アーカイブ候補）

## 実施記録
| パス | 判定 | スコア | アクション | 根拠リンク | 担当 | 期限 |
|---|---|---|---|---|---|---|
| docs/00-production-release/RELEASE-CHECKLIST.md | 正本 | 9 | 維持・証跡リンク追記 |  | Kenji | 2025-10-18 |
| docs/00-production-release/shopify-submission/* | 正本 | 8 | スクショ差替え後リンク更新 |  | 福田 | 2025-10-18 |
| docs/00-production-release/03-gdpr-compliance/* | 正本 | 7 | 06-shopify側の重複を参照化 |  | Takashi(提案)/Kenji(実行) | 2025-10-19 |
| docs/01-project-report/PM-00*.md | 重複 | 6 | 99-archiveへ移動（参照追記） |  | Kenji | 2025-10-19 |
| docs/03-design-specs/frontend/api-config.md | 正本候補 | 8 | 維持（使用例のimportを最新に整合） | frontend/src/lib/api-config.ts | Yuki | 2025-10-18 |
| docs/03-design-specs/frontend/routing-and-auth.md | 要更新 | 5 | 内容更新（Clerk記述を方針メモ化、実装はcookiesトークン検証） | frontend/src/app/(authenticated)/layout.tsx, frontend/middleware.ts | Yuki | 2025-10-18 |
| docs/03-design-specs/frontend/page-billing.md | 要更新 | 6 | 実装整合（SubscriptionProvider/useSubscription前提を明記、ルートは /billing と /settings/billing の重複整理） | frontend/src/app/billing/page.tsx, frontend/src/app/settings/billing/page.tsx | Yuki | 2025-10-18 |
| docs/03-design-specs/screen-designs/README.md | 正本 | 7 | 維持（索引の相対リンク確認） | docs/03-design-specs/screen-designs/* | Yuki | 2025-10-18 |
| docs/03-design-specs/frontend/examples-and-faq.md | 要確認 | 4 | 参照リンクの更新（API/ルーティング章への相対リンク） | docs/03-design-specs/frontend/* | Yuki | 2025-10-18 |
| docs/00-production-release/03-gdpr-compliance/GDPR_Webhook仕様.md | 正本 | 9 | 維持（正本）・他箇所は参照化 | backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs | Takashi | 2025-10-19 |
| docs/00-production-release/03-gdpr-compliance/実装状況確認と対応方針.md | 正本 | 8 | 維持・ルート表記統一（/api/webhook vs /api/webhooks） | 実装と差分あり（ルート表記） | Takashi | 2025-10-19 |
| docs/00-production-release/03-gdpr-compliance/実装計画書.md | 正本 | 8 | 維持・最新実装との整合点検 | Controllers/Services 実装あり | Takashi | 2025-10-19 |
| docs/06-shopify/04-GDPR対応/GDPR_Webhook仕様.md | 重複 | 5 | 正本へ統合・旧パスは参照に置換 | 正本と内容重複 | Takashi | 2025-10-19 |
| docs/06-shopify/03-GDPR/実装計画書.md | 重複/旧版 | 5 | 正本へ統合・差分のみ残す | 00-production-release側が正本 | Takashi | 2025-10-19 |
| docs/03-design-specs/backend/controllers.md | 要更新 | 6 | ルート表記統一・GDPR endpoints整合 | 実装: /api/webhook/* | Takashi | 2025-10-19 |
| docs/03-design-specs/backend/services.md | 正本候補 | 7 | 維持・GDPR冪等/非同期を明確化 | 実装方針と一致 | Takashi | 2025-10-19 |
| docs/03-design-specs/backend/middleware-jobs-models.md | 正本候補 | 7 | 維持・Hangfire定期/遅延の補足 | 運用要件の補強余地 | Takashi | 2025-10-19 |
| docs/02-architecture/02-データベース設計/データベースモデル一覧.md | 要更新 | 6 | GDPR/監査系モデルの最新化 | 実装/DDLと差分あり | Takashi | 2025-10-19 |
| docs/04-development/03-データベース/マイグレーション/2025-08-24-AddGDPRTables.sql | 正本 | 8 | 維持 | GDPRRequests/Logs/Stats作成あり | Takashi | 2025-10-19 |
| docs/04-development/03-データベース/設計・モデリング/データベース設計書.md | 正本 | 8 | 維持・IdempotencyKeyユニーク制約DDL追記要 | WebhookEvents差分指摘あり | Takashi | 2025-10-19 |
| docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md | 正本 | 7 | 要更新（IdempotencyKey Unique追加時に追記） | 現状ユニーク制約未記載 | Takashi | 2025-10-19 |
| docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md | 提案 | 7 | 追記案: IdempotencyKey Uniqueの明記、課金DDLの環境別適用状況の最新化 | 2025-08-24/25 DDLおよびMASTERで存在確認済 | Takashi | 2025-10-19 |
| docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md | 追記セル案 | 7 | 行: `2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql` → Development: ✅(2025-08-25 13:10) / Staging: ⏳ / Production: ⏳ | DDL・実装整合済 | Takashi | 2025-10-19 |
| docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md | 追記セル案 | 7 | 行: `2025-08-24-CreateBillingTables.sql` → Development: ✅(2025-08-25) / Staging: ⏳ / Production: ⏳ | DDL・実装整合済 | Takashi | 2025-10-19 |
| backend/ShopifyAnalyticsApi/Data/ShopifyDbContext.cs | 整合 | 8 | 課金/監査DbSetの存在確認済（DDLと一致） | SubscriptionPlans/StoreSubscriptions定義あり | Takashi | 2025-10-19 |
| docs/03-design-specs/screen-designs/README.md | 要更新 | 6 | 相対リンクチェックリストを提案章に追記（索引確認） | docs/03-design-specs/screen-designs/* | Yuki | 2025-10-18 |
| docs/03-design-specs/screen-designs/product-analysis/README.md | 要更新 | 5 | 子ドキュメント・親戻りリンクの確認を実施 | docs/03-design-specs/screen-designs/product-analysis/* | Yuki | 2025-10-18 |
| docs/03-design-specs/screen-designs/purchase-analysis/README.md | 要更新 | 5 | 子ドキュメント・親戻りリンクの確認を実施 | docs/03-design-specs/screen-designs/purchase-analysis/* | Yuki | 2025-10-18 |
| docs/03-design-specs/screen-designs/customer-analysis/README.md | 要更新 | 5 | 子ドキュメント・親戻りリンクの確認を実施 | docs/03-design-specs/screen-designs/customer-analysis/* | Yuki | 2025-10-18 |
