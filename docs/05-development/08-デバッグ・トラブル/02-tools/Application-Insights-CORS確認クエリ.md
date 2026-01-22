# Application Insights: CORS設定確認クエリ集

## 📋 概要

Application Insightsのログクエリエディタで、CORS設定や関連するログを確認するためのKustoクエリ集です。

---

## 🚀 ログクエリエディタの開き方

### 方法1: App Serviceから開く（推奨）

1. **Azure Portalにログイン**
   ```
   https://portal.azure.com
   ```

2. **App Serviceを開く**
   - リソースグループ: `ec-ranger-prod`
   - App Service: `ec-ranger-backend-prod`

3. **Application Insightsを開く**
   - 左メニュー → 「監視」→ 「Application Insights」
   - または、直接URL: `https://portal.azure.com/#@[tenant]/resource/subscriptions/[subscription-id]/resourceGroups/ec-ranger-prod/providers/Microsoft.Web/sites/ec-ranger-backend-prod/applicationInsights`

4. **ログを開く**
   - 左メニュー → 「ログ」
   - または、Application Insightsの概要ページから「ログ」をクリック

### 方法2: Application Insightsリソースから直接開く

1. **Azure Portalにログイン**
   ```
   https://portal.azure.com
   ```

2. **Application Insightsリソースを開く**
   - リソースグループ: `ec-ranger-prod`
   - Application Insights: `ec-ranger-backend-prod`
   - または、検索バーで「ec-ranger-backend-prod」を検索

3. **ログを開く**
   - 左メニュー → 「監視」→ 「ログ」
   - または、概要ページから「ログ」をクリック

### 方法3: 直接URLで開く

以下のURLをブラウザで開く（`[subscription-id]`を実際のサブスクリプションIDに置き換える）：

```
https://portal.azure.com/#@[tenant]/resource/subscriptions/[subscription-id]/resourceGroups/ec-ranger-prod/providers/microsoft.insights/components/ec-ranger-backend-prod/logs
```

**サブスクリプションIDの確認方法**:
- Azure Portal → サブスクリプション
- サブスクリプションIDをコピー

---

## 📝 ログクエリエディタの画面構成

ログクエリエディタを開くと、以下のような画面が表示されます：

### 画面の構成

1. **上部ツールバー**
   - 「保存」ボタン
   - 「共有」ボタン
   - 「クエリ ハブ」ボタン
   - 「簡易モード」ドロップダウン

2. **クエリエディタ**
   - クエリを入力・編集するエリア
   - タブで複数のクエリを管理可能

3. **クエリオプション**
   - 「テーブルの選択」ドロップダウン
   - 「時間の範囲」設定（デフォルト: 過去24時間）
   - 「表示: 1000 結果」設定

4. **結果表示エリア**
   - クエリ実行後の結果が表示されるエリア
   - テーブル形式で表示

---

## 🔍 CORS設定の確認

### 1. アプリケーション起動時のCORS設定を確認（推奨・最初に実行）

```kusto
// アプリケーション起動時のログ（CORS設定確認）
traces
| where timestamp > ago(30m)
| where message contains "CORS" 
   or message contains "AllowedOrigins" 
   or message contains "corsOrigins"
   or message contains "ec-ranger.access-net.co.jp"
| where customDimensions.SourceContext != "ApplicationInsights Profiler"  // Profilerログを除外
| order by timestamp desc
| take 50
```

**確認ポイント**:
- CORS設定が正しく読み込まれているか
- `https://ec-ranger.access-net.co.jp`が含まれているか

**注意**: Application Insights Profilerのログを除外するため、`where customDimensions.SourceContext != "ApplicationInsights Profiler"`を追加しています。

---

### 2. CORSエラーのログを確認

```kusto
// CORSエラーのログ
traces
| where timestamp > ago(1h)
| where message contains "CORS" 
   or message contains "Access-Control-Allow-Origin"
   or message contains "cors"
| where severityLevel >= 2  // Warning以上
| order by timestamp desc
| take 100
```

---

### 3. 特定のオリジンからのリクエストを確認

```kusto
// ec-ranger.access-net.co.jpからのリクエスト
traces
| where timestamp > ago(1h)
| where customDimensions.RequestPath != ""
| where customDimensions.RequestPath contains "/api/"
| extend origin = tostring(customDimensions["Origin"])
| where origin contains "ec-ranger.access-net.co.jp"
| order by timestamp desc
| take 100
```

