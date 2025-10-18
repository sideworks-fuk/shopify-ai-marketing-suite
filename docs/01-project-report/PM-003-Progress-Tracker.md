---
title: PM-003 進捗管理表
version: v0.1
created: 2025-10-06 12:51:50 JST
updated: 2025-10-06 14:37:24 JST
owner: 福田＋AI Assistant
---

# PM-003 進捗管理表

## スナップショット日付
- 2025-10-06 12:51:50 JST（JST）

## マイルストーン
| 期日 | マイルストーン | 達成率 | リスク |
|---|---|---|---|
| 2025-09-12 | アプリ申請準備完了 | 85% | 提出物/検証の残（worklog参照） |
| 2025-10-中 | Staging通しE2E完了 | 60% | GDPR/課金/同期の通し検証 |

## タスク進捗（集約）
| タスクID | 名称 | 説明 | 優先度 | 担当 | 開始日 | 期限 | 進捗(%) | ステータス | 関連要件/機能 | 根拠リンク |
|---|---|---|---|---|---|---|---|---|---|---|
| T-001 | SHOPIFY_FRONTEND_BASEURL設定 | App Serviceの環境変数設定 | 🟡 | Yuki | - | - | 0 | 未着手 | R-001/F-001 | @todo.md L8-L16 |
| T-002 | リダイレクトE2E確認 | インストール〜コールバック | 🟡 | Yuki/Takashi | - | - | 0 | 未着手 | R-001/F-001 | @todo.md L13-L16 |
| T-003 | DBマイグレーションtracking更新 | 8/13スクリプト適用状況反映 | 🟡 | Takashi | - | - | 0 | 未着手 | - | @todo.md L18-L21 |
| T-004 | Hangfireダッシュボード確認 | /hangfire稼働確認 | 🟢 | Takashi | - | - | 0 | 未着手 | R-010/F-13 | @todo.md L23-L26 |
| T-008 | GDPR遅延ジョブ実装 | 本番用単発スケジュール | 🔴 | Takashi | - | - | 0 | 未着手 | R-002/F-13 | 実装状況確認と対応方針.md |
| T-009 | プラン初期データ投入 | SubscriptionPlansに初期4プラン | 🔴 | Takashi | - | - | 0 | 未着手 | R-003/F-005 | billing-implementation-status-2025-10-06.md |
| T-010 | interval表示整合 | Front/Backのinterval整合 | 🟡 | Yuki | - | - | 0 | 未着手 | R-003/F-005 | ソース参照 |
| T-011 | TestModeキー統一 | Shopify:TestModeに統一 | 🟡 | Kenji | - | - | 0 | 未着手 | R-003 | ソース参照 |
| T-005 | 申請素材整備 | アイコン/スクショ/説明文 | 🟡 | Kenji | - | - | 0 | 未着手 | R-005 | @todo.md L28-L31 |
| T-006 | フロント型エラー0維持 | 型チェック実行 | 🟢 | Yuki | - | - | 0 | 未着手 | - | @todo.md L33-L36, worklog week1 |
| T-007 | Staging E2E（通し） | Webhook/課金/GDPR | 🔴 | 全員 | - | - | 0 | 未着手 | R-002/R-003/R-010 | worklog week2/3 |

注記: 進捗%は当表作成時点の概算。詳細は各worklog/コミット参照。

## 根拠
- `@todo.md`
- `docs/worklog/2025/09/2025-09-week1-production-release.md`
- `docs/worklog/2025/09/2025-09-week2-production-release.md`
- `docs/worklog/2025/09/2025-09-week3-production-release.md`


