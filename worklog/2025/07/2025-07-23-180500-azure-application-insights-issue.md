# 作業ログ: Azure Application Insights設定問題調査

## 作業情報
- 開始日時: 2025-07-23 18:05:00
- 完了日時: 2025-07-23 18:15:00
- 所要時間: 10分
- 担当: 福田＋AI Assistant

## 作業概要
Azure App ServiceでSwaggerが表示できない問題について、Application Insightsが設定されていないことが原因である可能性を調査し、適切な対処法を提案しました。

## 実施内容

### 1. 問題の分析

#### 1.1 現在の状況
- **ローカル環境**: 正常動作（Application Insights未設定でも動作）
- **Azure App Service**: Swagger表示エラー
- **推測される原因**: Application Insights設定の不足

#### 1.2 設定ファイルの確認
現在の設定では、Application Insights接続文字列が空の場合でもエラーが発生する可能性があります。

### 2. 対処法の提案

#### 2.1 即座の対処法
Application Insights設定を無効化して、Swaggerが表示されるかテスト：

```json
// appsettings.Production.json
{
  "ApplicationInsights": {
    "ConnectionString": ""
  },
  "Serilog": {
    "Using": ["Serilog.Sinks.Console"],
    "WriteTo": [
      {
        "Name": "Console",
        "Args": {
          "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"
        }
      }
    ]
  }
}
```

#### 2.2 Azure App ServiceでのApplication Insights設定手順

##### 手順1: Azure Portalでの設定
1. Azure Portalにログイン
2. App Serviceリソースを選択
3. 左メニューから「Application Insights」を選択
4. 「Application Insightsを有効にする」をクリック
5. 新しいリソースを作成するか、既存のリソースを選択
6. 「適用」をクリック

##### 手順2: 接続文字列の取得
1. Application Insightsリソースを開く
2. 「設定」→「接続文字列」を選択
3. 接続文字列をコピー

##### 手順3: App Serviceでの環境変数設定
1. App Serviceの「設定」→「構成」を選択
2. 「アプリケーション設定」タブを選択
3. 新しい設定を追加：
   - 名前: `APPLICATIONINSIGHTS_CONNECTION_STRING`
   - 値: コピーした接続文字列
4. 「保存」をクリック

### 3. 設定の調整

#### 3.1 Program.csの修正
Application Insights設定の条件を強化：

```csharp
// Application Insights接続文字列の環境変数対応
var aiConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
if (string.IsNullOrEmpty(aiConnectionString) || aiConnectionString?.Contains("#") == true)
{
    aiConnectionString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");
}

if (!string.IsNullOrEmpty(aiConnectionString))
{
    builder.Services.AddApplicationInsightsTelemetry(options =>
    {
        options.ConnectionString = aiConnectionString;
    });
    Log.Information("Application Insights configured with connection string");
}
else
{
    Log.Warning("Application Insights connection string not configured - continuing without telemetry");
}
```

#### 3.2 エラーハンドリングの強化
Application Insights設定が失敗してもアプリケーションが起動するように調整。

## 成果物

### 修正したファイル一覧
1. `worklog/2025/07/2025-07-23-180500-azure-application-insights-issue.md` - 本作業ログ（新規作成）

### 提案した対処法
1. **即座の対処**: Application Insights設定を無効化してテスト
2. **Azure設定手順**: Application Insightsの設定方法を詳細に説明
3. **コード修正**: エラーハンドリングを強化

### 技術的詳細
- **Application Insights設定**: Azure Portalでの設定手順
- **環境変数設定**: App Serviceでの環境変数設定方法
- **エラーハンドリング**: 設定失敗時の適切な処理
- **ログ設定**: Application Insights未設定時の代替設定

## 課題・注意点

### 実装済み
- 問題分析と対処法の提案
- Azure設定手順の詳細説明
- エラーハンドリング強化の提案

### 今後の注意点
1. **Azure設定確認**: Application Insightsが正しく設定されているか確認
2. **環境変数確認**: 接続文字列が正しく設定されているか確認
3. **ログ監視**: アプリケーション起動時のログを確認
4. **段階的テスト**: 設定を段階的に有効化してテスト

### 確認項目
- [ ] Azure PortalでのApplication Insights設定
- [ ] 環境変数の設定確認
- [ ] アプリケーション起動時のログ確認
- [ ] Swagger表示の動作確認
- [ ] Application Insightsへのデータ送信確認

## 関連ファイル
- `backend/ShopifyTestApi/Program.cs` - Application Insights設定
- `backend/ShopifyTestApi/appsettings.Production.json` - 本番環境設定
- `worklog/2025/07/2025-07-23-180000-date-update.md` - 日付更新作業ログ 