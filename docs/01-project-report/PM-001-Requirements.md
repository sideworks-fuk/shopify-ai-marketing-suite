---
title: PM-001 要件リスト
version: v0.1
created: 2025-10-06 12:51:50 JST
updated: 2025-10-06 14:37:24 JST
owner: 福田＋AI Assistant
---

# PM-001 要件リスト

## 概要
- **目的**: Shopifyストア向けに、AI/分析ベースの購買・顧客・売上インサイトを提供するマルチテナントSaaSアプリを実装・運用する。
- **スコープ**: Shopify OAuthインストール、埋め込みアプリ、GDPR必須Webhook、データ同期・分析、課金/サブスクリプション、環境毎の運用（Dev/Stg/Prod）。
- **非スコープ**: 本チケットではDBスキーマ変更の実施は行わない（必要性の提案のみ）。

## 利害関係者 / ユーザータイプ
- **ステークホルダー**: Kenji（PM/テックリード）、Yuki（FE）、Takashi（BE）、小野（PO）、浜地（PM）ほか（ai-team/knowledge/CLAUDE.md に基づく）
- **ユーザータイプ**: ストアオーナー/管理者、アプリ運用者（社内）、開発者（社内）

## 機能要件
| ID | 要件名 | 説明 | 優先度 | ステータス | 出典 | 関連ADR | 担当 |
|---|---|---|---|---|---|---|---|
| R-001 | Shopify OAuth/埋め込み | OAuthインストール、Shopify埋め込みアプリとして動作 | 🔴 | 進行中 | backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs, Middleware/ShopifyEmbeddedAppMiddleware.cs | ADR-001 | Takashi |
| R-002 | GDPR必須Webhook | customers/redact, shop/redact, customers/data_request 等の受信・HMAC検証・冪等 | 🔴 | 実装完了（本番スケジュール化・Stg証跡待ち） | backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs, Program.cs | ADR-001 | Takashi |
| R-003 | 課金/サブスク | プラン/トライアル/課金フロー、Freeプラン制限の適用 | 🔴 | 実装ほぼ完了（初期データ/interval整合/本番E2E残） | backend/.../SubscriptionController.cs, BillingController.cs, frontend/billing/*, hooks/useSubscription.ts | - | Kenji/Takashi/Yuki |
| R-004 | 購入回数分析 | 購入回数（F階層）分析のUIとAPI | 🟡 | 完了（UI移行完了） | frontend/purchase/count-analysis, backend/Controllers/PurchaseController.cs | - | Yuki/Takashi |
| R-005 | ダッシュボード | 主要KPI/チャート/最近の注文等のダッシュボード | 🟡 | 進行中 | frontend/sales/dashboard, components/dashboard/*, backend/DashboardController.cs | - | Yuki |
| R-006 | 初期設定フロー | 初期設定の状態に応じて/setupへ誘導 | 🟡 | 進行中 | frontend/src/middleware.ts, frontend/setup/*, backend/Controllers/SetupController.cs | - | Yuki/Takashi |
| R-007 | 機能アクセス制御 | プラン・フラグに基づく機能アクセス制御（403/Upgrade導線） | 🟡 | 進行中 | backend/Middleware/FeatureAccessMiddleware.cs, frontend/components/billing/*, hooks/useFeatureAccess.ts | - | Kenji/Yuki |
| R-008 | ヘルス/監視 | /health, /health/ready、App Insights/Serilog ログ出力 | 🟡 | 進行中 | backend/Program.cs, Documentation/* | - | Takashi |
| R-009 | 開発ルート遮断 | 本番で/dev等の開発ルートを遮断 | 🟡 | 完了 | frontend/middleware.ts, frontend/src/middleware.ts | - | Yuki |
| R-010 | データ同期/Hangfire | 定期ジョブ（*/5分）・ダッシュボード /hangfire | 🟡 | 進行中 | backend/Program.cs, Jobs/* | ADR-001 | Takashi |
| R-011 | 認証（Clerk） | Clerk導入による本格認証（計画） | 🟢 | 未着手 | 技術スタック要件 | - | Yuki |
| R-012 | マルチテナント分離 | ストア単位のデータ分離（StoreContext） | 🔴 | 進行中 | backend/Middleware/*StoreContext*, Controllers/StoreAwareControllerBase.cs | - | Takashi |

備考:
- frontend 側には `frontend/middleware.ts` と `frontend/src/middleware.ts` が併存。運用条件の重複/競合に注意（PM-004に課題記載）。
- 課金はDB初期データとinterval表記整合、TestModeキー統一、成功リダイレクト確認が残る。

## 非機能要件
- **性能**: FE LCP<2.5s, FID<100ms, CLS<0.1; BE API<200ms 平均、DBクエリ<100ms（ai-team/knowledge/CLAUDE.md）
- **セキュリティ**: HMAC検証（Webhook）、JWT、CSP、HTTPS必須、秘密情報はKey Vault/環境変数管理、GDPR順守
- **可用性**: ヘルスチェック、レート制限、例外ハンドラ
- **可観測性**: Serilog、Application Insights（ドキュメント類）
- **アクセシビリティ**: Shadcn/ui・Tailwind・Radix UIのガイドに準拠

## 依存関係/制約
- **フロント**: Next.js 15.1.0, React 18.2, TypeScript 5, Shadcn/ui, Tailwind, Radix, Lucide
- **バック**: .NET 8, ASP.NET Core, EF Core 8, SQL Server/Azure SQL（実装上の事実）
- **将来**: Prisma 5.11.0 + SQLite→Supabase（要件として明示、現行BEとは別経路）
- **外部**: Shopify API（OAuth/Webhook/REST/GraphQL）, Azure（App Service, Insights ほか）

## リスク/前提/仮説
- RISK-1: FEミドルウェアの二重化によるルーティング挙動の差異
- RISK-2: 課金UI/BEのエラー時導線（403/409）運用未確定の箇所
- RISK-3: スタック表記（Prisma）と現行BE（EF/SQL Server）の差異による認知齟齬
- 前提: 本ドキュメントではDBマイグレーション変更は実施しない

## 根拠抜粋（コード参照）

```311:337:backend/ShopifyAnalyticsApi/Program.cs
// HangFireダッシュボード設定 と GDPRジョブ登録
app.UseHangfireDashboard("/hangfire", new Hangfire.DashboardOptions
{
    Authorization = new[] { new ShopifyAnalyticsApi.Filters.HangfireAuthorizationFilter() },
    DashboardTitle = "EC Ranger - Job Dashboard"
});
RecurringJob.AddOrUpdate<GdprProcessingJob>(
    "gdpr-process-pending",
    job => job.ProcessPendingRequests(),
    "*/5 * * * *");
