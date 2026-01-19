# AZURE_CREDENTIALS - 設定確認とトラブルシューティング

## 📋 エラー内容

```
Error: Login failed with Error: Using auth-type: SERVICE_PRINCIPAL. 
Not all values are present. Ensure 'client-id' and 'tenant-id' are supplied.
```

このエラーは、`AZURE_CREDENTIALS`シークレットの形式が正しくない場合に発生します。

---

## 🔍 原因

`azure/login@v2`アクションは、サービスプリンシパルの認証情報を**JSON形式**で期待しています。

**必要なフィールド**:
- `clientId`（または`client-id`）
- `clientSecret`（または`client-secret`）
- `subscriptionId`（または`subscription-id`）
- `tenantId`（または`tenant-id`）

---

## ✅ 正しい形式

### GitHub Secretsでの設定

**シークレット名**: `AZURE_CREDENTIALS`

**値（JSON形式）**:
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**重要**:
- JSON形式である必要がある
- すべてのフィールドが必須
- 改行や余分なスペースは問題ないが、有効なJSONである必要がある

---

## 🔧 確認手順

### ステップ1: GitHub Secretsの確認

1. **GitHubリポジトリを開く**
   - https://github.com/[organization]/[repository]

2. **Settings → Secrets and variables → Actions**を開く

3. **`AZURE_CREDENTIALS`シークレットを確認**
   - シークレットが存在するか確認
   - 値が正しいJSON形式か確認（編集はできないが、削除して再作成可能）

---

### ステップ2: JSON形式の確認

**正しい形式の例**:
```json
{
  "clientId": "12345678-1234-1234-1234-123456789012",
  "clientSecret": "abc123def456ghi789jkl012mno345pqr678",
  "subscriptionId": "87654321-4321-4321-4321-210987654321",
  "tenantId": "11111111-2222-3333-4444-555555555555"
}
```

**間違った形式の例**:
```json
// ❌ フィールド名が間違っている
{
  "client_id": "...",  // 正しくは "clientId"
  "client_secret": "...",  // 正しくは "clientSecret"
  ...
}

// ❌ フィールドが不足している
{
  "clientId": "...",
  "clientSecret": "..."
  // subscriptionId と tenantId が不足
}

// ❌ JSON形式ではない
clientId=xxx
clientSecret=yyy
...
```

---

## 🔄 修正方法

### 方法1: Azure CLIでサービスプリンシパルを作成（推奨）

この方法で作成すると、正しいJSON形式が自動生成されます。

```powershell
# Azure CLIにログイン
az login

# サブスクリプションIDを確認
az account show --query id -o tsv

# サービスプリンシパルを作成（JSON形式で出力）
az ad sp create-for-rbac \
  --name "github-actions-deploy" \
  --role contributor \
  --scopes /subscriptions/<サブスクリプションID>/resourceGroups/ec-ranger-prod \
  --sdk-auth
```

**出力例**:
```json
{
  "clientId": "12345678-1234-1234-1234-123456789012",
  "clientSecret": "abc123def456ghi789jkl012mno345pqr678",
  "subscriptionId": "87654321-4321-4321-4321-210987654321",
  "tenantId": "11111111-2222-3333-4444-555555555555",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**この出力全体をGitHub Secretsの`AZURE_CREDENTIALS`に設定**してください。

---

### 方法2: Azure Portalで手動作成

1. **Azure Portal → Azure Active Directory → アプリの登録**
2. **新規登録**をクリック
3. **アプリケーション情報を入力**
   - 名前: `github-actions-deploy`
   - サポートされているアカウントの種類: 「この組織ディレクトリのみに含まれるアカウント」
   - 「登録」をクリック

4. **クライアントシークレットを作成**
   - 「証明書とシークレット」→ 「+ 新しいクライアント シークレット」
   - 説明: `GitHub Actions Deploy`
   - 有効期限: 24か月（推奨）
   - 「追加」をクリック
   - **値**をコピー（後で参照できないため）

5. **必要な情報をコピー**
   - **アプリケーション (クライアント) ID**: 「概要」からコピー
   - **ディレクトリ (テナント) ID**: 「概要」からコピー
   - **サブスクリプションID**: Azure Portalの右上からコピー
   - **クライアントシークレット**: 上記でコピーした値

6. **JSON形式で作成**
   ```json
   {
     "clientId": "<アプリケーションID>",
     "clientSecret": "<クライアントシークレット>",
     "subscriptionId": "<サブスクリプションID>",
     "tenantId": "<テナントID>"
   }
   ```

7. **GitHub Secretsに設定**
   - GitHub → Settings → Secrets and variables → Actions
   - `AZURE_CREDENTIALS`を削除（存在する場合）
   - 新しいシークレットを追加:
     - **名前**: `AZURE_CREDENTIALS`
     - **値**: 上記のJSON（全体をコピー＆ペースト）

---

### 方法3: 既存のサービスプリンシパルを使用

既にサービスプリンシパルが存在する場合：

```powershell
# サービスプリンシパルの一覧を確認
az ad sp list --display-name "github-actions-deploy" --query "[].{DisplayName:displayName, AppId:appId}" -o table

