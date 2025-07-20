# 📚 Shopify ECマーケティング分析アプリ - ドキュメント索引

## 🎯 プロジェクト概要

Shopifyストア運営者向けの**AIを活用した購買データ分析**アプリケーションのドキュメント集です。
実装済み8機能の設計・開発・運用に関する包括的な情報を提供しています。

---

## 📂 ドキュメント構成

### 📋 01. プロジェクト管理
プロジェクトの進捗状況、バックログ管理、ロードマップに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [project-status.md](./01-project-management/project-status.md) | プロジェクト状況・実装進捗・機能一覧 | 週次 | 2025-06-04 |
| [backlog-management.md](./01-project-management/backlog-management.md) | バックログ親課題・要件管理・改善計画 | 月次 | 2025-06-04 |

---

### 🏗️ 02. アーキテクチャ・技術設計
システム設計、技術的負債分析、アーキテクチャに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [system-architecture.md](./02-architecture/system-architecture.md) | システム設計・プロジェクト構造・技術スタック | 四半期 | 2025-05-25 |
| [technical-debt.md](./02-architecture/technical-debt.md) | 技術的負債分析・改善ガイド・リファクタリング計画 | 月次 | 2025-06-16 |

**今後追加予定:**
- `api-design.md` - API設計仕様書
- `database-design.md` - データベース設計書
- `security-architecture.md` - セキュリティ設計書

---

### 📱 03. 設計・仕様
画面設計、コンポーネント仕様、ビジネスロジックに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [screen-design.md](./03-design-specs/screen-design.md) | 画面設計仕様・UI/UX設計・機能別詳細仕様 | 機能追加時 | 2025-06-16 |

**今後追加予定:**
- `component-specs.md` - コンポーネント仕様書
- `business-logic.md` - ビジネスロジック仕様書
- `user-stories.md` - ユーザーストーリー集

---

### 💻 04. 開発関連
開発環境セットアップ、コーディング規約、テストに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [setup-guide.md](./04-development/setup-guide.md) | 開発環境セットアップ・依存関係・環境変数設定 | 必要時 | 2025-05-25 |

**今後追加予定:**
- `coding-standards.md` - コーディング規約・ベストプラクティス
- `testing-guide.md` - テスト戦略・実行手順
- `git-workflow.md` - Git運用ガイドライン

---

### 🚀 05. 運用・デプロイ
デプロイ手順、監視、トラブルシューティングに関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [deployment-guide.md](./05-operations/deployment-guide.md) | デプロイ手順・本番環境設定・トラブルシューティング | 必要時 | 2025-05-25 |

**今後追加予定:**
- `monitoring.md` - 監視・アラート設定ガイド
- `troubleshooting.md` - 障害対応手順書
- `maintenance.md` - 定期メンテナンス手順

---

### 💰 06. インフラストラクチャ・コスト管理 ⭐NEW
Azureインフラのコスト試算、監視、最適化に関するドキュメント

| ファイル | 内容 | 更新頻度 | 最終更新 |
|---|---|---|---|
| [README.md](./06-infrastructure-cost/README.md) | インフラ・コスト管理ドキュメント索引 | 必要時 | 2025-01-10 |
| [azure-cost-estimation-guide.md](./06-infrastructure-cost/azure-cost-estimation-guide.md) | Azureサービス料金体系・規模別試算・最適化 | 四半期 | 2025-01-10 |
| [cost-monitoring-plan.md](./06-infrastructure-cost/cost-monitoring-plan.md) | コスト監視計画（小規模向け簡略版） | 必要時 | 2025-01-10 |
| [cost-monitoring-plan-detailed.md](./06-infrastructure-cost/cost-monitoring-plan-detailed.md) | コスト監視計画（大規模向け詳細版） | 必要時 | 2025-01-10 |
| [azure-pricing-resources.md](./06-infrastructure-cost/azure-pricing-resources.md) | Azure価格情報・リソース集 ⭐NEW | 四半期 | 2025-01-10 |
| [cost-simulation-worksheet.md](./06-infrastructure-cost/cost-simulation-worksheet.md) | コストシミュレーション実践ワークシート ⭐NEW | 必要時 | 2025-01-10 |
| [cost-factors-checklist.md](./06-infrastructure-cost/cost-factors-checklist.md) | コスト影響要因チェックリスト ⭐NEW | 四半期 | 2025-01-10 |

**重要ポイント:**
- 1日1,000リクエスト規模では`cost-monitoring-plan.md`（簡略版）を参照
- PostgreSQLが総コストの約90%を占める点に注意
- 月額¥5,000の予算アラート設定を推奨
- Azure無料アカウントで¥22,500クレジット（30日間）を活用可能

---

## 🚀 実装状況（2025年6月16日現在）

### ✅ **実装完了機能（8機能）**

