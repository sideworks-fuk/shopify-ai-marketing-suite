# ローカルAPIデバッグ手順 - データ同期テスト

## 📋 概要

修正した注文データ同期処理をローカル環境でデバッグ・テストする手順を説明します。

---

## ✅ 前提条件

- [x] .NET 8.0 SDKがインストールされている
- [x] データベース（Azure SQL DatabaseまたはローカルSQL Server）に接続可能
- [x] テスト用のストアデータがデータベースに存在する（StoreId=18など）
- [x] VS CodeのREST Client拡張機能がインストールされている（オプション）
- [x] Postmanがインストールされている（オプション）

---

## 🔐 認証情報

### 開発環境での認証方法

ローカル環境では、以下の認証方法が利用可能です：

#### 1. 開発者認証（Developer Auth）

- **エンドポイント**: `POST /api/developer/login`
- **パスワード**: `dev2026`（デフォルト）
- **環境**: 開発環境（Development/LocalDevelopment）のみ
- **有効期限**: 60分（設定による）

#### 2. デモ認証（Demo Auth）

- **エンドポイント**: `POST /api/demo/login`
- **パスワード**: `dev2025`（デフォルト）
- **環境**: 開発環境（Development/LocalDevelopment）のみ
- **有効期限**: 60分（設定による）

#### 3. X-Store-Idヘッダー

- **必須**: すべてのAPIリクエストで`X-Store-Id`ヘッダーが必要
- **値**: データベースに存在するStoreId（例: `18`）

### 認証フロー

1. **開発者認証でトークンを取得**
   ```http
   POST /api/developer/login
   Body: { "password": "dev2026" }
   Response: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   ```

2. **トークンをAuthorizationヘッダーに設定**
   ```
   Authorization: Bearer {token}
   ```

3. **X-Store-Idヘッダーを設定**
   ```
   X-Store-Id: 18
   ```

4. **APIリクエストを実行**

---

## 🚀 ステップ1: バックエンドの起動

### 方法1: PowerShellスクリプトを使用（推奨）

```powershell
cd backend
.\start-backend.ps1
```

### 方法2: 手動で起動

```powershell
cd backend/ShopifyAnalyticsApi
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --launch-profile https
```

### 起動確認

バックエンドが正常に起動したら、以下のURLにアクセスして確認：

- **Swagger UI**: `http://localhost:5168/swagger`（HTTP推奨）
  - または `https://localhost:7088/swagger`（HTTPS使用時）
- **ヘルスチェック**: `http://localhost:5168/api/health`（HTTP推奨）
  - または `https://localhost:7088/api/health`（HTTPS使用時）

**推奨**: HTTP（`http://localhost:5168`）を使用することで、SSL証明書の問題を回避できます。PostmanやREST ClientでもHTTPを使用することを推奨します。

**注意**: HTTPSを使用する場合、SSL証明書の警告が表示される可能性があります。Postmanでは「Settings → SSL certificate verification → OFF」に設定する必要があります。

---

## 🔧 ステップ2: テスト用HTTPファイルの作成

VS CodeのREST Client拡張機能を使用して、APIを直接呼び出せます。

### ファイル作成

`backend/ShopifyAnalyticsApi/Tests/DataSync-Test.http` は既に作成済みです。

**重要**: HTTP（`http://localhost:5168`）を使用することを推奨します。HTTPSを使用する場合、SSL証明書の検証を無効化する必要があります。

```http
### データ同期テスト用HTTPファイル
@baseUrl = https://localhost:7088
@storeId = 18

### 1. ヘルスチェック
GET {{baseUrl}}/api/health
Accept: application/json

### 2. 初期データ同期を開始（3ヶ月分）
POST {{baseUrl}}/api/sync/initial
Content-Type: application/json
X-Store-Id: {{storeId}}

{
  "syncPeriod": "3months"
}

### 3. 同期ステータスを取得
GET {{baseUrl}}/api/sync/status/{{storeId}}
Accept: application/json
X-Store-Id: {{storeId}}

### 4. 同期履歴を取得
GET {{baseUrl}}/api/sync/history?limit=10
Accept: application/json
X-Store-Id: {{storeId}}

### 5. 注文データのみ同期（手動トリガー）
POST {{baseUrl}}/api/sync/trigger
Content-Type: application/json
X-Store-Id: {{storeId}}

{
  "type": "orders"
}

### 6. 顧客データのみ同期（手動トリガー）
POST {{baseUrl}}/api/sync/trigger
Content-Type: application/json
X-Store-Id: {{storeId}}

{
  "type": "customers"
}

### 7. 商品データのみ同期（手動トリガー）
POST {{baseUrl}}/api/sync/trigger
Content-Type: application/json
X-Store-Id: {{storeId}}

{
  "type": "products"
}
```

