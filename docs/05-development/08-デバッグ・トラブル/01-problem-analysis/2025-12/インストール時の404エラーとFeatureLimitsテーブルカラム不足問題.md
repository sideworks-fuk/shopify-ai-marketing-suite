# インストール時の404エラーとFeatureLimitsテーブルカラム不足問題

## 問題の概要

### 発生状況
- **日時**: 2025-12-25
- **環境**: 本番環境（Production）
- **症状**: 
  1. インストール実行後、404エラーが発生
  2. `Stores`テーブルにレコードが追加されていない
  3. バックエンドログで`FeatureLimits`テーブルのカラム不足エラーが発生

### エラーログ
```
[05:46:04 ERR] Failed executing DbCommand (37ms) [Parameters=[@__planType_0='?' (Size = 50), @__featureId_1='?' (Size = 100)], CommandType='Text', CommandTimeout='30']
SELECT TOP(1) [f].[Id], [f].[ChangeCooldownDays], [f].[CreatedAt], [f].[DailyLimit], [f].[FeatureId], [f].[IsActive], [f].[MonthlyLimit], [f].[PlanType], [f].[UpdatedAt]
FROM [FeatureLimits] AS [f]
WHERE [f].[PlanType] = @__planType_0 AND [f].[FeatureId] = @__featureId_1

Microsoft.Data.SqlClient.SqlException (0x80131904): Invalid column name 'ChangeCooldownDays'.
Invalid column name 'IsActive'.
```

## 原因分析

### 0. 重要な発見（2025-12-25追記）

**問題**: `client_id=706a757915dedce54806c0a179bee05d` のアプリ（EC Ranger-xn-fbkq6e5da0fpb）はインストール成功しているが、`client_id=23f81e22074df1b71fb0a5a495778f49` のアプリ（EC Ranger-demo）は404エラーになっている。

**バックエンドとDBは共通**なので、データベーススキーマの問題（FeatureLimitsテーブルのカラム不足）が原因なら、両方のアプリで同じエラーが発生するはずです。

**結論**: 404エラーの根本原因は**データベーススキーマの問題ではなく、フロントエンド側の設定やルーティングの問題**である可能性が高い。

### 1. データベーススキーマの不整合（二次的な問題）

**エンティティモデル** (`FeatureLimit`) には以下のプロパティが定義されている：
- `ChangeCooldownDays` (int, default: 30)
- `IsActive` (bool, default: true)

**EF Coreマイグレーション** (`20251222151634_AddShopifyAppsTable.cs`) では、これらのカラムが含まれている：
```csharp
ChangeCooldownDays = table.Column<int>(type: "int", nullable: false),
IsActive = table.Column<bool>(type: "bit", nullable: false),
```

**しかし、本番環境のデータベース**には、これらのカラムが存在しない。

### 2. マイグレーション適用状況

マイグレーション追跡ドキュメント (`database-migration-tracking.md`) を確認すると：
- `20251222_AddShopifyAppsTable_Production.sql` は **⏳ 未適用** となっている
- 本番環境に最新のマイグレーションが適用されていない可能性が高い

### 3. エラー発生フロー

1. **OAuth認証成功後**、`ShopifyAuthController.Callback` が実行される
2. `SaveOrUpdateStore` でストア情報を保存
3. `EnsureTrialSubscriptionAsync` でトライアルサブスクリプションを付与
4. **フロントエンドが `/api/feature-selection/current` を呼び出す**
5. `FeatureSelectionService.GetCurrentSelectionAsync` が実行される
6. `GetUsageLimitAsync` → `GetFeatureUsageAsync` が呼ばれる
7. **`FeatureLimits`テーブルからデータを取得しようとする**
8. **カラム不足によりSQLエラーが発生**
9. エラーが500エラーとして返される
10. フロントエンドで404エラーとして表示される可能性

### 4. 404エラーの原因（再調査）

404エラーの原因は、以下のいずれかが考えられる：

#### 4.1 カスタムアプリのインストールリンク（`no_redirect=true`）の問題

**問題点**:
- カスタムアプリのインストールリンク（`/oauth/install_custom_app?no_redirect=true`）からインストールした後、Shopify管理画面のアプリメニューに「EC Ranger-demo」が表示される
- ユーザーがアプリメニューからアプリを開こうとすると、`https://roomandout.myshopify.com/admin/apps/23f81e22074df1b71fb0a5a495778f49?host=...` にアクセスする
- しかし、このURLが正しく処理されず、404エラーになる可能性がある

**確認事項**:
1. **Shopify Partners Dashboardの設定**:
   - App URLが正しく設定されているか（`https://white-island-08e0a6300.2.azurestaticapps.net`）
   - Redirect URLsに正しいURLが登録されているか

