# 05-operations - 運用ガイド

> **📅 統合完了日**: 2025年7月26日  
> **🎯 目的**: 運用・デプロイ・トラブルシューティングの統一ガイド集  
> **📁 構成**: 4つのマスターガイド + アーカイブ

---

## 📋 マスターガイド構成

### 🚀 [DEPLOYMENT-MASTER-GUIDE.md](./DEPLOYMENT-MASTER-GUIDE.md)
**デプロイメント統合ガイド**
- Frontend (Azure Static Web Apps) デプロイ
- Backend (Azure App Service) デプロイ  
- ブランチ戦略とデプロイフロー
- 自動デプロイ設定
- ロールバック手順

### 🌍 [ENVIRONMENT-CONFIGURATION-MASTER.md](./ENVIRONMENT-CONFIGURATION-MASTER.md)
**環境設定統合ガイド**
- 環境変数設定 (Development/Staging/Production)
- GitHub Environments設定
- フロントエンド環境切り替え
- ビルド時環境変数
- 環境別設定詳細

### ⚙️ [AZURE-OPERATIONS-GUIDE.md](./AZURE-OPERATIONS-GUIDE.md)
**Azure運用統合ガイド**
- Azure App Service基本設定
- ログ管理・監視 (Serilog + Application Insights)
- Basic認証設定
- パフォーマンス最適化
- セキュリティ設定

### 🔧 [CICD-TROUBLESHOOTING-GUIDE.md](./CICD-TROUBLESHOOTING-GUIDE.md)
**CI/CD・トラブルシューティング統合ガイド**
- GitHub Actions設定
- よくある問題と解決法
- Azure Static Web Apps問題
- Azure App Service問題
- デバッグ・診断方法

---

## 🗂️ 統合内容

### 統合前 (21ファイル)

#### デプロイメント関連 (5ファイル)
- `branch-strategy-and-deployment-plan.md`
- `github-environments-setup.md`
- `github-manual-deploy-guide.md`
- `workflow-dispatch-troubleshooting.md`
- `workflow-files-update-checklist.md`

#### 環境設定関連 (8ファイル)
- `azure-app-service-basic-auth-fix.md`
- `azure-app-service-environment-setup.md`
- `azure-static-web-apps-setup-guide.md`
- `build-time-environment-variables.md`
- `environment-configuration-guide.md`
- `environment-naming-convention.md`
- `environment-urls-reference.md`
- `github-actions-environment-variables.md`

#### Azure運用関連 (4ファイル)
- `azure-app-service-logging-guide.md`
- `azure-app-service-setup-record.md`
- `azure-deployment-guide.md`
- `multi-environment-deployment-strategy.md`

#### トラブルシューティング関連 (4ファイル)
- `api-error-troubleshooting.md`
- `azure-app-service-deploy-error-troubleshooting.md`
- `azure-app-service-file-system-limitations.md`
- `workflow-dispatch-troubleshooting.md`

### 統合後 (4ファイル)

#### マスターガイド
1. **DEPLOYMENT-MASTER-GUIDE.md** - デプロイメント統合ガイド
2. **ENVIRONMENT-CONFIGURATION-MASTER.md** - 環境設定統合ガイド
3. **AZURE-OPERATIONS-GUIDE.md** - Azure運用統合ガイド
4. **CICD-TROUBLESHOOTING-GUIDE.md** - CI/CD・トラブルシューティング統合ガイド

---

## 📁 アーカイブ

統合前のオリジナルファイルは `/archived/` フォルダに保存されています。

### アーカイブファイル (21ファイル)
```
archived/
├── api-error-troubleshooting.md
├── azure-app-service-basic-auth-fix.md
├── azure-app-service-deploy-error-troubleshooting.md
├── azure-app-service-environment-setup.md
├── azure-app-service-file-system-limitations.md
├── azure-app-service-logging-guide.md
├── azure-deployment-guide.md
├── azure-functions-deployment-guide.md
├── azure-static-web-apps-setup-guide.md
├── branch-strategy-and-deployment-plan.md
├── build-time-environment-variables.md
├── deployment-guide.md
├── environment-configuration-guide.md
├── environment-naming-convention.md
├── environment-urls-reference.md
├── github-actions-environment-variables.md
├── github-environments-setup.md
├── github-manual-deploy-guide.md
├── multi-environment-deployment-strategy.md
├── workflow-dispatch-troubleshooting.md
└── workflow-files-update-checklist.md
```

---

## 🎯 使用方法

### 新規開発者向け
1. **[ENVIRONMENT-CONFIGURATION-MASTER.md](./ENVIRONMENT-CONFIGURATION-MASTER.md)** - 環境設定を理解
2. **[DEPLOYMENT-MASTER-GUIDE.md](./DEPLOYMENT-MASTER-GUIDE.md)** - デプロイ方法を学習

### 運用担当者向け
1. **[AZURE-OPERATIONS-GUIDE.md](./AZURE-OPERATIONS-GUIDE.md)** - 日常運用手順
2. **[CICD-TROUBLESHOOTING-GUIDE.md](./CICD-TROUBLESHOOTING-GUIDE.md)** - 問題発生時の対処

### 問題対応時
1. **[CICD-TROUBLESHOOTING-GUIDE.md](./CICD-TROUBLESHOOTING-GUIDE.md)** - まず最初に確認
2. 該当する個別マスターガイドで詳細確認

---

## 📈 統合の効果

### 改善点
- **文書数**: 21ファイル → 4ファイル (81%削減)
- **重複排除**: 同一内容の重複を統合
- **検索性向上**: 関連情報が1つのファイルに集約
- **保守性向上**: 更新箇所の一元化

### 保持した情報
- すべての技術的詳細
- 手順・設定例
- トラブルシューティング情報
- ベストプラクティス

---

## 📊 現在の環境

| 環境 | Frontend URL | Backend URL | ステータス |
|------|-------------|-------------|-----------|
| **Production** | [Azure Static Web Apps](https://shopify-marketing-suite.azurestaticapps.net) | [Azure App Service](https://shopifyapp-backend-production.japanwest-01.azurewebsites.net) | ✅ 稼働中 |
| **Staging** | Azure Static Web Apps Preview | [Azure App Service](https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net) | ✅ 稼働中 |
| **Development** | Azure Static Web Apps Preview | [Azure App Service](https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net) | ✅ 稼働中 |

---

*最終更新: 2025年7月26日*