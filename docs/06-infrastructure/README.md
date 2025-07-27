# インフラストラクチャドキュメント

このディレクトリには、Shopify AI Marketing Suiteのインフラストラクチャに関するドキュメントを整理しています。

## 📁 ディレクトリ構成

### 01-architecture/ - アーキテクチャ・設計
- **azure-infrastructure-overview.md** - Azureインフラ全体構成（統合版）
- **Azureインフラ構成とコスト.md** - インフラ構成詳細（非エンジニア向け）
- **Azureインフラ用語集 - 非エンジニア向け解説.md** - 技術用語解説

### 02-azure-sql/ - Azure SQL Database
- **azure-sql-setup-record.md** - SQL Database設定記録
- **azure-sql-migration-guide.md** - マイグレーションガイド
- **azure-sql-multi-database-strategy.md** - マルチDB戦略
- **azure-sql-performance-guide.md** - パフォーマンスチューニング
- **database-development-strategy.md** - DB開発戦略
- **sql-server-vs-sql-database-explanation.md** - SQL Server vs SQL Database
- **azure-app-service-setup-record.md** - App Service設定記録

### 03-cost-management/ - コスト管理
- **README.md** - コスト管理概要
- **azure-cost-estimation-guide.md** - コスト見積もりガイド
- **azure-pricing-resources.md** - Azure価格リソース
- **cost-factors-checklist.md** - コスト要因チェックリスト
- **cost-monitoring-plan.md** - コスト監視計画
- **cost-monitoring-plan-detailed.md** - 詳細監視計画
- **cost-simulation-worksheet.md** - コストシミュレーションワークシート

### 04-capacity-planning/ - 容量計画・負荷分析
- **10-users-load-analysis.md** - 10ユーザー負荷分析

## 🚀 クイックスタート

### インフラ全体を理解したい場合
1. [Azureインフラ概要](01-architecture/azure-infrastructure-overview.md)で全体像を把握

### データベース設定を確認する場合
1. [Azure SQL設定記録](02-azure-sql/azure-sql-setup-record.md)で現在の設定を確認
2. [パフォーマンスガイド](02-azure-sql/azure-sql-performance-guide.md)で最適化を検討

### コストを管理したい場合
1. [コスト見積もりガイド](03-cost-management/azure-cost-estimation-guide.md)で費用を把握
2. [コスト監視計画](03-cost-management/cost-monitoring-plan.md)で継続的な管理を設定

### 容量計画を検討する場合
1. [負荷分析](04-capacity-planning/10-users-load-analysis.md)で現在の利用状況を確認

## 🏗️ 現在のインフラ構成

| サービス | 役割 | プラン | 月額コスト | ステータス |
|----------|------|--------|-----------|-----------|
| **Azure Static Web Apps** | Frontend | Free | ¥0 | ✅ 稼働中 |
| **Azure App Service** | Backend API | Basic B1 | ~¥2,000 | ✅ 稼働中 |
| **Azure SQL Database** | Database | Basic | ~¥700 | ✅ 稼働中 |
| **合計** | - | - | **~¥2,700/月** | - |

## 📊 推奨改善ロードマップ

### Phase 1: 基本機能強化（1-3ヶ月）
- Azure Functions導入（バッチ処理効率化）
- Application Insights設定（監視強化）
- Azure Storage追加（バックアップ・ファイル管理）
- **追加コスト**: +¥1,500-2,500/月

### Phase 2: スケール対応（3-6ヶ月）
- Azure CDN導入（グローバル配信）
- Redis Cache追加（パフォーマンス向上）
- Azure Key Vault導入（セキュリティ強化）
- **追加コスト**: +¥3,000-5,000/月

## 🔧 技術スタック

### Frontend
- Next.js 14 + Shadcn/ui + Tailwind CSS
- Azure Static Web Apps

### Backend
- ASP.NET Core 8 + Entity Framework Core
- Azure App Service

### Database
- Azure SQL Database

### DevOps
- GitHub Actions (CI/CD)
- Application Insights (監視)

## 📝 更新履歴

- **2025-07-26**: ディレクトリ構造を整理し、統合概要ドキュメントを作成 - AIアシスタントケンジ
- **2025-07-23**: コスト管理ドキュメント群を整備
- **2025-07-01**: Azure SQL Database初期設定完了

## 🔗 関連ドキュメント

- [運用ガイド](../05-operations/README.md)
- [デプロイメントガイド](../05-operations/01-deployment/DEPLOYMENT-MASTER-GUIDE.md)
- [API統合マッピング](../03-design-specs/api-documentation/API-INTEGRATION-MAP.md)

---

**最終更新**: 2025年7月26日  
**更新者**: AIアシスタントケンジ