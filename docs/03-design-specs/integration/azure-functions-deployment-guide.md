# Azure Functions デプロイガイド

このガイドでは、ShopifyAzureFunctionsSampleをAzureにデプロイする手順を説明します。

## 前提条件

- Azure サブスクリプション
- Azure CLI または Azure Portal へのアクセス
- Visual Studio Code + Azure Functions 拡張機能（推奨）

## デプロイ手順

### 1. Azure リソースの作成

#### 1.1 リソースグループの作成

1. Azure Portal にログイン
2. 「リソースグループ」→「作成」をクリック
3. 以下の情報を入力：
   - **サブスクリプション**: 使用するサブスクリプションを選択
   - **リソースグループ名**: `rg-shopify-functions-sample`
   - **リージョン**: `Japan East`

![リソースグループ作成](images/create-resource-group.png)

#### 1.2 Function App の作成

1. 「リソースの作成」→「Function App」を検索
2. 「作成」をクリック
3. 基本設定：
   - **サブスクリプション**: 使用するサブスクリプションを選択
   - **リソースグループ**: `rg-shopify-functions-sample`
   - **関数アプリ名**: `shopify-functions-sample-{unique-id}`
   - **公開**: コード
   - **ランタイムスタック**: .NET
   - **バージョン**: 8 (Isolated)
   - **地域**: Japan East
   - **オペレーティングシステム**: Windows
   - **プランの種類**: 従量課金（サーバーレス）

![Function App作成](images/create-function-app.png)

4. 「確認および作成」→「作成」

#### 1.3 Application Insights の設定

Function Appの作成時に自動的に作成されますが、確認方法：

1. Function App のリソースに移動
2. 左メニューの「Application Insights」をクリック
3. 有効になっていることを確認

### 2. アプリケーション設定

#### 2.1 環境変数の設定

1. Function App の「構成」→「アプリケーション設定」に移動
2. 以下の設定を追加：

| 名前 | 値 | 説明 |
|------|-----|------|
| ShopifyDomain | your-shop.myshopify.com | Shopifyストアのドメイン |
| ShopifyApiKey | your-api-key | Shopify API キー（オプション） |
| ShopifyApiSecret | your-api-secret | Shopify API シークレット（オプション） |

![アプリケーション設定](images/app-settings.png)

3. 「保存」をクリック

### 3. コードのデプロイ

#### 方法1: Visual Studio Code を使用（推奨）

1. VS Code で azure-functions-sample フォルダを開く
2. Azure Functions 拡張機能がインストールされていることを確認
3. F1 キーを押して、「Azure Functions: Deploy to Function App...」を選択
4. サブスクリプション、Function App を選択
5. デプロイの確認で「Deploy」をクリック

![VS Code デプロイ](images/vscode-deploy.png)

#### 方法2: Azure CLI を使用

```bash
# プロジェクトをビルド
cd ShopifyAzureFunctionsSample
dotnet publish -c Release

# zip ファイルを作成
cd bin/Release/net8.0/publish
zip -r ../deploy.zip .

# デプロイ
az functionapp deployment source config-zip \
  --resource-group rg-shopify-functions-sample \
  --name shopify-functions-sample-{unique-id} \
  --src ../deploy.zip
```

### 4. デプロイの確認

#### 4.1 Function App の概要

1. Azure Portal で Function App に移動
2. 「関数」メニューで「HelloShopify」が表示されることを確認

![関数一覧](images/functions-list.png)

#### 4.2 実行ログの確認

1. 「モニター」→「ログ」を選択
2. タイマートリガーが30分ごとに実行されることを確認

```
2025-08-02T10:00:00.123 [Information] Hello Shopify timer trigger executed at: 2025-08-02 10:00:00
2025-08-02T10:00:00.456 [Information] Calling Shopify API for shop: test-shop.myshopify.com
```

#### 4.3 Application Insights でのモニタリング

1. Application Insights リソースに移動
2. 「ライブメトリック」で実行状況をリアルタイム確認
3. 「検索」でカスタムイベント「HelloShopifyTriggered」を確認

![Application Insights](images/app-insights.png)

### 5. コスト見積もり

#### Consumption Plan (従量課金) の場合

| リソース | 無料枠 | 超過後の料金 |
|----------|--------|--------------|
| 実行回数 | 100万回/月 | ¥0.022/1000回 |
| 実行時間 | 400,000 GB-秒/月 | ¥0.0018/GB-秒 |
| Application Insights | 5GB/月 | ¥0.35/GB |

**月間推定コスト（30分ごとの実行）**:
- 実行回数: 48回/日 × 30日 = 1,440回（無料枠内）
- 実行時間: 最小限（無料枠内）
- **合計: ¥0～¥100/月**

### 6. トラブルシューティング

#### デプロイエラー

1. **認証エラー**: Azure CLI で再ログイン
   ```bash
   az login
   ```

2. **ビルドエラー**: .NET SDK バージョンを確認
   ```bash
   dotnet --version
   ```

#### 実行エラー

1. **関数が実行されない**:
   - Application Settings を確認
   - Function App を再起動

2. **ログが表示されない**:
   - Application Insights が有効か確認
   - ログレベルを確認（host.json）

### 7. セキュリティのベストプラクティス

1. **アクセス制限**:
   - Function App の「ネットワーク」で IP 制限を設定

2. **シークレット管理**:
   - API キーは Key Vault に保存
   - Managed Identity を使用

3. **HTTPS 強制**:
   - 「TLS/SSL 設定」で HTTPS のみを有効化

### 8. 次のステップ

- HTTP トリガー関数の追加
- Durable Functions の実装
- CI/CD パイプラインの構築（GitHub Actions）
- 本番環境への移行計画

## 参考リンク

- [Azure Functions のドキュメント](https://docs.microsoft.com/ja-jp/azure/azure-functions/)
- [.NET 分離ワーカープロセス ガイド](https://docs.microsoft.com/ja-jp/azure/azure-functions/dotnet-isolated-process-guide)
- [Application Insights の使用](https://docs.microsoft.com/ja-jp/azure/azure-functions/functions-monitoring)