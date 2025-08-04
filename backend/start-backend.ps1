# バックエンドAPIサービス起動スクリプト
Write-Host "Starting Shopify Analytics API Backend..." -ForegroundColor Green

# プロジェクトディレクトリに移動
Set-Location -Path "ShopifyAnalyticsApi"

# 環境変数を設定
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "https://localhost:7088;http://localhost:5168"

Write-Host "Environment: $env:ASPNETCORE_ENVIRONMENT" -ForegroundColor Yellow
Write-Host "URLs: $env:ASPNETCORE_URLS" -ForegroundColor Yellow

# HTTPSプロファイルで起動
Write-Host "Starting API with HTTPS profile..." -ForegroundColor Cyan
dotnet run --launch-profile https

# エラーが発生した場合の処理
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start backend service!" -ForegroundColor Red
    Write-Host "Please check the following:" -ForegroundColor Yellow
    Write-Host "1. .NET SDK is installed" -ForegroundColor Yellow
    Write-Host "2. Project dependencies are restored (run 'dotnet restore')" -ForegroundColor Yellow
    Write-Host "3. Database connection string is configured in appsettings.json" -ForegroundColor Yellow
    exit 1
}