# Azure Functions デプロイ手順書

## 1. 前提条件

### 1.1 必要なアカウント・ツール
- **Azure アカウント** - 有効なサブスクリプション
- **Azure CLI** - 最新版インストール済み
- **Azure Functions Core Tools v4** - インストール済み
- **Git** - ソース管理用
- **GitHub アカウント** - CI/CD用（オプション）

### 1.2 権限要件
- Azure サブスクリプションの **共同作成者** 権限
- **Key Vault** 管理者権限（本番環境）
- **Application Insights** 管理権限

## 2. Azure リソースの作成

### 2.1 Azure CLI ログイン
```bash
# Azureにログイン
az login

# 使用するサブスクリプションの設定
az account list --output table
az account set --subscription "your-subscription-id"
```

### 2.2 リソースグループの作成
```bash
# 変数設定
export RESOURCE_GROUP="shopify-ai-rg"
export LOCATION="Japan East"
export FUNCTION_APP_NAME="shopify-batch-processor"
export STORAGE_ACCOUNT="shopifyaistg$(date +%s)"

# リソースグループ作成
az group create \
  --name $RESOURCE_GROUP \
  --location "$LOCATION"
```

### 2.3 ストレージアカウントの作成
```bash
# Azure Functions用ストレージアカウント
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2

# 接続文字列の取得
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --output tsv)
```

### 2.4 Application Insights の作成
```bash
# Application Insights インスタンス作成
az monitor app-insights component create \
  --app "$FUNCTION_APP_NAME-insights" \
  --location "$LOCATION" \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# インストルメンテーションキーと接続文字列の取得
APP_INSIGHTS_KEY=$(az monitor app-insights component show \
  --app "$FUNCTION_APP_NAME-insights" \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

APP_INSIGHTS_CONNECTION_STRING=$(az monitor app-insights component show \
  --app "$FUNCTION_APP_NAME-insights" \
  --resource-group $RESOURCE_GROUP \
  --query connectionString \
  --output tsv)
```

### 2.5 Key Vault の作成（本番環境）
```bash
# Key Vault作成
az keyvault create \
  --name "$FUNCTION_APP_NAME-kv" \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION" \
  --sku standard

# シークレットの追加
az keyvault secret set \
  --vault-name "$FUNCTION_APP_NAME-kv" \
  --name "ShopifyAccessToken" \
  --value "your-shopify-access-token"

az keyvault secret set \
  --vault-name "$FUNCTION_APP_NAME-kv" \
  --name "DatabaseConnectionString" \
  --value "your-database-connection-string"
```

