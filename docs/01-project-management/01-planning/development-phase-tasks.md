# 開発フェーズタスク管理ドキュメント

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant & プロダクトマネージャー
- **バージョン**: v1.0
- **目的**: バックエンドAPI実装とインフラ構築の詳細タスク管理
- **関連**: `project-status.md`、`backlog-management.md`

> ⚠️ **緊急開発対応**: 迅速な実装が必要な場合は [`rapid-development-plan.md`](./rapid-development-plan.md) を参照してください。
> 前年同月比分析と休眠顧客分析の2画面を2週間で80点実装する計画です。

---

## 🎯 開発フェーズ概要

### 目標
- **期間**: 2025年7月〜9月（約9週間）
- **リリース日**: 2025年9月末
- **対象機能**: 初期リリース4機能（前年同月比、F階層傾向、休眠顧客、組み合わせ商品）

### 前提条件
- ✅ フロントエンド8機能のモック実装完了
- ✅ UI/UXデザイン統一完了
- ✅ 技術スタック決定（Next.js + ASP.NET Core + Azure）

---

## 📊 Phase 0: 基盤構築（1-2週間）

### タスク一覧

#### SHOP-001: Shopify Partner開発環境構築
```yaml
タスク番号: SHOP-001
タイトル: Shopify Partner開発環境構築
優先度: Critical 🔴
見積工数: 3日
担当: インフラ/バックエンド
前提条件: なし

実施内容:
  1. Shopify Partnerアカウント作成
     - パートナー申請
     - 承認待ち（1-2営業日）
  
  2. Development Store作成
     - ストア名: shopify-ai-marketing-dev
     - プラン: Development (無料)
     - 地域: 日本
  
  3. テストデータ投入
     - 商品: 100件（カテゴリ別）
     - 顧客: 50件（セグメント別）
     - 注文: 1000件（過去2年分）
     - スクリプト作成・実行
  
  4. Custom App作成
     - アプリ名: AI Marketing Suite Dev
     - 権限設定:
       * read_all_orders
       * read_products
       * read_customers
       * read_reports
     - Webhook設定

成功条件:
  - APIキー・シークレット取得完了
  - GraphQL APIでデータ取得確認
  - テストデータの整合性確認

成果物:
  - 環境構築手順書
  - APIアクセス情報（Key Vaultに格納）
  - テストデータ生成スクリプト
```

#### INFRA-001: Azure開発環境構築
```yaml
タスク番号: INFRA-001
タイトル: Azure開発環境構築
優先度: Critical 🔴
見積工数: 2日
担当: インフラ
前提条件: Azureアカウント作成済み

実施内容:
  1. Resource Group作成
     - 名前: rg-shopify-ai-marketing-dev
     - リージョン: Japan East
  
  2. Azure SQL Database構築
     - サーバー名: sql-shopify-ai-dev
     - DB名: ShopifyAIMarketing
     - プラン: Basic (5 DTU)
     - バックアップ: 自動設定
  
  3. Azure App Service構築
     - 名前: app-shopify-ai-api-dev
     - プラン: B1 (Basic)
     - OS: Windows
     - Runtime: .NET 8
  
  4. Key Vault設定
     - 名前: kv-shopify-ai-dev
     - シークレット登録:
       * Shopify API Key
       * DB Connection String
       * JWT Secret
  
  5. Application Insights設定
     - 名前: ai-shopify-ai-dev
     - ログレベル: Information

成功条件:
  - 全リソース作成完了
  - ネットワーク疎通確認
  - コスト見積もり作成

成果物:
  - インフラ構成図
  - ARM テンプレート
  - 環境変数一覧
```

---

## 📊 Phase 1: バックエンドAPI基本実装（2週間）

### タスク一覧

#### API-001: .NET 8 Web APIプロジェクト構築
```yaml
タスク番号: API-001
タイトル: .NET 8 Web APIプロジェクト構築
優先度: High 🟠
見積工数: 1日
担当: バックエンド
前提条件: 開発環境準備完了

実施内容:
  1. ソリューション構造作成
     ShopifyAIMarketing/
     ├── src/
     │   ├── API/                    # Web APIプロジェクト
     │   ├── Application/            # ビジネスロジック
     │   ├── Domain/                 # ドメインモデル
     │   ├── Infrastructure/         # 外部連携
     │   └── Shared/                 # 共通ライブラリ
     └── tests/
         ├── UnitTests/
         └── IntegrationTests/
  
  2. 基本設定
     - Entity Framework Core 8.0
     - AutoMapper
     - Serilog
     - FluentValidation
     - MediatR (CQRS)
  
  3. Swagger設定
     - API仕様書自動生成
     - 認証対応
     - 環境別設定
  
  4. 認証設定
     - JWT Bearer認証
     - Shopify HMAC検証
  
  5. CI/CD基本設定
     - GitHub Actions
     - Azure DevOps Pipeline

成功条件:
  - dotnet run で起動確認
  - https://localhost:5001/swagger 表示
  - ヘルスチェックエンドポイント動作

成果物:
  - プロジェクトテンプレート
  - 開発環境セットアップ手順書
  - CI/CD設定ファイル
```

