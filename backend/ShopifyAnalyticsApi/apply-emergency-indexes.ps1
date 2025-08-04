# 2025-08-02 緊急インデックス適用スクリプト
# PowerShell スクリプト for Azure SQL Database

# 接続情報
$server = "shopify-test-server.database.windows.net"
$database = "shopify-test-db"
$username = "sqladmin"
$password = "ShopifyTest2025!"

# SQLファイルのパス
$sqlFile = ".\Migrations\2025-08-02-EmergencyIndexes.sql"

Write-Host "=== OrderItems緊急インデックス適用開始 ===" -ForegroundColor Yellow
Write-Host "サーバー: $server" -ForegroundColor Cyan
Write-Host "データベース: $database" -ForegroundColor Cyan
Write-Host ""

# sqlcmdでインデックスを適用
try {
    Write-Host "インデックスを作成中..." -ForegroundColor Green
    
    $result = sqlcmd -S "$server" -d "$database" -U "$username" -P "$password" -i "$sqlFile" -b
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ インデックスの作成が完了しました！" -ForegroundColor Green
        Write-Host ""
        Write-Host "作成されたインデックス:" -ForegroundColor Cyan
        Write-Host "  - IX_OrderItems_OrderId"
        Write-Host "  - IX_OrderItems_ProductTitle"
        Write-Host "  - IX_OrderItems_CreatedAt"
        Write-Host "  - IX_OrderItems_OrderId_CreatedAt (複合)"
        Write-Host ""
        Write-Host "統計情報も更新されました。" -ForegroundColor Green
    }
    else {
        Write-Host "❌ エラーが発生しました。" -ForegroundColor Red
        Write-Host $result
    }
}
catch {
    Write-Host "❌ 実行中にエラーが発生しました:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "=== 処理完了 ===" -ForegroundColor Yellow