# 画面ID体系リファレンス

## 🆔 画面ID命名規則

### ID体系
```
[カテゴリ]-[機能番号]-[画面種別]
```

- **カテゴリ**: PROD（商品）、CUST（顧客）、PURCH（購買）、AUTH（認証）、ADMIN（管理）、USER（ユーザー）、BATCH（バッチ処理）
- **機能番号**: 01～99（2桁）
- **画面種別**: 機能を表す短縮名

---

## 📊 画面ID一覧

### 優先度高・実装中（Phase 1）

| 画面ID | 画面名 | 説明 | 実装状況 | 設計書 |
|--------|--------|------|----------|--------|
| **CUST-01-DORMANT** | 休眠顧客分析【顧客】 | 休眠顧客の抽出と分析 | 🚧 **実装中** | [詳細設計書](./CUST-01-DORMANT-detailed-design.md) |
| **PROD-01-YOY** | 前年同月比分析【商品】 | 商品別の前年同月比較 | 🚧 **実装中** | [詳細設計書](./PROD-01-YOY-detailed-design.md) |
| **PURCH-02-COUNT** | 購入回数分析【購買】 | 購入回数分布と傾向分析 | 🚧 **実装中** | 作成予定 |

### 優先度高・未着手（Phase 1）

| 画面ID | 画面名 | 説明 | 実装状況 | 設計書 |
|--------|--------|------|----------|--------|
| **BATCH-01-DATA** | データ取得バッチ【バッチ】 | Azure FunctionsによるShopifyデータ取得 | ❌ **未着手** | 作成予定 |
| **AUTH-01-MULTI** | マルチテナント認証【認証】 | Shopify OAuth・マルチテナント対応 | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |

### 完了済み・未定（Phase 2以降）

| 画面ID | 画面名 | 説明 | 実装状況 | 設計書 |
|--------|--------|------|----------|--------|
| **PROD-03-BASKET** | 組み合わせ商品【商品】 | 同時購入される商品の分析 | 📝 **モック完了** | 作成予定 |
| **PURCH-03-FTIER** | F階層傾向【購買】 | 購買頻度による顧客階層分析 | 📝 **モック完了** | 作成予定 |
| **PROD-02-FREQ** | 購入頻度分析【商品】 | 商品の購入頻度パターン分析 | 📝 **モック完了** | 作成予定 |
| **PURCH-01-MONTHLY** | 月別売上統計【購買】 | 月次売上の推移と傾向分析 | 📝 **モック完了** | [詳細設計書](./PURCH-01-MONTHLY-detailed-design.md) |
| **CUST-02-ANALYSIS** | 顧客購買分析【顧客】 | 顧客の購買行動詳細分析 | 📝 **モック完了** | 作成予定 |

> 📌 **注記**: 上記5機能はモックデータを使用したフロントエンドUI実装まで完了していますが、実際のAPI連携やバックエンド実装は未着手です。

### Phase 4: 認証・管理機能

| 画面ID | 画面名 | 説明 | 実装状況 | 設計書 |
|--------|--------|------|----------|--------|
| **AUTH-02-LOGIN** | ログイン画面【認証】 | Shopify OAuth・既存ユーザーログイン | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |
| **AUTH-03-INSTALL** | アプリインストール【認証】 | Shopify新規インストールフロー | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |
| **ADMIN-01-DASHBOARD** | 管理者ダッシュボード【管理】 | システム全体統計・監視 | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |
| **ADMIN-02-STORES** | ストア管理【管理】 | 連携ストア一覧・詳細管理 | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |
| **ADMIN-03-USERS** | ユーザー管理【管理】 | ユーザー・権限管理 | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |
| **USER-01-PROFILE** | ユーザープロファイル【ユーザー】 | ユーザー情報・設定 | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |
| **USER-02-SWITCH** | ストア切り替え【ユーザー】 | マルチテナント間の切り替え | ❌ **未着手** | [詳細設計書](./shopify-oauth-multitenancy-detailed-design.md) |

---

## 💻 実装での使用例

### 1. ブランチ命名
```bash
# 機能開発ブランチ
git checkout -b feature/CUST-01-DORMANT-api
git checkout -b feature/PROD-01-YOY-frontend
git checkout -b feature/BATCH-01-DATA-implementation

# バグ修正ブランチ  
git checkout -b bugfix/PURCH-02-COUNT-calculation-error
```