#### API-002: Shopify API連携サービス実装
```yaml
タスク番号: API-002
タイトル: Shopify API連携サービス実装
優先度: High 🟠
見積工数: 3日
担当: バックエンド
前提条件: API-001完了、SHOP-001完了

実施内容:
  1. ShopifyService基盤実装
     - IShopifyService インターフェース
     - 依存性注入設定
     - 設定管理（IOptions）
  
  2. GraphQL Client実装
     - GraphQL.Client 導入
     - クエリビルダー実装
     - レスポンスマッピング
  
  3. 認証処理
     - OAuth 2.0フロー
     - アクセストークン管理
     - リフレッシュ処理
  
  4. API実装
     - GetProducts(filter, pagination)
     - GetOrders(dateRange, status)
     - GetCustomers(segment)
     - GetOrderDetails(orderId)
  
  5. エラーハンドリング
     - Polly によるリトライ
     - サーキットブレーカー
     - カスタム例外

成功条件:
  - 単体テスト全パス
  - 実際のShopifyデータ取得確認
  - エラー時の適切な処理

成果物:
  - ShopifyService実装
  - GraphQLクエリ集
  - 単体テストコード
```

#### DB-001: データベース設計・実装
```yaml
タスク番号: DB-001
タイトル: 基本テーブル設計・実装
優先度: High 🟠
見積工数: 2日
担当: バックエンド
前提条件: INFRA-001完了

実施内容:
  1. ERD作成
     - 概念設計
     - 論理設計
     - 物理設計
  
  2. 基本テーブル設計
     Products:
       - ProductId (PK)
       - ShopifyProductId
       - Name, Category, Price
       - CreatedAt, UpdatedAt
     
     Customers:
       - CustomerId (PK)
       - ShopifyCustomerId
       - Email, Name
       - Segment, TotalSpent
     
     Orders:
       - OrderId (PK)
       - ShopifyOrderId
       - CustomerId (FK)
       - OrderDate, TotalAmount
     
     OrderItems:
       - OrderItemId (PK)
       - OrderId (FK)
       - ProductId (FK)
       - Quantity, Price
  
  3. 分析用テーブル
     - YearOverYearAnalysis
     - CustomerSegmentAnalysis
     - ProductFrequencyAnalysis
     - MarketBasketAnalysis
  
  4. インデックス設計
     - パフォーマンス最適化
     - 複合インデックス
  
  5. マイグレーション作成
     - Initial Migration
     - Seed データ

成功条件:
  - マイグレーション成功
  - パフォーマンステスト合格
  - 制約・インデックス動作確認

成果物:
  - ERD図
  - DDLスクリプト
  - EF Coreマイグレーション
```

---

## 📊 Phase 2: 機能別API実装（3週間）

### 初期リリース4機能のAPI実装

#### FEAT-001: 前年同月比分析API
```yaml
タスク番号: FEAT-001
タイトル: 前年同月比分析API実装
優先度: Medium 🟡
見積工数: 3日
担当: バックエンド
前提条件: API-002, DB-001完了

実施内容:
  1. ビジネスロジック実装
     - 前年同月データ抽出
     - 比較計算ロジック
     - 成長率・減少率算出
     - トレンド分析
  
  2. データ集計最適化
     - SQLクエリ最適化
     - インメモリキャッシュ
     - バックグラウンド集計
  
  3. APIエンドポイント
     GET /api/analytics/year-over-year
     - Query Parameters:
       * year: 対象年
       * month: 対象月
       * categoryId: カテゴリ絞り込み
       * limit: 表示件数
  
  4. レスポンス設計
     {
       "period": "2025-06",
       "comparison": "2024-06",
       "totalGrowthRate": 15.3,
       "products": [
         {
           "productId": "123",
           "name": "商品A",
           "currentSales": 50000,
           "previousSales": 40000,
           "growthRate": 25.0,
           "trend": "increasing"
         }
       ]
     }

成功条件:
  - 2秒以内のレスポンス
  - 1000商品でのテスト合格
  - 計算精度99.9%以上

成果物:
  - API仕様書
  - パフォーマンステスト結果
  - 統合テストコード
```

