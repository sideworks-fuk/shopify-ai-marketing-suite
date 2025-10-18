# [Archived] ドキュメント再編アクション計画 - 2025-10-18

このファイルは整理のためアーカイブされました。最新版は `docs/01-project-management/04-organization/doc-cleanup/reorg-action-plan.md` を参照してください。

---

# ドキュメント再編アクション計画 - 2025-10-18

## 方針
- 破壊的変更は避け、まず参照統合→動作確認→削除/アーカイブの順で実施
- すべての移動はPR単位で小さく区切り、リンク張替えと同時に行う

## マッピング（初期案）
| 種別 | 現在の場所 | 目的地 | アクション |
|---|---|---|---|
| 重複 | docs/01-project-report/PM-001..004 | 99-archive/2025-10-19/ | アーカイブ移動、`01-project-management`正本参照を追記 |
| 重複 | docs/06-shopify/04-GDPR対応/GDPR_Webhook仕様.md | 00-production-release/gdpr-compliance/ | コンテンツ統合、旧場所は参照に置換 |
| 重複 | docs/06-shopify/03-GDPR/実装計画書.md | 00-production-release/gdpr-compliance/ | 要素抽出・統合、冗長部はアーカイブ |
| アーカイブ | docs/03-design-specs/archive/* | 99-archive/2025-10-19/ | 一括移動、必要箇所に参照リンク |
| 整理 | docs/00-production-release/billing-system/* | 同階層 | ファイル命名統一、README索引化 |

## 実行ステップ
1. 承認取得（最終フォルダ構造提案）
2. PM文書の重複解消（report→archive）
3. GDPRの正本統合（00-production-releaseへ統合、旧パスは参照）
4. design-specsのarchive統合（99-archiveへ移動）
5. リンク張替え、索引更新、チェックリスト更新

## 検証
- リンク切れ検査（相対リンク確認）
- チェックリスト/KPIの達成確認

## ロールバック
- 各PRのRevertで段階的に戻せるよう小分割

## 追跡
- ギャップ台帳（P1/P2）に全項目を起票し、担当/ETA管理
