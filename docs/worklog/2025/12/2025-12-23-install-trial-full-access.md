# 作業ログ: インストール直後トライアルで全機能アクセス（案1）

## 作業情報
- 開始日時: 2025-12-23 14:23:15
- 完了日時: 2025-12-23 14:24:09
- 所要時間: 約1分
- 担当: 福田＋AI Assistant

## 作業概要
インストール直後（OAuth完了直後）に `trialing` サブスクリプションを自動付与し、無料プランでも一定期間は全機能にアクセスできるようにした。

## 実施内容
1. OAuth完了時に `StoreSubscriptions` へ `trialing` レコードを自動作成（既存があればスキップ）
2. 機能ゲート（`FeatureAccessMiddleware`）で `trialing` を「有料相当」として全機能許可
3. `GET /api/subscription/status` が `trialing` を有効扱いで返すように修正（フロントの planId 互換も付与）
4. `FeatureSelectionService` が `trialing` を有料相当として扱うように修正
5. 既存テストの不正キャスト（TaskをRedirectResultにキャスト）を修正し、`dotnet build` が通ることを確認

## 成果物
- backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs
  - OAuth完了時にトライアルサブスクを付与する `EnsureTrialSubscriptionAsync` を追加
- backend/ShopifyAnalyticsApi/Middleware/FeatureAccessMiddleware.cs
  - `trialing` を有料相当として許可
- backend/ShopifyAnalyticsApi/Controllers/SubscriptionController.cs
  - `trialing` を status で返却、フロント互換の `planId` を付与（trialing は professional 相当）
- backend/ShopifyAnalyticsApi/Services/FeatureSelectionService.cs
  - `trialing` を有料相当として扱う
- backend/ShopifyAnalyticsApi.Tests/Controllers/ShopifyAuthControllerTests.cs
  - async/await に修正してビルドエラーを解消

## 課題・注意点
- `StoreSubscription.IsInTrialPeriod` が `Status == "active"` 依存のため、将来的に `trialing` と整合を取る余地あり
- `SubscriptionPlans` に有効プランが存在しない場合はトライアル作成をスキップする（ログ出力あり）
- フロント側の feature-selection/current のレスポンス形状は別途整合が必要な可能性あり

## 関連ファイル
- backend/ShopifyAnalyticsApi/Middleware/FeatureAccessMiddleware.cs
- backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs
- backend/ShopifyAnalyticsApi/Controllers/SubscriptionController.cs
- backend/ShopifyAnalyticsApi/Services/FeatureSelectionService.cs
- backend/ShopifyAnalyticsApi.Tests/Controllers/ShopifyAuthControllerTests.cs


