# 🔖 EC Ranger (Shopify AIマーケティングスイート) - ブックマークリンク集

## 📅 最終更新: 2025年10月18日

---

### 🔗 正本/計画
- GDPR 正本: `docs/00-production-release/03-gdpr-compliance/`
- 整理ハブ: `docs/01-project-management/04-organization/doc-cleanup/`
- ADR-002: `docs/02-architecture/05-ADR/ADR-002-gdpr-canonical-and-report-naming.md`
- 環境再構築計画: `docs/01-project-management/01-planning/environment-rebuild-plan-2025-10-申請前.md`
- E2Eテスト計画: `docs/01-project-management/01-planning/full-e2e-test-plan-2025-10-申請前.md`
- ドキュメント構成ガイド: `docs/ドキュメント構成ガイド.md`

## 🌐 **開発環境 - ワンクリックアクセス**

| 環境 | サービス | URL | 説明 |
|---|---|---|---|
| **📱 フロントエンド** | メインサイト | [https://brave-sea-038f17a00.1.azurestaticapps.net](https://brave-sea-038f17a00.1.azurestaticapps.net) | Azure開発環境フロントエンド |
| | プレビュー環境 | [https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net](https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net) | 開発環境プレビューサイト |
| **🔌 バックエンドAPI** | Health Check | [https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/health](https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/health) | Azure API稼働確認 |
| | Swagger API仕様 | [https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/swagger](https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/swagger) | API仕様書 |
| | Database APIテスト | [https://brave-sea-038f17a00.1.azurestaticapps.net/database-test](https://brave-sea-038f17a00.1.azurestaticapps.net/database-test) | データベース接続テスト |

---

## 🛠️ **開発・管理ツール**

### **☁️ Azure管理**
- [🌐 **Azure Portal**](https://portal.azure.com) - Azureリソース管理
- [📊 **App Service**](https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2Fsites) - バックエンド管理
- [⚡ **Static Web Apps**](https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2FStaticSites) - フロントエンド管理
- [🗄️ **SQL Database**](https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Sql%2Fservers) - Azure SQL管理
- [📈 **Application Insights**](https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/microsoft.insights%2Fcomponents) - 監視・ログ
- [🔐 **Key Vault**](https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.KeyVault%2Fvaults) - シークレット管理

### **🔄 GitHub**
- [📂 **リポジトリ**](https://github.com/sideworks-fuk/shopify-ai-marketing-suite) - ソースコード
- [⚙️ **GitHub Actions**](https://github.com/sideworks-fuk/shopify-ai-marketing-suite/actions) - CI/CDパイプライン
- [📋 **Issues**](https://github.com/sideworks-fuk/shopify-ai-marketing-suite/issues) - 課題管理
- [🔀 **Pull Requests**](https://github.com/sideworks-fuk/shopify-ai-marketing-suite/pulls) - コードレビュー

### **🏪 Shopify開発・公式ドキュメント**
- [🔧 **Shopify Partner Dashboard**](https://partners.shopify.com) - アプリ管理
- [📚 **Shopify Dev Docs**](https://shopify.dev) - 開発ドキュメント
- [🧪 **開発ストア**](https://admin.shopify.com/store/fuk-dev1) - テストストア管理
- [📖 **Shopify Admin API**](https://shopify.dev/docs/admin-api) - Admin API仕様
- [🔌 **Shopify GraphQL API**](https://shopify.dev/docs/admin-api/graphql) - GraphQL API仕様
- [📦 **Shopify App Bridge**](https://shopify.dev/docs/app-bridge) - 埋め込みアプリ開発
- [🔐 **Shopify OAuth**](https://shopify.dev/docs/apps/auth/oauth) - OAuth認証
- [📊 **Shopify Webhooks**](https://shopify.dev/docs/apps/webhooks) - Webhook設定
- [💰 **Shopify Billing API**](https://shopify.dev/docs/apps/billing) - 課金システム
- [🛡️ **Shopify GDPR**](https://shopify.dev/docs/apps/store/data-protection) - GDPR対応

---

## 📚 **ドキュメント・リソース**

### **📖 プロジェクトドキュメント**
- [📝 **CLAUDE.md**](./CLAUDE.md) - AI開発チームルール ✅ **UPDATED!**
- [📝 **環境設定ガイド**](./04-development/backend-connection-setup-guide.md) - バックエンド接続設定 ✅ **NEW!**
- [🔐 **OAuth実装ガイド**](./04-development/shopify-oauth-debug-guide.md) - OAuth詳細デバッグ
- [🌳 **ブランチ戦略**](./05-operations/branch-strategy-and-deployment-plan.md) - 開発フロー・デプロイ戦略
- [⚙️ **開発環境セットアップ**](./04-development/DEVELOPMENT-SETUP-MASTER.md) - 環境構築

### **📊 作業ログ**
- [📁 **2025年8月**](./worklog/2025/08/) - 最新作業ログ
- [🔧 **Shopify APIクリーンアップ**](./worklog/2025/08/2025-08-11-shopify-api-cleanup.md) - API整理作業 ✅ **NEW!**
- [🔌 **バックエンド接続修正**](./worklog/2025/08/2025-08-11-backend-connection-fix.md) - 接続エラー修正 ✅ **NEW!**

### **🏗️ 技術仕様**
- [🏛️ **システムアーキテクチャ**](./02-architecture/system-architecture.md) - 全体設計
- [🗄️ **データベース設計**](./03-design-specs/database/DATABASE-DESIGN.md) - データベース設計
- [🔐 **マルチテナント設計**](./03-design-specs/multi-tenant-architecture/README.md) - マルチテナント対応

---

## 💡 **使用方法**

1. **MDプレビュー**: このファイルをVS Code等でプレビューモードで開く
2. **ワンクリック**: 各リンクを直接クリックでアクセス
3. **ブックマーク**: ブラウザのブックマークバーにドラッグ&ドロップ
4. **チーム共有**: この文書をチーム全員で共有

**💡 このページをブックマークして、開発効率を最大化しましょう！** 🚀