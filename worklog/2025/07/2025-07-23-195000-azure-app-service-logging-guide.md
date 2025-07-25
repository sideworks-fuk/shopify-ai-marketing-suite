# 作業ログ: Azure App Service ログガイド作成

## 作業情報
- 開始日時: 2025-07-23 19:50:00
- 完了日時: 2025-07-23 20:05:00
- 所要時間: 15分
- 担当: 福田＋AI Assistant

## 作業概要
Azure App Serviceにデプロイした.NETアプリケーションのログ確認方法について、現在の構成を分析し、包括的なガイドを作成しました。

## 実施内容

### 1. 現在の構成分析

#### 1.1 Serilog設定の確認
**appsettings.json / appsettings.Production.json**:
- Console Sinkのみ使用
- File Sinkは未設定
- Application Insights Sinkは未設定（環境変数による動的設定）

#### 1.2 Program.csの設定確認
```csharp
// Azure App Service Logging
builder.Services.AddLogging(loggingBuilder =>
{
    loggingBuilder.AddAzureWebAppDiagnostics();
});

// Application Insights (環境変数対応)
var aiConnectionString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");
if (!string.IsNullOrEmpty(aiConnectionString))
{
    builder.Services.AddApplicationInsightsTelemetry(options =>
    {
        options.ConnectionString = aiConnectionString;
    });
}
```

### 2. ログ出力先の分析

#### 2.1 現在のログ出力先
1. **Console Sink** → Azure App Service Application Logs
2. **Azure Web App Diagnostics** → App Service の標準ログ
3. **Application Insights** → Azure Monitor (接続文字列が設定されている場合)

#### 2.2 ローカルディスクへのログ出力状況
**❌ 現在の構成ではローカルディスクにログファイルは出力されていません**

**理由**:
- Serilog.Sinks.File パッケージが未インストール
- File Sink の設定が appsettings.json にない
- Console Sink のみの設定

### 3. ログ確認方法の整理

#### 3.1 Azure Portal での確認方法
1. **Log Stream (リアルタイム)**
   - パス: Azure Portal → App Service → 監視 → Log stream
   - メリット: リアルタイム確認
   - 制限: 過去ログは見れない

2. **App Service Logs**
   - パス: Azure Portal → App Service → 監視 → App Service logs
   - 設定項目: Application Logging (Filesystem), Web server logging等

#### 3.2 Kudu Console での確認方法
- **URL**: https://<app-name>.scm.azurewebsites.net/
- **ログ場所**: /home/LogFiles/Application/
- **用途**: ファイル直接確認

#### 3.3 Azure CLI での確認方法
```bash
# リアルタイムログストリーム
az webapp log tail --name <app-name> --resource-group <rg-name>

# ログファイルのダウンロード
az webapp log download --name <app-name> --resource-group <rg-name>
```

#### 3.4 Application Insights での確認方法
- **場所**: Azure Portal → Application Insights → ログ
- **クエリ言語**: KQL (Kusto Query Language)
- **用途**: 高度な分析、アラート設定

### 4. ローカルディスクログ出力の設定方法

#### 4.1 必要なパッケージ
```bash
dotnet add package Serilog.Sinks.File
```

#### 4.2 設定例
```json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.Console", "Serilog.Sinks.File"],
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "File",
        "Args": {
          "path": "/home/LogFiles/Application/app-.txt",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 7
        }
      }
    ]
  }
}
```

#### 4.3 Azure App Service での保存場所
```
/home/LogFiles/Application/app-20250723.txt
/home/LogFiles/Application/app-20250724.txt
```

### 5. 推奨設定の策定

#### 5.1 環境別推奨設定

**開発環境**:
- Console + File (ローカルディスク)
- 詳細ログレベル

**本番環境**:
- Console + File + Application Insights
- 適度なログレベル
- ローテーション設定

#### 5.2 パフォーマンス考慮事項
- ログレベルの最適化
- ファイルローテーション
- 保存期間の設定

## 成果物

### 作成したファイル一覧
1. `docs/05-operations/azure-app-service-logging-guide.md` - Azure App Service ログガイド（新規作成）

### 主要な内容
1. **Azure App Serviceでのログの仕組み**: 4種類のログタイプと保存場所
2. **現在の構成でのログ出力**: Console Sinkの動作とApplication Insights連携
3. **ログの確認方法**: 4つの確認方法（Portal, Kudu, CLI, Application Insights）
4. **ローカルディスクへのログ出力**: File Sinkの設定方法
5. **推奨されるログ設定**: 環境別の設定例
6. **トラブルシューティング**: よくある問題と解決方法

### 技術的詳細
- **Mermaid図**: ログフローの視覚化
- **設定例**: 実際の JSON 設定
- **CLI コマンド**: 実用的なコマンド例
- **KQLクエリ**: Application Insights での検索例

## 質問への回答

### Q: Azure App Serviceにデプロイした.NETアプリケーションのログはどのようにして確認できるのか？

**A: 4つの主要な方法があります**

1. **Azure Portal Log Stream** (リアルタイム確認)
2. **Kudu Console** (ファイル直接確認)
3. **Azure CLI** (コマンドライン)
4. **Application Insights** (高度な分析)

### Q: ローカルの時同様にローカルディスクにはログ出力できているのか？

**A: 現在の構成ではローカルディスクにログファイルは出力されていません**

**理由**:
- Serilog設定でFile Sinkを使用していない
- Console Sinkのみの設定

**解決方法**:
- `Serilog.Sinks.File` パッケージの追加
- appsettings.json にFile Sink設定の追加
- Azure App Service の `/home/LogFiles/Application/` ディレクトリに出力

## 課題・注意点

### 実装済み
- 現在の構成の詳細分析
- ログ確認方法の包括的説明
- ローカルディスクログ出力の設定方法
- 推奨設定の策定
- トラブルシューティングガイド

### 今後の検討事項
1. **File Sink の導入**: より詳細なログ保存のため
2. **Application Insights Sink の設定**: 高度な監視のため
3. **ログレベルの最適化**: パフォーマンス向上のため
4. **ログローテーションの設定**: ディスク容量管理のため

### 確認項目
- [x] 現在のログ出力先の確認
- [x] ローカルディスクログ出力の可否確認
- [x] ログ確認方法の整理
- [x] 推奨設定の策定
- [x] トラブルシューティング方法の整理

## 関連ファイル
- `backend/ShopifyTestApi/Program.cs` - ログ設定
- `backend/ShopifyTestApi/appsettings.json` - Serilog設定
- `backend/ShopifyTestApi/appsettings.Production.json` - 本番環境設定
- `docs/05-operations/azure-app-service-logging-guide.md` - 作成したガイド 