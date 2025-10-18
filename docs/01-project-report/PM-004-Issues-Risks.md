---
title: PM-004 課題・リスク一覧
version: v0.1
created: 2025-10-06 12:51:50 JST
updated: 2025-10-06 14:37:24 JST
owner: 福田＋AI Assistant
---

# PM-004 課題・リスク一覧

## 重大度基準
- 🔴 重大: 期限に直結/本番インシデントに発展可能
- 🟡 重要: 申請/品質に影響、中期で要対処
- 🟢 通常: 影響限定的、計画内で収束

## 課題一覧
| ID | タイトル | 種別 | 重要度 | 状態 | 起点 | 対応策 | 期限 | 担当 | 根拠 |
|---|---|---|---|---|---|---|---|---|---|
| I-001 | Devルート遮断の二重定義 | 課題 | 🟡 | 未着手 | frontend `middleware.ts` と `src/middleware.ts` 併存 | どちらを採用/整理するか方針決定 | - | Yuki | frontend/middleware.ts, frontend/src/middleware.ts |
| I-002 | 提出素材未完 | 課題 | 🟡 | 未着手 | worklog week1 | アイコン/スクショ/説明文の整備 | - | Kenji | worklog week1 |
| I-003 | Staging通し検証未完 | 課題 | 🔴 | 未着手 | worklog week2/3 | GDPR/課金/同期の通し検証・記録 | - | 全員 | worklog week2/3 |
| I-004 | DB tracking未更新 | 課題 | 🟡 | 未着手 | @todo | 8/13スクリプトの適用状況を更新 | - | Takashi | @todo.md |
| I-005 | プラン初期データ未投入 | 課題 | 🔴 | 未着手 | billingレポート | SubscriptionPlansの初期化 | - | Takashi | billing-implementation-status-2025-10-06.md |
| I-006 | interval表記の不整合 | 課題 | 🟡 | 未着手 | ソース | 表示/値の整合（monthly/30days） | - | Yuki | Front/Backコード |
| I-007 | TestModeキー不整合 | 課題 | 🟡 | 未着手 | ソース | Shopify:TestMode に統一 | - | Kenji | サービス実装 |

## リスク一覧
| ID | タイトル | 発生確度×影響 | 状態 | 起点 | 対応計画 | 期限 | 担当 | 根拠 |
|---|---|---|---|---|---|---|---|---|
| R-ISK-1 | 課金導線（403/409）運用未確定 | 中×中 | 監視 | worklog | 仕様確定→UI/エラーハンドリング統一→E2E | - | Kenji/Yuki | worklog week1/2 |
| R-ISK-2 | スタック表記不整合（Prisma vs EF/SQLServer） | 低×中 | 監視 | 仕様 | ドキュメントで整合性明記（本PMに反映） | - | Kenji | 仕様/README |
| R-ISK-3 | Hangfire負荷/スケール影響 | 低×中 | 監視 | ADR-001 | モニタリング強化、必要時Functionsへ移行 | - | Takashi | ADR-001, Program.cs |
| R-ISK-4 | GDPR遅延ジョブ未実装 | 中×高 | 対応中 | 実装状況 | 遅延ジョブ実装とE2E証跡 | - | Takashi | WebhookController.cs |

## 参考
- `@todo.md`
- `docs/02-architecture/05-ADR/ADR-001-hangfire-vs-azure-functions.md`
- `docs/worklog/2025/09/*`
- `frontend/*`, `backend/ShopifyAnalyticsApi/*`


