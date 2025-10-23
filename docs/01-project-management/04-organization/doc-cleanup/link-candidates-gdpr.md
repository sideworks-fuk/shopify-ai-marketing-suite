# リンク張替え候補（GDPR関連）

## 目的
- GDPR関連で正本へのリンクに統一する候補を列挙

## 優先候補（参照元 → 参照先）
- `docs/06-shopify/04-GDPR対応/GDPR_Webhook仕様.md` → `docs/00-production-release/03-gdpr-compliance/GDPR_Webhook仕様.md`
- `docs/06-shopify/03-GDPR/実装計画書.md` → `docs/00-production-release/03-gdpr-compliance/実装計画書.md`
- `docs/06-shopify/03-GDPR/*` → `docs/00-production-release/03-gdpr-compliance/*`
- `docs/03-design-specs/02-backend/controllers.md` 内のGDPRリンク → `docs/00-production-release/03-gdpr-compliance/*`

## 実施順
1) 参照化テンプレを旧ファイル先頭に追加
2) 正本側の章・見出しを固定（リンク先安定化）
3) 本ファイルの候補に従って相対リンクを張替え

## 備考
- 既存の外部参照がある場合は、旧ファイルを即削除せず参照化で告知
