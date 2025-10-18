# PM-001 Requirements Document - EC Ranger (Shopify AI Marketing Suite)

**Version**: v0.1
**作成日時**: 2025-10-06 12:47:17
**作成者**: AI Project Assistant
**ステータス**: Draft

## 1. 概要

### 1.1 プロジェクト概要
EC Ranger（旧Shopify AI Marketing Suite）は、Shopifyストア向けの高度な分析・マーケティング支援アプリケーションです。AIを活用した顧客分析、売上予測、マーケティング最適化機能を提供し、EC事業者の売上向上と業務効率化を支援します。

### 1.2 スコープ
- Shopifyストアのデータ分析機能
- 顧客セグメンテーションと行動分析
- 売上傾向と予測分析
- マーケティング施策の効果測定
- データエクスポート機能

### 1.3 非スコープ
- 在庫管理機能
- 配送管理機能
- 会計・経理機能
- カスタマーサポート機能
- SNSマーケティング自動化

## 2. 利害関係者とユーザータイプ

### 2.1 主要な利害関係者
| 名前/役割 | 関心事項 | 影響度 |
|----------|---------|--------|
| 福田 浩之（プロダクトオーナー） | プロジェクト全体の成功、ROI | 🔴高 |
| Kenji（プロジェクトマネージャー） | スケジュール、品質、チーム連携 | 🔴高 |
| Yuki（フロントエンド開発） | UI/UX品質、技術選定 | 🟡中 |
| Takashi（バックエンド開発） | API性能、データ整合性 | 🟡中 |
| ERIS（品質管理） | コード品質、テスト網羅性 | 🟡中 |

### 2.2 ユーザータイプ
| タイプ | 説明 | 主な利用機能 |
|-------|------|------------|
| ECストアオーナー | 売上・顧客分析を行う経営者 | ダッシュボード、レポート |
| マーケティング担当者 | 施策立案・効果測定を行う担当者 | 顧客分析、セグメント機能 |
| データアナリスト | 詳細な分析を行う専門家 | エクスポート、詳細分析 |

## 3. 機能要件

| ID | 要件名 | 説明 | 優先度 | ステータス | 出典 | 関連ADR | 担当 |
|----|--------|------|--------|-----------|------|---------|------|
| FR-001 | Shopify OAuth認証 | Shopifyストアとの安全な認証連携 | 🔴高 | 完了 | 2025-08-12-oauth-authentication-breakthrough.md | - | Takashi |
| FR-002 | 休眠顧客分析（CUST-01-DORMANT） | 一定期間購入がない顧客の特定と分析 | 🔴高 | 完了 | 2025-07-24-comprehensive-dormant-customer-implementation.md | - | Yuki/Takashi |
| FR-003 | 前年同月比分析（PROD-01-YOY） | 商品売上の前年同月比較機能 | 🔴高 | 完了 | 2025-06-10-180000-year-over-year-functionality-restoration.md | - | Yuki/Takashi |
| FR-004 | 購入回数分析（PURCH-02-COUNT） | 顧客の購入回数パターン分析 | 🔴高 | 完了 | main-todo.md | - | Yuki/Takashi |
| FR-005 | 課金システム | Shopify Billing APIを使用した課金機能 | 🔴高 | 90%完了 | 2025-08-24-billing-implementation-plan.md | - | Takashi |
| FR-006 | 無料プラン機能制限 | 無料プランでの機能制限実装 | 🔴高 | 70%完了 | 2025-08-24-free-plan-implementation.md | - | Yuki/Takashi |
| FR-007 | GDPR Webhook処理 | 顧客データ削除要求への対応 | 🔴高 | 未着手 | @todo.md, 2025-08-24-development-report.md | - | Takashi |
| FR-008 | 組み合わせ商品分析（PROD-03-BASKET） | よく一緒に購入される商品の分析 | 🟡中 | モック完了 | 2025-06-03-195000-market-basket-menu-activation.md | - | Yuki |
| FR-009 | F階層傾向分析（PURCH-03-FTIER） | RFM分析のFrequency階層分析 | 🟡中 | モック完了 | 2025-06-04-180000-f-tier-trend-implementation.md | - | Yuki |
| FR-010 | 購入頻度分析（PROD-02-FREQ） | 商品別の購入頻度パターン分析 | 🟡中 | モック完了 | 2025-06-04-170000-purchase-frequency-improvements.md | - | Yuki |
| FR-011 | 月別売上統計（PURCH-01-MONTHLY） | 月次売上トレンド分析 | 🟡中 | モック完了 | 2025-06-10-204500-monthly-stats-unification.md | - | Yuki |
| FR-012 | 顧客購買分析（CUST-02-ANALYSIS） | 顧客の購買行動詳細分析 | 🟡中 | モック完了 | 2025-06-10-204500-customer-purchase-unification.md | - | Yuki |
| FR-013 | データエクスポート | CSV/Excel形式でのデータエクスポート | 🟢低 | 未着手 | project-schedule.md | - | - |
| FR-014 | メール通知 | 重要なイベントのメール通知 | 🟢低 | 未着手 | project-schedule.md | - | - |
| FR-015 | 多言語対応 | 日本語・英語対応 | 🟢低 | 未着手 | project-schedule.md | - | - |

## 4. 非機能要件

### 4.1 性能要件
| ID | 要件名 | 説明 | 基準値 | 出典 |
|----|--------|------|--------|------|
| NFR-001 | レスポンスタイム | API応答時間 | 95%が3秒以内 | docs/04-development/02-インフラ・デプロイ/azure-performance-guide.md |
| NFR-002 | 同時接続数 | 同時アクセス可能ユーザー数 | 100ユーザー | azure-performance-guide.md |
| NFR-003 | データ処理量 | バッチ処理可能データ量 | 10万件/時間 | ADR-001-hangfire-vs-azure-functions.md |

