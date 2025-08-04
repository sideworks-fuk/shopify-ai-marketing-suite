#!/bin/bash
# 2025-08-02 緊急インデックス適用スクリプト
# Bash スクリプト for Azure SQL Database

# 接続情報
SERVER="shopify-test-server.database.windows.net"
DATABASE="shopify-test-db"
USERNAME="sqladmin"
PASSWORD="ShopifyTest2025!"

# SQLファイルのパス
SQL_FILE="./Migrations/2025-08-02-EmergencyIndexes.sql"

echo "=== OrderItems緊急インデックス適用開始 ==="
echo "サーバー: $SERVER"
echo "データベース: $DATABASE"
echo ""

# sqlcmdでインデックスを適用
echo "インデックスを作成中..."

if sqlcmd -S "$SERVER" -d "$DATABASE" -U "$USERNAME" -P "$PASSWORD" -i "$SQL_FILE" -b; then
    echo "✅ インデックスの作成が完了しました！"
    echo ""
    echo "作成されたインデックス:"
    echo "  - IX_OrderItems_OrderId"
    echo "  - IX_OrderItems_ProductTitle"
    echo "  - IX_OrderItems_CreatedAt"
    echo "  - IX_OrderItems_OrderId_CreatedAt (複合)"
    echo ""
    echo "統計情報も更新されました。"
else
    echo "❌ エラーが発生しました。"
fi

echo ""
echo "=== 処理完了 ==="