---

## 🧪 ステップ3: APIの実行とデバッグ

### 方法1: REST Client拡張機能を使用（推奨）

1. **VS CodeでHTTPファイルを開く**
   - `backend/ShopifyAnalyticsApi/Tests/DataSync-Test.http` を開く

2. **リクエストを実行**
   - 各リクエストの上に「Send Request」ボタンが表示されます
   - クリックしてリクエストを実行

3. **レスポンスを確認**
   - 右側のパネルにレスポンスが表示されます
   - ステータスコード、ヘッダー、ボディを確認

### 方法2: Swagger UIを使用

1. **Swagger UIを開く**
   - `https://localhost:7088/swagger` にアクセス

2. **開発者認証でトークンを取得**
   - `POST /api/developer/login` を展開
   - 「Try it out」をクリック
   - Bodyに以下を入力:
     ```json
     {
       "password": "dev2026"
     }
     ```
   - 「Execute」をクリック
   - レスポンスの`token`をコピー

3. **認証を設定**
   - ページ上部の「Authorize」ボタンをクリック
   - `Bearer {token}` の形式でトークンを入力（`{token}`を実際のトークンに置き換え）
   - 「Authorize」をクリック

4. **APIエンドポイントを選択**
   - `POST /api/sync/initial` を展開
   - 「Try it out」をクリック

5. **リクエストパラメータを入力**
   ```json
   {
     "syncPeriod": "3months"
   }
   ```

6. **ヘッダーを設定**
   - `X-Store-Id`: `18`（テスト用のStoreId）

7. **実行**
   - 「Execute」をクリック
   - レスポンスを確認

### 方法3: Postmanを使用

#### ステップ1: PostmanのSSL設定を確認

**重要**: HTTPSを使用する場合、SSL証明書の検証を無効化する必要があります。

1. **Settingsを開く**
   - Postman → Settings（右上の歯車アイコン）

2. **SSL証明書の検証を無効化**
   - General タブ → SSL certificate verification → **OFF**
   - **注意**: 開発環境のみで無効化してください

**または**: HTTPを使用する場合（推奨）
- URL: `http://localhost:5168/api/developer/login`
- SSL証明書の問題を回避できます

#### ステップ2: 開発者認証でトークンを取得

1. **新しいリクエストを作成**
   - Method: `POST`
   - URL: `http://localhost:5168/api/developer/login`（HTTP推奨）
     - または `https://localhost:7088/api/developer/login`（HTTPS使用時）
   - Headers:
     ```
     Content-Type: application/json
     ```

2. **Bodyを設定**
   - Bodyタブを選択
   - `raw` を選択
   - `JSON` を選択
   - 以下のJSONを入力:
     ```json
     {
       "password": "dev2026"
     }
     ```

