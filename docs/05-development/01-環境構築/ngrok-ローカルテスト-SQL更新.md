# ngrok ローカルテスト - ShopifyAppsテーブル更新SQL

## 作成日
2025-12-29

## 目的
ngrokを使用したローカルテストのために、`ShopifyApps`テーブルの`AppUrl`を更新する。

---

## 📋 現在の状態

### ShopifyAppsテーブル（Id: 6）

| 項目 | 現在の値 | 更新後の値 |
|------|---------|-----------|
| Id | 6 | - |
| Name | EC Ranger-xn-fbkq6e5da0fpb | - |
| ApiKey | 706a757915dedce54806c0a179bee05d | - |
| AppUrl | `https://black-flower-004e1de00.2.azurestaticapps.net` | `https://unsavagely-repressive-terrance.ngrok-free.dev` |
| RedirectUri | `https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback` | `https://unsavagely-repressive-terrance.ngrok-free.dev/api/shopify/callback` |

---

## 🔧 更新SQL

### Step 1: AppUrlとRedirectUriを更新

```sql
-- ShopifyAppsテーブルのAppUrlとRedirectUriを更新
UPDATE [dbo].[ShopifyApps]
SET 
    [AppUrl] = 'https://unsavagely-repressive-terrance.ngrok-free.dev',
    [RedirectUri] = 'https://unsavagely-repressive-terrance.ngrok-free.dev/api/shopify/callback',
    [UpdatedAt] = GETUTCDATE()
WHERE [Id] = 6
  AND [ApiKey] = '706a757915dedce54806c0a179bee05d'
  AND [IsActive] = 1;
```

### Step 2: 更新結果の確認

```sql
-- 更新結果を確認
SELECT 
    [Id],
    [Name],
    [ApiKey],
    [AppUrl],
    [RedirectUri],
    [IsActive],
    [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [Id] = 6
  AND [ApiKey] = '706a757915dedce54806c0a179bee05d';
```

---

## 🔄 GitHub Actions環境変数の更新

### 変更内容

1. **`NEXT_PUBLIC_API_URL`**:
   - 変更前: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`
   - 変更後: `https://unsavagely-repressive-terrance.ngrok-free.dev`
   - **注意**: フロントエンドからバックエンドAPIへの呼び出しに使用されるため、フロントエンド用のngrok URLを設定します。

2. **`NEXT_PUBLIC_SHOPIFY_APP_URL`**:
   - 変更前: `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`
   - 変更後: `https://unsavagely-repressive-terrance.ngrok-free.dev`
   - **注意**: フロントエンド用のngrok URLを設定します。

### 変更手順

1. GitHubリポジトリにアクセス
2. Settings → Environments → `development`を選択
3. Environment variablesセクションで以下を更新：
   - `NEXT_PUBLIC_API_URL`: `https://unsavagely-repressive-terrance.ngrok-free.dev`
   - `NEXT_PUBLIC_SHOPIFY_APP_URL`: `https://unsavagely-repressive-terrance.ngrok-free.dev`

---

## ⚠️ 重要な注意事項

### バックエンドの設定について

ユーザーが「バックエンドは `https://localhost:7088` で進めます」と述べていますが、これは**ローカル開発環境**での話です。

**GitHub Actions環境変数**では`localhost`は使用できません（デプロイ先でアクセスできないため）。

**推奨アプローチ**:
- **ローカル開発環境**: `frontend/.env.local`で`NEXT_PUBLIC_API_URL=https://localhost:7088`を設定
- **GitHub Actions環境変数**: `NEXT_PUBLIC_API_URL=https://unsavagely-repressive-terrance.ngrok-free.dev`を設定（フロントエンド用ngrok URL）

### appsettings.Development.jsonについて

ユーザーが「`appsettings.Development.json`は現在使っていない」と述べています。

**現在の実装**:
- バックエンドの`GetShopifyAppUrlAsync()`メソッドは、`ShopifyApps`テーブルから`AppUrl`を取得します
- フォールバックとして環境変数`SHOPIFY_APPURL`または`Shopify:AppUrl`を参照しますが、テーブルが優先されます

**結論**: `ShopifyApps`テーブルの`AppUrl`を更新することで、バックエンドのOAuthリダイレクト処理が正しく動作します。

---

## 🧪 テスト手順

### 1. データベース更新の確認

```sql
-- 更新後の値を確認
SELECT 
    [Id],
    [Name],
    [ApiKey],
    [AppUrl],
    [RedirectUri],
    [IsActive],
    [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [Id] = 6;
```

### 2. バックエンドのログ確認

バックエンドのログで、`GetShopifyAppUrlAsync`メソッドが正しい`AppUrl`を取得していることを確認：

```
GetShopifyAppUrlAsync: ShopifyApp found. Id=6, Name=EC Ranger-xn-fbkq6e5da0fpb, AppUrl=https://unsavagely-repressive-terrance.ngrok-free.dev, IsActive=True
```

### 3. OAuth認証フローのテスト

1. ブラウザで `https://unsavagely-repressive-terrance.ngrok-free.dev/install?shop=your-dev-store.myshopify.com` にアクセス
2. 「接続を開始」ボタンをクリック
3. Shopify OAuth認証画面で権限を承認
4. `/auth/success`ページにリダイレクトされることを確認
5. バックエンドログで`BuildRedirectUrlAsync`が正しいURLを生成していることを確認

---

## 📝 設定確認チェックリスト

- [ ] `ShopifyApps`テーブルの`AppUrl`が更新されている（Id: 6）
- [ ] `ShopifyApps`テーブルの`RedirectUri`が更新されている（Id: 6）
- [ ] GitHub Actions環境変数`NEXT_PUBLIC_API_URL`が更新されている
- [ ] GitHub Actions環境変数`NEXT_PUBLIC_SHOPIFY_APP_URL`が更新されている
- [ ] Shopify Partners DashboardのApp URLが更新されている
- [ ] Shopify Partners DashboardのAllowed redirection URLsが更新されている

---

## 📚 関連ドキュメント

- [ngrok設定ガイド](./ngrok設定ガイド.md)
- [ngrok-ローカルテスト設定手順](./ngrok-ローカルテスト設定手順.md)
- [インストール機能設計書](../../03-feature-development/インストールフロー改善機能/インストール機能設計書.md)
- [マルチアプリ設定管理](../../05-development/06-Shopify連携/マルチアプリ設定管理.md)

---

## 📝 更新履歴

- 2025-12-29: 初版作成
  - `ShopifyApps`テーブル更新SQLを追加
  - GitHub Actions環境変数更新手順を追加
  - バックエンド設定に関する注意事項を追加