#### FEAT-002: F階層傾向分析API
```yaml
タスク番号: FEAT-002
タイトル: F階層分析API実装
優先度: Medium 🟡
見積工数: 5日
担当: バックエンド
前提条件: DB-001完了

実施内容:
  1. RFM分析エンジン実装
     - Recency計算
     - Frequency計算
     - Monetary計算
     - スコアリングロジック
  
  2. F階層定義
     - F1: 初回購入（1回）
     - F2: リピーター（2-3回）
     - F3: ロイヤル（4-9回）
     - F4: VIP（10回以上）
  
  3. 時系列分析
     - 月次推移計算
     - 階層間移動分析
     - 将来予測モデル
  
  4. バッチ処理設計
     - 日次集計ジョブ
     - 差分更新処理
     - エラーリカバリ
  
  5. APIエンドポイント
     GET /api/analytics/f-tier-trend
     - Query Parameters:
       * startDate: 開始日
       * endDate: 終了日
       * interval: month/quarter

成功条件:
  - 5000顧客で3秒以内
  - バッチ処理30分以内
  - 階層判定精度100%

成果物:
  - RFM分析仕様書
  - バッチ処理設計書
  - 負荷テスト結果
```

#### FEAT-003: 休眠顧客分析API
```yaml
タスク番号: FEAT-003
タイトル: 休眠顧客分析API実装
優先度: Medium 🟡
見積工数: 3日
担当: バックエンド
前提条件: API-002完了

実施内容:
  1. 休眠判定ロジック
     - 最終購入日からの経過日数
     - 購入頻度との相関
     - 季節性考慮
  
  2. セグメント分類
     - 要注意: 60-89日
     - 休眠: 90-179日
     - 離脱: 180日以上
  
  3. 復帰可能性スコア
     - 過去の購買パターン
     - 顧客属性
     - 機械学習モデル（簡易版）
  
  4. 推奨アクション生成
     - セグメント別施策
     - パーソナライズ要素
     - 優先順位付け
  
  5. APIエンドポイント
     GET /api/analytics/dormant-customers
     POST /api/analytics/dormant-customers/actions

成功条件:
  - 判定精度95%以上
  - アクション提案の妥当性
  - リアルタイム処理

成果物:
  - 休眠判定アルゴリズム
  - 施策テンプレート
  - A/Bテスト設計
```

#### FEAT-004: マーケットバスケット分析API
```yaml
タスク番号: FEAT-004
タイトル: バスケット分析API実装
優先度: Medium 🟡
見積工数: 4日
担当: バックエンド
前提条件: DB-001完了

実施内容:
  1. アソシエーション分析
     - Aprioriアルゴリズム実装
     - FP-Growth実装（高速版）
     - 最小支持度: 1%
  
  2. 指標計算
     - Support（支持度）
     - Confidence（確信度）
     - Lift（リフト値）
     - Conviction（確信度）
  
  3. フィルタリング
     - カテゴリ除外
     - 季節商品考慮
     - 価格帯フィルタ
  
  4. 推奨ロジック
     - クロスセル候補
     - バンドル提案
     - 在庫連動
  
  5. APIエンドポイント
     GET /api/analytics/market-basket
     GET /api/analytics/product-recommendations/{productId}

成功条件:
  - 10万トランザクションで5秒以内
  - 妥当な組み合わせ提案
  - リフト値2.0以上の発見

成果物:
  - アルゴリズム実装
  - パフォーマンスチューニング結果
  - 組み合わせ検証レポート
```

---

## 📊 Phase 3: 統合・最適化（2週間）

### タスク一覧

#### INT-001: フロントエンド・バックエンド統合
```yaml
タスク番号: INT-001
タイトル: API統合・モックデータ置換
優先度: Normal 🟢
見積工数: 5日
担当: フロントエンド
前提条件: FEAT-001〜004完了

実施内容:
  1. API クライアント実装
     - Axios設定
     - 型定義生成（OpenAPI）
     - エラーハンドリング
  
  2. 状態管理更新
     - Zustand統合
     - キャッシュ戦略
     - 楽観的更新
  
  3. モックデータ削除
     - 段階的置き換え
     - フィーチャーフラグ
     - A/Bテスト準備
  
  4. UI調整
     - ローディング状態
     - エラー表示
     - 空状態
  
  5. E2Eテスト
     - Cypress設定
     - 主要シナリオ
     - CI統合

成功条件:
  - 全画面実データ表示
  - エラー時の適切な表示
  - パフォーマンス維持

成果物:
  - APIクライアントライブラリ
  - E2Eテストスイート
  - 統合テスト結果
```

