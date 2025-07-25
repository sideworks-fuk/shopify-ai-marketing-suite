# 開発環境用起動スクリプト
# 使用方法: .\dev-start.ps1

# 環境変数を設定
$env:NEXT_PUBLIC_BUILD_ENVIRONMENT = "development"
$env:NEXT_PUBLIC_ENVIRONMENT = "development"
$env:NEXT_PUBLIC_DEBUG_API = "false"

Write-Host "🔧 開発環境変数を設定しました:" -ForegroundColor Green
Write-Host "  - NEXT_PUBLIC_BUILD_ENVIRONMENT: $env:NEXT_PUBLIC_BUILD_ENVIRONMENT" -ForegroundColor Yellow
Write-Host "  - NEXT_PUBLIC_ENVIRONMENT: $env:NEXT_PUBLIC_ENVIRONMENT" -ForegroundColor Yellow
Write-Host "  - NEXT_PUBLIC_DEBUG_API: $env:NEXT_PUBLIC_DEBUG_API" -ForegroundColor Yellow
Write-Host ""

# 開発サーバーを起動
Write-Host "🚀 開発サーバーを起動します..." -ForegroundColor Green
npm run dev 
