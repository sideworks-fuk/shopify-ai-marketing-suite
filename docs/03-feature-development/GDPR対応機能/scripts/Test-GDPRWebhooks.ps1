<# 
.SYNOPSIS
    GDPR Webhook テストスクリプト

.DESCRIPTION
    Shopify GDPR Webhookの動作確認を行うPowerShellスクリプト
    HMAC-SHA256署名を自動計算してリクエストを送信します

.PARAMETER BaseUrl
    バックエンドAPIのベースURL

.PARAMETER ApiSecret
    HMAC署名に使用するAPIシークレット（ShopifyAppsテーブルから取得）

.PARAMETER ShopDomain
    テスト対象のShopifyストアドメイン

.PARAMETER TestType
    実行するテストの種類
    - All: 全てのテストを実行（デフォルト）
    - Normal: 正常系のみ
    - Error: 異常系のみ
    - Single: 単一のWebhookのみ

.PARAMETER SingleEndpoint
    TestType=Single の場合に指定するエンドポイント

.EXAMPLE
    .\Test-GDPRWebhooks.ps1

.EXAMPLE
    .\Test-GDPRWebhooks.ps1 -BaseUrl "https://your-backend.azurewebsites.net" -ApiSecret "your-secret"

.EXAMPLE
    .\Test-GDPRWebhooks.ps1 -TestType Single -SingleEndpoint "customers-redact"
#>

param(
    [string]$BaseUrl = "https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net",
    [string]$ApiSecret = "be83457b1f63f4c9b20d3ea5e62b5ef0",
    [string]$ShopDomain = "xn-fbkq6e5da0fpb.myshopify.com",
    [ValidateSet("All", "Normal", "Error", "Single")]
    [string]$TestType = "All",
    [string]$SingleEndpoint = ""
)

# ===================================================
# ヘルパー関数
# ===================================================

function Write-TestHeader {
    param([string]$Message)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Success,
        [int]$StatusCode,
        [int]$TimeMs,
        [string]$ExpectedStatus
    )
    
    $color = if ($Success) { "Green" } else { "Red" }
    $icon = if ($Success) { "✅" } else { "❌" }
    
    Write-Host ""
    Write-Host "$icon $TestName" -ForegroundColor $color
    Write-Host "   Status: $StatusCode (Expected: $ExpectedStatus)" -ForegroundColor Gray
    Write-Host "   Time: ${TimeMs}ms" -ForegroundColor Gray
}

function Get-HmacSignature {
    param(
        [string]$Body,
        [string]$Secret
    )
    
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Body))
    return [Convert]::ToBase64String($hash)
}

function Invoke-WebhookTest {
    param(
        [string]$Endpoint,
        [string]$Topic,
        [string]$Body,
        [bool]$UseValidHmac = $true,
        [bool]$IncludeHeaders = $true,
        [int]$ExpectedStatus = 200
    )
    
    $url = "$BaseUrl/api/webhook/$Endpoint"
    
    # HMAC署名を計算
    if ($UseValidHmac) {
        $signature = Get-HmacSignature -Body $Body -Secret $ApiSecret
    } else {
        $signature = "invalid-signature-xxxxx"
    }
    
    $webhookId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')-$(Get-Random)"
    
    $headers = @{
        "Content-Type" = "application/json"
        "X-Shopify-Hmac-SHA256" = $signature
    }
    
    if ($IncludeHeaders) {
        $headers["X-Shopify-Topic"] = $Topic
        $headers["X-Shopify-Shop-Domain"] = $ShopDomain
        $headers["X-Shopify-Webhook-Id"] = $webhookId
    }
    
    Write-Host ""
    Write-Host "Testing: $Topic" -ForegroundColor Yellow
    Write-Host "   URL: $url" -ForegroundColor DarkGray
    Write-Host "   Webhook ID: $webhookId" -ForegroundColor DarkGray
    Write-Host "   Valid HMAC: $UseValidHmac" -ForegroundColor DarkGray
    Write-Host "   Headers: $IncludeHeaders" -ForegroundColor DarkGray
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $Body -UseBasicParsing -ErrorAction Stop
        $stopwatch.Stop()
        
        $actualStatus = $response.StatusCode
        $success = ($actualStatus -eq $ExpectedStatus)
        
        Write-TestResult -TestName "$Topic" -Success $success -StatusCode $actualStatus -TimeMs $stopwatch.ElapsedMilliseconds -ExpectedStatus $ExpectedStatus
        
        return @{
            Success = $success
            StatusCode = $actualStatus
            TimeMs = $stopwatch.ElapsedMilliseconds
            TestName = $Topic
        }
    }
    catch {
        $stopwatch.Stop()
        
        $actualStatus = 0
        if ($_.Exception.Response) {
            $actualStatus = [int]$_.Exception.Response.StatusCode
        }
        
        $success = ($actualStatus -eq $ExpectedStatus)
        
        Write-TestResult -TestName "$Topic" -Success $success -StatusCode $actualStatus -TimeMs $stopwatch.ElapsedMilliseconds -ExpectedStatus $ExpectedStatus
        
        if (-not $success) {
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor DarkRed
        }
        
        return @{
            Success = $success
            StatusCode = $actualStatus
            TimeMs = $stopwatch.ElapsedMilliseconds
            TestName = $Topic
        }
    }
}