### 2.6 Function App の作成
```bash
# Function App作成 (.NET 8 Isolated)
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location "$LOCATION" \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --storage-account $STORAGE_ACCOUNT \
  --app-insights $APP_INSIGHTS_KEY \
  --functions-version 4

# Managed Identity有効化
az functionapp identity assign \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### 2.7 Key Vault アクセス許可設定
```bash
# Function AppのManaged IdentityにKey Vaultアクセス権を付与
FUNCTION_PRINCIPAL_ID=$(az functionapp identity show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

az keyvault set-policy \
  --name "$FUNCTION_APP_NAME-kv" \
  --object-id $FUNCTION_PRINCIPAL_ID \
  --secret-permissions get list
```

## 3. アプリケーション設定

### 3.1 Function App 設定の構成
```bash
# データベース接続文字列（開発環境用）
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "ConnectionStrings__DefaultConnection=Server=your-server;Database=ShopifyAI;User Id=your-user;Password=your-password;TrustServerCertificate=true;" \
    "Shopify__ShopDomain=your-shop-name.myshopify.com" \
    "Shopify__AccessToken=@Microsoft.KeyVault(VaultName=$FUNCTION_APP_NAME-kv;SecretName=ShopifyAccessToken)" \
    "Shopify__ApiVersion=2023-10" \
    "Shopify__RateLimit__RequestsPerSecond=2" \
    "ApplicationInsights__ConnectionString=$APP_INSIGHTS_CONNECTION_STRING" \
    "KeyVault__VaultUrl=https://$FUNCTION_APP_NAME-kv.vault.azure.net/" \
    "Sync__BatchSize=250" \
    "Sync__EnableIncrementalSync=true" \
    "Sync__CustomerSyncSchedule=0 0 */2 * * *" \
    "Sync__ProductSyncSchedule=0 30 */4 * * *" \
    "Sync__OrderSyncSchedule=0 15 */1 * * *"
```

### 3.2 本番環境用設定の構成
```bash
# 本番環境用設定（Key Vault参照）
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "ConnectionStrings__DefaultConnection=@Microsoft.KeyVault(VaultName=$FUNCTION_APP_NAME-kv;SecretName=DatabaseConnectionString)" \
    "FUNCTIONS_WORKER_RUNTIME=dotnet-isolated" \
    "AzureWebJobsStorage=$STORAGE_CONNECTION_STRING"
```

## 4. デプロイ方法

### 4.1 方法1: Azure CLI 直接デプロイ
```bash
# プロジェクトディレクトリに移動
cd /path/to/shopify-ai-marketing-suite/backend/ShopifyBatchProcessor

# プロジェクトをビルド
dotnet build --configuration Release

# Azure Functionsにデプロイ
func azure functionapp publish $FUNCTION_APP_NAME
```

### 4.2 方法2: Visual Studio からのデプロイ

1. **Visual Studio 2022** でプロジェクトを開く
2. **ソリューション エクスプローラー** でプロジェクトを右クリック
3. **発行** を選択
4. **Azure** → **Azure Function App (Windows)** を選択
5. 作成したFunction Appを選択してデプロイ

### 4.3 方法3: GitHub Actions CI/CD

**.github/workflows/deploy-azure-functions.yml**
```yaml
name: Deploy Azure Functions

on:
  push:
    branches: [main]
    paths: ['backend/ShopifyBatchProcessor/**']
  pull_request:
    branches: [main]
    paths: ['backend/ShopifyBatchProcessor/**']

env:
  AZURE_FUNCTIONAPP_NAME: 'shopify-batch-processor'
  AZURE_FUNCTIONAPP_PACKAGE_PATH: 'backend/ShopifyBatchProcessor'
  DOTNET_VERSION: '8.0.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: 'Checkout GitHub Action'
      uses: actions/checkout@v4

    - name: 'Setup .NET Core SDK'
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: ${{ env.DOTNET_VERSION }}

    - name: 'Restore packages'
      shell: bash
      run: |
        pushd './${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}'
        dotnet restore
        popd

    - name: 'Build project'
      shell: bash
      run: |
        pushd './${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}'
        dotnet build --configuration Release --output ./output
        popd

    - name: 'Run unit tests'
      shell: bash
      run: |
        pushd './${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}.Tests'
        dotnet test --configuration Release --logger trx --collect:"XPlat Code Coverage"
        popd

    - name: 'Deploy to Azure Functions'
      uses: Azure/functions-action@v1
      id: deploy-to-function
      with:
        app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
        package: '${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}/output'
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}

    - name: 'Post-deployment health check'
      shell: bash
      run: |
        sleep 30
        curl -f https://${{ env.AZURE_FUNCTIONAPP_NAME }}.azurewebsites.net/api/HealthCheck || exit 1
```

### 4.4 GitHub Secrets の設定

GitHub Actions用の秘匿情報を設定:

```bash
# Publish Profileの取得
PUBLISH_PROFILE=$(az functionapp deployment list-publishing-profiles \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --xml)

echo "以下をGitHub SecretsのAZURE_FUNCTIONAPP_PUBLISH_PROFILEに設定:"
echo "$PUBLISH_PROFILE"
```

**GitHub Secrets設定項目:**
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: Publish Profile XML

## 5. デプロイ後の確認

### 5.1 デプロイ状況の確認
```bash
# Function Appの状態確認
az functionapp show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{name:name,state:state,hostNames:hostNames}"

# Functionsの一覧表示
az functionapp function list \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### 5.2 ヘルスチェック
```bash
# ヘルスチェックエンドポイントのテスト
curl https://$FUNCTION_APP_NAME.azurewebsites.net/api/HealthCheck

# 期待されるレスポンス:
# {
#   "Status": "Healthy",
#   "Timestamp": "2024-07-24T12:00:00Z",
#   "Service": "ShopifyBatchProcessor"
# }
```

### 5.3 ログの確認
```bash
# リアルタイムログストリーミング
az webapp log tail \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Application Insightsでのログ確認
az monitor app-insights query \
  --app "$FUNCTION_APP_NAME-insights" \
  --resource-group $RESOURCE_GROUP \
  --analytics-query "traces | where timestamp > ago(1h) | order by timestamp desc | limit 50"
```

## 6. 運用設定