#### OPT-001: パフォーマンス最適化
```yaml
タスク番号: OPT-001
タイトル: システム全体最適化
優先度: Normal 🟢
見積工数: 3日
担当: フルスタック
前提条件: INT-001完了

実施内容:
  1. データベース最適化
     - スロークエリ分析
     - インデックス追加
     - クエリプラン最適化
  
  2. API最適化
     - レスポンス圧縮
     - ページネーション
     - GraphQLクエリ最適化
  
  3. フロントエンド最適化
     - コード分割
     - 画像最適化
     - バンドルサイズ削減
  
  4. インフラ最適化
     - CDN設定（Azure Front Door）
     - キャッシュポリシー
     - 自動スケーリング
  
  5. 監視設定
     - APM設定
     - アラート設定
     - ダッシュボード作成

成功条件:
  - 全API 2秒以内
  - Lighthouse スコア90以上
  - 同時接続100ユーザー対応

成果物:
  - パフォーマンステスト結果
  - 最適化レポート
  - 監視ダッシュボード
```

---

## 📊 Phase 4: デプロイ・運用準備（1週間）

### タスク一覧

#### PROD-001: Azure本番環境構築
```yaml
タスク番号: PROD-001
タイトル: Azure本番環境構築
優先度: Low ⚪
見積工数: 2日
担当: インフラ
前提条件: OPT-001完了

実施内容:
  1. 本番リソース作成
     - Resource Group: rg-shopify-ai-marketing-prod
     - App Service: P1v3
     - SQL Database: S2
     - Redis Cache追加
  
  2. セキュリティ設定
     - VNet統合
     - Private Endpoint
     - WAF設定
     - DDoS Protection
  
  3. 高可用性設定
     - Traffic Manager
     - 複数リージョン
     - 自動フェイルオーバー
  
  4. バックアップ設定
     - DB自動バックアップ
     - PITR設定
     - Blob Storage連携
  
  5. 監視・アラート
     - Log Analytics
     - カスタムメトリクス
     - アラートルール

成功条件:
  - 可用性99.9%設計
  - セキュリティスキャン合格
  - DR訓練成功

成果物:
  - 本番環境構成図
  - 運用手順書
  - DR計画書
```

#### DEPLOY-001: 初回本番デプロイ
```yaml
タスク番号: DEPLOY-001
タイトル: 初回本番デプロイ
優先度: Low ⚪
見積工数: 1日
担当: DevOps
前提条件: PROD-001完了

実施内容:
  1. リリース準備
     - リリースノート作成
     - 承認プロセス
     - ロールバック計画
  
  2. デプロイ実施
     - Blue-Greenデプロイ
     - データベースマイグレーション
     - 設定値確認
  
  3. DNS・SSL設定
     - カスタムドメイン
     - SSL証明書（Let's Encrypt）
     - DNSレコード設定
  
  4. 動作確認
     - スモークテスト
     - 負荷テスト
     - セキュリティテスト
  
  5. 切り替え作業
     - トラフィック切り替え
     - 旧環境停止
     - 監視確認

成功条件:
  - ゼロダウンタイムデプロイ
  - 全機能正常動作
  - パフォーマンス基準達成

成果物:
  - デプロイ手順書
  - チェックリスト
  - 運用引き継ぎ資料
```

---

## 📋 プロジェクト管理

### スプリント計画
| スプリント | 期間 | 内容 | 主要成果物 |
|---|---|---|---|
| Sprint 1 | Week 1-2 | Phase 0: 基盤構築 | 開発環境完成 |
| Sprint 2 | Week 3-4 | Phase 1: API基本実装 | 基本API動作 |
| Sprint 3 | Week 5-6 | Phase 2: 機能API（前半） | 2機能API完成 |
| Sprint 4 | Week 7-8 | Phase 2: 機能API（後半）+ Phase 3 | 全機能統合完了 |
| Sprint 5 | Week 9 | Phase 4: デプロイ | 本番環境稼働 |

### リスク管理
| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| Shopify API制限 | 高 | 中 | キャッシュ戦略、バッチ処理 |
| パフォーマンス問題 | 高 | 中 | 早期負荷テスト、段階的最適化 |
| Azure コスト超過 | 中 | 低 | 日次監視、アラート設定 |
| 開発遅延 | 高 | 中 | バッファ確保、MVP優先 |

### コミュニケーション計画
- **日次**: スタンドアップ（15分）
- **週次**: スプリントレビュー（1時間）
- **隔週**: ステークホルダー報告（30分）
- **Slack**: #shopify-ai-dev チャンネル
- **ドキュメント**: Confluenceで管理

---

## 🚀 次のアクション

### 今週（2025年7月21日〜）の優先タスク
1. ✅ **本ドキュメント承認**
2. 🔄 **SHOP-001開始**: Shopify Partner申請
3. 🔄 **INFRA-001開始**: Azure環境準備
4. 📅 **キックオフMTG**: 開発チーム全体会議

### 成功のための重要ポイント
1. **段階的リリース**: MVP優先で確実に
2. **継続的テスト**: 品質を犠牲にしない
3. **定期的な振り返り**: 改善サイクル確立
4. **ドキュメント更新**: 知識の共有と継承

---

*最終更新: 2025年7月20日*
*次回更新: Sprint 1完了時（Week 2終了時）* 