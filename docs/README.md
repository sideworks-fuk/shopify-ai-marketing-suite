# 📚 Shopify AI Marketing Suite - ドキュメント索引

## 📅 最終更新: 2025年7月20日 [[memory:3773065]]

## 🎯 プロジェクト概要

Shopifyストア運営者向けの**AIを活用した購買データ分析**アプリケーションのドキュメント集です。
Azure SQL Database統合完了済み、開発環境での動作確認済み、feature ブランチ戦略導入済みの包括的なドキュメントを提供しています。

---

## 📂 ドキュメント構成

### 📋 01. プロジェクト管理
プロジェクトの進捗状況、バックログ管理、データアーキテクチャ、テスト計画に関するドキュメント

#### **01-planning (企画・計画)**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [project-status.md](./01-project-management/01-planning/project-status.md) | プロジェクト状況・実装進捗・機能一覧 | 週次 | 2025-06-04 |
| [backlog-management.md](./01-project-management/01-planning/backlog-management.md) | バックログ親課題・要件管理・改善計画 | 月次 | 2025-06-04 |
| [development-phase-tasks.md](./01-project-management/01-planning/development-phase-tasks.md) | 開発フェーズ別タスク管理 | 週次 | 最新確認要 |
| [rapid-development-plan.md](./01-project-management/01-planning/rapid-development-plan.md) | 迅速開発計画 | 月次 | 最新確認要 |
| [technical-validation-plan.md](./01-project-management/01-planning/technical-validation-plan.md) | 技術検証計画 | 必要時 | 最新確認要 |

#### **02-data-architecture (データアーキテクチャ)** ✅ **重要**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [data-processing-architecture.md](./01-project-management/02-data-architecture/data-processing-architecture.md) | データ処理アーキテクチャ設計 | 四半期 | 2025-07-20 |
| [data-sync-implementation-guide.md](./01-project-management/02-data-architecture/data-sync-implementation-guide.md) | データ同期実装ガイド | 四半期 | 2025-07-20 |
| [sample-db-architecture.md](./01-project-management/02-data-architecture/sample-db-architecture.md) | サンプルDB設計 | 必要時 | 最新確認要 |
| [shopify-order-date-workaround.md](./01-project-management/02-data-architecture/shopify-order-date-workaround.md) | Shopify日付データ回避策 | 必要時 | 最新確認要 |

#### **03-testing (テスト戦略)**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [test-store-creation-plan.md](./01-project-management/03-testing/test-store-creation-plan.md) | テストストア作成計画 | 必要時 | 最新確認要 |
| [test-store-tasks.md](./01-project-management/03-testing/test-store-tasks.md) | テストストアタスク | 必要時 | 最新確認要 |

---

### 🏗️ 02. アーキテクチャ・技術設計
システム設計、技術的負債分析、アーキテクチャに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [system-architecture.md](./02-architecture/system-architecture.md) | システム設計・プロジェクト構造・技術スタック | 四半期 | 2025-05-25 |
| [technical-debt.md](./02-architecture/technical-debt.md) | 技術的負債分析・改善ガイド・リファクタリング計画 | 月次 | 2025-06-16 |

**📝 更新推奨:**
- system-architecture.md: Azure SQL Database統合、.NET 8バックエンド反映要
- technical-debt.md: Phase 1完了状況反映要

---

### 📱 03. 設計・仕様
画面設計、コンポーネント仕様、ビジネスロジックに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [screen-design.md](./03-design-specs/screen-design.md) | 画面設計仕様・UI/UX設計・機能別詳細仕様 | 機能追加時 | 2025-06-16 |
| [user-interview-guide.md](./03-design-specs/user-interview-guide.md) | ユーザーインタビューガイド | 必要時 | 最新確認要 |
| [user-research-framework.md](./03-design-specs/user-research-framework.md) | ユーザー調査フレームワーク | 必要時 | 最新確認要 |
| [year-over-year-detailed-design.md](./03-design-specs/year-over-year-detailed-design.md) | 前年同月比詳細設計 | 機能更新時 | 2025-06-10 |
| [year-over-year-detailed-design-review.md](./03-design-specs/year-over-year-detailed-design-review.md) | 前年同月比設計レビュー | 必要時 | 最新確認要 |

**📝 更新推奨:**
- screen-design.md: Database API統合画面追加要
- year-over-year-detailed-design.md: Azure SQL Database実装反映要

---

