# 📁 Development フォルダ構成

## 📋 概要
開発に関する技術ドキュメントを整理・統合したフォルダです。

## 📂 ファイル構成

### 🚀 **メインドキュメント**

#### **DEVELOPMENT-SETUP-MASTER.md**
- **内容**: フロントエンド＋バックエンド統合セットアップガイド
- **対象**: 新規開発者のオンボーディング
- **更新**: 2025-01-26（統合版）

### 🔧 **統合ガイド（2025-08-11更新）**

#### **ngrok-complete-guide.md**
- **内容**: ngrokを使用したHTTPS環境構築の完全ガイド
- **統合元**: ngrok関連3ファイルを統合
- **用途**: ローカル開発でのShopify OAuth認証テスト

#### **store-switcher-complete-guide.md**
- **内容**: マルチテナント対応ストア切り替え機能の完全実装ガイド
- **統合元**: store-switcher関連4ファイルを統合
- **用途**: 複数ストア管理機能の実装

#### **purchase-count-analysis-complete-guide.md**
- **内容**: 購入回数分析機能の完全実装ガイド
- **統合元**: PURCH-02-COUNT関連3ファイルを統合
- **用途**: 顧客セグメント分析機能の実装

### 📋 **環境設定**

#### **environment-configuration-unified-guide.md**
- **内容**: 環境変数と設定の統一管理ガイド
- **用途**: 開発・ステージング・本番環境の設定管理

### 🗄️ **データベース関連**

#### **database-migration-tracking.md**
- **内容**: データベースマイグレーション管理台帳
- **更新**: リアルタイムで更新必須
- **重要度**: ⚠️ 最重要（全環境の整合性管理）

#### **database-migrations/** フォルダ
- マイグレーションスクリプトの格納場所
- ファイル命名規則: `YYYY-MM-DD-説明.sql`

### 🚀 **デプロイメント（deployment/サブフォルダ）**

#### **deployment/azure-environment-variables-setup.md**
- **内容**: Azure App Service環境変数設定ガイド
- **重要**: リダイレクトエラー解決方法を含む

#### **deployment/azure-production-deployment-plan.md**
- **内容**: Azure本番環境構築の6フェーズ計画
- **見積**: 月額約¥21,900のコスト詳細含む

#### **deployment/github-workflow-optimization-plan.md**
- **内容**: CI/CDパイプライン最適化計画
- **効果**: ビルド時間30%削減、デプロイ失敗率改善

### 🏗️ **アーキテクチャ**

#### **shopify-batch-processor-architecture.md**
- **内容**: Shopifyデータバッチ処理アーキテクチャ
- **用途**: 大規模データ同期の設計参考

### 🔌 **Shopify統合**

#### **shopify-app-installation-master-guide.md** ✅ **NEW!**
- **内容**: Shopifyアプリインストール完全ガイド（統合版）
- **統合元**: OAuth関連10ファイル以上を統合
- **更新**: 2025-08-11（最新版）
- **用途**: インストール、OAuth認証、セットアップの統一ガイド

#### **shopify-app-navigation-guide.md**
- **内容**: Shopify管理画面ナビゲーション統合
- **更新**: App Bridge v4対応

#### **shopify-navigation-implementation-2025-08-05.md**
- **内容**: 最新のShopifyナビゲーション実装詳細
- **技術**: NavMenuコンポーネント使用

#### **shopify-submenu-implementation-guide.md**
- **内容**: Shopifyサブメニュー実装ガイド
- **用途**: アプリナビゲーションの詳細設定

### 🔮 **将来拡張用**

#### **AZURE-FUNCTIONS-FUTURE-INTEGRATION.md**
- **内容**: Azure Functions活用案
- **ステータス**: 📋 参考情報（実装時に詳細設計要）

#### **azure-functions-implementation-samples.md**
- **内容**: Azure Functions実装サンプル集
- **用途**: バッチ処理実装時の参考

### 🔒 **セキュリティ・テスト**

#### **swagger-jwt-testing-guide.md**
- **内容**: Swagger UIでのJWT認証テストガイド
- **用途**: API認証のデバッグ

## 🗑️ 統合・削除履歴（2025-08-11）

### 最新の統合作業

| アーカイブファイル | 統合先 | 理由 |
|-----------|--------|------|
| `shopify-oauth-debug-guide.md` | `shopify-app-installation-master-guide.md` | OAuth関連を統合 |
| `shopify-oauth-implementation-guide.md` | 同上 | 重複内容の削除 |
| `oauth-implementation-design.md` | 同上 | 設計情報を統合 |
| `oauth-implementation-progress.md` | 同上 | 進捗情報を統合 |
| `oauth-install-page-test-guide.md` | 同上 | テスト手順を統合 |

### 以前の統合作業

| 削除ファイル | 統合先 | 理由 |
|-----------|--------|------|
| `ngrok-https-setup-guide.md` | `ngrok-complete-guide.md` | 3ファイルを1つに統合 |
| `ngrok-shopify-oauth-testing.md` | 同上 | 重複内容の削除 |
| `shopify-oauth-local-testing-guide.md` | 同上 | 包括的ガイドに統合 |
| `store-switcher-*.md` (4ファイル) | `store-switcher-complete-guide.md` | 完全版に統合 |
| `PURCH-02-COUNT-*.md` (3ファイル) | `purchase-count-analysis-complete-guide.md` | 実装ガイド統合 |

## 🔄 整理効果

### **Before（整理前）**
- ❌ 26ファイル（重複・散在）
- ❌ deploymentフォルダが別階層
- ❌ 類似ドキュメントの乱立

### **After（整理後）**  
- ✅ 19ファイル（統合・整理済み）
- ✅ deployment/サブフォルダに集約
- ✅ 機能別の完全ガイドに統合
- ✅ 検索性と保守性の向上

## 📖 使用ガイド

### **新規開発者の場合**
1. 📖 `DEVELOPMENT-SETUP-MASTER.md` でセットアップ実行
2. 🔧 `ngrok-complete-guide.md` でローカルHTTPS環境構築
3. 🚀 `deployment/`フォルダでデプロイ方法確認

### **機能実装の場合**
1. 📋 該当する`*-complete-guide.md`を参照
2. 🗄️ `database-migration-tracking.md`でDB変更管理
3. 🔧 環境設定は`environment-configuration-unified-guide.md`

### **デプロイ・運用の場合**
1. 📁 `deployment/`サブフォルダのガイド参照
2. 🔄 GitHub Workflowの最適化計画確認
3. ⚙️ Azure環境変数設定の確認

## 🔗 関連リンク

### **他フォルダとの関連**
- 📋 `/docs/03-design-specs/` - 設計仕様書
- 🏗️ `/docs/06-infrastructure/` - インフラ構成
- 📝 `/docs/05-operations/` - 運用手順

### **実装ファイル**
- 🖥️ `/frontend/src/` - フロントエンド実装
- ⚙️ `/backend/ShopifyAnalyticsApi/` - バックエンド実装

---

**最終更新**: 2025年8月11日  
**更新者**: Kenji（AI開発チームリーダー）  
**更新内容**: ドキュメント統合とdeploymentサブフォルダ化