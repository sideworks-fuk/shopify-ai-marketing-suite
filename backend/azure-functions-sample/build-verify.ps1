# Azure Functions ビルド検証スクリプト
Write-Host "🚀 Azure Functions ビルド検証開始" -ForegroundColor Green

$projects = @(
    "ShopifyAzureFunctionsSample",
    "DatabaseFunction",
    "WebhookFunction", 
    "BlobFunction"
)

foreach ($project in $projects) {
    Write-Host "📦 検証中: $project" -ForegroundColor Yellow
    
    if (Test-Path $project) {
        Set-Location $project
        
        # クリーン
        Write-Host "  🧹 クリーン実行中..." -ForegroundColor Cyan
        dotnet clean --verbosity quiet
        
        # bin/obj フォルダ削除
        if (Test-Path "bin") { Remove-Item -Path "bin" -Recurse -Force -ErrorAction SilentlyContinue }
        if (Test-Path "obj") { Remove-Item -Path "obj" -Recurse -Force -ErrorAction SilentlyContinue }
        
        # 復元
        Write-Host "  📦 パッケージ復元中..." -ForegroundColor Cyan
        $restoreResult = dotnet restore --verbosity quiet
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ $project - パッケージ復元失敗" -ForegroundColor Red
            Write-Host $restoreResult
            Set-Location ..
            continue
        }
        
        # ビルド
        Write-Host "  🔨 ビルド実行中..." -ForegroundColor Cyan
        $buildResult = dotnet build --configuration Release --verbosity quiet --no-restore
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $project - ビルド成功" -ForegroundColor Green
        } else {
            Write-Host "❌ $project - ビルド失敗" -ForegroundColor Red
            Write-Host $buildResult
        }
        
        Set-Location ..
    } else {
        Write-Host "⚠️  $project - プロジェクトフォルダが見つかりません" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

Write-Host "🎉 検証完了" -ForegroundColor Green
Write-Host ""
Write-Host "📋 次のステップ:" -ForegroundColor Cyan
Write-Host "  1. ローカル実行テスト: func start --port 7071" -ForegroundColor White
Write-Host "  2. エラーがあれば報告してください" -ForegroundColor White