### 2. Pull Request / Issue
```markdown
# PR タイトル
[CUST-01] feat: 休眠顧客分析APIの実装
[PROD-01] feat: 前年同月比計算ロジックの実装
[BATCH-01] feat: Azure Functionsによるデータ取得バッチ実装

# Issue タイトル
[CUST-01] bug: 休眠顧客の期間フィルタが正しく動作しない
[AUTH-01] feat: Shopify OAuth認証フローの実装
```

### 3. コミットメッセージ
```bash
# 機能追加
git commit -m "feat(CUST-01): Add dormant customer analysis service"
git commit -m "feat(PROD-01): Add year-over-year calculation logic"
git commit -m "feat(BATCH-01): Add Azure Functions data retrieval"

# バグ修正
git commit -m "fix(PURCH-02): Correct purchase count calculation"
git commit -m "fix(AUTH-01): Fix OAuth token refresh issue"

# リファクタリング
git commit -m "refactor(CUST-01): Optimize dormant customer query performance"
```

### 4. APIルーティング
```csharp
// Controllers/Analytics/DormantCustomerController.cs
[Route("api/analytics/CUST-01")]
[ApiController]
public class DormantCustomerController : ControllerBase
{
    private const string SCREEN_ID = "CUST-01-DORMANT";
    // ...
}

// Controllers/Analytics/YearOverYearController.cs
[Route("api/analytics/PROD-01")]
[ApiController]
public class YearOverYearController : ControllerBase
{
    private const string SCREEN_ID = "PROD-01-YOY";
    // ...
}

// Functions/DataRetrievalFunction.cs
public class DataRetrievalFunction
{
    private const string FUNCTION_ID = "BATCH-01-DATA";
    // ...
}
```

### 5. フロントエンドルーティング
```typescript
// app/analytics/routes.ts
export const analyticsRoutes = {
  // 実装中画面
  'CUST-01-DORMANT': '/customers/dormant',
  'PROD-01-YOY': '/sales/year-over-year',
  'PURCH-02-COUNT': '/sales/purchase-frequency',
  
  // 完了済み画面
  'PROD-03-BASKET': '/sales/market-basket',
  'PURCH-03-FTIER': '/purchase/f-tier-trend',
  'PROD-02-FREQ': '/purchase/frequency-detail',
  'PURCH-01-MONTHLY': '/sales/monthly-stats',
  'CUST-02-ANALYSIS': '/customers/profile',
  
  // 認証・管理画面
  'AUTH-01-MULTI': '/auth/multitenant',
  'AUTH-02-LOGIN': '/auth/login',
  'AUTH-03-INSTALL': '/auth/install',
  'ADMIN-01-DASHBOARD': '/admin/dashboard',
  'ADMIN-02-STORES': '/admin/stores',
  'ADMIN-03-USERS': '/admin/users',
  'USER-01-PROFILE': '/user/profile',
  'USER-02-SWITCH': '/user/switch-store',
} as const;
```

### 6. ログ・監視での使用
```csharp
// ログ出力
_logger.LogInformation("[{ScreenId}] User accessed screen: {UserId}", 
    "CUST-01-DORMANT", userId);

// Application Insights
_telemetryClient.TrackEvent("ScreenView", new Dictionary<string, string>
{
    { "ScreenId", "PROD-01-YOY" },
    { "UserId", userId },
    { "SessionId", sessionId }
});

// Azure Functions ログ
_logger.LogInformation("[{FunctionId}] Data retrieval started", 
    "BATCH-01-DATA");
```