---

## 🔐 認証・OAuth関連のログ確認

### 4. HMAC検証失敗のログ

```kusto
// HMAC検証失敗のログ
traces
| where timestamp > ago(1h)
| where message contains "HMAC" 
   or message contains "HMAC検証失敗"
| order by timestamp desc
| take 100
```

---

### 5. OAuth認証フローのログ

```kusto
// OAuth認証フローのログ
traces
| where timestamp > ago(1h)
| where message contains "OAuth" 
   or message contains "ShopifyAuth"
   or message contains "OAuth URL"
| order by timestamp desc
| take 100
```

---

### 6. 認証エラーのログ

```kusto
// 認証エラーのログ
traces
| where timestamp > ago(1h)
| where severityLevel >= 3  // Error以上
| where message contains "認証" 
   or message contains "authentication"
   or message contains "401"
| order by timestamp desc
| take 100
```

---

## 📊 リクエスト・レスポンスの確認

### 7. 特定のRequestIdでログを検索

```kusto
// 特定のRequestIdでログを検索
traces
| where timestamp > ago(1h)
| where customDimensions.RequestId == "40000599-0000-e300-b63f-84710c7967bb"
| order by timestamp asc
| project timestamp, severityLevel, message, customDimensions
```

**使い方**:
- `RequestId`を実際の値に置き換えてください
- ブラウザのコンソールで確認したRequestIdを使用

---

### 8. /api/store エンドポイントのログ

```kusto
// /api/store エンドポイントのログ
traces
| where timestamp > ago(1h)
| where customDimensions.RequestPath == "/api/store"
| order by timestamp desc
| take 100
```

---

### 9. 401エラーのログ

```kusto
// 401エラーのログ
requests
| where timestamp > ago(1h)
| where resultCode == 401
| order by timestamp desc
| take 100
| project timestamp, name, url, resultCode, duration, customDimensions
```

---

## 🚀 アプリケーション起動時の確認

### 10. アプリケーション起動時のログ（全般）

```kusto
// アプリケーション起動時のログ
traces
| where timestamp > ago(30m)
| where message contains "Application started" 
   or message contains "アプリケーション起動"
   or message contains "Program.cs"
| order by timestamp desc
| take 50
```

---

### 11. 設定ファイルの読み込み確認

```kusto
// 設定ファイルの読み込み確認
traces
| where timestamp > ago(30m)
| where message contains "appsettings" 
   or message contains "Configuration"
   or message contains "設定"
| order by timestamp desc
| take 50
```

---

## 🔧 トラブルシューティング用クエリ

### 12. エラーログの一覧（過去1時間・Profiler除外）

```kusto
// エラーログの一覧（Application Insights Profilerを除外）
traces
| where timestamp > ago(1h)
| where severityLevel >= 3  // Error以上
| where customDimensions.SourceContext != "ApplicationInsights Profiler"  // Profilerログを除外
| order by timestamp desc
| take 100
| project timestamp, severityLevel, message, customDimensions.SourceContext, customDimensions.RequestId
```

---

### 13. 警告ログの一覧（過去1時間）

```kusto
// 警告ログの一覧
traces
| where timestamp > ago(1h)
| where severityLevel == 2  // Warning
| order by timestamp desc
| take 100
| project timestamp, severityLevel, message, customDimensions.SourceContext
```

---

### 14. 最新のログ（リアルタイム確認用・Profiler除外）

```kusto
// 最新のログ（リアルタイム確認用・Application Insights Profilerを除外）
traces
| where timestamp > ago(10m)
| where customDimensions.SourceContext != "ApplicationInsights Profiler"  // Profilerログを除外
| order by timestamp desc
| take 100
| project timestamp, severityLevel, message, customDimensions.SourceContext, customDimensions.RequestPath
```

---

## ⚠️ Application Insights Profilerのログを除外する方法

Application Insights Profilerのログが多く表示される場合、以下のフィルタを追加してください：

### Profilerログを除外するフィルタ

```kusto
| where customDimensions.SourceContext != "ApplicationInsights Profiler"
```

### すべてのApplication Insights関連ログを除外するフィルタ

```kusto
| where customDimensions.SourceContext !contains "ApplicationInsights"
```

### アプリケーションログのみを表示するフィルタ