3. **リクエストを実行**
   - 「Send」ボタンをクリック
   - **エラーが発生する場合**: バックエンドが起動しているか確認（[トラブルシューティング](#問題1-econnrefused-エラー接続拒否)を参照）
   - レスポンスから `token` をコピー
   - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### ステップ3: 環境変数にトークンを保存（推奨）

1. **Postman環境を作成**
   - 右上の「Environments」をクリック
   - 「+」ボタンで新しい環境を作成
   - 環境名: `Local Development`

2. **変数を追加**
   - `baseUrl`: `http://localhost:5168`（HTTP推奨）
     - または `https://localhost:7088`（HTTPS使用時）
   - `token`: ステップ2で取得したトークン
   - `storeId`: `18`

3. **環境を選択**
   - 右上の環境ドロップダウンで「Local Development」を選択

#### ステップ4: データ同期APIを実行

1. **新しいリクエストを作成**
   - Method: `POST`
   - URL: `{{baseUrl}}/api/sync/initial`

2. **Authorizationタブで設定（推奨）**
   - 「Authorization」タブを選択
   - Type: `Bearer Token` を選択
   - Token: `{{token}}`（環境変数を使用）
     - または、直接トークンを貼り付け
   - **重要**: Postmanが自動的に `Authorization: Bearer {token}` の形式でヘッダーを設定します

3. **Headersタブで追加設定**
   - `X-Store-Id`: `{{storeId}}`
   - `Content-Type`: `application/json`
   - **注意**: `Authorization`ヘッダーはAuthorizationタブで設定したため、Headersタブには表示されない場合があります（正常です）

4. **Bodyを設定**
   - Bodyタブを選択
   - `raw` を選択
   - `JSON` を選択
   - 以下のJSONを入力:
     ```json
     {
       "syncPeriod": "3months"
     }
     ```

5. **リクエストを実行**
   - 「Send」ボタンをクリック
   - **エラーが発生する場合**: 
     - `401 Unauthorized`: [認証エラーのトラブルシューティング](#問題6-認証エラー401-unauthorized)を参照
     - `ECONNREFUSED`: [接続拒否エラーのトラブルシューティング](#問題1-econnrefused-エラー接続拒否)を参照
   - レスポンスを確認

#### 代替方法: Headersタブで手動設定

Authorizationタブを使用しない場合：

1. **Headersタブを選択**
   - Key: `Authorization`
   - Value: `Bearer {{token}}`（環境変数を使用）
     - または `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（直接トークンを指定）
   - **重要**: 
     - Keyは必ず `Authorization` であること
     - Valueは `Bearer {token}` の形式であること（`Bearer`とトークンの間にスペースが必要）

2. **その他のヘッダーを設定**
   - `X-Store-Id`: `{{storeId}}`
   - `Content-Type`: `application/json`

#### Postman Collectionの例

以下のコレクションを作成すると便利です：

**1. 開発者認証**
```
POST {{baseUrl}}/api/developer/login
Body: { "password": "dev2026" }
→ レスポンスのtokenを環境変数に保存
```

**2. 初期データ同期**
```
POST {{baseUrl}}/api/sync/initial
Headers: 
  Authorization: Bearer {{token}}
  X-Store-Id: {{storeId}}
Body: { "syncPeriod": "3months" }
```

**3. 同期ステータス取得**
```
GET {{baseUrl}}/api/sync/status/{{storeId}}
Headers: 
  Authorization: Bearer {{token}}
  X-Store-Id: {{storeId}}
```

### 方法4: PowerShell/curlを使用

```powershell
# 初期データ同期を開始
$headers = @{
    "Content-Type" = "application/json"
    "X-Store-Id" = "18"
}
$body = @{
    syncPeriod = "3months"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://localhost:7088/api/sync/initial" `
    -Method Post `
    -Headers $headers `
    -Body $body `
    -SkipCertificateCheck
```

**注意**: `-SkipCertificateCheck`は自己署名証明書を使用している場合に必要です。

---

## 🔍 ステップ4: ログの確認

### コンソールログ

バックエンドを起動したターミナルで、リアルタイムでログを確認できます：

```
[INF] 🟡 [ShopifyDataSyncService] 注文データ同期開始
[ERR] 🔴 [OrderSyncJob] Failed to fetch orders from Shopify for store 18. Error: Failed to fetch orders: Forbidden
[WRN] 🟡 [ShopifyDataSyncService] ⚠️ 注文データ同期が失敗しました（Protected Customer Data未承認）
```

### ログファイル

開発環境では、ログファイルが以下の場所に出力される場合があります：

- `backend/ShopifyAnalyticsApi/logs/`（設定による）

---

## 🎯 テストシナリオ

### シナリオ1: 正常な同期（すべて成功）

1. **テスト用ストアの準備**
   - StoreId=18のストアが存在することを確認
   - AccessTokenが正しく設定されていることを確認

2. **初期データ同期を実行**
   ```http
   POST /api/sync/initial
   X-Store-Id: 18
   {
     "syncPeriod": "3months"
   }
   ```

3. **期待される結果**
   - 顧客データ同期: 成功
   - 商品データ同期: 成功
   - 注文データ同期: 成功
   - 同期ステータス: `completed`

---

### シナリオ2: Protected Customer Dataエラー（部分的な成功）

1. **テスト用ストアの準備**
   - StoreId=18のストアが存在することを確認
   - AccessTokenが設定されているが、Protected Customer Dataへのアクセスが未承認

2. **初期データ同期を実行**
   ```http
   POST /api/sync/initial
   X-Store-Id: 18
   {
     "syncPeriod": "3months"
   }
   ```

3. **期待される結果**
   - 顧客データ同期: `Forbidden`エラー → 警告を出して続行
   - 商品データ同期: 成功 ✅
   - 注文データ同期: `Forbidden`エラー → 警告を出して続行
   - 同期ステータス: `completed`（部分的な成功）
   - エラーメッセージ: `顧客データ同期がスキップされました: Protected Customer Data未承認...`

4. **ログの確認**
   ```
   [WRN] ⚠️ 顧客データ同期が失敗しました（Protected Customer Data未承認）
   [INF] ✅ 商品データ同期完了: Count=150
   [WRN] ⚠️ 注文データ同期が失敗しました（Protected Customer Data未承認）
   [INF] ✅ 部分的な同期完了: Total=150 (Customers=0, Products=150, Orders=0)
   ```

---

### シナリオ3: 注文データのみの同期テスト

1. **手動トリガーで注文データ同期を実行**
   ```http
   POST /api/sync/trigger
   X-Store-Id: 18
   {
     "type": "orders"
   }
   ```

2. **期待される結果**
   - 注文データ同期が開始される
   - `Forbidden`エラーの場合、警告を出して続行
   - 商品データ同期は実行されない

---

## 🐛 デバッグのポイント

### 1. ブレークポイントの設定

Visual StudioやVS Codeでデバッグ実行する場合：

1. **ブレークポイントを設定**
   - `ShopifyDataSyncService.cs` の `RunInitialSyncWithJobs` メソッド
   - `ShopifyApiService.cs` の `FetchOrdersPageAsync` メソッド
   - `ShopifyDataSyncService.cs` の注文データ同期エラーハンドリング部分

2. **デバッグ実行**
   - F5キーでデバッグ実行
   - ブレークポイントで停止して、変数の値を確認

### 2. ログレベルの調整

`appsettings.Development.json`でログレベルを調整：

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "ShopifyAnalyticsApi": "Debug"
    }
  }
}
```

### 3. エラーレスポンスの詳細確認

`ShopifyApiService.FetchOrdersPageAsync`でエラーレスポンスの内容を確認：

```csharp
var errorContent = await response.Content.ReadAsStringAsync();
_logger.LogError("🛒 [ShopifyApiService] Failed to fetch orders: StatusCode={StatusCode}, ErrorContent={ErrorContent}, StoreId={StoreId}", 
    response.StatusCode, errorContent, storeId);
```

このログで、`Protected Customer Data`エラーかどうかを確認できます。

---

## 📊 確認項目チェックリスト

### 修正前の動作確認

- [ ] 注文データ同期が`Forbidden`エラーで失敗すると、同期全体が失敗する
- [ ] 商品データ同期は成功しているにもかかわらず、同期全体が失敗として扱われる

### 修正後の動作確認

- [ ] 注文データ同期が`Forbidden`エラーの場合、警告を出して続行する
- [ ] 商品データ同期は成功している場合、部分的な成功として処理される
- [ ] 同期ステータスが`completed`になる（部分的な成功）
- [ ] エラーメッセージに「注文データ同期がスキップされました」が含まれる
- [ ] ログに「部分的な同期完了」が出力される

---

## 🚨 トラブルシューティング

### 問題1: `ECONNREFUSED` エラー（接続拒否）

**症状**: 
```
Error: connect ECONNREFUSED 127.0.0.1:7088
```

**原因**:
- バックエンドが起動していない
- ポート番号が間違っている
- HTTPSではなくHTTPを使用する必要がある

**解決方法**:

#### ステップ1: バックエンドが起動しているか確認

1. **PowerShellでバックエンドを起動**
   ```powershell
   cd backend
   .\start-backend.ps1
   ```

2. **起動確認**
   - ターミナルに以下のようなメッセージが表示されることを確認:
     ```
     Now listening on: https://localhost:7088
     Now listening on: http://localhost:5168
     ```

3. **ヘルスチェックで確認**
   - ブラウザで `https://localhost:7088/api/health` にアクセス
   - または `http://localhost:5168/api/health` にアクセス
   - 正常に応答することを確認

#### ステップ2: PostmanのURLを確認

**HTTPSを使用する場合**:
- URL: `https://localhost:7088/api/developer/login`
- **重要**: Postmanの設定でSSL証明書の検証を無効化する必要があります
  - Postman → Settings → General → SSL certificate verification → **OFF**

**HTTPを使用する場合（推奨）**:
- URL: `http://localhost:5168/api/developer/login`
- SSL証明書の問題を回避できます

#### ステップ3: ポート番号の確認

`launchSettings.json`で確認できるポート番号:
- **HTTP**: `http://localhost:5168`
- **HTTPS**: `https://localhost:7088`

#### ステップ4: ファイアウォールの確認

Windowsファイアウォールがポートをブロックしていないか確認:
```powershell
# ポートがリッスンされているか確認
netstat -an | findstr "7088"
netstat -an | findstr "5168"
```

---

### 問題2: SSL証明書エラー

**症状**: `ERR_CERT_AUTHORITY_INVALID` エラーが表示される

**解決方法**:

#### Postmanの場合

1. **Settingsを開く**
   - Postman → Settings（右上の歯車アイコン）

2. **SSL証明書の検証を無効化**
   - General タブ → SSL certificate verification → **OFF**
   - **注意**: 開発環境のみで無効化してください

#### 代替方法: HTTPを使用

- HTTPSではなくHTTPを使用:
  - URL: `http://localhost:5168/api/developer/login`

---

### 問題3: `X-Store-Id`ヘッダーが必須

**症状**: `401 Unauthorized` エラーが返される

**解決方法**:
- リクエストに `X-Store-Id` ヘッダーを追加
- データベースに存在するStoreIdを指定

---

### 問題4: データベース接続エラー

**症状**: `SqlException` が発生する

**解決方法**:
1. `appsettings.Development.json` の接続文字列を確認
2. データベースが起動していることを確認
3. ファイアウォール設定を確認

---

### 問題5: ストアが見つからない

**症状**: `404 Not Found` エラーが返される

**解決方法**:
1. データベースでStoreId=18のストアが存在することを確認
2. `X-Store-Id` ヘッダーに正しいStoreIdを指定

---

### 問題6: 認証エラー（401 Unauthorized）

**症状**: 
```
401 Unauthorized
{
  "error": "Unauthorized",
  "message": "OAuth, demo, or developer authentication required"
}
```

**原因**:
1. `Authorization`ヘッダーが設定されていない
2. `Authorization`ヘッダーの形式が間違っている
3. トークンが無効または期限切れ
4. `X-Store-Id`ヘッダーが設定されていない

**解決方法**:

#### ステップ1: Authorizationヘッダーの形式を確認

**正しい形式**:
```
Authorization: Bearer {token}
```

**誤った形式の例**:
```
Bearer: {token}  ❌（ヘッダー名が間違っている）
Authorization: {token}  ❌（Bearerプレフィックスがない）
```

#### ステップ2: Postmanの設定を確認

**方法1: Authorizationタブを使用（推奨）**
1. 「Authorization」タブを選択
2. Type: `Bearer Token` を選択
3. Token: `{{token}}`（環境変数）または直接トークンを貼り付け
4. Postmanが自動的に正しい形式でヘッダーを設定します

**方法2: Headersタブで手動設定**
1. 「Headers」タブを選択
2. Key: `Authorization`
3. Value: `Bearer {{token}}`（環境変数）または `Bearer {実際のトークン}`
4. **重要**: `Bearer`とトークンの間にスペースが必要

#### ステップ3: トークンの確認

1. **トークンが取得されているか確認**
   - 開発者認証（`POST /api/developer/login`）を実行済みか確認
   - レスポンスから`token`をコピーしているか確認

2. **トークンの有効期限を確認**
   - 通常は60分（設定による）
   - 期限切れの場合は、再度開発者認証でトークンを取得

3. **環境変数に設定されているか確認**
   - Postmanの環境変数で`token`が設定されているか確認
   - 環境が選択されているか確認

#### ステップ4: X-Store-Idヘッダーの確認

1. **Headersタブで設定**
   - Key: `X-Store-Id`
   - Value: `18`（テスト用のStoreId）
     - または環境変数 `{{storeId}}` を使用

2. **データベースに存在するか確認**
   - StoreId=18のストアがデータベースに存在することを確認

#### ステップ5: リクエストヘッダーの最終確認

Postmanの「Headers」タブで、以下のヘッダーが設定されていることを確認：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Store-Id: 18
Content-Type: application/json
```

**注意**: Authorizationタブを使用した場合、`Authorization`ヘッダーはHeadersタブに表示されない場合があります（正常です）。実際のリクエストには含まれています。

#### ステップ6: バックエンドログの確認

バックエンドのコンソールログで、以下のログを確認：

```
🔐 [AuthModeMiddleware] 同期リクエスト受信: Path=/api/sync/initial
🔐 [AuthModeMiddleware] Authorizationヘッダー: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
🔐 [AuthModeMiddleware] Developer token validation successful. StoreId: 18
```

ログに「Authorizationヘッダーが見つかりません」や「token validation failed」が表示される場合、設定を再確認してください。

---

### 問題7: 認証トークンが無効

**症状**: `401 Unauthorized` エラーが返される（トークン取得後、形式は正しい）

**解決方法**:
1. トークンの有効期限を確認（通常は60分）
2. 再度開発者認証でトークンを取得
3. Postmanの環境変数に最新のトークンを設定
4. トークンをデコードして内容を確認（https://jwt.io/ を使用）

---

## 📚 関連ドキュメント

- [ローカルバックエンド開発者モード設定ガイド](../01-problem-analysis/2026-01/local-backend-dev-mode-setup.md)
- [データ同期-注文データForbiddenエラー対応](../01-problem-analysis/2026-01/2026-01-19-データ同期-注文データForbiddenエラー対応.md)
- [データ同期失敗-Protected-Customer-Dataエラー](../01-problem-analysis/2026-01/2026-01-19-データ同期失敗-Protected-Customer-Dataエラー.md)

---

## 🎯 クイックリファレンス

### バックエンドURL

| プロトコル | URL | 用途 |
|---|---|---|
| **HTTP**（推奨） | `http://localhost:5168` | SSL証明書の問題を回避 |
| **HTTPS** | `https://localhost:7088` | SSL証明書の検証を無効化する必要あり |

### 主要なAPIエンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/developer/login` | POST | 開発者認証でトークンを取得 |
| `/api/sync/initial` | POST | 初期データ同期を開始 |
| `/api/sync/status/{storeId}` | GET | 同期ステータスを取得 |
| `/api/sync/history` | GET | 同期履歴を取得 |
| `/api/sync/trigger` | POST | 手動で同期をトリガー |

### 必須ヘッダー

- `Authorization`: `Bearer {token}`（認証トークン）
- `X-Store-Id`: ストアID（例: `18`）
- `Content-Type`: `application/json`（POSTリクエストの場合）

### 認証情報

- **開発者認証パスワード**: `dev2026`
- **テスト用StoreId**: `18` (acs-goods-3)

### Postman設定の確認事項

- [ ] バックエンドが起動している（`http://localhost:5168/api/health` にアクセス可能）
- [ ] PostmanのSSL証明書検証が無効化されている（HTTPS使用時）
- [ ] 環境変数に正しい`baseUrl`が設定されている
- [ ] 開発者認証でトークンを取得済み
- [ ] 環境変数に`token`が設定されている

---

**最終更新**: 2026年1月19日  
**作成者**: AI Assistant
