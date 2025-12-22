# docs/deployment フォルダのファイル整理スクリプト

# 必要なディレクトリを作成
New-Item -ItemType Directory -Force -Path "docs/04-customer" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/05-development/04-Azure_DevOps/デプロイメント" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/05-development/03-データベース/Azure_SQL設定" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/05-development/08-デバッグ・トラブル/04-troubleshooting" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/worklog/2025/12" | Out-Null

# 顧客向けドキュメント
$customerFiles = @(
    "customer-installation-guide.md",
    "customer-presentation.md",
    "customer-quick-guide.md",
    "demo-user-installation-guide.md",
    "demo-user-simple-steps.md",
    "demo-user-simple-steps.pdf"
)
foreach ($file in $customerFiles) {
    $source = "docs/deployment/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "docs/04-customer/" -Force -ErrorAction SilentlyContinue
    }
}

# インフラ・デプロイ関連
$deploymentFiles = @(
    "azure-app-service-env-setup.md",
    "azure-static-webapp-url-fix.md",
    "custom-domain-setup-guide.md",
    "github-actions-deployment-guide.md",
    "manual-deployment-steps.md"
)
foreach ($file in $deploymentFiles) {
    $source = "docs/deployment/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "docs/05-development/04-Azure_DevOps/デプロイメント/" -Force -ErrorAction SilentlyContinue
    }
}

# トラブルシューティング
$troubleshootingFiles = @(
    "backend-500-30-emergency-fix.md",
    "backend-error-500-30-checklist.md",
    "backend-error-debug-commands.md",
    "backend-error-investigation-checklist.md",
    "backend-error-log-patterns.md",
    "backend-url-verification.md",
    "emergency-deployment-fix.md",
    "fix-backend-url-dns-error.md",
    "nuget-config-issue-analysis.md",
    "shopify-oauth-error-troubleshooting.md"
)
foreach ($file in $troubleshootingFiles) {
    $source = "docs/deployment/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "docs/05-development/08-デバッグ・トラブル/04-troubleshooting/" -Force -ErrorAction SilentlyContinue
    }
}

# Shopify関連
$shopifyFiles = @(
    "shopify-partner-settings.md",
    "shopify-versions-update-guide.md",
    "swagger-hangfire-auth-setup.md"
)
foreach ($file in $shopifyFiles) {
    $source = "docs/deployment/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "docs/05-development/06-Shopify連携/" -Force -ErrorAction SilentlyContinue
    }
}

# 一時的なドキュメント
$worklogFiles = @(
    "DEMO-INSTALLATION-URL.md"
)
foreach ($file in $worklogFiles) {
    $source = "docs/deployment/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "docs/worklog/2025/12/" -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "ファイル移動が完了しました。"

