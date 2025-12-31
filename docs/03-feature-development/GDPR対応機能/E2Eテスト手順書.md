# GDPR Webhook E2Eテスト手順書

**作成日**: 2025-12-31  
**作成者**: 福田 + AI Assistant  
**目的**: GDPR Webhookの動作確認とSHopify申請用証跡の取得

---

## 1. 事前準備

### 1.1 必要情報の取得

以下の情報を事前に取得してください：

| 項目 | 値 | 取得方法 |
|------|-----|---------|
| バックエンドURL | `https://shopifyapp-backend-develop-xxx.azurewebsites.net` | Azure Portal |
| APIシークレット | `be83457b1f63f4c9b20d3ea5e62b5ef0` | ShopifyAppsテーブル or appsettings |
| テストストアドメイン | `xn-fbkq6e5da0fpb.myshopify.com` | Shopify Partners |
| Hangfire Dashboard | `/hangfire` | バックエンドURL + /hangfire |

### 1.2 ツールの準備

- [ ] Postman または curl
- [ ] Azure Portal（Application Insights）へのアクセス
- [ ] SQL Server Management Studio または Azure Data Studio
- [ ] スクリーンショット取得ツール

---

## 2. Postman設定

### 2.1 環境変数の設定

Postmanで新しい環境を作成し、以下の変数を設定：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `baseUrl` | `https://shopifyapp-backend-develop-xxx.azurewebsites.net` | バックエンドURL |
| `apiSecret` | `be83457b1f63f4c9b20d3ea5e62b5ef0` | HMAC署名用シークレット |
| `shopDomain` | `xn-fbkq6e5da0fpb.myshopify.com` | テストストア |

### 2.2 Pre-request Script（HMAC自動計算）

各リクエストの「Pre-request Script」タブに以下を貼り付け：

```javascript
// ===========================================
// GDPR Webhook HMAC署名自動計算スクリプト
// ===========================================

// 環境変数からAPIシークレットを取得
const apiSecret = pm.environment.get("apiSecret");
if (!apiSecret) {
    console.error("Error: apiSecret環境変数が設定されていません");
    throw new Error("apiSecret環境変数を設定してください");
}

// リクエストボディを取得
const body = pm.request.body.raw;
if (!body) {
    console.error("Error: リクエストボディが空です");
    throw new Error("リクエストボディを設定してください");
}

// HMAC-SHA256を計算
const signature = CryptoJS.HmacSHA256(body, apiSecret);
const signatureBase64 = CryptoJS.enc.Base64.stringify(signature);

// ヘッダーに設定
pm.request.headers.add({
    key: "X-Shopify-Hmac-SHA256",
    value: signatureBase64
});

// ユニークなWebhook IDを生成
const webhookId = "test-" + Date.now();
pm.request.headers.add({
    key: "X-Shopify-Webhook-Id",
    value: webhookId
});

console.log("HMAC署名を計算しました:");
console.log("  Body length: " + body.length);
console.log("  Signature: " + signatureBase64.substring(0, 20) + "...");
console.log("  Webhook ID: " + webhookId);
```

### 2.3 共通ヘッダー設定

各リクエストに以下のヘッダーを設定：

| ヘッダー | 値 |
|---------|-----|
| `Content-Type` | `application/json` |
| `X-Shopify-Shop-Domain` | `{{shopDomain}}` |

---

## 3. テストケース

### 3.1 app/uninstalled テスト

**リクエスト設定:**
- Method: `POST`
- URL: `{{baseUrl}}/api/webhook/uninstalled`
- Header: `X-Shopify-Topic`: `app/uninstalled`

