# 開発環境統合起動スクリプト
Write-Host "Starting Shopify AI Marketing Suite Development Environment..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# バックエンドの起動
Write-Host "`n[1/2] Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\start-backend.ps1" -WorkingDirectory $PSScriptRoot

# 3秒待機（バックエンドの起動を待つ）
Start-Sleep -Seconds 3

# フロントエンドの起動
Write-Host "`n[2/2] Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WorkingDirectory $PSScriptRoot

Write-Host "`n✅ Development environment started!" -ForegroundColor Green
Write-Host "`nAccess points:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: https://localhost:7088" -ForegroundColor White
Write-Host "  Swagger UI: https://localhost:7088/swagger" -ForegroundColor White
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")