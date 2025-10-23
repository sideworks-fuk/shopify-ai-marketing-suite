# ドキュメント再編アクション計画（作業版）

（元: reorg-action-plan-2025-10-18.md）

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
| 整理 | frontend/src/app/billing, frontend/src/app/settings/billing | frontend/src/app/billing | ルート統合提案（/settings/billing は参照 or リダイレクト）。関連ドキュメントの記載を /billing に統一 |

## 追加提案（本日）
| 種別 | 現在の場所 | 目的地 | アクション |
|---|---|---|---|
| 正本統一 | docs/06-shopify/03-GDPR/*, 04-GDPR対応/* | 00-production-release/gdpr-compliance/* | 重要項目のみ正本へ統合、旧ファイルは参照化 |
| 重複 | docs/01-project-report/PM-00*.md | 99-archive/2025-10-19/ | アーカイブ移動、正本は`01-project-management`側を参照 |
| ルート表記整合 | `docs/03-design-specs/backend/controllers.md` | 同ファイル | GDPRエンドポイントの表記を `/api/webhook/...` に統一（注記で`/api/webhooks`表記との揺れを記載） |
| DDL追補 | `docs/04-development/03-データベース/マイグレーション/` | 同ディレクトリ | `WebhookEvents.IdempotencyKey` のユニークインデックスDDL追加（Filtered Unique）。tracking.mdへ記録 |
| DDL追補（詳細） | 同上 | 同上 | 具体案: `ALTER TABLE WebhookEvents ADD IdempotencyKey NVARCHAR(255) NULL; CREATE UNIQUE INDEX UX_WebhookEvents_IdempotencyKey ON WebhookEvents(IdempotencyKey) WHERE IdempotencyKey IS NOT NULL;` |
| 設計差分解消 | `docs/02-architecture/02-データベース設計/データベースモデル一覧.md` | 同ファイル | GDPR/監査テーブルと実装・DDLの差分を反映（項目/インデックス） |

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