```kusto
| where customDimensions.SourceContext !contains "ApplicationInsights"
   and customDimensions.SourceContext !contains "Microsoft.AspNetCore.Hosting.Diagnostics"
   and customDimensions.SourceContext !contains "Microsoft.AspNetCore"
```

---

## 📝 クエリの使い方

### 基本的な使い方

1. **Application Insightsのログ画面を開く**
   - Azure Portal → Application Insights → ログ

2. **クエリエディタにクエリを貼り付ける**
   - 上記のクエリをコピー＆ペースト

3. **時間範囲を調整**
   - デフォルトは「過去24時間」
   - 必要に応じて「過去1時間」「過去30分」などに変更

4. **クエリを実行**
   - 「実行」ボタンをクリック

5. **結果を確認**
   - テーブル形式で結果が表示されます
   - 各列をクリックしてソート可能

---

### クエリのカスタマイズ

#### 時間範囲の変更

```kusto
// 過去30分のログ
traces
| where timestamp > ago(30m)  // ← ここを変更
| ...
```

**利用可能な時間範囲**:
- `ago(10m)` - 過去10分
- `ago(30m)` - 過去30分
- `ago(1h)` - 過去1時間
- `ago(24h)` - 過去24時間
- `ago(7d)` - 過去7日

#### 結果数の変更

```kusto
traces
| ...
| take 100  // ← ここを変更（デフォルトは1000）
```

---

## 🎯 現在のCORSエラー確認用クエリ

### 即座に実行できるクエリ（推奨）

```kusto
// CORS設定とエラーを同時に確認（Application Insights Profilerを除外）
traces
| where timestamp > ago(30m)
| where message contains "CORS" 
   or message contains "AllowedOrigins"
   or message contains "Access-Control-Allow-Origin"
   or message contains "ec-ranger.access-net.co.jp"
| where customDimensions.SourceContext != "ApplicationInsights Profiler"  // Profilerログを除外
| order by timestamp desc
| take 100
| project timestamp, severityLevel, message, customDimensions.SourceContext, customDimensions.RequestPath, customDimensions
```

**このクエリの特徴**:
- Application Insights Profilerのログを除外
- CORS関連のログのみを表示
- SourceContextとRequestPathも表示して、どのコンポーネントからのログか確認可能

---

### アプリケーションログのみを確認（Profilerを完全に除外）

```kusto
// アプリケーションログのみ（Profiler、Diagnosticsを除外）
traces
| where timestamp > ago(30m)
| where customDimensions.SourceContext !contains "ApplicationInsights"
   and customDimensions.SourceContext !contains "Microsoft.AspNetCore.Hosting.Diagnostics"
| where message contains "CORS" 
   or message contains "AllowedOrigins"
   or message contains "Access-Control-Allow-Origin"
   or message contains "ec-ranger.access-net.co.jp"
   or message contains "Program.cs"
   or message contains "appsettings"
| order by timestamp desc
| take 100
| project timestamp, severityLevel, message, customDimensions.SourceContext, customDimensions
```

---

## ⚠️ トラブルシューティング

### 「指定した時間範囲の結果が見つかりませんでした」エラー

このエラーが表示される場合、以下の対処方法を試してください：

#### 1. 時間範囲を広げる

**問題**: 指定した時間範囲内にログが存在しない可能性があります。

**解決方法**:
- 時間範囲を「過去24時間」または「過去7日」に変更
- または、クエリ内の`ago(30m)`を`ago(24h)`や`ago(7d)`に変更

**例**:
```kusto
// 時間範囲を過去24時間に変更
traces
| where timestamp > ago(24h)  // ← 30m から 24h に変更
| where message contains "CORS"
| ...
```

---

#### 2. まずはすべてのログを確認する

**問題**: クエリの条件が厳しすぎて、ログが見つからない可能性があります。

**解決方法**: まずは条件を緩和して、ログが存在するか確認します。

**確認用クエリ**:
```kusto
// すべてのログを確認（Profilerを除外）
traces
| where timestamp > ago(24h)
| where customDimensions.SourceContext != "ApplicationInsights Profiler"
| order by timestamp desc
| take 100
| project timestamp, severityLevel, message, customDimensions.SourceContext
```

**このクエリで結果が表示されない場合**:
- Application Insightsが正しく設定されていない可能性
- ログが送信されていない可能性
- 時間範囲が適切でない可能性

---

