# OAuth認証画面でread_customersスコープが表示されない問題

## 問題概要

OAuth認証画面で`read_customers`を含むすべてのスコープを承認するインターフェースが表示されない。

## 発生日時

2025-12-25

## エラーメッセージ

- バックエンドログ: `[API] This action requires merchant approval for read_customers scope.`
- ユーザー報告: OAuth認証画面で`read_customers`スコープが表示されない

## 原因分析

### 重要なポイント

**カスタムアプリの場合、Shopify Partners Dashboardでスコープを事前設定する必要はありません。**
- OAuth認証URLに`scope`パラメータを指定すれば、そのスコープがOAuth認証画面に表示されます
- Shopify Partners Dashboardの「Settings」ページには「Scopes」フィールドは表示されません（カスタムアプリの場合）

### 考えられる原因

1. **OAuth認証URLにスコープが正しく含まれていない**
   - `GetShopifySetting("Scopes")`が正しい値を返しているか確認が必要
   - 環境変数`SHOPIFY_SCOPES`が設定されている場合、それが優先される
   - バックエンドログで実際に生成されているOAuth認証URLを確認する必要がある

2. **Shopifyのセキュリティポリシー**
   - `read_customers`スコープは「merchant approval」が必要なスコープ
   - OAuth認証画面ではなく、Shopify Adminで別途承認が必要な場合がある

3. **既にインストール済みで、スコープが変更されたが再認証が必要**
   - 既存のインストールでは、新しいスコープが自動的に追加されない
   - 再インストールまたは権限更新が必要

## 確認方法

### 1. バックエンドログでOAuth認証URLを確認

バックエンドログに以下のログが出力されるようになりました：

```
OAuth認証スコープ: read_orders,read_products,read_customers
生成されたOAuth認証URL: https://{shop}/admin/oauth/authorize?client_id={apiKey}&scope=read_orders,read_products,read_customers&redirect_uri={redirectUri}&state={state}
```

このログで、実際に生成されているOAuth認証URLとスコープを確認できます。

### 2. Shopify Partners Dashboardでスコープ設定を確認

**注意**: カスタムアプリの場合、Shopify Partners Dashboardの「Settings」ページには「Scopes」フィールドは表示されません。これは正常です。

カスタムアプリでは、OAuth認証URLに`scope`パラメータを指定することでスコープを要求します。Shopify Partners Dashboardで事前に設定する必要はありません。

### 3. 環境変数の確認

Azure App Serviceの環境変数を確認：

```powershell
# Azure Portalで確認
# App Service → 設定 → アプリケーション設定
# または、Azure CLIで確認
az webapp config appsettings list --name <app-name> --resource-group <resource-group>
```

確認すべき環境変数：
- `SHOPIFY_SCOPES`（設定されている場合、これが優先される）

### 4. データベースのShopifyAppsテーブルを確認

```sql
SELECT 
    Id,
    Name,
    ApiKey,
    Scopes,
    IsActive
FROM ShopifyApps
WHERE IsActive = 1;
```

`Scopes`カラムに`read_customers`が含まれているか確認。

## 対応方法

### 方法1: バックエンドログでOAuth認証URLを確認（推奨）

1. アプリを再インストール
2. バックエンドログで以下のログを確認：
   ```
   OAuth認証スコープ: read_orders,read_products,read_customers
   生成されたOAuth認証URL: https://{shop}/admin/oauth/authorize?client_id={apiKey}&scope=read_orders,read_products,read_customers&...
   ```
3. URLに`scope=read_orders,read_products,read_customers`が含まれていることを確認
4. OAuth認証画面でスコープが表示されるか確認

### 方法2: 環境変数でスコープを設定

Azure App Serviceの環境変数に`SHOPIFY_SCOPES`が設定されている場合、それが優先されます。

確認方法：
```powershell
# Azure Portalで確認
# App Service → 設定 → アプリケーション設定
# または、Azure CLIで確認
az webapp config appsettings list --name <app-name> --resource-group <resource-group>
```

設定が必要な場合：
```
SHOPIFY_SCOPES=read_orders,read_products,read_customers
```

**注意**: 環境変数が設定されている場合、`appsettings.json`の設定よりも優先されます。

### 方法3: アプリを再インストール

1. Shopify Adminでアプリを削除
2. アプリを再インストール
3. バックエンドログでOAuth認証URLとスコープを確認
4. OAuth認証画面で、すべてのスコープ（特に`read_customers`）を承認

### 方法4: Shopify Adminで権限を更新

1. Shopify Adminにログイン
2. 「設定」→「アプリと販売チャネル」→「開発用アプリ」
3. 該当アプリを選択
4. 「権限」セクションで`read_customers`が承認されているか確認
5. 未承認の場合は「権限を更新」をクリックして承認

## 検証方法

### 1. OAuth認証URLの確認

バックエンドログで、生成されたOAuth認証URLを確認：

```
生成されたOAuth認証URL: https://{shop}/admin/oauth/authorize?client_id={apiKey}&scope=read_orders,read_products,read_customers&...
```

URLに`scope=read_orders,read_products,read_customers`が含まれていることを確認。

### 2. OAuth認証画面の確認

OAuth認証画面で、以下のスコープが表示されることを確認：
- 注文情報の読み取り（`read_orders`）
- 商品情報の読み取り（`read_products`）
- 顧客情報の読み取り（`read_customers`）

### 3. インストール後の確認

インストール後、以下のクエリでスコープが正しく保存されているか確認：

```sql
SELECT 
    Id,
    ShopDomain,
    Scopes,
    AccessToken
FROM Stores
WHERE ShopDomain = '{shop_domain}';
```

`Scopes`カラムに`read_customers`が含まれていることを確認。

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` - OAuth認証URL生成処理
- `backend/ShopifyAnalyticsApi/appsettings.Production.json` - スコープ設定
- `docs/05-development/06-Shopify連携/マルチアプリ設定管理.md` - Shopify Partners Dashboard設定

## 更新履歴

- 2025-12-25: 初版作成
- 2025-12-25: ログ出力を追加してOAuth認証URLとスコープを確認可能に
