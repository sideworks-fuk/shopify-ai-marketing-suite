# Kuduアクセス不可時のログ確認方法

## 📋 問題状況

**問題**: Kudu（高度なツール）にアクセスできない
- SSLエラー: `https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.scm.japanwest-01.azurewebsites.net/`でSSLエラーが発生
- Trend Microなどのセキュリティソフトによるブロック
- リージョン付きURL（`.japanwest-01.azurewebsites.net`）の問題

**影響**: ログファイルを直接確認できない

---

## ✅ 代替手段（優先順位順）

### 方法1: Azure Portalのログストリーム（最も簡単・推奨）

**メリット**:
- Kuduへのアクセスが不要
- リアルタイムでログを確認可能
- SSLエラーやセキュリティソフトのブロックを回避

**手順**:
1. **Azure Portalにログイン**
   ```
   https://portal.azure.com
   ```

2. **App Serviceを開く**
   - リソースグループ: `ec-ranger-prod`
   - App Service: `ec-ranger-backend-prod`

3. **ログストリームを開く**
   - 左メニュー → 「監視」→ 「ログストリーム」
   - または、直接URL: `https://portal.azure.com/#@[tenant]/resource/subscriptions/[subscription-id]/resourceGroups/ec-ranger-prod/providers/Microsoft.Web/sites/ec-ranger-backend-prod/logStream`

4. **ログを確認**
   - リアルタイムでログが表示されます
   - フィルタリング機能も利用可能

**注意事項**:
- 過去のログは確認できません（リアルタイムのみ）
- 長時間接続しているとタイムアウトする場合があります

---

### 方法2: Application Insights（推奨・最も強力）

**メリット**:
- Kuduへのアクセスが不要
- 過去のログも確認可能
- 高度なクエリ機能（Kustoクエリ）
- ログの検索・フィルタリングが容易

**前提条件**:
- Application Insightsが有効になっていること
- 接続文字列が設定されていること

**手順**:
1. **Azure Portalにログイン**
   ```
   https://portal.azure.com
   ```

2. **Application Insightsを開く**
   - リソースグループ: `ec-ranger-prod`
   - Application Insights: `ec-ranger-backend-prod`
   - または、App Service → 「監視」→ 「Application Insights」

3. **ログを開く**
   - 左メニュー → 「ログ」
   - または、直接URL: `https://portal.azure.com/#@[tenant]/resource/subscriptions/[subscription-id]/resourceGroups/ec-ranger-prod/providers/microsoft.insights/components/ec-ranger-backend-prod/logs`

4. **Kustoクエリでログを確認**
   ```kusto
   // 最新のログ（過去1時間）
   traces
   | where timestamp > ago(1h)
   | order by timestamp desc
   | take 100

   // エラーログのみ
   traces
   | where timestamp > ago(1h)
   | where severityLevel >= 3
   | order by timestamp desc

   // CORS関連のログ
   traces
   | where timestamp > ago(1h)
   | where message contains "CORS" or message contains "cors"
   | order by timestamp desc

   // 特定のRequestIdでログを検索
   traces
   | where timestamp > ago(1h)
   | where customDimensions.RequestId == "40000599-0000-e300-b63f-84710c7967bb"
   | order by timestamp desc
   ```

**便利なクエリ例**:
```kusto
// アプリケーション起動時のログ（CORS設定確認用）
traces
| where timestamp > ago(30m)
| where message contains "CORS" or message contains "AllowedOrigins"
| order by timestamp desc

// HMAC検証失敗のログ
traces
| where timestamp > ago(1h)
| where message contains "HMAC" or message contains "HMAC検証失敗"
| order by timestamp desc

// OAuth認証フローのログ
traces
| where timestamp > ago(1h)
| where message contains "OAuth" or message contains "ShopifyAuth"
| order by timestamp desc
```

---

### 方法3: Azure CLIでログをダウンロード

**メリット**:
- ログファイルをローカルにダウンロード可能
- テキストエディタやログ解析ツールで分析可能
- 過去のログも取得可能

**前提条件**:
- Azure CLIがインストールされていること
- Azureにログインしていること

**手順**:

#### ステップ1: Azure CLIにログイン

```powershell
az login
```

#### ステップ2: ログストリームを確認（リアルタイム）

```powershell
az webapp log tail `
  --name ec-ranger-backend-prod `
  --resource-group ec-ranger-prod
```

#### ステップ3: ログファイルをダウンロード

```powershell
# ログファイルをZIP形式でダウンロード
az webapp log download `
  --name ec-ranger-backend-prod `
  --resource-group ec-ranger-prod `
  --log-file logs.zip
```

#### ステップ4: ログファイルを解凍して確認

```powershell
# ZIPファイルを解凍
Expand-Archive -Path logs.zip -DestinationPath logs

