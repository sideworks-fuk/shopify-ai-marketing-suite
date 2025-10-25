# 📚 Shopify AI Marketing Suite - ドキュメント索引

## 📅 最終更新: 2025年10月25日

## 🎯 プロジェクト概要

Shopifyストア運営者向けの**AIを活用した購買データ分析**アプリケーションのドキュメント集です。
Azure SQL Database統合完了済み、開発環境での動作確認済み、feature ブランチ戦略導入済みの包括的なドキュメントを提供しています。

---

## 📖 **ドキュメント利用ガイド**

### 👨‍💻 **開発者向け（最新）**
1. **新規メンバー**: [オンボーディングガイド](00-onboarding.md) ✅ **新規作成**
2. **クイックスタート**: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) ✅ **更新済み**
3. **ブックマーク集**: [BOOKMARKS.md](./BOOKMARKS.md) ✅ **更新済み**
4. **ブランチ戦略**: [branch-strategy-and-deployment-plan.md](./05-operations/03-デプロイメント/branch-strategy-and-deployment-plan.md) ✅ **新規**
5. **システム理解**: [system-architecture.md](./02-architecture/01-システム設計/system-architecture.md) 📝 **更新推奨**

### 🗄️ **データベース統合確認**
1. **設定記録**: [azure-sql-setup-record.md](./06-infrastructure/01-azure-sql/azure-sql-setup-record.md) ✅ **完成**
2. **統合成功ログ**: [docs/worklog/2025/07/2025-07-21-051500-azure-sql-database-integration-success.md](../docs/worklog/2025/07/2025-07-21-051500-azure-sql-database-integration-success.md) ✅ **新規**
3. **データアーキテクチャ**: [data-processing-architecture.md](./01-project-management/02-business-analysis/data-processing-architecture.md) ✅ **最新**

### 📊 **プロジェクトマネージャー向け**
1. **プロジェクト状況**: [project-status.md](./01-project-management/01-planning/project-status.md) 📝 **Phase 1完了反映要**
2. **バックログ管理**: [backlog-management.md](./01-project-management/01-planning/backlog-management.md) 📝 **Database統合反映要**

### 🚀 **運用チーム向け**
1. **ブランチ戦略**: [branch-strategy-and-deployment-plan.md](./05-operations/03-デプロイメント/branch-strategy-and-deployment-plan.md) ✅ **最新**
2. **環境URL**: [environment-urls-reference.md](./05-operations/04-環境管理/environment-urls-reference.md) 📝 **Database API反映要**

---

### 🔗 正本と重要リンク
- **新規メンバー向け**: [オンボーディングガイド](00-onboarding.md) ✅ **新規作成**
- **機能開発管理**: `docs/03-feature-development/` 🆕 **新規追加**
- **テスト・品質保証**: `docs/06-testing/` 🆕 **新規追加**
- GDPR 正本: `docs/00-production-release/03-gdpr-compliance/`
- 整理ハブ: `docs/01-project-management/04-organization/doc-cleanup/`
- ADR: `docs/02-architecture/05-ADR/ADR-002-gdpr-canonical-and-report-naming.md`
- 環境再構築計画: `docs/01-project-management/01-planning/environment-rebuild-plan-2025-10-申請前.md`
- E2Eテスト計画: `docs/01-project-management/01-planning/full-e2e-test-plan-2025-10-申請前.md`
- ドキュメント構成ガイド: `docs/ドキュメント構成ガイド.md`

## 📂 ドキュメント構成

### 🚀 03. 機能開発管理 🆕
新機能開発のプロセス管理とドキュメント化

#### **概要**
- **要件定義**: 機能要件の定義、ユーザーストーリーの作成
- **機能設計**: 機能設計書の作成、システム設計の概要
- **実装計画**: 実装計画の策定、タスク分解
- **レビュー・テスト**: コードレビュー記録、テスト結果

#### **主要ドキュメント**
- [機能開発管理](./03-feature-development/README.md) 🆕
- [テンプレート集](./03-feature-development/templates/) 🆕

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

#### **01-システム設計**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [system-architecture.md](./02-architecture/01-システム設計/system-architecture.md) | システム設計・プロジェクト構造・技術スタック | 四半期 | 2025-05-25 |
| [technical-debt.md](./02-architecture/01-システム設計/technical-debt.md) | 技術的負債分析・改善ガイド・リファクタリング計画 | 月次 | 2025-06-16 |

#### **02-データベース設計**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [データベースモデル一覧.md](./02-architecture/02-データベース設計/データベースモデル一覧.md) | エンティティ設計・リレーション・インデックス | 機能追加時 | 2025-10-18 |

