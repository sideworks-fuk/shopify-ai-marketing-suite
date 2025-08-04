# Test build script for DatabaseFunction
Write-Host "Testing DatabaseFunction build..." -ForegroundColor Green

# Change to the DatabaseFunction directory
Set-Location -Path $PSScriptRoot

# Clean and restore packages
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
dotnet clean

Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
dotnet restore

Write-Host "Building project..." -ForegroundColor Yellow
dotnet build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build test completed." -ForegroundColor Green