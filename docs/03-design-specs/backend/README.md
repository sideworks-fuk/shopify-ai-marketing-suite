# EC Ranger Backend - 技術概要

## 目的
- Shopifyストアからのデータ同期、分析API提供、課金管理、GDPR対応を担うASP.NET Core API。
- マルチテナント（Store/Tenant）を前提に、JWTでストア文脈を伝播し、機能アクセスをサーバー側で制御。

## 技術スタック
- ASP.NET Core 8 / C#
- Entity Framework Core + SQL Server
- Hangfire (バッチ/定期ジョブ)
- Serilog / Application Insights
- JWT Bearer 認証

## ディレクトリ構成
```
backend/ShopifyAnalyticsApi/
├── Controllers/        # APIエンドポイント
├── Services/           # ドメインサービス/外部統合
├── Middleware/         # 共通ミドルウェア
├── Jobs/               # Hangfireジョブ
├── Models/             # DTO/DBモデル/ドメインモデル
├── Data/               # DbContext
└── Program.cs          # DI登録/パイプライン
```

## リクエストライフサイクル
1. `UseHttpsRedirection`/セキュリティヘッダー/CSP適用
2. `UseCors("AllowAll")`（本番は許可ドメインのみ）
3. `UseGlobalExceptionHandler()` で例外→統一レスポンス
4. `UseHmacValidation()`（Webhook時の署名検証）
5. `UseRateLimiter()`（固定ウィンドウ）
6. `UseShopifyEmbeddedApp()`（埋め込み動作用ヘッダ）
7. `UseAuthentication()` → `UseStoreContext()`（JWTからStoreId抽出）
8. `UseFeatureAccess()`（無料プランの機能ゲート）
9. ルーティング → 各`Controller`

## 主要責務
- 認証: `AuthController` + `TokenService`（開発用トークン発行。Shopify OAuthは`ShopifyOAuthService`で実装）
- 課金: `BillingController` + `ShopifySubscriptionService`（プラン取得/作成/変更/キャンセル、Webhook反映）
- GDPR: `WebhookController` + `GDPRService`（customers/data_request, customers/redact, shop/redact, app/uninstalled）
- 分析: `PurchaseController`/`AnalyticsController` 等 + 対応サービス
- 同期: `SyncController`/`SyncManagementController` + `Shopify*SyncJob`/`ShopifyDataSyncService`

## 設定と環境変数（抜粋）
- `ConnectionStrings:DefaultConnection` - SQL Server接続
- `Jwt:Issuer|Audience|Key` - JWT署名・検証
- `Cors:AllowedOrigins` - 本番の許可オリジン
- `Shopify:*` - OAuth/署名検証/Webhook Secret

## セキュリティ
- CORSは本番ドメインに限定
- Hangfireダッシュボードは `HangfireAuthorizationFilter` で保護
- HMAC検証（Webhook）/RateLimiting/セキュリティヘッダー

## 運用
- `/health`, `/health/ready` ヘルスチェック
- `/hangfire` ダッシュボード
- `KeepAliveService` によるApp Serviceアイドル対策