#### **03-技術スタック**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [Shopifyアプリ開発技術ガイド.md](./02-architecture/03-技術スタック/Shopifyアプリ開発技術ガイド.md) | 技術選定理由・実装パターン・ベストプラクティス | 四半期 | 2025-05-25 |

#### **05-ADR（アーキテクチャ決定記録）**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [ADR-001-技術スタック選定.md](./02-architecture/05-ADR/ADR-001-技術スタック選定.md) | 技術選定の経緯と理由 | 必要時 | 2025-05-25 |
| [ADR-002-gdpr-canonical-and-report-naming.md](./02-architecture/05-ADR/ADR-002-gdpr-canonical-and-report-naming.md) | GDPR正本統合とレポート命名規則 | 必要時 | 2025-10-18 |

**📝 更新推奨:**
- system-architecture.md: Azure SQL Database統合、.NET 8バックエンド反映要
- technical-debt.md: Phase 1完了状況反映要

---

### 📱 03. 設計・仕様
画面設計、コンポーネント仕様、ビジネスロジックに関するドキュメント

#### **01-frontend（フロントエンド設計）**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./03-design-specs/01-frontend/README.md) | フロントエンド技術スタック・設計方針 | 四半期 | 2025-10-18 |
| [routing-and-auth.md](./03-design-specs/01-frontend/routing-and-auth.md) | ルーティング・認証設計 | 機能追加時 | 2025-10-18 |
| [page-billing.md](./03-design-specs/01-frontend/page-billing.md) | 課金ページ設計 | 機能追加時 | 2025-10-18 |

#### **02-backend（バックエンド設計）**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./03-design-specs/02-backend/README.md) | バックエンド技術スタック・設計方針 | 四半期 | 2025-10-18 |
| [controllers.md](./03-design-specs/02-backend/controllers.md) | APIエンドポイント設計 | 機能追加時 | 2025-10-18 |
| [services.md](./03-design-specs/02-backend/services.md) | サービス層設計 | 機能追加時 | 2025-10-18 |

#### **11-screen-designs（画面設計）**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./03-design-specs/11-screen-designs/README.md) | 画面設計概要・ナビゲーション | 機能追加時 | 2025-10-18 |

#### **07-performance（パフォーマンス設計）**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [virtual-scroll-performance-measurement.md](./03-design-specs/07-performance/virtual-scroll-performance-measurement.md) | 仮想スクロール性能測定 | 必要時 | 2025-10-18 |

**📝 更新推奨:**
- 各README.md: 最新の実装状況反映要
- screen-designs: Database API統合画面追加要

---

### 💻 04. 開発関連
開発環境セットアップ、コーディング規約、テストに関するドキュメント

#### **01-環境構築**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [setup-guide.md](./04-development/01-環境構築/setup-guide.md) | 開発環境セットアップ・依存関係・環境変数設定 | 必要時 | 2025-05-25 |
| [development-environment-setup.md](./04-development/01-環境構築/development-environment-setup.md) | 開発環境詳細セットアップ | 必要時 | 最新確認要 |
| [backend-foundation-setup.md](./04-development/01-環境構築/backend-foundation-setup.md) | バックエンド基盤セットアップ | 必要時 | 最新確認要 |

#### **02-インフラストラクチャ**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [Azureインフラ構成とコスト.md](./04-development/02-インフラストラクチャ/Azureアーキテクチャ/Azureインフラ構成とコスト.md) | Azureインフラ構成・コスト分析 | 四半期 | 最新確認要 |
| [azure-infrastructure-overview.md](./04-development/02-インフラストラクチャ/Azureアーキテクチャ/azure-infrastructure-overview.md) | Azureインフラ概要 | 四半期 | 最新確認要 |

#### **03-データベース**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [database-migration-tracking.md](./04-development/03-データベース/マイグレーション/database-migration-tracking.md) | データベースマイグレーション管理 | 変更時 | 2025-10-18 |
| [azure-sql-setup-record.md](./04-development/03-データベース/Azure_SQL設定/azure-sql-setup-record.md) | Azure SQL Database設定記録 | 必要時 | 2025-07-20 |

#### **05-コスト管理**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [azure-cost-estimation-guide.md](./04-development/05-コスト管理/azure-cost-estimation-guide.md) | Azureコスト見積もりガイド | 四半期 | 2025-01-10 |
| [cost-monitoring-plan.md](./04-development/05-コスト管理/cost-monitoring-plan.md) | コスト監視計画 | 必要時 | 2025-01-10 |