**Body (raw JSON):**
```json
{
  "id": 123456789,
  "name": "Test Shop",
  "email": "test@example.com",
  "domain": "xn-fbkq6e5da0fpb.myshopify.com",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**期待結果:**
- Status: `200 OK`
- レスポンス時間: 5秒以内

---

### 3.2 customers/redact テスト

**リクエスト設定:**
- Method: `POST`
- URL: `{{baseUrl}}/api/webhook/customers-redact`
- Header: `X-Shopify-Topic`: `customers/redact`

**Body (raw JSON):**
```json
{
  "shop_id": 123456789,
  "shop_domain": "xn-fbkq6e5da0fpb.myshopify.com",
  "customer": {
    "id": 987654321,
    "email": "customer@example.com",
    "phone": "+81-90-1234-5678"
  },
  "orders_to_redact": [111, 222, 333]
}
```

**期待結果:**
- Status: `200 OK`
- レスポンス時間: 5秒以内

---

### 3.3 shop/redact テスト

**リクエスト設定:**
- Method: `POST`
- URL: `{{baseUrl}}/api/webhook/shop-redact`
- Header: `X-Shopify-Topic`: `shop/redact`

**Body (raw JSON):**
```json
{
  "shop_id": 123456789,
  "shop_domain": "xn-fbkq6e5da0fpb.myshopify.com"
}
```

**期待結果:**
- Status: `200 OK`
- レスポンス時間: 5秒以内

---

### 3.4 customers/data_request テスト

**リクエスト設定:**
- Method: `POST`
- URL: `{{baseUrl}}/api/webhook/customers-data-request`
- Header: `X-Shopify-Topic`: `customers/data_request`

**Body (raw JSON):**
```json
{
  "shop_id": 123456789,
  "shop_domain": "xn-fbkq6e5da0fpb.myshopify.com",
  "customer": {
    "id": 987654321,
    "email": "customer@example.com",
    "phone": "+81-90-1234-5678"
  },
  "orders_requested": [111, 222, 333],
  "data_request": {
    "id": 555555
  }
}
```

**期待結果:**
- Status: `200 OK`
- レスポンス時間: 5秒以内

---

### 3.5 HMAC検証失敗テスト

**目的:** 不正なHMAC署名で401が返ることを確認

**リクエスト設定:**
- Method: `POST`
- URL: `{{baseUrl}}/api/webhook/uninstalled`
- Header: `X-Shopify-Topic`: `app/uninstalled`
- Header: `X-Shopify-Hmac-SHA256`: `invalid-signature-xxxxx` ← **手動で設定**

> ⚠️ Pre-request Scriptを無効化するか、手動でヘッダーを上書き

**Body (raw JSON):**
```json
{
  "id": 123456789,
  "domain": "xn-fbkq6e5da0fpb.myshopify.com"
}
```

**期待結果:**
- Status: `401 Unauthorized`

---

### 3.6 ヘッダー欠落テスト

**目的:** 必須ヘッダーが欠落している場合に401が返ることを確認

**リクエスト設定:**
- Method: `POST`
- URL: `{{baseUrl}}/api/webhook/uninstalled`
- Header: `X-Shopify-Topic`: 設定しない
- Header: `X-Shopify-Hmac-SHA256`: 有効な署名

**期待結果:**
- Status: `401 Unauthorized`

---

## 4. PowerShell版テストスクリプト

Postmanが使えない場合、以下のPowerShellスクリプトを使用：

```powershell
# ===========================================
# GDPR Webhook テストスクリプト (PowerShell)
# ===========================================

param(
    [string]$BaseUrl = "https://shopifyapp-backend-develop-xxx.azurewebsites.net",
    [string]$ApiSecret = "be83457b1f63f4c9b20d3ea5e62b5ef0",
    [string]$ShopDomain = "xn-fbkq6e5da0fpb.myshopify.com"
)

function Invoke-WebhookTest {
    param(
        [string]$Endpoint,
        [string]$Topic,
        [string]$Body,
        [bool]$UseValidHmac = $true
    )
    
    $url = "$BaseUrl/api/webhook/$Endpoint"
    
    # HMAC署名を計算
    if ($UseValidHmac) {
        $hmac = New-Object System.Security.Cryptography.HMACSHA256
        $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($ApiSecret)
        $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Body))
        $signature = [Convert]::ToBase64String($hash)
    } else {
        $signature = "invalid-signature-xxxxx"
    }
    
    $webhookId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    
    $headers = @{
        "Content-Type" = "application/json"
        "X-Shopify-Topic" = $Topic
        "X-Shopify-Shop-Domain" = $ShopDomain
        "X-Shopify-Webhook-Id" = $webhookId
        "X-Shopify-Hmac-SHA256" = $signature
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Testing: $Topic" -ForegroundColor Cyan
    Write-Host "URL: $url" -ForegroundColor Gray
    Write-Host "Webhook ID: $webhookId" -ForegroundColor Gray
    Write-Host "Valid HMAC: $UseValidHmac" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $Body -UseBasicParsing
        $stopwatch.Stop()
        
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Time: $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor Green
        
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            TimeMs = $stopwatch.ElapsedMilliseconds
        }
    }
    catch {
        $stopwatch.Stop()
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 401 -and -not $UseValidHmac) {
            Write-Host "Status: $statusCode (Expected for invalid HMAC)" -ForegroundColor Yellow
        } else {
            Write-Host "Status: $statusCode" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        return @{
            Success = $false
            StatusCode = $statusCode
            TimeMs = $stopwatch.ElapsedMilliseconds
        }
    }
}

# テスト実行
Write-Host "`n########## GDPR Webhook Tests ##########`n" -ForegroundColor Magenta

# 1. app/uninstalled (正常系)
$body1 = '{"id":123456789,"name":"Test Shop","email":"test@example.com","domain":"' + $ShopDomain + '"}'
Invoke-WebhookTest -Endpoint "uninstalled" -Topic "app/uninstalled" -Body $body1 -UseValidHmac $true

# 2. customers/redact (正常系)
$body2 = '{"shop_domain":"' + $ShopDomain + '","customer":{"id":987654321,"email":"customer@example.com"}}'
Invoke-WebhookTest -Endpoint "customers-redact" -Topic "customers/redact" -Body $body2 -UseValidHmac $true

# 3. shop/redact (正常系)
$body3 = '{"shop_domain":"' + $ShopDomain + '"}'
Invoke-WebhookTest -Endpoint "shop-redact" -Topic "shop/redact" -Body $body3 -UseValidHmac $true