2. **フロントエンドの環境変数**:
   - `NEXT_PUBLIC_SHOPIFY_API_KEY` が正しく設定されているか（`23f81e22074df1b71fb0a5a495778f49`）
   - Azure Static Web Appsの環境変数を確認

3. **ShopifyAppsテーブルの設定**:
   - `AppUrl` が正しく設定されているか
   - `IsActive` が `true` になっているか

#### 4.2 フロントエンドのルーティング問題

**問題点**:
- `auth/success/page.tsx` の171行目で、`process.env.NEXT_PUBLIC_SHOPIFY_API_KEY` を使用してリダイレクト先を生成している
- この環境変数が正しく設定されていない場合、リダイレクト先が正しく生成されない

**確認事項**:
```typescript
// auth/success/page.tsx:171
const adminAppUrl = `https://${resolvedShop}/admin/apps/${apiKey}?host=${encodeURIComponent(host)}`;
```
- `apiKey` が `undefined` または空文字列になっていないか
- ブラウザのConsoleで `process.env.NEXT_PUBLIC_SHOPIFY_API_KEY` の値を確認

#### 4.3 OAuthコールバック後のリダイレクト先の問題

**問題点**:
- バックエンドの `ShopifyAuthController.Callback` で、`GetShopifyAppUrlAsync(stateData.apiKey)` を使用してAppURLを取得している
- このメソッドは `ShopifyApps` テーブルから `AppUrl` を取得する
- もし `ShopifyApps` テーブルに `AppUrl` が設定されていない、または古い値が残っている場合、正しいリダイレクト先に遷移できない

**確認事項**:
```sql
-- EC Ranger-demoのShopifyAppsレコードを確認
SELECT 
    [Id],
    [Name],
    [AppType],
    [ApiKey],
    [AppUrl],
    [RedirectUri],
    [IsActive],
    [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49'
  AND [IsActive] = 1;
```

**期待される結果**:
- `AppUrl` = `https://white-island-08e0a6300.2.azurestaticapps.net`
- `RedirectUri` = `https://white-island-08e0a6300.2.azurestaticapps.net/api/shopify/callback`

## 解決策（優先順位順）

### 1. ShopifyAppsテーブルの設定確認と修正（最優先）

**問題**: `ShopifyApps`テーブルの`AppUrl`が正しく設定されていない可能性があります。

**解決方法**:
```sql
-- EC Ranger-demoのAppUrlを更新
UPDATE [dbo].[ShopifyApps]
SET 
    [AppUrl] = 'https://white-island-08e0a6300.2.azurestaticapps.net',
    [RedirectUri] = 'https://white-island-08e0a6300.2.azurestaticapps.net/api/shopify/callback',
    [UpdatedAt] = GETUTCDATE()
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49'
  AND [IsActive] = 1;
```

### 2. Azure Static Web Appsの環境変数確認と修正

**問題**: `NEXT_PUBLIC_SHOPIFY_API_KEY`が正しく設定されていない可能性があります。

**解決方法**:
1. Azure PortalでStatic Web App（white-island）を開く
2. 「設定」→「環境変数」を確認
3. `NEXT_PUBLIC_SHOPIFY_API_KEY` = `23f81e22074df1b71fb0a5a495778f49` に設定
4. 変更を保存（自動的に再デプロイが実行される）

### 3. Shopify Partners Dashboardの設定確認

**問題**: App URLやRedirect URLsが正しく設定されていない可能性があります。

**解決方法**:
1. Shopify Partners Dashboardで「EC Ranger-demo」アプリを開く
2. 「Settings」ページで以下を確認・修正:
   - **App URL**: `https://white-island-08e0a6300.2.azurestaticapps.net`（`/` に設定）
   - **Redirect URLs**: 上記の3つのURLがすべて登録されていることを確認
3. 変更を保存

### 4. 本番環境へのマイグレーション適用（FeatureLimitsテーブル）

**マイグレーションスクリプト**: `20251222_AddShopifyAppsTable_Production.sql`

このスクリプトを本番環境に適用することで、`FeatureLimits`テーブルに不足しているカラムが追加される。

**適用手順**:
1. 本番環境のデータベースバックアップを取得
2. `20251222_AddShopifyAppsTable_Production.sql` を実行
3. マイグレーション追跡ドキュメントを更新

### 2. 不足カラム追加用の緊急マイグレーション（代替案）

もし`20251222_AddShopifyAppsTable_Production.sql`が適用できない場合、以下のSQLスクリプトで不足カラムを追加する：

```sql
-- FeatureLimitsテーブルに不足カラムを追加
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FeatureLimits') AND name = 'ChangeCooldownDays')
BEGIN
    ALTER TABLE FeatureLimits
    ADD ChangeCooldownDays INT NOT NULL DEFAULT 30;
    PRINT 'ChangeCooldownDays column added to FeatureLimits';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FeatureLimits') AND name = 'IsActive')
BEGIN
    ALTER TABLE FeatureLimits
    ADD IsActive BIT NOT NULL DEFAULT 1;
    PRINT 'IsActive column added to FeatureLimits';
END
GO

-- 既存データの更新（必要に応じて）
UPDATE FeatureLimits
SET ChangeCooldownDays = 30
WHERE ChangeCooldownDays IS NULL;

UPDATE FeatureLimits
SET IsActive = 1
WHERE IsActive IS NULL;
```

### 3. エラーハンドリングの改善

`FeatureSelectionController.GetCurrentSelection` のエラーハンドリングを改善し、データベースエラーを適切に処理する：

```csharp
catch (Microsoft.Data.SqlClient.SqlException sqlEx)
{
    _logger.LogError(sqlEx, "Database error while getting current feature selection");
    
    // カラム不足エラーの場合、より詳細なエラーメッセージを返す
    if (sqlEx.Message.Contains("Invalid column name"))
    {
        return StatusCode(500, new { 
            error = "database_schema_mismatch", 
            message = "データベーススキーマが最新ではありません。管理者に連絡してください。" 
        });
    }
    
    return StatusCode(500, new { error = "Internal server error" });
}
```

## 確認事項（優先順位順）

### 1. ShopifyAppsテーブルの設定確認（最優先）

```sql
-- EC Ranger-demoのShopifyAppsレコードを確認
SELECT 
    [Id],
    [Name],
    [DisplayName],
    [AppType],
    [ApiKey],
    [AppUrl],
    [RedirectUri],
    [IsActive],
    [CreatedAt],
    [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49'
  AND [IsActive] = 1;

-- 比較: EC Ranger-xn-fbkq6e5da0fpb（成功しているアプリ）
SELECT 
    [Id],
    [Name],
    [DisplayName],
    [AppType],
    [ApiKey],
    [AppUrl],
    [RedirectUri],
    [IsActive],
    [CreatedAt],
    [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [ApiKey] = '706a757915dedce54806c0a179bee05d'
  AND [IsActive] = 1;
```

**期待される結果**:
- `AppUrl` が正しいフロントエンドURLと一致していること
- `RedirectUri` が `{AppUrl}/api/shopify/callback` と一致していること
- 両方のアプリで設定が一致していること

### 2. Azure Static Web Appsの環境変数確認

**white-island (ec-ranger-frontend-prod)**:
- `NEXT_PUBLIC_SHOPIFY_API_KEY` = `23f81e22074df1b71fb0a5a495778f49` であることを確認

**確認方法**:
1. Azure PortalでStatic Web Appを開く
2. 「設定」→「環境変数」を確認
3. または、GitHub Actionsの環境変数を確認

### 3. Shopify Partners Dashboardの設定確認

**EC Ranger-demo**:
- App URL: `https://white-island-08e0a6300.2.azurestaticapps.net`（`/` に設定）
- Redirect URLs:
  - `https://white-island-08e0a6300.2.azurestaticapps.net/api/shopify/callback`
  - `https://white-island-08e0a6300.2.azurestaticapps.net/auth/success`
  - `https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/api/shopify/callback`

### 4. 本番環境のデータベーススキーマ確認（FeatureLimitsテーブル）

以下のクエリで、`FeatureLimits`テーブルのカラムを確認：

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'FeatureLimits'
ORDER BY ORDINAL_POSITION;
```

### 2. マイグレーション適用状況の確認

```sql
SELECT * FROM __EFMigrationsHistory
ORDER BY MigrationId DESC;
```

### 5. ブラウザのConsoleログ確認

インストール時にブラウザの開発者ツール（F12）で以下を確認：

1. **環境変数の確認**:
   ```javascript
   console.log('NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
   ```

2. **リダイレクト先の確認**:
   - `auth/success/page.tsx` の171行目で生成される `adminAppUrl` の値を確認
   - 正しいURLが生成されているか

3. **エラーメッセージの確認**:
   - 404エラーが発生した際の詳細なエラーメッセージを確認
   - ネットワークタブでリクエスト/レスポンスを確認

### 6. OAuthフローの確認

- OAuthコールバック後のリダイレクト先が正しいか
- `Stores`テーブルにレコードが作成されているか
- エラーログにOAuth関連のエラーがないか

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Models/FeatureSelectionModels.cs` - エンティティモデル定義
- `backend/ShopifyAnalyticsApi/Migrations/20251222151634_AddShopifyAppsTable.cs` - EF Coreマイグレーション
- `backend/ShopifyAnalyticsApi/Services/FeatureSelectionService.cs` - サービス実装
- `backend/ShopifyAnalyticsApi/Controllers/FeatureSelectionController.cs` - コントローラー実装
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md` - マイグレーション追跡

## 今後の対策

1. **マイグレーション適用の自動化**: CI/CDパイプラインでマイグレーションを自動適用
2. **スキーマ検証**: アプリケーション起動時にデータベーススキーマを検証
3. **エラーハンドリングの統一**: データベースエラーを適切に処理し、ユーザーに分かりやすいメッセージを表示
4. **マイグレーション適用の徹底**: バックエンドのデプロイ前に、必要なマイグレーションが本番環境に適用されていることを確認するチェックリストを作成

## 原因特定（2025-12-25 確認完了）

### 確認結果

1. **ShopifyAppsテーブルの設定**: ✅ 正しく設定されている
   - EC Ranger-demo: `AppUrl` = `https://white-island-08e0a6300.2.azurestaticapps.net`
   - EC Ranger-xn-fbkq6e5da0fpb: `AppUrl` = `https://black-flower-004e1de00.2.azurestaticapps.net`

2. **Azure Static Web Appsの環境変数**: ❌ **未設定**
   - `ec-ranger-frontend-prod` (white-island): `NEXT_PUBLIC_SHOPIFY_API_KEY` が設定されていない
   - `ec-ranger-frontend-prod-2` (black-flower): `NEXT_PUBLIC_SHOPIFY_API_KEY` が設定されていない

3. **Shopify Partners Dashboardの設定**: ❌ **App URLが間違っている**
   - **EC Ranger-demo**: App URL = `https://white-island-08e0a6300.2.azurestaticapps.net/install` ❌
   - **EC Ranger-xn-fbkq6e5da0fpb**: App URL = `https://black-flower-004e1de00.2.azurestaticapps.net` ✅

### 根本原因

**404エラーの根本原因は、Shopify Partners DashboardのApp URL設定が間違っていることです。**

- EC Ranger-demoのApp URLが `/install` になっているため、認証済みユーザーがアプリメニューからアプリを開こうとすると、常にインストール画面にリダイレクトされてしまう
- 正しくは `/` に設定する必要がある（マルチアプリ設定管理ドキュメント参照）

### 補足説明：なぜprod2では動作するのか？

**重要な発見**: prod2（EC Ranger-xn-fbkq6e5da0fpb）では、App URLに `/install` をつけても404にならない。

**理由**:
1. **GitHub Actionsでビルド時に環境変数が設定されている**
   - `.github/workflows/production_frontend.yml` の89行目（prod1）と109行目（prod2）で、ビルド時に `NEXT_PUBLIC_SHOPIFY_API_KEY` が設定されている
   - Next.jsでは、`NEXT_PUBLIC_*` 環境変数はビルド時に静的に埋め込まれるため、実行時にAzure Static Web Appsで設定されていなくても動作する

2. **prod1とprod2の違い**
   - 両方ともGitHub Actionsでビルド時に環境変数が設定されているはず
   - しかし、prod1で404エラーが発生する理由は、**App URLが `/install` になっていること**が主な原因
   - prod2では `/install` でも動作する可能性があるが、これは `/install` ページの実装やデプロイタイミングの違いによるものかもしれない

**結論**: 
- Azure Static Web Appsの環境変数は、GitHub Actionsでビルド時に設定されているため、実行時に設定されていなくても動作する
- しかし、App URLが `/install` になっていると、認証済みユーザーがアプリを開いた際に不適切なリダイレクトが発生する可能性がある
- 推奨される設定は、App URLを `/` にすること（マルチアプリ設定管理ドキュメント参照）

## 解決手順（即座に実施）

### 0. FeatureLimitsテーブルのカラム不足エラーへの対応（推奨）

**重要**: 404エラーの根本原因はApp URLの設定ですが、バックエンドログにはFeatureLimitsテーブルのカラム不足エラーも記録されています。将来的にFeatureLimitsテーブルを使用する機能が正常に動作しない可能性があるため、対応しておくことを推奨します。

**対応方法**:
1. 本番環境のデータベースに `2025-12-25-FIX-AddMissingColumnsToFeatureLimits.sql` を適用
2. マイグレーション追跡ドキュメントを更新

**適用手順**:
```sql
-- 本番環境のデータベースで実行
-- ファイル: docs/05-development/03-データベース/マイグレーション/2025-12-25-FIX-AddMissingColumnsToFeatureLimits.sql
```

**確認クエリ**（適用後）:
```sql
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'FeatureLimits'
    AND COLUMN_NAME IN ('ChangeCooldownDays', 'IsActive')
ORDER BY COLUMN_NAME;
```

### 1. Shopify Partners DashboardのApp URLを修正（最優先）

**EC Ranger-demo**:
1. Shopify Partners Dashboardにログイン
2. 「EC Ranger-demo」アプリを選択
3. 「Versions」→ アクティブなバージョンを選択
4. 「App URL」を以下に変更:
   ```
   https://white-island-08e0a6300.2.azurestaticapps.net
   ```
   ⚠️ **重要**: `/install` を削除して `/` に設定すること
5. 変更を保存

### 2. Azure Static Web Appsの環境変数について（補足）

**重要**: GitHub Actionsのワークフロー（`.github/workflows/production_frontend.yml`）で、ビルド時に環境変数が設定されています。

- **Production1 (white-island)**: 89行目で `NEXT_PUBLIC_SHOPIFY_API_KEY: '${{ env.PROD1_SHOPIFY_API_KEY }}'` が設定されている
- **Production2 (black-flower)**: 109行目で `NEXT_PUBLIC_SHOPIFY_API_KEY: '${{ env.PROD2_SHOPIFY_API_KEY }}'` が設定されている

Next.jsでは、`NEXT_PUBLIC_*` 環境変数はビルド時に静的に埋め込まれるため、実行時にAzure Static Web Appsで設定されていなくても動作します。

**結論**: Azure Static Web Appsの環境変数は、GitHub Actionsでビルド時に設定されているため、実行時に設定されていなくても動作します。ただし、将来のデプロイで環境変数が正しく設定されていることを確認するため、Azure Portalでも設定しておくことを推奨します。

### 3. 動作確認

1. Shopify管理画面で「EC Ranger-demo」アプリを開く
2. 404エラーが発生しないことを確認
3. 正常にアプリが表示されることを確認

### 4. 補足：prod2で `/install` でも動作する理由

**発見**: prod2（EC Ranger-xn-fbkq6e5da0fpb）では、App URLに `/install` をつけても404にならない。

**理由の分析**:

1. **`/install` ページの実装**:
   - `frontend/src/app/install/page.tsx` の88-154行目で、認証状態をチェックし、認証済みで登録済みストアが見つかった場合、`/customers/dormant` にリダイレクトする実装になっている
   - このリダイレクト処理は `window.location.replace()` を使用している（149行目）

2. **prod2で動作する理由**:
   - prod2では、認証状態のチェックが正常に動作し、登録済みストアが見つかった場合に適切に `/customers/dormant` にリダイレクトされている
   - リダイレクト先の `/customers/dormant` ページが正常に存在し、アクセス可能である

3. **prod1で404エラーが発生する理由の推測**:
   - 認証状態のチェックやストア検索処理で何らかの問題が発生している可能性
   - リダイレクト先の `/customers/dormant` ページにアクセスできない（ルーティングの問題）
   - デプロイタイミングの違い（prod1は古いビルド、prod2は新しいビルド）
   - ストア情報や認証状態の違い

4. **GitHub Actionsの環境変数について**:
   - GitHubの環境変数には `SHOPIFY_API_KEY_PRODUCTION` と `SHOPIFY_API_KEY_PRODUCTION_2` が設定されている
   - GitHub Actionsのワークフロー（`.github/workflows/production_frontend.yml`）で、これらの環境変数を `PROD1_SHOPIFY_API_KEY` と `PROD2_SHOPIFY_API_KEY` にマッピングし、ビルド時に `NEXT_PUBLIC_SHOPIFY_API_KEY` として設定している
   - そのため、ビルド時に環境変数が正しく埋め込まれ、実行時にAzure Static Web Appsで設定されていなくても動作する

**推奨される設定**:
- App URLは `/` に設定することを推奨（マルチアプリ設定管理ドキュメント参照）
- `/` ページは認証状態をチェックして、認証済みなら `/customers/dormant` に、未認証なら `/install` に自動リダイレクトする
- これにより、認証済みユーザーがアプリを開いた際に、常に適切なページにリダイレクトされる
- App URLを `/` に設定することで、`/install` ページのリダイレクト処理に依存せず、より確実に動作する

## 更新履歴

- 2025-12-25: 初版作成（福田 + AI Assistant）
- 2025-12-25: 原因特定完了（Shopify Partners DashboardのApp URL設定とAzure環境変数の未設定が原因）
