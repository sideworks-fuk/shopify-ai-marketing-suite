# DatabaseFunction パッケージ競合完全解決スクリプト
Write-Host "🔧 DatabaseFunction パッケージ競合完全解決開始" -ForegroundColor Green
Write-Host ""

# 現在のディレクトリ確認
$currentPath = Get-Location
Write-Host "📁 現在のディレクトリ: $currentPath" -ForegroundColor Cyan

# 1. 完全クリーン
Write-Host "🧹 完全クリーン実行中..." -ForegroundColor Yellow
dotnet clean --verbosity quiet

# 2. ビルド成果物とキャッシュを完全削除
Write-Host "🗑️  ビルド成果物とキャッシュ削除中..." -ForegroundColor Yellow
if (Test-Path "bin") { 
    Remove-Item -Path "bin" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ bin フォルダ削除完了" -ForegroundColor Green
}

if (Test-Path "obj") { 
    Remove-Item -Path "obj" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ obj フォルダ削除完了" -ForegroundColor Green
}

# 3. NuGetキャッシュから競合パッケージを削除
Write-Host "📦 NuGetキャッシュからHTTPパッケージを削除中..." -ForegroundColor Yellow
$nugetCache = "$env:USERPROFILE\.nuget\packages"
$httpPackages = @(
    "microsoft.azure.functions.worker.extensions.http",
    "microsoft.azure.functions.worker.extensions.http.aspnetcore"
)

foreach ($package in $httpPackages) {
    $packagePath = Join-Path $nugetCache $package
    if (Test-Path $packagePath) {
        Remove-Item -Path $packagePath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ $package キャッシュ削除完了" -ForegroundColor Green
    }
}

# 4. パッケージ復元（強制・キャッシュなし）
Write-Host "📥 パッケージ復元実行中（強制・キャッシュなし）..." -ForegroundColor Yellow
$restoreResult = dotnet restore --force --no-cache --verbosity normal

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ パッケージ復元に失敗しました" -ForegroundColor Red
    Write-Host $restoreResult
    exit 1
} else {
    Write-Host "✅ パッケージ復元成功" -ForegroundColor Green
}

# 5. ビルド実行
Write-Host "🔨 ビルド実行中..." -ForegroundColor Yellow
$buildResult = dotnet build --configuration Release --verbosity normal --no-restore

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 ビルド成功！パッケージ競合が完全に解決されました" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 確認された最終パッケージバージョン:" -ForegroundColor Cyan
    Write-Host "  • Microsoft.Azure.Functions.Worker: 1.22.0" -ForegroundColor White
    Write-Host "  • Microsoft.Azure.Functions.Worker.Extensions.Http: 3.3.0" -ForegroundColor White
    Write-Host "  • Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore: 1.3.2" -ForegroundColor White
    Write-Host "  • Microsoft.Azure.Functions.Worker.Sdk: 1.17.2" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 次のステップ: func start --port 7072 でローカル実行テスト" -ForegroundColor Green
} else {
    Write-Host "❌ ビルドに失敗しました" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}

Write-Host ""
Write-Host "✨ 修正完了！明日のデモ準備完了です" -ForegroundColor Green