| カテゴリ | 機能名 | 実装状況 | 技術的負債 | 詳細 |
|---|---|---|---|---|
| 商品分析 | 前年同月比【商品】 | ✅ 完了 | 🟡 軽微 | [詳細](./03-design-specs/screen-design.md#1-前年同月比商品) |
| 商品分析 | 購入頻度【商品】 | ✅ 完了 | 🟡 軽微 | [詳細](./03-design-specs/screen-design.md#2-購入頻度商品) |
| 商品分析 | 組み合わせ商品【商品】 | ✅ 完了 | ✅ 解消済み | [詳細](./03-design-specs/screen-design.md#3-組み合わせ商品商品) |
| 購買分析 | 月別売上統計【購買】 | ✅ 完了 | ✅ 解消済み | [詳細](./03-design-specs/screen-design.md#4-月別売上統計購買) |
| 購買分析 | 購入回数【購買】 | ✅ 完了 | 🟡 軽微 | [詳細](./03-design-specs/screen-design.md#5-購入回数購買) |
| 購買分析 | F階層傾向【購買】 | ✅ 完了 | ✅ 解消済み | [詳細](./03-design-specs/screen-design.md#6-f階層傾向購買) |
| 顧客分析 | 顧客購買【顧客】 | ✅ 完了 | 🟡 軽微 | [詳細](./03-design-specs/screen-design.md#7-顧客購買顧客) |
| 顧客分析 | 休眠顧客【顧客】 | ✅ 完了 | ✅ 解消済み | [詳細](./03-design-specs/screen-design.md#8-休眠顧客顧客) |

### 🔧 **技術基盤**
- **フレームワーク**: Next.js 15.2.4 + React 19 + TypeScript 5
- **状態管理**: Zustand（AppContext廃止済み）
- **UI**: Tailwind CSS + shadcn/ui
- **技術的負債**: 90%解消済み

---

## 📖 ドキュメント利用ガイド

### 👨‍💻 **開発者向け**
1. **初回セットアップ**: [setup-guide.md](./04-development/setup-guide.md)
2. **システム理解**: [system-architecture.md](./02-architecture/system-architecture.md)
3. **画面仕様確認**: [screen-design.md](./03-design-specs/screen-design.md)
4. **技術的負債**: [technical-debt.md](./02-architecture/technical-debt.md)

### 📊 **プロジェクトマネージャー向け**
1. **プロジェクト状況**: [project-status.md](./01-project-management/project-status.md)
2. **バックログ管理**: [backlog-management.md](./01-project-management/backlog-management.md)
3. **技術的負債状況**: [technical-debt.md](./02-architecture/technical-debt.md)

### 🚀 **運用チーム向け**
1. **デプロイ手順**: [deployment-guide.md](./05-operations/deployment-guide.md)
2. **システム構成**: [system-architecture.md](./02-architecture/system-architecture.md)

### 🎨 **デザイナー向け**
1. **画面設計**: [screen-design.md](./03-design-specs/screen-design.md)
2. **UI仕様**: [system-architecture.md](./02-architecture/system-architecture.md)

---

## 🔄 ドキュメント更新ルール

### 更新頻度
- **週次**: プロジェクト状況
- **月次**: バックログ管理、技術的負債
- **四半期**: システムアーキテクチャ
- **必要時**: セットアップガイド、デプロイガイド
- **機能追加時**: 画面設計

### 更新担当
- **プロジェクト状況**: プロジェクトリーダー
- **技術系ドキュメント**: テックリード
- **設計系ドキュメント**: 機能担当者
- **運用系ドキュメント**: DevOpsチーム

### 品質管理
- 全ドキュメントはMarkdown形式で統一
- 図表はMermaid、画像は相対パスで管理
- リンク切れの定期チェック（月次）
- 最終更新日の明記必須

---

## 🆘 サポート・お問い合わせ

### 技術的な質問
- **システム設計**: [system-architecture.md](./02-architecture/system-architecture.md) を参照
- **セットアップ**: [setup-guide.md](./04-development/setup-guide.md) を参照
- **技術的負債**: [technical-debt.md](./02-architecture/technical-debt.md) を参照

### プロジェクト関連
- **進捗確認**: [project-status.md](./01-project-management/project-status.md) を参照
- **要望管理**: [backlog-management.md](./01-project-management/backlog-management.md) を参照

### 緊急時対応
- **障害対応**: [deployment-guide.md](./05-operations/deployment-guide.md#トラブルシューティング) を参照

---

## 📝 変更履歴

| 日付 | 変更内容 | 担当者 |
|---|---|---|
| 2025-01-10 | インフラ・コスト管理ドキュメント追加（06セクション） | AI Assistant |
| 2025-06-16 | ドキュメント構造整理・統合・README作成 | AI Assistant |
| 2025-06-04 | プロジェクト状況ドキュメント更新 | AI Assistant |
| 2025-05-25 | システムアーキテクチャドキュメント更新 | AI Assistant |

---

*最終更新: 2025年1月10日*
*作成者: AI Assistant*
*次回レビュー: 2025年2月10日（月次）* 