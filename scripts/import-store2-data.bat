@echo off
REM Store 2 テストデータインポートスクリプト（Windows用）
REM 実行日: 2025年7月28日
REM 目的: Store ID=2 用のテストデータをインポート

echo =====================================
echo Store 2 テストデータインポート開始
echo =====================================

REM カレントディレクトリを保存
set ORIGINAL_DIR=%CD%

REM ShopifyDataAnonymizerディレクトリに移動
cd backend\ShopifyDataAnonymizer

REM 1. 顧客データのインポート
echo.
echo 1. 顧客データをインポート中...
dotnet run -- import ^
  --input "..\..\data\staging\anonymized-customers_store2.csv" ^
  --store-id 2 ^
  --type customers

REM 2. 商品データのインポート
echo.
echo 2. 商品データをインポート中...
dotnet run -- import ^
  --input "..\..\data\staging\anonymized-products_store2.csv" ^
  --store-id 2 ^
  --type products

REM 3. 注文データのインポート
echo.
echo 3. 注文データをインポート中...
dotnet run -- import ^
  --input "..\..\data\staging\anonymized-orders_store2_comprehensive.csv" ^
  --store-id 2 ^
  --type orders

REM 元のディレクトリに戻る
cd %ORIGINAL_DIR%

echo.
echo =====================================
echo インポート完了！
echo =====================================
echo.
echo 次のステップ:
echo 1. 開発ブックマーク画面 (/dev-bookmarks) でStore 2に切り替え
echo 2. 各分析画面で以下を確認:
echo    - 前年同月比【商品】: 2020-2025年の完全データ
echo    - 購入回数分析【購買】: 5階層の分布
echo    - 休眠顧客分析【顧客】: 山田由美（350日休眠）等

pause