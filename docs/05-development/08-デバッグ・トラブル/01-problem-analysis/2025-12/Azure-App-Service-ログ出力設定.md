# Azure App Service ログ出力設定

## 問題
`web.config`で`stdoutLogFile=".\logs\stdout"`を設定しているが、`logs`フォルダが作成されない。

## 原因

### 1. Azure App Serviceでのstdoutログの制限
Azure App Serviceでは、`web.config`の`stdoutLogFile`設定は**ローカル開発環境**でのみ有効です。Azure App Serviceでは、以下の理由で`logs`フォルダが作成されない可能性があります：

1. **ファイルシステムの制限**: Azure App Serviceのファイルシステムは読み取り専用の部分があり、アプリケーションのルートディレクトリに書き込みできない場合がある
2. **stdoutログの無効化**: Azure App Serviceでは、Application Insightsやログストリームを使用するため、`stdoutLogFile`が無効化されている可能性がある

### 2. 推奨されるログ出力方法

Azure App Serviceでは、以下の方法でログを出力することを推奨します：

#### 方法1: Application Insights（推奨）
`Program.cs`で既に設定されている：
```csharp
builder.Services.AddLogging(loggingBuilder =>
{
    loggingBuilder.AddAzureWebAppDiagnostics();
});
```

#### 方法2: ログストリーム
Azure Portalの「ログストリーム」機能を使用

#### 方法3: Serilog（既に設定済み）
`appsettings.LocalDevelopment.json`でSerilogが設定されている：
```json
"Serilog": {
  "WriteTo": [
    {
      "Name": "Console",
      "Args": {
        "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"
      }
    }
  ]
}
```

## 解決策

### 1. `web.config`の修正（オプション）

Azure App Serviceでは、`stdoutLogFile`を設定しても効果がない場合があります。以下のように修正することで、ローカル開発環境でのみ有効にできます：

```xml
<aspNetCore processPath=".\ShopifyAnalyticsApi.exe" 
            arguments="" 
            stdoutLogEnabled="true" 
            stdoutLogFile=".\logs\stdout" 
            hostingModel="outofprocess">
  <environmentVariables>
    <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Development" />
  </environmentVariables>
</aspNetCore>
```

### 2. Application Insightsの確認

Azure Portalで以下を確認：
1. Application Insightsが有効になっているか
2. ログレベルが適切に設定されているか（`Information`以上）

### 3. ログストリームの確認

Azure Portalの「ログストリーム」でリアルタイムログを確認：
1. Azure Portal → App Service → 「ログストリーム」
2. ログが表示されることを確認

### 4. Serilogのファイル出力を追加（オプション）

ローカル開発環境でファイル出力が必要な場合：

```json
"Serilog": {
  "WriteTo": [
    {
      "Name": "Console"
    },
    {
      "Name": "File",
      "Args": {
        "path": "logs/app-.log",
        "rollingInterval": "Day",
        "retainedFileCountLimit": 7,
        "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"
      }
    }
  ]
}
```

**注意**: Azure App Serviceでは、ファイル出力は推奨されません。Application Insightsを使用してください。

## 確認手順

### 1. Application Insightsでログを確認
1. Azure Portal → Application Insights → 「ログ」
2. 以下のクエリでログを確認：
```kusto
traces
| where timestamp > ago(1h)
| order by timestamp desc
```

### 2. ログストリームでログを確認
1. Azure Portal → App Service → 「ログストリーム」
2. リアルタイムログが表示されることを確認

### 3. ローカル開発環境でログを確認
1. コンソール出力を確認
2. `logs`フォルダが作成されることを確認（ローカルのみ）

## 関連ファイル
- `backend/ShopifyAnalyticsApi/web.config`
- `backend/ShopifyAnalyticsApi/Program.cs`
- `backend/ShopifyAnalyticsApi/appsettings.LocalDevelopment.json`

## 参考
- [Azure App Service でのログ記録](https://learn.microsoft.com/ja-jp/azure/app-service/troubleshoot-diagnostic-logs)
- [Application Insights でのログ記録](https://learn.microsoft.com/ja-jp/azure/azure-monitor/app/asp-net-core)