### 7. エラーコード体系
```csharp
public static class ErrorCodes
{
    // CUST-01-DORMANT 関連エラー
    public const string CUST01_DATA_NOT_FOUND = "CUST-01-404";
    public const string CUST01_INVALID_PARAMS = "CUST-01-400";
    public const string CUST01_CALC_ERROR = "CUST-01-500";
    
    // PROD-01-YOY 関連エラー
    public const string PROD01_NO_PREV_YEAR_DATA = "PROD-01-404";
    public const string PROD01_INVALID_DATE_RANGE = "PROD-01-400";
    
    // PURCH-02-COUNT 関連エラー
    public const string PURCH02_SEGMENT_ERROR = "PURCH-02-500";
    public const string PURCH02_INVALID_FILTER = "PURCH-02-400";
    
    // BATCH-01-DATA 関連エラー
    public const string BATCH01_API_ERROR = "BATCH-01-500";
    public const string BATCH01_RETRY_FAILED = "BATCH-01-503";
    public const string BATCH01_DATA_VALIDATION = "BATCH-01-400";
    
    // AUTH-01-MULTI 関連エラー
    public const string AUTH01_INVALID_CREDENTIALS = "AUTH-01-401";
    public const string AUTH01_SHOPIFY_AUTH_FAILED = "AUTH-01-403";
    public const string AUTH01_TOKEN_EXPIRED = "AUTH-01-401";
    public const string AUTH01_TENANT_NOT_FOUND = "AUTH-01-404";
    
    // ADMIN-02-STORES 関連エラー
    public const string ADMIN02_STORE_NOT_FOUND = "ADMIN-02-404";
    public const string ADMIN02_UNAUTHORIZED = "ADMIN-02-403";
    public const string ADMIN02_SYNC_FAILED = "ADMIN-02-500";
}
```

### 8. テストファイル命名
```
tests/
├── backend/
│   ├── CUST-01-DORMANT/
│   │   ├── DormantCustomerService.Tests.cs
│   │   └── DormantCustomerController.Tests.cs
│   ├── PROD-01-YOY/
│   │   ├── YearOverYearService.Tests.cs
│   │   └── YearOverYearController.Tests.cs
│   ├── PURCH-02-COUNT/
│   │   ├── PurchaseCountService.Tests.cs
│   │   └── PurchaseCountController.Tests.cs
│   ├── BATCH-01-DATA/
│   │   ├── DataRetrievalFunction.Tests.cs
│   │   └── ShopifyApiService.Tests.cs
│   ├── AUTH-01-MULTI/
│   │   ├── AuthService.Tests.cs
│   │   └── MultiTenantService.Tests.cs
│   └── ADMIN-02-STORES/
│       ├── StoreService.Tests.cs
│       └── AdminController.Tests.cs
└── frontend/
    ├── CUST-01-DORMANT/
    │   └── DormantCustomer.test.tsx
    ├── PROD-01-YOY/
    │   └── YearOverYear.test.tsx
    ├── PURCH-02-COUNT/
    │   └── PurchaseCount.test.tsx
    ├── AUTH-01-MULTI/
    │   └── MultiTenantAuth.test.tsx
    └── ADMIN-02-STORES/
        └── StoreManagement.test.tsx
```

---

## 📋 運用ガイドライン

### 新規画面追加時
1. カテゴリを決定（PROD/CUST/PURCH/AUTH/ADMIN/USER/BATCH）
2. カテゴリ内で次の番号を割り当て
3. 画面種別の短縮名を決定
4. このドキュメントを更新
5. 該当する詳細設計書へのリンクを追加

### 画面ID変更時
1. 影響範囲の調査（コード、ドキュメント、ログ）
2. 移行計画の作成
3. 段階的な移行実施
4. 旧IDからのリダイレクト設定

### 実装状況の更新
- 🚧 **実装中**: 開発進行中
- ✅ **完了**: 実装完了、テスト済み
- 📝 **モック完了**: モックデータを使用したフロントエンドUI実装完了
- ❌ **未着手**: 設計完了、実装未開始
- 📝 **未定**: リリース時期未定

---

*作成日: 2025年7月21日*  
*最終更新: 2025年7月26日（実装状況更新版）*  
*メンテナー: 開発チーム*  

## 📝 更新履歴

**2025年7月26日:**
- 実装状況の反映（実装中・完了・未着手・未定）
- BATCH-01-DATA（データ取得バッチ）追加
- AUTH-01-MULTI（マルチテナント認証）追加
- 優先度別の分類整理
- エラーコード・テストファイル命名例の更新

**2025年7月24日:**
- Phase 4: 認証・管理機能の画面ID追加
- AUTH、ADMIN、USERカテゴリ追加
- Shopify OAuth認証・マルチテナント設計書へのリンク追加
- 新しい画面IDに対応したルーティング・エラーコード例を更新 