### 6.1 スケーリング設定
```bash
# 最大インスタンス数の設定
az functionapp plan update \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --max-burst 10

# タイムアウト設定の確認・更新
az functionapp config set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --generic-configurations '{"functionTimeout":"00:10:00"}'
```

### 6.2 監視・アラート設定
```bash
# Function実行エラーアラート
az monitor metrics alert create \
  --name "FunctionErrors" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
  --condition "count static FunctionExecutionCount >= 1 where ResultCode startswith 5" \
  --description "Function execution errors detected" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --severity 2

# 応答時間アラート
az monitor metrics alert create \
  --name "FunctionDuration" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
  --condition "average static FunctionExecutionTime >= 300000" \
  --description "Function execution time is too long" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --severity 3
```

### 6.3 バックアップ・災害復旧
```bash
# Function Appの設定バックアップ
az functionapp config backup create \
  --resource-group $RESOURCE_GROUP \
  --webapp-name $FUNCTION_APP_NAME \
  --backup-name "backup-$(date +%Y%m%d)" \
  --storage-account-url "https://$STORAGE_ACCOUNT.blob.core.windows.net/" \
  --frequency 24 \
  --retention 30
```

## 7. スロットを使用した段階的デプロイ

### 7.1 ステージングスロットの作成
```bash
# ステージングスロット作成
az functionapp deployment slot create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

# ステージング用設定
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --slot-settings \
    "Environment=Staging" \
    "Sync__BatchSize=100"
```

### 7.2 段階的デプロイ実行
```bash
# ステージングスロットにデプロイ
func azure functionapp publish $FUNCTION_APP_NAME --slot staging

# ステージング環境でテスト実行
curl https://$FUNCTION_APP_NAME-staging.azurewebsites.net/api/HealthCheck

# 問題なければ本番にスワップ
az functionapp deployment slot swap \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging
```

## 8. トラブルシューティング

### 8.1 一般的な問題と解決方法

**1. デプロイエラー**
```bash
# デプロイログの確認
az functionapp log deployment list \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# 詳細なデプロイログ
az functionapp log deployment show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-id [deployment-id]
```

**2. Function実行エラー**
```bash
# Function実行ログの確認
az webapp log tail \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Application Insightsでの詳細分析
# Azure PortalでApplication Insightsにアクセス
```

**3. Key Vault接続エラー**
```bash
# Managed Identityの確認
az functionapp identity show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Key Vaultアクセス権限の再設定
az keyvault set-policy \
  --name "$FUNCTION_APP_NAME-kv" \
  --object-id [principal-id] \
  --secret-permissions get list
```

**4. データベース接続エラー**
```bash
# 接続文字列の確認
az functionapp config connection-string list \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# SQLデータベースのファイアウォール設定確認
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server [sql-server-name] \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 8.2 パフォーマンス最適化

**1. コールドスタート対策**
```bash
# Always On設定（Premium Plan必要）
az functionapp config set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --always-on true
```

**2. 並列実行数の調整**
```bash
# host.jsonでの設定
# "functionTimeout": "00:10:00"
# "batchSize": 16
# "maxConcurrentCalls": 25
```

## 9. セキュリティ設定

### 9.1 Function レベルの認証
```bash
# Function App認証の有効化
az functionapp auth update \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --enabled true \
  --action LoginWithAzureActiveDirectory
```

### 9.2 ネットワーク制限
```bash
# IP制限の設定
az functionapp config access-restriction add \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --rule-name "AllowOfficeIP" \
  --action Allow \
  --ip-address "203.0.113.0/24" \
  --priority 100
```

## 10. 定期メンテナンス

### 10.1 更新チェックリスト
- [ ] Function Appランタイムの更新確認
- [ ] NuGetパッケージの更新
- [ ] セキュリティパッチの適用
- [ ] パフォーマンスメトリクスの確認
- [ ] エラーログの確認
- [ ] コスト使用量の確認

### 10.2 定期的な監視項目
```bash
# コスト分析
az consumption usage list \
  --start-date 2024-07-01 \
  --end-date 2024-07-31 \
  --query "[?contains(instanceName,'$FUNCTION_APP_NAME')]"

# パフォーマンスメトリクス
az monitor metrics list \
  --resource "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
  --metric FunctionExecutionTime,FunctionExecutionCount \
  --start-time 2024-07-24T00:00:00Z \
  --end-time 2024-07-24T23:59:59Z
```

これでAzure Functionsのデプロイが完了です。次にアーキテクチャ説明資料を作成します。