# ===================================================
# テストデータ定義
# ===================================================

$testCases = @{
    "uninstalled" = @{
        Endpoint = "uninstalled"
        Topic = "app/uninstalled"
        Body = @{
            id = 123456789
            name = "Test Shop"
            email = "test@example.com"
            domain = $ShopDomain
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
        } | ConvertTo-Json -Compress
    }
    "customers-redact" = @{
        Endpoint = "customers-redact"
        Topic = "customers/redact"
        Body = @{
            shop_id = 123456789
            shop_domain = $ShopDomain
            customer = @{
                id = 987654321
                email = "customer@example.com"
                phone = "+81-90-1234-5678"
            }
            orders_to_redact = @(111, 222, 333)
        } | ConvertTo-Json -Compress
    }
    "shop-redact" = @{
        Endpoint = "shop-redact"
        Topic = "shop/redact"
        Body = @{
            shop_id = 123456789
            shop_domain = $ShopDomain
        } | ConvertTo-Json -Compress
    }
    "customers-data-request" = @{
        Endpoint = "customers-data-request"
        Topic = "customers/data_request"
        Body = @{
            shop_id = 123456789
            shop_domain = $ShopDomain
            customer = @{
                id = 987654321
                email = "customer@example.com"
                phone = "+81-90-1234-5678"
            }
            orders_requested = @(111, 222, 333)
            data_request = @{
                id = 555555
            }
        } | ConvertTo-Json -Compress
    }
}

# ===================================================
# メイン処理
# ===================================================

Write-Host ""
Write-Host "######################################################" -ForegroundColor Magenta
Write-Host "#          GDPR Webhook E2E Test Script              #" -ForegroundColor Magenta
Write-Host "######################################################" -ForegroundColor Magenta
Write-Host ""
Write-Host "Configuration:" -ForegroundColor White
Write-Host "   Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "   Shop Domain: $ShopDomain" -ForegroundColor Gray
Write-Host "   API Secret: $($ApiSecret.Substring(0, 8))..." -ForegroundColor Gray
Write-Host "   Test Type: $TestType" -ForegroundColor Gray

$results = @()

# 正常系テスト
if ($TestType -in @("All", "Normal")) {
    Write-TestHeader "Normal Cases (Expected: 200 OK)"
    
    foreach ($key in $testCases.Keys) {
        $test = $testCases[$key]
        $result = Invoke-WebhookTest -Endpoint $test.Endpoint -Topic $test.Topic -Body $test.Body -UseValidHmac $true -ExpectedStatus 200
        $results += $result
    }
}

# 異常系テスト
if ($TestType -in @("All", "Error")) {
    Write-TestHeader "Error Cases (Expected: 401 Unauthorized)"
    
    # HMAC署名不正
    $test = $testCases["uninstalled"]
    $result = Invoke-WebhookTest -Endpoint $test.Endpoint -Topic $test.Topic -Body $test.Body -UseValidHmac $false -ExpectedStatus 401
    $result.TestName = "HMAC Invalid - $($result.TestName)"
    $results += $result
    
    # ヘッダー欠落
    $result = Invoke-WebhookTest -Endpoint $test.Endpoint -Topic $test.Topic -Body $test.Body -UseValidHmac $true -IncludeHeaders $false -ExpectedStatus 401
    $result.TestName = "Headers Missing - $($result.TestName)"
    $results += $result
}

# 単一テスト
if ($TestType -eq "Single" -and $SingleEndpoint) {
    Write-TestHeader "Single Test: $SingleEndpoint"
    
    if ($testCases.ContainsKey($SingleEndpoint)) {
        $test = $testCases[$SingleEndpoint]
        $result = Invoke-WebhookTest -Endpoint $test.Endpoint -Topic $test.Topic -Body $test.Body -UseValidHmac $true -ExpectedStatus 200
        $results += $result
    } else {
        Write-Host "Unknown endpoint: $SingleEndpoint" -ForegroundColor Red
        Write-Host "Available: $($testCases.Keys -join ', ')" -ForegroundColor Yellow
    }
}

# サマリー表示
Write-Host ""
Write-Host "######################################################" -ForegroundColor Magenta
Write-Host "#                    SUMMARY                         #" -ForegroundColor Magenta
Write-Host "######################################################" -ForegroundColor Magenta
Write-Host ""

$passed = ($results | Where-Object { $_.Success }).Count
$failed = ($results | Where-Object { -not $_.Success }).Count
$total = $results.Count

Write-Host "Total: $total tests" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "Failed Tests:" -ForegroundColor Red
    $results | Where-Object { -not $_.Success } | ForEach-Object {
        Write-Host "   - $($_.TestName): Status $($_.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Response Time Analysis:" -ForegroundColor White
$avgTime = ($results | Measure-Object -Property TimeMs -Average).Average
$maxTime = ($results | Measure-Object -Property TimeMs -Maximum).Maximum
Write-Host "   Average: $([math]::Round($avgTime, 0))ms" -ForegroundColor Gray
Write-Host "   Maximum: ${maxTime}ms" -ForegroundColor $(if ($maxTime -gt 5000) { "Red" } else { "Gray" })

Write-Host ""
Write-Host "######################################################" -ForegroundColor Magenta