# ログファイルを確認
Get-ChildItem logs -Recurse -Filter "*.log" | Select-Object FullName, LastWriteTime
```

**ログファイルの場所**:
```
logs/
├── LogFiles/
│   ├── Application/
│   │   ├── app-2026-01-19.log
│   │   ├── sync-2026-01-19.log
│   │   └── webhook-2026-01-19.log
│   └── http/
│       └── RawLogs/
└── ...
```

---

### 方法4: PowerShellでログを取得

**メリット**:
- Azure PowerShellモジュールを使用
- スクリプト化可能

**前提条件**:
- Azure PowerShellモジュールがインストールされていること
- Azureにログインしていること

**手順**:

#### ステップ1: Azure PowerShellにログイン

```powershell
Connect-AzAccount
```

#### ステップ2: ログストリームを確認

```powershell
Get-AzWebAppLog `
  -ResourceGroupName "ec-ranger-prod" `
  -Name "ec-ranger-backend-prod" `
  -Follow
```

#### ステップ3: ログファイルの一覧を取得

```powershell
Get-AzWebAppLog `
  -ResourceGroupName "ec-ranger-prod" `
  -Name "ec-ranger-backend-prod"
```

---

### 方法5: Azure Portalの「App Service ログ」からダウンロード

**メリット**:
- Azure Portalから直接ダウンロード可能
- ブラウザから操作可能

**手順**:
1. **Azure Portalにログイン**
   ```
   https://portal.azure.com
   ```

2. **App Serviceを開く**
   - リソースグループ: `ec-ranger-prod`
   - App Service: `ec-ranger-backend-prod`

3. **App Service ログを開く**
   - 左メニュー → 「監視」→ 「App Service ログ」
   - または、直接URL: `https://portal.azure.com/#@[tenant]/resource/subscriptions/[subscription-id]/resourceGroups/ec-ranger-prod/providers/Microsoft.Web/sites/ec-ranger-backend-prod/logs`

4. **ログをダウンロード**
   - 「ダウンロード」ボタンをクリック
   - ZIPファイルがダウンロードされます

**注意事項**:
- ログ設定が有効になっている必要があります
- ログファイルが生成されている必要があります

---

## 🔧 ログ設定の確認と有効化

### ログ設定が有効になっているか確認

1. **Azure Portal → App Service → 監視 → App Service ログ**
2. 以下の設定が有効になっているか確認：
   - **Application Logging (File System)**: 有効
   - **Web Server Logging**: 有効
   - **Detailed Error Messages**: 有効（オプション）
   - **Failed Request Tracing**: 有効（オプション）

### ログ設定を有効化する方法

1. **Azure Portal → App Service → 監視 → App Service ログ**
2. 各ログ設定を「オン」に設定
3. 「保存」をクリック
4. App Serviceを再起動（必要に応じて）

---

## 📊 用途別推奨方法

### リアルタイムログ確認
1. **Azure Portalのログストリーム**（最も簡単）
2. **Azure CLIのログストリーム**（コマンドラインから）

### 過去のログ確認
1. **Application Insights**（最も強力・推奨）
2. **Azure CLIでログダウンロード**（ローカルで分析）

### ログファイルの詳細分析
1. **Azure CLIでログダウンロード**（推奨）
2. **Azure PortalのApp Service ログからダウンロード**

### CORS設定の確認
1. **Application Insights**（Kustoクエリで検索）
2. **Azure Portalのログストリーム**（起動時のログを確認）

---

## 🚀 実践例: CORS設定の確認

### Application InsightsでCORS設定を確認

```kusto
// アプリケーション起動時のログ（CORS設定確認）
traces
| where timestamp > ago(30m)
| where message contains "CORS" or message contains "AllowedOrigins" or message contains "corsOrigins"
| order by timestamp desc
| take 50
```

### ログストリームでCORS設定を確認

1. Azure Portal → App Service → 監視 → ログストリーム
2. App Serviceを再起動
3. 起動時のログでCORS設定を確認

---

## 📝 チェックリスト

### ログ確認方法の選択

- [ ] Azure Portalのログストリームを試した
- [ ] Application Insightsでログを確認した
- [ ] Azure CLIでログをダウンロードした
- [ ] ログ設定が有効になっていることを確認した

### トラブルシューティング

- [ ] ログストリームでログが表示されない場合、ログ設定を確認した
- [ ] Application Insightsでログが表示されない場合、接続文字列を確認した
- [ ] Azure CLIでエラーが発生する場合、ログイン状態を確認した

---

## 🔗 参考情報

### 関連ドキュメント

- [Azure App Service ログの確認方法](https://learn.microsoft.com/ja-jp/azure/app-service/troubleshoot-diagnostic-logs)
- [Application Insights ログクエリ](https://learn.microsoft.com/ja-jp/azure/azure-monitor/logs/log-query-overview)
- [Azure CLI ログコマンド](https://learn.microsoft.com/ja-jp/cli/azure/webapp/log)

### 関連ファイル

- `docs/05-development/08-デバッグ・トラブル/01-problem-analysis/2025-12/Kuduでバックエンドログを確認する方法.md`
- `docs/07-operations/01-Azure運用/Azure運用ガイド.md`

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
