---
title: PM-002 機能一覧
version: v0.1
created: 2025-10-06 12:51:50 JST
updated: 2025-10-06 14:37:24 JST
owner: 福田＋AI Assistant
---

# PM-002 機能一覧

## 機能マップ（ドメイン別）
- 認証/埋め込み: OAuthインストール、埋め込み起動
- データ同期/分析: 同期ジョブ、休眠顧客・購入回数・年同分析
- 課金/サブスク: プラン、トライアル、Free制限
- 初期設定/環境: 初期セットアップ、開発ルート遮断
- 監視/運用: ヘルスチェック、ログ、Hangfireダッシュボード

## 機能目録
| 機能ID | 機能名 | 区分 | 主要パス/クラス | 関連要件ID | 状態 | 備考 |
|---|---|---|---|---|---|---|
| F-001 | OAuthインストール | Back | `Controllers/ShopifyAuthController.cs` | R-001 | 進行中 | 埋め込みと連携 |
| F-002 | 埋め込みアプリ起動 | Back | `Middleware/ShopifyEmbeddedAppMiddleware.cs` | R-001 | 進行中 | iframe対応/CSP |
| F-003 | GDPR Webhook | Back | `Controllers/WebhookController.cs` | R-002 | 完了(検証待) | HMAC/Idempotency |
| F-004 | 課金/サブスクAPI | Back | `SubscriptionController.cs`, `BillingController.cs` | R-003 | 進行中 | app/uninstalled対応 |
| F-005 | 課金UI | Front | `app/billing/*`, `components/billing/*` | R-003 | 進行中 | useSubscription連携・interval表示整合 |
| F-006 | 購入回数分析UI | Front | `app/purchase/count-analysis/page.tsx` | R-004 | 完了 | UI移行済み |
| F-007 | 購入分析API | Back | `Controllers/PurchaseController.cs` | R-004 | 進行中 | 実データ連携 |
| F-008 | ダッシュボード | Front | `app/sales/dashboard/*`, `components/dashboard/*` | R-005 | 進行中 | KPI/グラフ |
| F-009 | 初期設定フロー | Both | `src/middleware.ts`, `app/setup/*`, `SetupController.cs` | R-006 | 進行中 | 状態リダイレクト |
| F-010 | 機能アクセス制御 | Both | `FeatureAccessMiddleware.cs`, `useFeatureAccess.ts` | R-007 | 進行中 | Free制限 |
| F-011 | ヘルス/運用 | Back | `Program.cs(/health)`, `HealthChecks/*` | R-008 | 進行中 | ready/health |
| F-012 | Devルート遮断 | Front | `frontend/middleware.ts`, `frontend/src/middleware.ts` | R-009 | 完了 | 本番のみ遮断 |
| F-13 | 同期/Hangfire | Back | `Jobs/*`, `Program.cs(Hangfire)` | R-010 | 進行中 | */5登録/ダッシュボード・GDPR単発遅延ジョブ追加 |
| F-014 | Clerk認証（計画） | Front | - | R-011 | 未着手 | 将来導入 |
| F-015 | マルチテナント分離 | Back | `*StoreContext*`, `StoreAwareControllerBase.cs` | R-012 | 進行中 | Cookie/ヘッダ |

## 実装所在
- フロント: `frontend/src/app/...`, `frontend/components/...`, `frontend/src/middleware.ts` ほか
- バックエンド: `backend/ShopifyAnalyticsApi/...`

## 根拠抜粋（コード参照）

```311:323:backend/ShopifyAnalyticsApi/Program.cs
// Hangfire + GDPRジョブ
app.UseHangfireDashboard("/hangfire", new Hangfire.DashboardOptions { /* ... */ });
RecurringJob.AddOrUpdate<GdprProcessingJob>("gdpr-process-pending", job => job.ProcessPendingRequests(), "*/5 * * * *");
```

```1:16:frontend/middleware.ts
// 本番で開発用ルートを遮断
export function middleware(req: NextRequest) { /* ... */ }
```