# クライアントシークレットを再作成
az ad sp credential reset --name "github-actions-deploy" --sdk-auth
```

**出力されたJSONをGitHub Secretsに設定**してください。

---

## 🔐 リソースグループへのアクセス権限の付与

サービスプリンシパルを作成したら、リソースグループへのアクセス権限を付与する必要があります。

```powershell
# サービスプリンシパルにリソースグループへのアクセス権を付与
az role assignment create \
  --assignee <アプリケーションID> \
  --role "Contributor" \
  --scope /subscriptions/<サブスクリプションID>/resourceGroups/ec-ranger-prod
```

**必要な権限**:
- **Contributor**: App Serviceのデプロイ、スロットスワップに必要
- **App Service Contributor**: App Service専用の権限（より限定的）

---

## 🧪 動作確認

### ローカルでの確認

```powershell
# Azure CLIにログイン
az login

# サービスプリンシパルでログイン（JSONファイルを使用）
az login --service-principal \
  --username <clientId> \
  --password <clientSecret> \
  --tenant <tenantId>

# ログイン確認
az account show

# リソースグループへのアクセス確認
az group show --name ec-ranger-prod
```

---

### GitHub Actionsでの確認

ワークフローにデバッグステップを追加：

```yaml
- name: 🔍 Verify Azure Login
  uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
  
- name: 🔍 Test Azure CLI
  uses: azure/CLI@v2
  with:
    inlineScript: |
      echo "Current subscription:"
      az account show --query "{Name:name, Id:id}" -o table
      echo ""
      echo "Resource groups:"
      az group list --query "[].{Name:name, Location:location}" -o table
```

---

## 🐛 よくある問題

### 問題1: "Not all values are present"

**原因**: JSON形式が正しくない、またはフィールドが不足している

**解決方法**:
1. JSON形式を確認（有効なJSONか）
2. すべての必須フィールドが含まれているか確認
3. フィールド名が正しいか確認（`clientId`、`clientSecret`、`subscriptionId`、`tenantId`）

---

### 問題2: "Authentication failed"

**原因**: 
- クライアントシークレットが期限切れ
- サービスプリンシパルが削除されている
- 認証情報が間違っている

**解決方法**:
1. クライアントシークレットの有効期限を確認
2. サービスプリンシパルが存在するか確認
3. 新しいクライアントシークレットを作成

---

### 問題3: "Access denied"

**原因**: リソースグループへのアクセス権限がない

**解決方法**:
```powershell
# アクセス権限を確認
az role assignment list \
  --assignee <アプリケーションID> \
  --scope /subscriptions/<サブスクリプションID>/resourceGroups/ec-ranger-prod

# アクセス権限を付与
az role assignment create \
  --assignee <アプリケーションID> \
  --role "Contributor" \
  --scope /subscriptions/<サブスクリプションID>/resourceGroups/ec-ranger-prod
```

---

## 📝 チェックリスト

### 設定前
- [ ] Azure CLIがインストールされている
- [ ] Azure CLIにログインしている
- [ ] サブスクリプションIDを確認済み
- [ ] リソースグループ名を確認済み

### 設定中
- [ ] サービスプリンシパルを作成
- [ ] クライアントシークレットを作成
- [ ] JSON形式で認証情報を取得
- [ ] GitHub Secretsに設定（正しいJSON形式）

### 設定後
- [ ] リソースグループへのアクセス権限を付与
- [ ] ローカルで動作確認
- [ ] GitHub Actionsで動作確認

---

## 📚 参考資料

- [Azure/login アクション](https://github.com/Azure/login#readme)
- [サービスプリンシパルの作成](https://docs.microsoft.com/ja-jp/azure/active-directory/develop/howto-create-service-principal-portal)
- [Azure CLI でのサービスプリンシパル作成](https://docs.microsoft.com/ja-jp/cli/azure/ad/sp?view=azure-cli-latest)

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
