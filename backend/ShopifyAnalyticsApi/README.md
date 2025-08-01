# Shopify Test API

## 概要
Shopifyデータ分析用のバックエンドAPIです。

## ログシステム

### 機能
- Application Insights統合
- 構造化ログ（リクエストID、相関ID、パフォーマンス測定）
- 環境別ログ設定
- グローバル例外処理
- ヘルスチェック機能
- パフォーマンス監視

### 環境変数設定（Azure App Service）

#### 必須設定
```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=your_application_insights_connection_string
```

#### オプション設定
```bash
ASPNETCORE_ENVIRONMENT=Production
WEBSITE_SITE_NAME=your-app-service-name
```

### Azure App Serviceでの設定手順

1. **Azure PortalでApplication Insightsリソースを作成**
   - リソースグループを選択
   - Application Insightsリソースを作成
   - 接続文字列をコピー

2. **App Serviceの設定で環境変数を追加**
   - Azure PortalでApp Serviceに移動
   - 「設定」→「構成」→「アプリケーション設定」
   - 新しいアプリケーション設定を追加：
     - 名前: `APPLICATIONINSIGHTS_CONNECTION_STRING`
     - 値: Application Insightsの接続文字列

3. **App Serviceを再起動**
   - 設定変更後、App Serviceを再起動

### ヘルスチェックエンドポイント

- `/health` - 基本的なヘルスチェック
- `/health/ready` - 詳細な準備状態確認（データベース接続含む）

### ログレベル

#### 開発環境
- デフォルト: Debug
- ファイルログ: 有効
- コンソールログ: 有効

#### 本番環境
- デフォルト: Information
- Application Insights: 有効
- コンソールログ: 有効

### パフォーマンス監視

- 遅い処理（1秒以上）: Warningログ
- クリティカル処理（5秒以上）: Warningログ + Application Insightsメトリクス
- カスタムメトリクス: OperationDuration, SlowOperationDuration, CriticalOperationDuration

### ログクエリ

Application Insightsでのログ分析用クエリは `Documentation/LogQueries.md` を参照してください。

## 開発環境での実行

```bash
cd backend/ShopifyTestApi
dotnet run
```

## デプロイ

Azure App Serviceへのデプロイは、Azure CLIまたはVisual Studioから実行できます。
