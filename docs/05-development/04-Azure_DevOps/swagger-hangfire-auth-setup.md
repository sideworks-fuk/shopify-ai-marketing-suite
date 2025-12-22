# Swagger・Hangfireダッシュボード認証設定

本番環境でSwaggerとHangfireダッシュボードにBasic認証を追加しました。

## 設定方法

### Azure Portalでの環境変数設定

**Azure Portal** → **App Service** → **構成** → **アプリケーション設定**タブ：

以下の環境変数を追加：

```
Swagger__BasicAuth__Username = admin
Swagger__BasicAuth__Password = [強力なパスワードを設定]
Hangfire__Dashboard__Username = admin
Hangfire__Dashboard__Password = [強力なパスワードを設定]
```

**注意**: 
- パスワードは環境変数で上書きするため、`appsettings.Production.json`のプレースホルダーはそのまま残します
- 本番環境では強力なパスワードを設定してください

## アクセス方法

### Swagger UI

- URL: `https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/swagger`
- 認証: Basic認証
  - ユーザー名: 環境変数 `Swagger__BasicAuth__Username` の値（デフォルト: `admin`）
  - パスワード: 環境変数 `Swagger__BasicAuth__Password` の値

### Hangfireダッシュボード

- URL: `https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/hangfire`
- 認証: Basic認証
  - ユーザー名: 環境変数 `Hangfire__Dashboard__Username` の値（デフォルト: `admin`）
  - パスワード: 環境変数 `Hangfire__Dashboard__Password` の値

## セキュリティに関する注意事項

1. **強力なパスワードを使用**: 本番環境では必ず強力なパスワードを設定してください
2. **定期的なパスワード変更**: セキュリティのため、定期的にパスワードを変更することを推奨します
3. **IP制限（オプション）**: さらにセキュリティを強化する場合は、Azure App ServiceのIP制限機能を使用できます

## 開発環境での動作

開発環境では認証がスキップされ、誰でもアクセス可能です。

