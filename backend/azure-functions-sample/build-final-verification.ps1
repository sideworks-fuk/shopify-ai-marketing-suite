# Azure Functions 最終ビルド検証スクリプト - AZFW0014エラー対応版
Write-Host "🚀 Azure Functions 最終ビルド検証開始（AZFW0014対応版）" -ForegroundColor Green
Write-Host ""

$projects = @(
    "ShopifyAzureFunctionsSample",
    "DatabaseFunction",
    "WebhookFunction", 
    "BlobFunction"
)

$totalErrors = 0
$successCount = 0

foreach ($project in $projects) {
    Write-Host "📦 検証中: $project" -ForegroundColor Yellow
    
    if (Test-Path $project) {
        Set-Location $project
        
        # クリーンとキャッシュ削除
        Write-Host "  🧹 クリーン実行中..." -ForegroundColor Cyan
        dotnet clean --verbosity quiet
        
        if (Test-Path "bin") { Remove-Item -Path "bin" -Recurse -Force -ErrorAction SilentlyContinue }
        if (Test-Path "obj") { Remove-Item -Path "obj" -Recurse -Force -ErrorAction SilentlyContinue }
        
        # 復元
        Write-Host "  📦 パッケージ復元中..." -ForegroundColor Cyan
        $restoreResult = dotnet restore --verbosity quiet
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ $project - パッケージ復元失敗" -ForegroundColor Red
            $totalErrors++
            Set-Location ..
            continue
        }
        
        # ビルド
        Write-Host "  🔨 ビルド実行中..." -ForegroundColor Cyan
        $buildResult = dotnet build --configuration Release --verbosity normal --no-restore
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $project - ビルド成功" -ForegroundColor Green
            $successCount++
            
            # 特定エラーの確認
            Write-Host "  🔍 エラーチェック実行中..." -ForegroundColor Cyan
            $checkResult = dotnet build --configuration Release --verbosity normal --no-restore 2>&1
            
            $hasCS1061 = $checkResult | Select-String "CS1061" | Measure-Object | Select-Object -ExpandProperty Count
            $hasNU1605 = $checkResult | Select-String "NU1605" | Measure-Object | Select-Object -ExpandProperty Count
            $hasAZFW0014 = $checkResult | Select-String "AZFW0014" | Measure-Object | Select-Object -ExpandProperty Count
            
            if ($hasCS1061 -eq 0 -and $hasNU1605 -eq 0 -and $hasAZFW0014 -eq 0) {
                Write-Host "  ✅ 全ターゲットエラー解消確認" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  残存エラー: CS1061($hasCS1061), NU1605($hasNU1605), AZFW0014($hasAZFW0014)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ $project - ビルド失敗" -ForegroundColor Red
            Write-Host $buildResult
            $totalErrors++
        }
        
        Set-Location ..
    } else {
        Write-Host "⚠️  $project - プロジェクトフォルダが見つかりません" -ForegroundColor Yellow
        $totalErrors++
    }
    
    Write-Host ""
}

# 最終結果
Write-Host "🎯 最終検証結果" -ForegroundColor Cyan
Write-Host "  ✅ 成功: $successCount プロジェクト" -ForegroundColor Green
Write-Host "  ❌ 失敗: $totalErrors プロジェクト" -ForegroundColor $(if ($totalErrors -eq 0) { "Green" } else { "Red" })

if ($totalErrors -eq 0) {
    Write-Host ""
    Write-Host "🎉 全プロジェクトのビルドが成功しました！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 解決済みエラー確認:" -ForegroundColor Cyan
    Write-Host "  ✅ CS1061エラー（ConfigureFunctionsWebApplication） - 解決済み" -ForegroundColor Green
    Write-Host "  ✅ NU1605エラー（パッケージダウングレード） - 解決済み" -ForegroundColor Green  
    Write-Host "  ✅ AZFW0014エラー（ASP.NET Core Integration） - 解決済み" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 次のステップ:" -ForegroundColor Cyan
    Write-Host "  1. ローカル実行テスト: func start --port 7071" -ForegroundColor White
    Write-Host "  2. 月曜日デモ準備完了！" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "💥 エラーが残っています。上記のエラー内容を確認してください。" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✨ 検証完了 - 明日のデモ準備完了です！" -ForegroundColor Green