### 4.2 セキュリティ要件
| ID | 要件名 | 説明 | 実装状況 | 出典 |
|----|--------|------|----------|------|
| NFR-004 | OAuth 2.0認証 | Shopify標準認証フロー | 完了 | 2025-08-12-oauth-authentication-breakthrough.md |
| NFR-005 | データ暗号化 | 通信・保存データの暗号化 | 完了 | azure-security-best-practices.md |
| NFR-006 | GDPR準拠 | 個人データの適切な管理 | 進行中 | @todo.md |
| NFR-007 | マルチテナント分離 | ストア間のデータ分離 | 完了 | database-design.md |

### 4.3 可用性要件
| ID | 要件名 | 説明 | SLA | 出典 |
|----|--------|------|-----|------|
| NFR-008 | システム稼働率 | 月間稼働率 | 99.5% | azure-infrastructure.md |
| NFR-009 | バックアップ | データバックアップ頻度 | 日次 | azure-backup-strategy.md |
| NFR-010 | 災害復旧 | RPO/RTO | 24時間/4時間 | disaster-recovery-plan.md |

### 4.4 可観測性要件
| ID | 要件名 | 説明 | ツール | 出典 |
|----|--------|------|--------|------|
| NFR-011 | ログ管理 | アプリケーションログ収集 | Serilog + App Insights | Program.cs:45 |
| NFR-012 | メトリクス監視 | パフォーマンスメトリクス | Application Insights | azure-monitoring.md |
| NFR-013 | アラート | 異常検知とアラート | Azure Monitor | monitoring-strategy.md |

### 4.5 アクセシビリティ要件
| ID | 要件名 | 説明 | 基準 | 出典 |
|----|--------|------|------|------|
| NFR-014 | WCAG準拠 | Webアクセシビリティ基準 | WCAG 2.1 Level A | frontend/README.md |
| NFR-015 | レスポンシブデザイン | 複数デバイス対応 | モバイル対応 | UI統一化ドキュメント |

## 5. 依存関係と制約

### 5.1 技術スタック制約
| 領域 | 技術 | バージョン | 理由 |
|------|------|-----------|------|
| フロントエンド | Next.js | 15.1.0 | 最新の安定版、App Router対応 |
| フロントエンド | React | 18.2.0 | Next.js 15との互換性 |
| バックエンド | .NET | 8.0 | LTS版、Azure最適化 |
| データベース | PostgreSQL | 15+ | Azure Database for PostgreSQL |
| 認証 | Clerk | 6.12.9 | 開発環境用（将来変更予定） |

### 5.2 外部API依存
| API | 用途 | 制約 | 出典 |
|-----|------|------|------|
| Shopify Admin API | データ取得・更新 | Rate Limit: 2req/sec | Shopifyドキュメント |
| Shopify Billing API | 課金処理 | 必須実装 | billing-requirements.md |
| Shopify Webhook | リアルタイム通知 | GDPR必須 | webhook-implementation.md |

### 5.3 インフラ制約
| リソース | 制約 | 理由 | 出典 |
|---------|------|------|------|
| Azure App Service | P1v3プラン | コスト最適化 | azure-cost-optimization.md |
| Static Web Apps | Free Plan | フロントエンド配信 | deployment-strategy.md |
| Azure SQL Database | Basic Tier | 初期段階のコスト削減 | database-sizing.md |

## 6. リスクと前提条件

### 6.1 リスク
| ID | リスク内容 | 可能性 | 影響度 | 対策 | 状態 |
|----|-----------|--------|--------|------|------|
| RISK-001 | GDPR未実装による申請却下 | 高 | 🔴高 | 最優先実装 | 対応中 |
| RISK-002 | 本番環境での性能問題 | 中 | 🟡中 | 負荷テスト実施 | 未対応 |
| RISK-003 | Shopify API仕様変更 | 低 | 🟡中 | APIバージョン固定 | 対応済 |
| RISK-004 | セキュリティ脆弱性 | 中 | 🔴高 | セキュリティ監査 | 計画中 |

### 6.2 前提条件
| ID | 前提条件 | 根拠 | 検証状況 |
|----|---------|------|----------|
| ASM-001 | Shopify Plus/通常プラン両対応 | 市場要求 | 検証済 |
| ASM-002 | 日本市場優先 | ビジネス戦略 | 確定 |
| ASM-003 | 月額課金モデル | Shopify標準 | 確定 |
| ASM-004 | Azure環境利用 | 既存インフラ | 確定 |

### 6.3 仮説
| ID | 仮説内容 | 検証方法 | 状態 |
|----|---------|----------|------|
| HYP-001 | 分析機能がユーザー価値を提供 | ユーザーテスト | 未検証 |
| HYP-002 | 無料プランからの有料転換率10% | 実運用データ | 未検証 |
| HYP-003 | 月10万レコード処理で十分 | 実データ分析 | 部分検証 |

## 7. 承認履歴

| 日付 | バージョン | 承認者 | 変更内容 |
|------|-----------|--------|---------|
| 2025-10-06 | v0.1 | - | 初版作成 |

## 8. 参照資料

- [プロジェクトスケジュール](project-schedule.md)
- [アーキテクチャ設計書](../02-architecture/README.md)
- [開発ガイド](../04-development/README.md)
- [ワークログ](../worklog/2025/)
- [ADR](../02-architecture/05-ADR/)

---
*このドキュメントは定期的に更新され、プロジェクトの進行に応じて内容が変更される可能性があります。*