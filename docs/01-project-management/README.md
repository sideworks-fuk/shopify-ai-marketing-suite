# プロジェクト管理ドキュメント

このディレクトリには、Shopify AI Marketing Suiteプロジェクトの管理に関するドキュメントが含まれています。

## 📁 ディレクトリ構成

### 00_meeting/ - 会議議事録
定例会議、開発報告、調査報告などの記録
- 会議議事録（日付順）
- 開発報告書
- 調査報告書

### 01-planning/ - プロジェクト計画
プロジェクトの計画、スケジュール、戦略文書
- プロジェクト概要
- 開発スケジュール
- 顧客導入計画
- アーカイブ（過去の計画書）

### 04-organization/ - ドキュメント整理
ドキュメント構造と整理に関する計画
- ドキュメント再編成計画
- フォルダ構造の整理

## 🚀 プロジェクト現状（2025年7月28日）

### 📊 開発フェーズ
- **現在**: Phase 2 - Shopify統合・アプリ申請準備
- **目標**: 2025年8月8日 Shopifyアプリ申請
- **初顧客**: 早稲田メーヤウ様（カレー専門店）

### 🎯 直近の優先タスク
1. **Shopify OAuth 2.0認証**（7/29-8/2）
2. **Azure Functionsバッチ処理**（7/29-8/2）
3. **マルチストア管理機能**（8/5-8/9）
4. **アプリ申請準備**（8/4-8/8）

### 📈 実装状況
| カテゴリ | 完了 | 進行中 | 未着手 |
|----------|------|--------|--------|
| 基本機能 | 8 | 2 | 0 |
| インフラ | 完了 | - | - |
| 認証機能 | - | OAuth実装中 | - |
| バッチ処理 | - | 設計中 | Azure Functions |

## 💼 主要ドキュメント

### 最新の重要文書
- [プロジェクト概要 2025](./01-planning/PROJECT-OVERVIEW-2025.md)
- [早稲田メーヤウ導入計画](./01-planning/2025-07-28-maeyao-implementation-plan.md)
- [加速スケジュール](./01-planning/2025-07-28-accelerated-schedule.md)
- [現状分析レポート](./01-planning/2025-07-26-current-status-analysis.md)

### 最新の会議議事録
- [7/28 定例会議](./00_meeting/250728_会議議事録.md) - OAuth認証とAzure Functions前倒し決定
- [7/22 プロジェクト会議](./00_meeting/250722_会議議事録.md) - アプリ申請目標設定

## 📅 重要な日程

### 2025年7月-8月
| 期間 | タスク | 状態 |
|------|--------|------|
| 7/29-8/2 | Shopify OAuth認証実装 | 🚧 進行中 |
| 7/29-8/2 | Azure Functions開発 | 🚧 進行中 |
| 8/4-8/8 | **Shopifyアプリ申請** | 📋 準備中 |
| 8/5-8/9 | 早稲田メーヤウ様カスタマイズ | 📋 計画中 |
| 8/12-8/16 | 本番導入 | 📋 計画中 |

## 👥 チーム体制

### 開発チーム
- **YUKI**: フロントエンド開発、前年同月比画面担当
- **TAKASHI**: バックエンド開発、OAuth認証・購入回数分析担当
- **ケンジ**: ドキュメント作成、技術設計、Azure Functions設計

### ビジネスチーム
- **福田様**: プロジェクトマネージャー
- **小野様**: ビジネス開発
- **浜地様**: マーケティング・営業

## 💰 コスト構造

### 現在の環境（開発）
- Azure App Service: F1（無料）
- Azure SQL Database: Basic（5 DTU）
- 月額コスト: 約600円

### 本番環境（推奨）
- Azure App Service: S1以上
- Azure SQL Database: S0以上（10 DTU）
- Azure Functions: 従量課金
- 月額コスト: 約5,000円

## 🔧 技術スタック

### Frontend
- **Framework**: Next.js 14.2.4 (App Router)
- **UI**: Shadcn/ui + Tailwind CSS
- **State**: Context API + カスタムフック

### Backend
- **Framework**: ASP.NET Core 8.0
- **ORM**: Entity Framework Core 8.0
- **Database**: Azure SQL Database

### Infrastructure
- **Frontend**: Azure Static Web Apps
- **Backend**: Azure App Service
- **Batch**: Azure Functions（実装中）
- **CI/CD**: GitHub Actions

## 📚 クイックアクセス

### 開発者向け
- [開発セットアップ](../04-development/DEVELOPMENT-SETUP-MASTER.md)
- [API仕様書](../03-design-specs/api-documentation/api-endpoints-catalog.md)
- [デプロイメントガイド](../05-operations/DEPLOYMENT-MASTER-GUIDE.md)

### ビジネスチーム向け
- [画面設計書](../03-design-specs/screen-designs/README.md)
- [コスト見積もり](../06-infrastructure/03-cost-management/azure-cost-estimation-guide.md)
- [セキュリティ要件](../03-design-specs/security/frontend-security-issues.md)

## 🚨 注意事項

1. **8月8日のアプリ申請に向けて全力対応中**
2. **早稲田メーヤウ様が初の実顧客**
3. **OAuth認証とAzure Functionsは今週中に完成必須**

## 📝 更新履歴

- **2025-07-28**: フォルダ構造整理、最新状況を反映 - ケンジ
- **2025-07-26**: プロジェクト管理ドキュメントを整理・統合
- **2025-07-22**: アプリ申請目標を8月8日に設定

---

**最終更新**: 2025年7月28日  
**更新者**: ケンジ  
**次回定例**: 2025年8月4日（日）