# 4. customers/data_request (正常系)
$body4 = '{"shop_domain":"' + $ShopDomain + '","customer":{"id":987654321},"data_request":{"id":555555}}'
Invoke-WebhookTest -Endpoint "customers-data-request" -Topic "customers/data_request" -Body $body4 -UseValidHmac $true

# 5. HMAC検証失敗テスト
Write-Host "`n---------- HMAC Failure Tests ----------`n" -ForegroundColor Yellow
Invoke-WebhookTest -Endpoint "uninstalled" -Topic "app/uninstalled" -Body $body1 -UseValidHmac $false

Write-Host "`n########## Tests Completed ##########`n" -ForegroundColor Magenta
```

**使用方法:**
```powershell
# スクリプトを保存して実行
.\Test-GDPRWebhooks.ps1 -BaseUrl "https://your-backend-url" -ApiSecret "your-secret"
```

---

## 5. 証跡取得

### 5.1 取得すべき証跡

| # | 証跡 | 取得方法 | 保存場所 |
|---|------|---------|---------|
| 1 | Postmanレスポンス | スクリーンショット | `docs/03-feature-development/GDPR対応機能/evidence/` |
| 2 | Application Insightsログ | Azure Portal → クエリ実行 | 同上 |
| 3 | GDPRRequestsテーブル | SQL クエリ結果 | 同上 |
| 4 | Hangfire Dashboard | スクリーンショット | 同上 |

### 5.2 Application Insights クエリ

```kusto
// GDPR Webhook ログを検索
traces
| where timestamp > ago(1h)
| where message contains "webhook" or message contains "GDPR" or message contains "redact"
| order by timestamp desc
| take 100
```

### 5.3 SQL確認クエリ

```sql
-- GDPRリクエスト確認
SELECT TOP 10 
    Id, ShopDomain, RequestType, Status, 
    ReceivedAt, DueDate, CompletedAt
FROM GDPRRequests
ORDER BY ReceivedAt DESC;

-- Webhookイベント確認
SELECT TOP 10 
    Id, ShopDomain, Topic, Status, 
    IdempotencyKey, ProcessedAt
FROM WebhookEvents
WHERE Topic IN ('app/uninstalled', 'customers/redact', 'shop/redact', 'customers/data_request')
ORDER BY CreatedAt DESC;

-- 冪等性テスト確認（同一キーの重複がないこと）
SELECT IdempotencyKey, COUNT(*) as Count
FROM WebhookEvents
GROUP BY IdempotencyKey
HAVING COUNT(*) > 1;
```

---

## 6. テスト結果記録

### 6.1 チェックリスト

| # | テストケース | 期待結果 | 実行日時 | 結果 | 備考 |
|---|-------------|---------|---------|------|------|
| 1 | app/uninstalled 正常系 | 200 OK | | ☐ | |
| 2 | customers/redact 正常系 | 200 OK | | ☐ | |
| 3 | shop/redact 正常系 | 200 OK | | ☐ | |
| 4 | customers/data_request 正常系 | 200 OK | | ☐ | |
| 5 | HMAC署名不正 | 401 Unauthorized | | ☐ | |
| 6 | ヘッダー欠落 | 401 Unauthorized | | ☐ | |
| 7 | 応答時間 5秒以内 | < 5000ms | | ☐ | |
| 8 | GDPRRequests登録 | pending状態 | | ☐ | |
| 9 | 冪等性（重複送信） | 処理スキップ | | ☐ | |
| 10 | Hangfireジョブ登録 | Scheduled表示 | | ☐ | |

### 6.2 テスト実行者

- **実行者**: 
- **実行日**: 
- **環境**: Development / Staging / Production

---

## 7. トラブルシューティング

### 7.1 401 Unauthorized が返る場合

1. **APIシークレットの確認**
   - ShopifyAppsテーブルのApiSecretと一致しているか
   - 環境変数が正しく設定されているか

2. **ヘッダーの確認**
   - `X-Shopify-Topic` が正しいトピック名か
   - `X-Shopify-Shop-Domain` が設定されているか
   - `X-Shopify-Webhook-Id` が設定されているか

3. **ボディの確認**
   - JSON形式が正しいか
   - 署名計算に使用したボディと送信ボディが一致しているか

### 7.2 500 Internal Server Error が返る場合

1. **Application Insightsでエラーログを確認**
2. **DBへの接続が正常か確認**
3. **Hangfireが正常に動作しているか確認**

### 7.3 レスポンスが5秒以上かかる場合

1. **非同期処理が正しく動作しているか確認**
   - `Task.Run()` でバックグラウンド処理していることを確認
2. **DBクエリのパフォーマンスを確認**

---

## 8. 参考リンク

- [Shopify Webhook Verification](https://shopify.dev/docs/apps/build/webhooks/verify)
- [GDPR Webhooks](https://help.shopify.com/en/manual/privacy-and-security/privacy/gdpr)
- [対応作業リスト](./対応作業リスト.md)
- [テスト計画](./テスト計画.md)
