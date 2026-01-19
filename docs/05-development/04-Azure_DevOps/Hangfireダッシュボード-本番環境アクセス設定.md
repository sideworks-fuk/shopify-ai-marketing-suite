# Hangfireダッシュボード - 本番環境アクセス設定

## 📋 概要

本番環境のHangfireダッシュボードにアクセスできるようにするための設定手順です。

**HangfireダッシュボードURL**: `https://ec-ranger-api.access-net.co.jp/hangfire`

---

## 🔐 認証方法

本番環境では、以下のいずれかの方法で認証できます：

### 1. Basic認証（推奨）

**設定方法**:
1. Azure PortalでApp Serviceの環境変数を設定
2. ブラウザでBasic認証ダイアログが表示される
3. ユーザー名とパスワードを入力

**環境変数名**:
- `Hangfire:Dashboard:Username` - ユーザー名（デフォルト: `admin`）
- `Hangfire:Dashboard:Password` - パスワード（**必須**）

---

### 2. ローカルアクセス

**条件**:
- リモートIPアドレスが `127.0.0.1` または `::1`
- Azure App Serviceのローカルネットワークからのアクセスのみ

**注意**: 本番環境では通常使用できません（Azure App Serviceはリモートアクセス）

---

### 3. 認証済みユーザー

**条件**:
- `Admin` または `SystemAdmin` ロールを持つユーザー
- または `ViewHangfireDashboard` クレームを持つユーザー

**注意**: 現在の実装では、この方法は使用されていません

---

## 🔧 設定手順

### ステップ1: Azure Portalで環境変数を設定

1. **Azure Portalにログイン**
   - https://portal.azure.com

2. **App Serviceを開く**
   - リソースグループ: `ec-ranger-resource-group`（または該当するリソースグループ）
   - App Service名: `ec-ranger-backend-prod-ghf3bbarghcwh4gn`（または該当するApp Service）

3. **設定 → 構成 → アプリケーション設定**を開く

4. **新しいアプリケーション設定を追加**

   **設定1: ユーザー名**
   ```
   名前: Hangfire:Dashboard:Username
   値: admin（または任意のユーザー名）
   ```

   **設定2: パスワード**
   ```
   名前: Hangfire:Dashboard:Password
   値: [強力なパスワードを設定]
   ```

   **パスワードの推奨要件**:
   - 最低12文字以上
   - 大文字・小文字・数字・記号を含む
   - 例: `HangfireAdmin2025!Secure`

5. **保存**をクリック

6. **App Serviceを再起動**（必要に応じて）
   - 設定 → 概要 → **再起動**

---

### 設定例（スクリーンショット参考）

**Azure Portalでの設定画面**:
```
アプリケーション設定
┌─────────────────────────────────────┬──────────────────────────┐
│ 名前                                │ 値                       │
├─────────────────────────────────────┼──────────────────────────┤
│ Hangfire:Dashboard:Username         │ admin                    │
│ Hangfire:Dashboard:Password         │ HangfireAdmin2025!Secure │
└─────────────────────────────────────┴──────────────────────────┘
```

**注意**: 
- 環境変数名は `Hangfire:Dashboard:Username` と `Hangfire:Dashboard:Password` です（コロン`:`を含む）
- Azure Portalでは、コロンを含む環境変数名が正しく設定されることを確認してください

---

### ステップ2: アクセステスト

1. **ブラウザでHangfireダッシュボードにアクセス**
   ```
   https://ec-ranger-api.access-net.co.jp/hangfire
   ```

2. **Basic認証ダイアログが表示される**
   - ユーザー名: 設定したユーザー名（例: `admin`）
   - パスワード: 設定したパスワード

3. **認証成功後、Hangfireダッシュボードが表示される**

---

## 🔒 セキュリティ推奨事項

### 1. 強力なパスワードを使用

- 最低12文字以上
- 大文字・小文字・数字・記号を含む
- 定期的に変更する（推奨: 3ヶ月ごと）

### 2. IP制限の追加（オプション）

Azure App Serviceの「アクセス制限」機能を使用して、特定のIPアドレスからのみアクセスを許可できます。

**設定手順**:
1. App Service → **ネットworking** → **アクセス制限**
2. **ルールの追加**をクリック
3. 許可するIPアドレス範囲を設定
4. **保存**

**注意**: IP制限を設定すると、Basic認証と併用できます

---

### 3. 環境変数の管理

**推奨**: Azure Key Vaultを使用してパスワードを管理

**設定手順**:
1. Azure Key Vaultを作成
2. シークレットとしてパスワードを保存
3. App ServiceのマネージドIDを有効化
4. Key Vaultへのアクセス権限を付与
5. 環境変数でKey Vault参照を設定

**環境変数の設定例**:
```
名前: Hangfire:Dashboard:Password
値: @Microsoft.KeyVault(SecretUri=https://[keyvault-name].vault.azure.net/secrets/hangfire-dashboard-password/)
```

---

## 🐛 トラブルシューティング

### 問題1: Basic認証ダイアログが表示されない

**原因**:
- 環境変数が正しく設定されていない
- App Serviceが再起動されていない

**解決方法**:
1. 環境変数が正しく設定されているか確認
2. App Serviceを再起動
3. ブラウザのキャッシュをクリア

---

### 問題2: 認証に失敗する

**原因**:
- ユーザー名またはパスワードが間違っている
- 環境変数の値が正しく読み込まれていない

**解決方法**:
1. 環境変数の値を確認（Azure Portal → 構成 → アプリケーション設定）
2. ユーザー名とパスワードが正しいか確認
3. App Serviceのログを確認（Application Insights）

---

### 問題3: 403 Forbiddenエラーが表示される

**原因**:
- 認証フィルターがアクセスを拒否している
- IP制限が設定されている

**解決方法**:
1. IP制限の設定を確認
2. アクセス元のIPアドレスが許可されているか確認
3. 環境変数が正しく設定されているか確認

---

### 問題4: ダッシュボードが表示されない（404エラー）

**原因**:
- Hangfireが正しく設定されていない
- ルーティングの問題

**解決方法**:
1. App Serviceのログを確認
2. Hangfireの設定を確認（`Program.cs`）
3. データベース接続を確認

---

## 📝 現在の設定確認

### 設定ファイル

**`appsettings.Production.json`**:
```json
{
  "Hangfire": {
    "Dashboard": {
      "Username": "admin",
      "Password": "Will be overridden by environment variable"
    }
  }
}
```

**`Program.cs`**:
```csharp
app.UseHangfireDashboard("/hangfire", new Hangfire.DashboardOptions
{
    Authorization = new[] { new ShopifyAnalyticsApi.Filters.HangfireAuthorizationFilter() },
    DashboardTitle = "EC Ranger - Job Dashboard"
});
```

**`HangfireAuthorizationFilter.cs`**:
- Basic認証をサポート
- 環境変数から認証情報を取得
- 本番環境では認証必須

---

## 🔄 環境変数の更新

### パスワードを変更する場合

1. **Azure Portalで環境変数を更新**
   - `Hangfire:Dashboard:Password` の値を変更

2. **App Serviceを再起動**（必要に応じて）

3. **新しいパスワードでアクセステスト**

---

## 📚 関連ドキュメント

- [Hangfire公式ドキュメント](https://docs.hangfire.io/)
- [Azure App Service環境変数の設定](https://docs.microsoft.com/ja-jp/azure/app-service/configure-common)
- [Azure Key Vaultの使用](https://docs.microsoft.com/ja-jp/azure/key-vault/general/overview)

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