### 💻 04. 開発関連
開発環境セットアップ、コーディング規約、テストに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [setup-guide.md](./04-development/setup-guide.md) | 開発環境セットアップ・依存関係・環境変数設定 | 必要時 | 2025-05-25 |
| [development-environment-setup.md](./04-development/development-environment-setup.md) | 開発環境詳細セットアップ | 必要時 | 最新確認要 |
| [backend-foundation-setup.md](./04-development/backend-foundation-setup.md) | バックエンド基盤セットアップ | 必要時 | 最新確認要 |

**📝 更新推奨:**
- setup-guide.md: .NET 8、Azure SQL Database、ブランチ戦略反映要
- backend-foundation-setup.md: Entity Framework Core 8.0設定反映要

---

### 🚀 05. 運用・デプロイ
デプロイ手順、監視、トラブルシューティング、ブランチ戦略に関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [deployment-guide.md](./05-operations/deployment-guide.md) | デプロイ手順・本番環境設定・トラブルシューティング | 必要時 | 2025-05-25 |
| [branch-strategy-and-deployment-plan.md](./05-operations/branch-strategy-and-deployment-plan.md) | ブランチ戦略・デプロイ戦略 ✅ **新規作成済み** | 必要時 | 2025-07-20 |
| [environment-urls-reference.md](./05-operations/environment-urls-reference.md) | 環境URL参照 | 必要時 | 最新確認要 |
| [azure-deployment-guide.md](./05-operations/azure-deployment-guide.md) | Azure デプロイガイド | 必要時 | 最新確認要 |
| [azure-static-web-apps-setup-guide.md](./05-operations/azure-static-web-apps-setup-guide.md) | Azure Static Web Apps セットアップ | 必要時 | 最新確認要 |
| [azure-app-service-basic-auth-fix.md](./05-operations/azure-app-service-basic-auth-fix.md) | Azure App Service 認証修正 | 必要時 | 最新確認要 |

**📝 更新推奨:**
- environment-urls-reference.md: 開発環境URL・Database API反映要
- deployment-guide.md: 現在の開発環境戦略反映要

---

### 💰 06. インフラストラクチャ・コスト管理
Azureインフラのコスト試算、監視、最適化、SQL Database管理に関するドキュメント

#### **01-azure-sql (Azure SQL管理)** ✅ **重要・最新**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [azure-sql-setup-record.md](./06-infrastructure/01-azure-sql/azure-sql-setup-record.md) | Azure SQL Database設定記録 ✅ **完成** | 必要時 | 2025-07-20 |
| [database-development-strategy.md](./06-infrastructure/01-azure-sql/database-development-strategy.md) | データベース開発戦略 | 四半期 | 最新確認要 |
| [azure-app-service-setup-record.md](./06-infrastructure/01-azure-sql/azure-app-service-setup-record.md) | App Service設定記録 | 必要時 | 最新確認要 |
| [azure-sql-migration-guide.md](./06-infrastructure/01-azure-sql/azure-sql-migration-guide.md) | SQL移行ガイド | 必要時 | 最新確認要 |
| [azure-sql-multi-database-strategy.md](./06-infrastructure/01-azure-sql/azure-sql-multi-database-strategy.md) | マルチDB戦略 | 四半期 | 最新確認要 |
| [azure-sql-performance-guide.md](./06-infrastructure/01-azure-sql/azure-sql-performance-guide.md) | SQLパフォーマンスガイド | 必要時 | 最新確認要 |

#### **02-cost-management (コスト管理)**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [azure-cost-estimation-guide.md](./06-infrastructure/02-cost-management/azure-cost-estimation-guide.md) | Azureサービス料金体系・規模別試算・最適化 | 四半期 | 2025-01-10 |
| [cost-monitoring-plan.md](./06-infrastructure/02-cost-management/cost-monitoring-plan.md) | コスト監視計画（小規模向け簡略版） | 必要時 | 2025-01-10 |
| [cost-monitoring-plan-detailed.md](./06-infrastructure/02-cost-management/cost-monitoring-plan-detailed.md) | コスト監視計画（大規模向け詳細版） | 必要時 | 2025-01-10 |
| [azure-pricing-resources.md](./06-infrastructure/02-cost-management/azure-pricing-resources.md) | Azure価格情報・リソース集 | 四半期 | 2025-01-10 |
| [cost-simulation-worksheet.md](./06-infrastructure/02-cost-management/cost-simulation-worksheet.md) | コストシミュレーション実践ワークシート | 必要時 | 2025-01-10 |
| [cost-factors-checklist.md](./06-infrastructure/02-cost-management/cost-factors-checklist.md) | コスト影響要因チェックリスト | 四半期 | 2025-01-10 |

---

## 🚀 **Phase 1 完了状況 (2025年7月20日現在)**

