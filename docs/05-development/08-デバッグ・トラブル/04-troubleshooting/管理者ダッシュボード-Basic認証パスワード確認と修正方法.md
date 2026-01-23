# 管理者ダッシュボード - Basic認証パスワード確認と修正方法

## 📋 問題概要

本番環境で管理者ダッシュボード（`/admin`）に`admin`/`Admin2025!`でログインできない。

ログから判明した問題：
- `SwaggerPassword: [8 chars]` - 8文字のパスワードが設定されている
- `ExpectedPasswordPreview: w7Mf3` - 期待されるパスワードの最初の5文字
- `PasswordLength: 10` - 入力されたパスワードは10文字（`Admin2025!`）
- `ExpectedPasswordLength: 8` - 期待されるパスワードは8文字

## 🔍 原因

`Swagger:BasicAuth:Password`に8文字のパスワードが環境変数で設定されているため、デフォルト値（`Admin2025!`）が使用されていない。

## ✅ 解決方法

### 方法1: Azure Portalで環境変数を確認・修正（推奨）

#### ステップ1: ステージングスロットの環境変数を確認

1. **Azure Portal**にログイン
   - https://portal.azure.com

2. **App Serviceを開く**
   - リソースグループ: `ec-ranger-prod`
   - App Service名: `ec-ranger-backend-prod-ghf3bbarghcwh4gn`

3. **デプロイスロットを選択**
   - 左メニュー → 「デプロイ」→ 「デプロイ スロット」
   - `staging`スロットをクリック

4. **設定 → 構成 → アプリケーション設定**を開く

5. **環境変数を確認**
   - 以下の環境変数を検索：
     - `Swagger__BasicAuth__Password`
     - `Admin__BasicAuth__Password`
     - `Hangfire__Dashboard__Password`

#### ステップ2: 環境変数を修正

**推奨**: `Admin__BasicAuth__Password`を設定（最優先）

1. **新しいアプリケーション設定を追加**
   - 「+ 新しいアプリケーション設定」をクリック
   - 以下を設定：
     ```
     名前: Admin__BasicAuth__Password
     値: Admin2025!
     ```

2. **既存の`Swagger__BasicAuth__Password`を確認**
   - 8文字のパスワードが設定されている場合は、削除または`Admin2025!`に変更

3. **保存**
   - 「保存」をクリック
   - アプリケーションの再起動が自動的に実行されます

### 方法2: Azure CLIで環境変数を設定

```powershell
# Azureにログイン
az login

# ステージングスロットの環境変数を設定
az webapp config appsettings set `
  --resource-group ec-ranger-prod `
  --name ec-ranger-backend-prod-ghf3bbarghcwh4gn `
  --slot staging `
  --settings Admin__BasicAuth__Password="Admin2025!"

# 既存のSwaggerパスワードを削除（オプション）
az webapp config appsettings delete `
  --resource-group ec-ranger-prod `
  --name ec-ranger-backend-prod-ghf3bbarghcwh4gn `
  --slot staging `
  --setting-names Swagger__BasicAuth__Password
```

## 🔍 確認方法

### ステップ1: 環境変数を確認

```powershell
# ステージングスロットの環境変数を一覧表示
az webapp config appsettings list `
  --resource-group ec-ranger-prod `
  --name ec-ranger-backend-prod-ghf3bbarghcwh4gn `
  --slot staging `
  --query "[?name=='Admin__BasicAuth__Password' || name=='Swagger__BasicAuth__Password' || name=='Hangfire__Dashboard__Password']"
```

### ステップ2: ログで確認

修正後、`/admin`にアクセスして、以下のログを確認：

```
[AdminBasicAuthMiddleware] GetConfigValue: Using Admin config value (length: 10)
```

または

```
[AdminBasicAuthMiddleware] GetConfigValue: Using default value (no valid config found). DefaultLength: 10
```

## 📝 設定の優先順位

認証情報は以下の優先順位で取得されます：

1. **`Admin__BasicAuth__Password`**（最優先）✅ 推奨
2. `Swagger__BasicAuth__Password`
3. `Hangfire__Dashboard__Password`
4. デフォルト値（`Admin2025!`）

## ⚠️ 注意事項

### 1. 環境変数の命名規則

Azure Portalでは、階層構造を`__`（ダブルアンダースコア）で表現します：

- `Admin:BasicAuth:Password` → `Admin__BasicAuth__Password`
- `Swagger:BasicAuth:Password` → `Swagger__BasicAuth__Password`
- `Hangfire:Dashboard:Password` → `Hangfire__Dashboard__Password`

### 2. アプリケーションの再起動

環境変数を変更した後、アプリケーションが自動的に再起動されます。再起動が完了するまで数分かかる場合があります。

### 3. パスワードのセキュリティ

- 強力なパスワードを使用してください（推奨: 32文字以上）
- パスワードをGitにコミットしないでください
- 定期的にパスワードをローテーションしてください

## 🔗 関連ドキュメント

- [管理者ダッシュボード使用方法](./管理者ダッシュボード使用方法.md)
- [管理者ダッシュボード-認証仕様](./管理者ダッシュボード-認証仕様.md)
- [管理者ダッシュボードBasic認証失敗の原因と対処法](../01-problem-analysis/2026-01/2026-01-23-管理者ダッシュボードBasic認証失敗の原因と対処法.md)
