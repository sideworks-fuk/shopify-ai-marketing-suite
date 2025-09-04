# 2025-08-26 無料プラン機能制限API実装

## 作業者
Takashi (バックエンドエンジニア)

## 作業概要
無料プラン向けの機能制限APIを実装。3つの分析機能から1つを選択可能にする仕組みを構築。

## 実装内容

### 1. データベース設計
- マイグレーションスクリプト作成: `2025-08-26-free-plan-feature-selection.sql`
- 以下のテーブルを新規作成:
  - `FeatureLimits`: 機能制限マスタ
  - `UserFeatureSelections`: ユーザーの現在の選択状態
  - `FeatureUsageLogs`: 使用/変更/制限のログ
  - `FeatureSelectionChangeHistory`: 選択変更履歴
- ストアドプロシージャも作成（パフォーマンス最適化用）

### 2. モデルクラス実装
- `FeatureSelectionModels.cs`: 全モデルクラス定義
  - `FeatureLimit`: 制限マスタ
  - `UserFeatureSelection`: 選択状態
  - `FeatureUsageLog`: 使用ログ
  - `FeatureSelectionChangeHistory`: 変更履歴
  - DTOクラス群（Request/Response）
  - 定数クラス（`FeatureConstants`, `PlanTypes`）

### 3. サービス層実装
- `FeatureSelectionService.cs`: ビジネスロジック実装
  - 30日制限の厳密管理（UTC統一）
  - 冪等性とロック機構（楽観ロック）
  - キャッシュ戦略（5分TTL）
  - 監査ログの自動記録
  - プラン変更時の処理

### 4. API コントローラー実装
- `FeatureSelectionController.cs`: RESTful API エンドポイント
  - `GET /api/feature-selection/current`: 現在の選択状態取得
  - `POST /api/feature-selection/select`: 機能選択/変更
  - `GET /api/feature-selection/available-features`: 利用可能な機能一覧
  - `GET /api/feature-selection/usage/{feature}`: 使用状況取得
  - `GET /api/feature-selection/check-access/{feature}`: アクセス権限チェック

### 5. 依存性注入設定
- `Program.cs`に`IFeatureSelectionService`を登録
- `ShopifyDbContext`に新規DbSetを追加

## 技術的な実装詳細

### 冪等性の実装
- `X-Idempotency-Token`ヘッダーを必須化
- トークンベースの重複リクエスト防止

### 並行性制御
- `SemaphoreSlim`によるストア単位のロック
- 楽観ロック（`RowVersion`）による同時更新の検出

### エラーハンドリング
- 適切なHTTPステータスコード返却
  - 409 Conflict: 30日制限違反
  - 400 Bad Request: 無効な機能ID
  - 429 Too Many Requests: 同時リクエスト制限

### キャッシュ戦略
- 選択状態は5分間キャッシュ
- 変更時は確実にキャッシュ無効化

## 残タスク（Day 2以降）

### Day 2 (8/27)
- [ ] Webhook連携実装（APP_SUBSCRIPTIONS_UPDATE）
- [ ] ミドルウェア実装（FeatureAccessMiddleware）
- [ ] 単体テスト作成

### Day 3 (8/28)
- [ ] 統合テスト実装
- [ ] パフォーマンス最適化
- [ ] ドキュメント作成

## 注意事項
- Entity Frameworkマイグレーションの実行が必要
- 本番環境への適用前にバックアップ必須
- Application Insightsへのログ連携設定が必要

## 参考資料
- ERISさんの設計ドキュメント: `/docs/06-shopify/02-課金システム/05-無料プラン機能制限/`
- Kenjiさんからの開発指示: `to_takashi.md`

## ステータス
✅ Day 1 完了 - 基本実装完了
⏳ Day 2 待機中 - Webhook連携待ち