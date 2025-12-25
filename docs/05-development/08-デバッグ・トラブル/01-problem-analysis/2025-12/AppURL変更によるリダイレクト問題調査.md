# AppURL変更によるリダイレクト問題調査

## 問題の概要

ShopifyのAppURLを変更した後、OAuth認証後のリダイレクトが正しく動作しなくなった可能性があります。

## 原因の可能性

### 1. ShopifyAppsテーブルのAppUrlが更新されていない

**問題点**:
- バックエンドのOAuthコールバック処理（`ShopifyAuthController.cs` 377行目）では、`GetShopifyAppUrlAsync(stateData.apiKey)` を使用してAppURLを取得しています
- このメソッドは `ShopifyApps` テーブルから `AppUrl` を取得します（1514行目）
- もしShopifyAppsテーブルにAppURLが設定されていない、または古い値が残っている場合、正しいリダイレクト先に遷移できません

**確認方法**:
```sql
-- カスタムアプリのAPI Keyに対応するShopifyAppsレコードを確認
SELECT 
    [Id],
    [Name],
    [DisplayName],
    [AppType],
    [ApiKey],
    [AppUrl],
    [RedirectUri],
    [IsActive],
    [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49' -- カスタムアプリのAPI Key
  AND [IsActive] = 1;
```

**期待される結果**:
- `AppUrl` が現在のフロントエンドURLと一致していること
- `RedirectUri` が `{AppUrl}/api/shopify/callback` と一致していること

### 2. Shopify Partners Dashboardの設定とShopifyAppsテーブルの不一致

**問題点**:
- Shopify Partners DashboardでAppURLを変更したが、ShopifyAppsテーブルを更新していない
- または、ShopifyAppsテーブルを更新したが、Shopify Partners Dashboardの設定と一致していない

**確認方法**:
1. Shopify Partners Dashboardで確認:
   - App URL: `https://black-flower-004e1de00.2.azurestaticapps.net`（現在のURL）
   - Redirect URLs: `https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback`

2. データベースで確認:
   ```sql
   SELECT [AppUrl], [RedirectUri] 
   FROM [dbo].[ShopifyApps] 
   WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49';
   ```

### 3. フロントエンドの認証状態初期化タイミング

**問題点**:
- `/auth/success` ページで `markAuthenticated` を呼び出しているが、`AuthProvider` の `authMode` が `null` のままになっている可能性がある
- `authMode` が `null` の場合、`isAuthenticated` が `true` に設定されても、`page.tsx` のリダイレクトロジックが正しく動作しない可能性がある

**確認方法**:
- ブラウザの開発者ツール（F12）のコンソールで以下を確認:
  - `🔐 認証コールバック受信` ログ
  - `✅ 認証状態を設定しました` ログ
  - `🔍 認証状態をチェック` ログ（`page.tsx` から）

## 修正手順

### ステップ1: ShopifyAppsテーブルのAppUrlを更新

```sql
-- カスタムアプリのAppUrlを更新
UPDATE [dbo].[ShopifyApps]
SET 
    [AppUrl] = 'https://black-flower-004e1de00.2.azurestaticapps.net',
    [RedirectUri] = 'https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback',
    [UpdatedAt] = GETUTCDATE()
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49'
  AND [IsActive] = 1;

-- 更新結果を確認
SELECT [AppUrl], [RedirectUri], [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49';
```

### ステップ2: バックエンドのログを確認

OAuthコールバック処理のログで以下を確認:
- `OAuth認証完了後のリダイレクト: {RedirectUrl}` ログ
- リダイレクト先URLが正しいか確認

### ステップ3: フロントエンドの認証状態を確認

`/auth/success` ページに到達した後、以下を確認:
- ブラウザのコンソールで `✅ 認証状態を設定しました` ログが表示されるか
- `localStorage` に `oauth_authenticated` と `currentStoreId` が設定されているか
- 1秒後に `/customers/dormant` にリダイレクトされるか

## トラブルシューティング

### 問題1: ShopifyAppsテーブルにレコードが存在しない

**対処法**:
```sql
-- カスタムアプリのレコードを作成
INSERT INTO [dbo].[ShopifyApps] 
    ([Name], [DisplayName], [AppType], [ApiKey], [ApiSecret], [AppUrl], [RedirectUri], [Scopes], [IsActive], [CreatedAt], [UpdatedAt])
VALUES 
    ('EC Ranger Demo', 'EC Ranger - カスタムアプリ', 'Custom', 
     '23f81e22074df1b71fb0a5a495778f49', -- API Key
     '[YOUR_API_SECRET]', -- API Secret（実際の値に置き換えてください）
     'https://black-flower-004e1de00.2.azurestaticapps.net', -- AppUrl
     'https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback', -- RedirectUri
     'read_orders,read_products,read_customers',
     1, GETUTCDATE(), GETUTCDATE());
```

### 問題2: リダイレクト先URLが間違っている

**確認ポイント**:
- `GetShopifyAppUrlAsync` メソッドが正しいAppURLを返しているか
- バックエンドのログで `OAuth認証完了後のリダイレクト: {RedirectUrl}` を確認

**対処法**:
- ShopifyAppsテーブルの `AppUrl` を確認・更新
- 環境変数 `Shopify:AppUrl` または `Frontend:BaseUrl` を確認

### 問題3: フロントエンドで認証状態が反映されない

**確認ポイント**:
- `/auth/success` ページで `markAuthenticated` が呼び出されているか
- `localStorage` に `oauth_authenticated` と `currentStoreId` が設定されているか
- `AuthProvider` の `authMode` が正しく設定されているか

**対処法**:
- `AuthProvider.tsx` の `authMode` 設定ロジックを確認
- `oauth_authenticated` フラグを確認する `useEffect` が正しく動作しているか確認

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` (377行目, 1509行目)
- `frontend/src/app/auth/success/page.tsx` (149行目)
- `frontend/src/components/providers/AuthProvider.tsx` (79-99行目, 268-285行目)
- `frontend/src/app/page.tsx` (21-62行目)

## 参考ドキュメント

- `docs/05-development/06-Shopify連携/マルチアプリ設定管理.md` (294-297行目: App URLの設定に関する注意事項)