#### 3. Application Insightsの設定を確認する

**確認事項**:
1. **Application Insightsが有効になっているか**
   - Azure Portal → App Service → 監視 → Application Insights
   - 接続されているか確認

2. **接続文字列が設定されているか**
   - Azure Portal → App Service → 設定 → 構成 → アプリケーション設定
   - `APPLICATIONINSIGHTS_CONNECTION_STRING`が設定されているか確認

3. **ログレベルが適切か**
   - `appsettings.Production.json`の`Logging:LogLevel`を確認
   - `Default`が`Information`以上になっているか確認

---

#### 4. 段階的に条件を追加する

**問題**: 一度に多くの条件を指定すると、結果が見つからない可能性があります。

**解決方法**: 段階的に条件を追加して、どの条件で結果が見つからなくなるか確認します。

**ステップ1: 基本的なクエリ**
```kusto
// ステップ1: すべてのログを確認
traces
| where timestamp > ago(24h)
| where customDimensions.SourceContext != "ApplicationInsights Profiler"
| order by timestamp desc
| take 100
```

**ステップ2: メッセージでフィルタ**
```kusto
// ステップ2: メッセージでフィルタ
traces
| where timestamp > ago(24h)
| where customDimensions.SourceContext != "ApplicationInsights Profiler"
| where message contains "CORS"  // ← 条件を追加
| order by timestamp desc
| take 100
```

**ステップ3: さらに条件を追加**
```kusto
// ステップ3: さらに条件を追加
traces
| where timestamp > ago(24h)
| where customDimensions.SourceContext != "ApplicationInsights Profiler"
| where message contains "CORS" 
   or message contains "AllowedOrigins"  // ← 条件を追加
| order by timestamp desc
| take 100
```

---

#### 5. 異なるテーブルを試す

**問題**: `traces`テーブルにログがない場合、他のテーブルにログがある可能性があります。

**解決方法**: `requests`テーブルや`exceptions`テーブルも確認します。

**requestsテーブルで確認**:
```kusto
// requestsテーブルで確認
requests
| where timestamp > ago(24h)
| where url contains "/api/"
| order by timestamp desc
| take 100
| project timestamp, name, url, resultCode, duration
```

**exceptionsテーブルで確認**:
```kusto
// exceptionsテーブルで確認
exceptions
| where timestamp > ago(24h)
| order by timestamp desc
| take 100
| project timestamp, type, message, outerMessage
```

---

#### 6. ログストリームで確認する

**問題**: Application Insightsにログが送信されていない可能性があります。

**解決方法**: Azure Portalのログストリームでリアルタイムログを確認します。

**手順**:
1. Azure Portal → App Service → 監視 → ログストリーム
2. リアルタイムでログが表示されるか確認
3. ログが表示されない場合、ログ設定を確認

---

## 🔧 よくある問題と解決方法

### 問題1: ログが全く表示されない

**原因**:
- Application Insightsが有効になっていない
- 接続文字列が設定されていない
- ログレベルが低すぎる

**解決方法**:
1. Application Insightsの設定を確認
2. 接続文字列を設定
3. ログレベルを`Information`以上に設定

---

### 問題2: Application Insights Profilerのログばかり表示される

**原因**: Profilerのログが多く、アプリケーションログが見つからない

**解決方法**: Profilerのログを除外するフィルタを追加

```kusto
| where customDimensions.SourceContext != "ApplicationInsights Profiler"
```

---

### 問題3: 時間範囲を広げても結果が見つからない

**原因**:
- アプリケーションが起動していない
- ログが送信されていない
- Application Insightsの設定に問題がある

**解決方法**:
1. App Serviceが起動しているか確認
2. ログストリームでリアルタイムログを確認
3. Application Insightsの設定を確認

---

## 📚 参考情報

### Kustoクエリの基本構文

- `traces` - トレースログ（アプリケーションログ）
- `requests` - HTTPリクエストログ
- `exceptions` - 例外ログ
- `where` - フィルタ条件
- `order by` - ソート
- `take` - 結果数の制限
- `project` - 表示する列の選択

### 関連ドキュメント

- [Kustoクエリ言語のドキュメント](https://learn.microsoft.com/ja-jp/azure/data-explorer/kusto/query/)
- [Application Insights ログクエリ](https://learn.microsoft.com/ja-jp/azure/azure-monitor/logs/log-query-overview)

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