**📝 更新推奨:**
- setup-guide.md: .NET 8、Azure SQL Database、ブランチ戦略反映要
- backend-foundation-setup.md: Entity Framework Core 8.0設定反映要

---

### 🚀 05. 運用・デプロイ
デプロイ手順、監視、トラブルシューティング、ブランチ戦略に関するドキュメント

#### **03-デプロイメント**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [deployment-guide.md](./05-operations/03-デプロイメント/deployment-guide.md) | デプロイ手順・本番環境設定・トラブルシューティング | 必要時 | 2025-05-25 |
| [branch-strategy-and-deployment-plan.md](./05-operations/03-デプロイメント/branch-strategy-and-deployment-plan.md) | ブランチ戦略・デプロイ戦略 ✅ **新規作成済み** | 必要時 | 2025-07-20 |
| [azure-deployment-guide.md](./05-operations/03-デプロイメント/azure-deployment-guide.md) | Azure デプロイガイド | 必要時 | 最新確認要 |

#### **04-環境管理**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [environment-urls-reference.md](./05-operations/04-環境管理/environment-urls-reference.md) | 環境URL参照 | 必要時 | 最新確認要 |

#### **05-external-communications（外部連絡）**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [01-azure-proxy-work-request-guide-final.md](./05-operations/05-external-communications/01-azure-proxy-work-request-guide-final.md) | Azureプロキシ作業依頼ガイド | 必要時 | 2025-10-18 |

**📝 更新推奨:**
- environment-urls-reference.md: 開発環境URL・Database API反映要
- deployment-guide.md: 現在の開発環境戦略反映要

---

### 🛍️ 06. Shopify関連
Shopifyアプリ申請、課金システム、GDPR対応、法的文書、技術ガイドに関するドキュメント

#### **01-申請関連**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./06-shopify/01-申請関連/README.md) | Shopifyアプリ申請関連ドキュメント | 必要時 | 最新確認要 |

#### **02-課金システム**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./06-shopify/02-課金システム/README.md) | 課金システム関連ドキュメント | 必要時 | 最新確認要 |

#### **03-GDPR**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./06-shopify/03-GDPR/README.md) | GDPR関連ドキュメント（旧版） | 必要時 | 最新確認要 |

#### **04-GDPR対応**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./06-shopify/04-GDPR対応/README.md) | GDPR対応ドキュメント（旧版） | 必要時 | 最新確認要 |

#### **05-法的文書**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./06-shopify/05-法的文書/README.md) | 法的文書関連ドキュメント | 必要時 | 最新確認要 |

#### **06-技術ガイド**
| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./06-shopify/06-技術ガイド/README.md) | Shopify技術ガイド | 必要時 | 最新確認要 |

### 📖 07. 運用マニュアル
UI操作ガイド、トラブルシューティング、FAQに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./07-operations-manual/README.md) | 運用マニュアル概要 | 必要時 | 最新確認要 |
| [01-UI操作ガイド.md](./07-operations-manual/01-UI操作ガイド.md) | UI操作ガイド | 必要時 | 最新確認要 |
| [02-トラブルシューティングガイド.md](./07-operations-manual/02-トラブルシューティングガイド.md) | トラブルシューティングガイド | 必要時 | 最新確認要 |
| [03-FAQ.md](./07-operations-manual/03-FAQ.md) | よくある質問 | 必要時 | 最新確認要 |

---

## 📝 **変更履歴**

| 日付 | 変更内容 | 担当者 |
|---|---|---|
| 2025-10-25 | ✅ 開発フロー重視の番号体系最適化・03-feature-development・06-testing追加 | AI Assistant |
| 2025-10-18 | ✅ オンボーディングガイド新規作成・ドキュメント再編完了 | AI Assistant |
| 2025-07-20 | ✅ ドキュメント索引全面更新・Phase 1完了反映・Azure SQL統合状況反映 | AI Assistant |
| 2025-07-20 | ✅ QUICK-REFERENCE.md・BOOKMARKS.md更新完了 | AI Assistant |
| 2025-07-20 | ✅ branch-strategy-and-deployment-plan.md新規作成 | AI Assistant |
| 2025-01-10 | インフラ・コスト管理ドキュメント追加（06セクション） | AI Assistant |
| 2025-06-16 | ドキュメント構造整理・統合・README作成 | AI Assistant |

---

**💡 次のアクション: 新規メンバーは[オンボーディングガイド](00-onboarding.md)から開始！** 🎯

*最終更新: 2025年10月25日*  
*作成者: AI Assistant*  
*次回レビュー: 2025年11月25日（月次）* 