### ✅ **完了済み成果**
- **Azure SQL Database完全統合**: Entity Framework Core 8.0 + 実データ
- **Database API実装**: 接続テスト、CRUD操作、フロントエンド統合
- **開発環境確立**: develop ブランチ戦略導入
- **技術基盤確立**: .NET 8 + Next.js 14 + Azure SQL

### 🗄️ **Database API統合詳細**
- **フロントエンド画面**: `/database-test` - 顧客データリアルタイム表示
- **バックエンドAPI**: 5つのエンドポイント実装済み
- **データベース**: 3テーブル + サンプルデータ投入済み
- **動作確認**: ローカル・クラウド両環境で成功

### 🌳 **開発戦略**
- **現在の環境**: 開発環境として統合活用
- **ブランチ戦略**: develop → feature/ → PR → 統合テスト
- **次回開発**: feature/orders-products-frontend 予定

---

## 📖 **ドキュメント利用ガイド**

### 👨‍💻 **開発者向け（最新）**
1. **クイックスタート**: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) ✅ **更新済み**
2. **ブックマーク集**: [BOOKMARKS.md](./BOOKMARKS.md) ✅ **更新済み**
3. **ブランチ戦略**: [branch-strategy-and-deployment-plan.md](./05-operations/branch-strategy-and-deployment-plan.md) ✅ **新規**
4. **システム理解**: [system-architecture.md](./02-architecture/system-architecture.md) 📝 **更新推奨**

### 🗄️ **データベース統合確認**
1. **設定記録**: [azure-sql-setup-record.md](./06-infrastructure/01-azure-sql/azure-sql-setup-record.md) ✅ **完成**
2. **統合成功ログ**: [worklog/2025/07/2025-07-21-051500-azure-sql-database-integration-success.md](../worklog/2025/07/2025-07-21-051500-azure-sql-database-integration-success.md) ✅ **新規**
3. **データアーキテクチャ**: [data-processing-architecture.md](./01-project-management/02-data-architecture/data-processing-architecture.md) ✅ **最新**

### 📊 **プロジェクトマネージャー向け**
1. **プロジェクト状況**: [project-status.md](./01-project-management/01-planning/project-status.md) 📝 **Phase 1完了反映要**
2. **バックログ管理**: [backlog-management.md](./01-project-management/01-planning/backlog-management.md) 📝 **Database統合反映要**

### 🚀 **運用チーム向け**
1. **ブランチ戦略**: [branch-strategy-and-deployment-plan.md](./05-operations/branch-strategy-and-deployment-plan.md) ✅ **最新**
2. **環境URL**: [environment-urls-reference.md](./05-operations/environment-urls-reference.md) 📝 **Database API反映要**

---

## 🔄 **即座に更新が必要なドキュメント**

### 🔴 **高優先度（今週中）**
1. [system-architecture.md](./02-architecture/system-architecture.md) - Azure SQL統合、.NET 8反映
2. [project-status.md](./01-project-management/01-planning/project-status.md) - Phase 1完了状況反映
3. [environment-urls-reference.md](./05-operations/environment-urls-reference.md) - Database API統合反映

### 🟡 **中優先度（今月中）**
1. [screen-design.md](./03-design-specs/screen-design.md) - Database API統合画面追加
2. [technical-debt.md](./02-architecture/technical-debt.md) - Phase 1完了後の技術的負債状況
3. [setup-guide.md](./04-development/setup-guide.md) - .NET 8、Azure SQL、ブランチ戦略

### ⚪ **低優先度（必要時）**
1. 各種設計・テスト関連ドキュメント
2. コスト管理ドキュメント（現状維持）

---

## 📝 **変更履歴**

| 日付 | 変更内容 | 担当者 |
|---|---|---|
| 2025-07-20 | ✅ ドキュメント索引全面更新・Phase 1完了反映・Azure SQL統合状況反映 | AI Assistant |
| 2025-07-20 | ✅ QUICK-REFERENCE.md・BOOKMARKS.md更新完了 | AI Assistant |
| 2025-07-20 | ✅ branch-strategy-and-deployment-plan.md新規作成 | AI Assistant |
| 2025-01-10 | インフラ・コスト管理ドキュメント追加（06セクション） | AI Assistant |
| 2025-06-16 | ドキュメント構造整理・統合・README作成 | AI Assistant |

---

**💡 次のアクション: 高優先度ドキュメント3件の更新を推奨します！** 🎯

*最終更新: 2025年7月20日*  
*作成者: AI Assistant*  
*次回レビュー: 2025年8月20日（月次）* 