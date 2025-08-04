#!/bin/bash
# バックエンドAPIサービス起動スクリプト

echo -e "\033[32mStarting Shopify Analytics API Backend...\033[0m"

# プロジェクトディレクトリに移動
cd ShopifyAnalyticsApi

# 環境変数を設定
export ASPNETCORE_ENVIRONMENT=Development
export ASPNETCORE_URLS="https://localhost:7088;http://localhost:5168"

echo -e "\033[33mEnvironment: $ASPNETCORE_ENVIRONMENT\033[0m"
echo -e "\033[33mURLs: $ASPNETCORE_URLS\033[0m"

# HTTPSプロファイルで起動
echo -e "\033[36mStarting API with HTTPS profile...\033[0m"
dotnet run --launch-profile https

# エラーが発生した場合の処理
if [ $? -ne 0 ]; then
    echo -e "\033[31mFailed to start backend service!\033[0m"
    echo -e "\033[33mPlease check the following:\033[0m"
    echo -e "\033[33m1. .NET SDK is installed\033[0m"
    echo -e "\033[33m2. Project dependencies are restored (run 'dotnet restore')\033[0m"
    echo -e "\033[33m3. Database connection string is configured in appsettings.json\033[0m"
    exit 1
fi