```

```31:55:frontend/src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.NEXT_PUBLIC_BUILD_ENVIRONMENT === 'production' ||
                       process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'production'
  if (isProduction) {
    const isDevPath = DEV_PATHS.some(path => {
      if (path.endsWith('/')) return pathname.startsWith(path)
      return pathname === path || pathname.startsWith(path + '/')
    })
    if (isDevPath) { /* 404へリダイレクト */ }
  }
```

```17:25:backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs
[ApiController]
[Route("api/webhook")]
[AllowAnonymous]
public class WebhookController : ControllerBase
{
    private readonly IConfiguration _configuration;
```

```10:17:frontend/src/app/(authenticated)/layout.tsx
// 簡易認証チェック（本番のみ）
if (process.env.NODE_ENV === 'production') {
  const token = cookies().get('authToken')?.value;
  if (!token) { redirect('/install'); }
}
```

```123:135:frontend/src/hooks/useSubscription.ts
const backendUrl = getBackendUrl();
const [subResponse, plansResponse] = await Promise.all([
  fetch(`${backendUrl}/api/subscription/status`, { credentials: 'include' }),
  fetch(`${backendUrl}/api/subscription/plans`, { credentials: 'include' })
]);
```

## 参考/出典
- `@todo.md`
- `docs/02-architecture/05-ADR/ADR-001-hangfire-vs-azure-functions.md`
- `docs/worklog/2025/09/*`
- `backend/ShopifyAnalyticsApi/*`
- `frontend/*`


