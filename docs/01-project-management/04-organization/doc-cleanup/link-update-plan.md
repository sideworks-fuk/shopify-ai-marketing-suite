# リンク更新計画（Docs Cleanup）

## 目的
- 参照統合後に相対リンクを正本へ一貫して張替え、リンク切れを防止する

## 優先リンク更新
1) 00-production-release配下の手順/チェックリストから、GDPR正本`gdpr-compliance/*`へのリンク
2) PM-003/PM-004からdoc-cleanup配下（audit/reorg/decisions）へのリンク
3) design-specsから`01-project-management`と`00-production-release`への正本参照（完了）

## 優先リンク更新（Frontend追加）
- [x] `docs/03-design-specs/frontend/page-billing.md` → ルート表記を `/billing` に統一（参照先）
- [x] `docs/03-design-specs/frontend/routing-and-auth.md` → 現行保護手段（cookies + middleware）への参照明確化
- [x] `docs/03-design-specs/frontend/api-config.md` → 使用例と優先順の説明整合
- [ ] `docs/03-design-specs/screen-designs/*/README.md` → 親子間の相対リンクを統一

## 手順
- 変更ごとに対象MDを列挙→相対リンクへ統一→ローカル検証
- スクショ/証跡は提出物フォルダに集約し、相対リンクで接続

## チェックリスト
- [x] 00-production-release → gdpr-complianceリンク更新
- [x] PM-003/PM-004 → doc-cleanupリンク追加
- [x] design-specs → 正本参照の張替え
- [ ] 99-archive移動後のリンク切れ確認

## 実施ログ
- 2025-10-18: 初版作成
- 2025-10-18 夕: `docs/03-design-specs/backend/controllers.md` にGDPR正本への関連リンク節を追加（正本参照に統一）
- 2025-10-18 夕: `docs/03-design-specs/backend/services.md` にGDPR正本への関連リンク節を追加
- 2025-10-18 夕: `docs/03-design-specs/backend/middleware-jobs-models.md` にGDPR正本への関連リンク節を追加
- 2025-10-18 夜: `docs/03-design-specs/backend/README.md`, `examples-and-faq.md` にGDPR正本への関連リンク節を追加

## 具体リンク張替え候補（Frontend 8件以上）
- [x] `docs/03-design-specs/frontend/page-billing.md#注意` → （参照追記）`docs/03-design-specs/frontend/routing-and-auth.md`
- [x] `docs/03-design-specs/frontend/page-billing.md` 内の `/settings/billing` 記述 → `/billing`（本文・見出し・例）
- [x] `docs/03-design-specs/frontend/examples-and-faq.md` のAPI例→ `./api-config.md` への相対リンク
- [x] `docs/03-design-specs/frontend/examples-and-faq.md` の認証参照→ `./routing-and-auth.md`
- [x] `docs/03-design-specs/frontend/routing-and-auth.md` のAPI参照→ `./api-config.md`
- [x] `docs/03-design-specs/frontend/routing-and-auth.md` のBilling参照→ `./page-billing.md`
- [x] `docs/03-design-specs/frontend/api-config.md` の認証参照→ `./routing-and-auth.md`
- [x] `docs/03-design-specs/frontend/api-config.md` のBilling参照→ `./page-billing.md`
- [x] `docs/03-design-specs/screen-designs/README.md` の各カテゴリREADME参照→ 相対リンクの現行維持確認
- [x] `docs/03-design-specs/screen-designs/product-analysis/README.md` → 親README `../README.md` への戻りリンク
- [x] `docs/03-design-specs/screen-designs/purchase-analysis/README.md` → 親README `../README.md` への戻りリンク
- [x] `docs/03-design-specs/screen-designs/customer-analysis/README.md` → 親README `../README.md` への戻りリンク

## 具体リンク張替え候補（Frontend 8件以上・アンカー付き）
- [x] `docs/03-design-specs/frontend/routing-and-auth.md` → `docs/03-design-specs/frontend/api-config.md#注意事項`
- [x] `docs/03-design-specs/frontend/routing-and-auth.md#認証保護の実装方針（現行）` → `docs/03-design-specs/frontend/page-billing.md#統合前提`
- [x] `docs/03-design-specs/frontend/api-config.md` → `docs/03-design-specs/frontend/routing-and-auth.md#認証保護の実装方針（現行）`
- [x] `docs/03-design-specs/frontend/api-config.md#注意事項` → `docs/03-design-specs/frontend/page-billing.md#統合前提`
- [x] `docs/03-design-specs/frontend/page-billing.md#注意（/settings/billing との整合）` → `docs/03-design-specs/frontend/routing-and-auth.md#認証保護の実装方針（現行）`
- [x] `docs/03-design-specs/frontend/examples-and-faq.md#faq` → `docs/03-design-specs/frontend/api-config.md#注意事項`
- [x] `docs/03-design-specs/frontend/examples-and-faq.md#faq` → `docs/03-design-specs/frontend/routing-and-auth.md#認証保護の実装方針（現行）`
- [x] `docs/03-design-specs/frontend/examples-and-faq.md#faq` → `docs/03-design-specs/frontend/page-billing.md#統合前提`
- [x] `docs/03-design-specs/screen-designs/product-analysis/README.md` → `docs/03-design-specs/screen-designs/README.md#🔍-クイックアクセス`
- [x] `docs/03-design-specs/screen-designs/purchase-analysis/README.md` → `docs/03-design-specs/screen-designs/README.md#🔍-クイックアクセス`
- [x] `docs/03-design-specs/screen-designs/customer-analysis/README.md` → `docs/03-design-specs/screen-designs/README.md#🔍-クイックアクセス`
