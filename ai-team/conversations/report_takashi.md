# Takashi からの報告書

## 更新履歴

### 2025-09-06: Quick Ship Tracker バックエンド実装

#### 実装完了内容

##### 1. プロジェクト構造の作成 ✅
- **QuickShipTracker.sln** - ソリューションファイル
- **QuickShipTracker.Api** - Web APIプロジェクト (.NET 8.0)
- **QuickShipTracker.Core** - ビジネスロジック層
- **QuickShipTracker.Data** - データアクセス層

##### 2. データモデルとEntity Framework ✅
**Core Models**
- Shop (ストア情報)
- Order (注文情報)
- TrackingInfo (配送追跡)
- BillingPlan (料金プラン)

**DTOs完備**
- 認証、注文、追跡、課金用のDTO一式

##### 3. REST API実装 ✅
**認証** (`AuthController`)
- OAuth認証フロー
- JWT トークン発行
- セッション管理

**注文管理** (`OrdersController`)
- 注文一覧/詳細取得
- ページング/検索対応

**配送追跡** (`TrackingController`)
- トラッキング情報CRUD
- 一括登録機能
- プラン制限チェック

**課金** (`BillingController`)
- 3つの料金プラン (Free/Basic/Pro)
- 使用量追跡
- Shopify Billing API統合

**Webhooks** (`WebhookController`)
- GDPR必須Webhook対応
- 署名検証実装

##### 4. セキュリティ実装 ✅
- JWT Bearer認証
- CSRF防止 (state parameter)
- Webhook署名検証
- セキュリティヘッダー
- CORS設定

##### 5. 技術仕様
```
Framework: ASP.NET Core 8.0
Database: SQLite (EF Core 8.0.8)
Shopify: ShopifySharp 6.18.0
API Docs: Swagger/OpenAPI
```

#### ビルド状態
✅ **ビルド成功** - 警告2件のみ

#### アクセス情報
- API: https://localhost:5001
- Swagger: https://localhost:5001/swagger

---

### 2025-08-25: バックエンドコンパイルエラー修正

#### 実施内容
バックエンドのコンパイルエラーを修正しました。

#### 修正内容

##### 1. StoreSubscriptionモデルへのPlanNameプロパティ追加
**ファイル**: `backend/ShopifyAnalyticsApi/Models/WebhookModels.cs`
- StoreSubscriptionクラスにPlanNameプロパティ（string?型）を追加
- WebhookController.csで使用されていたプロパティの不足を解消

##### 2. StoreモデルへのShopifyUrlプロパティ追加
**ファイル**: `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs`
- ShopifyUrlプロパティを計算プロパティとして追加（Domainプロパティのエイリアス）
- FeatureSelectionService.csで使用されていたプロパティの不足を解消

##### 3. AvailableFeatureの型エラー修正
**ファイル**: 
- `backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs`
- `backend/ShopifyAnalyticsApi/Services/FeatureSelectionService.cs`
- `backend/ShopifyAnalyticsApi.Tests/Services/FeatureSelectionServiceTests.cs`

AvailableFeatureはenumではなくクラスとして定義されているため、以下の修正を実施：
- Enum.GetValues<AvailableFeature>()をFeatureConstants.FreeSelectableFeaturesを使用した実装に変更
- Enum.TryParse<AvailableFeature>()をFeatureConstants.IsValidFeature()を使用した実装に変更
- テストコードのAvailableFeature.Analyticsなどの参照を適切なインスタンス生成に変更

##### 4. テストコードの修正
**ファイル**: `backend/ShopifyAnalyticsApi.Tests/Services/FeatureSelectionServiceTests.cs`
- ShopifyUrlプロパティへの直接代入を削除（読み取り専用プロパティのため）

#### ビルド結果
```
0 エラー
16 個の警告
```
すべてのコンパイルエラーが解消されました。

#### 注意事項
- 警告は残っていますが、ビルドは成功しています
- 主な警告はnull参照に関するものが多く、今後のコード品質改善で対応可能です

## 2025-09-17 22:52 進捗（GDPR/課金/DBマイグレーション）

- GDPR Webhook 実装確認（`backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs`）
  - HMAC検証あり、各エンドポイントは即時200返却で5秒ルール対応
  - 監査ログ: `LogWebhookEvent`で`WebhookEvents`に記録（ただし`IdempotencyKey`未設定）
  - 冪等性: `GDPRService.CreateRequestAsync`で`IdempotencyKey`生成→`GDPRRequests`ユニーク制約で重複排除
  - 本番非同期: 削除/エクスポートはTODOコメント（Hangfire/Queueでのスケジュール未実装）

- app/uninstalled 連動（課金キャンセル）
  - 現状: `CancelStoreSubscription`はローカルDBの`StoreSubscriptions`のみCANCELLEDに更新
  - 不足: Shopify側への`appSubscriptionCancel`呼び出しなし（`ShopifySubscriptionService.CancelSubscription`未使用）

- 課金/Billing統合
  - `BillingController`/`SubscriptionController`/`ShopifySubscriptionService`のAPIは揃っており、Confirm用`/api/subscription/confirm`も実装済み
  - `CreateSubscription`はGraphQLで`confirmationUrl`を取得→ローカルは`pending`で保存
  - Webhook `subscriptions-update|cancel`でローカル状態を更新

- DBマイグレーション支援
  - 追跡: `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md` の更新前提
  - 福田さんがStaging適用担当。適用後の検証（サブスク/Feature選択/GDPRテーブル）をこちらで実施予定

### 提案（実装は承認後）
1) `app/uninstalled`で`ShopifySubscriptionService.CancelSubscriptionAsync`を利用しShopify側も確実にキャンセル
2) `LogWebhookEvent`に`IdempotencyKey`設定（`ShopDomain + Topic + created_at`等）で重複記録防止
3) HangfireでGDPR`pending`処理の定期実行（例: 5分毎）と`Overdue`警告
4) HMAC比較は固定時間比較へ（`CryptographicOperations.FixedTimeEquals`）

### 次アクション
- Kenji承認後、上記1)→2)→3)の順でPR分割実装します（テスト含む）

### 2025-09-17 23:47 進捗報告（方針順守・実装完了項目）
- 実装（承認済み内容に基づく）
  - WebhookController:
    - HMAC固定時間比較・失敗403化
    - app/uninstalledで`ISubscriptionService.CancelSubscriptionAsync`呼出し（Shopify/ローカル冪等）
    - `WebhookEvents.IdempotencyKey`生成・重複抑止
  - Hangfire:
    - `GdprProcessingJob`を追加し`*/5`分で`ProcessPendingRequests`登録
- リンター: 新規エラーなし
- 次: 課金E2E前提確認（確認URL→`/api/subscription/confirm`、環境値の最終チェック、コレクション更新）

### 2025-09-17 23:59 追記（Billing E2E資材）
- 追加: `backend/ShopifyAnalyticsApi/Tests/Billing-Flow.http`
- 観点: 確認URL発行→承認→/api/subscription/confirm→status/history→change/cancel→再確認
- 次: Staging値（NEXT_PUBLIC_API_URL/AppUrl/WebhookSecret）で動作確認、コレクションに環境・フォルダ分割

## 2025-09-18 00:09 進捗（実装完了・次ステップ）

- 実装済: app/uninstalledキャンセル連動 / WebhookEvents.IdempotencyKey / HMAC固定時間比較 / GDPR Hangfire登録
- 資材: Webhook/Billingの.http と 手順md を追加
- 次: 指定シナリオでStaging検証 → 結果と分割PRリンクを本ファイルへ記載

## 2025-09-18 00:11 Staging検証（ドラフト）
- 対象: Webhook（正常/重複/順不同/403）、Billing（subscribe→confirm→status/history→change→cancel）
- 環境: `https://stg-api.ec-ranger.example.com`（AppUrl/NEXT_PUBLIC_API_URL整合）、WebhookSecret=Staging値
- 手順資材:
  - `backend/ShopifyAnalyticsApi/Tests/Webhook-Idempotency.http`
  - `docs/00-production-release/test-procedures/webhook-idempotency-test-guide.md`
  - `backend/ShopifyAnalyticsApi/Tests/Billing-Flow.http`

### 結果
- Webhook（customers-redact, app/uninstalled, customers-data-request）: [実行予定]
- 監査ログ重複抑止（IdempotencyKeyユニーク）: [実行予定]
- HMAC不正/欠落403・副作用なし: [実行予定]
- Hangfire停止/再起動の追従処理: [実行予定]
- Billing確認URL→/api/subscription/confirm→status/history→change/cancel: [実行予定]

### 分割PRリンク
- PR#1: uninstalledでCancelSubscriptionAsync呼出し … [リンク]
- PR#2: WebhookEvents.IdempotencyKey付与と重複抑止 … [リンク]
- PR#4: HMAC FixedTimeEquals/403対応 … [リンク]
- PR#3: GDPR Hangfire（*/5分） … [リンク]

## 2025-09-18 00:30 実装完了・検証ハンドオフ
- 実装完了項目
  - Webhook: HMAC固定時間比較/403、IdempotencyKey付与・重複抑止、必須ヘッダ検証、Topic許可、サイズ上限、構造化ログ（RequestId/CorrelationId/latencyMs）
  - Billing: E2E資材（.http）追加、確認URL→/api/subscription/confirmの検証手順準備
  - GDPR: Hangfire定期実行（*/5分）追加、pending処理実装
  - 運用: 監視KQL/アラート手順、リプレイ手順ドキュメント追加
  - Hangfire: ワーカー並列1へ調整
- 残作業（検証・運用）
  - Staging指定シナリオの実行と結果記録（Webhook正常/重複/順不同/403、Billing subscribe→confirm→status/history→change→cancel、GDPR pending）
  - 分割PRリンクの作成・記載（#1, #2, #4, #3）
  - Postman/Insomniaコレクション（環境付き）の共有
- 担当引き継ぎ
  - 検証担当: 福田さん
  - 参照資料:
    - `backend/ShopifyAnalyticsApi/Tests/Webhook-Idempotency.http`
    - `backend/ShopifyAnalyticsApi/Tests/Billing-Flow.http`
    - `docs/00-production-release/test-procedures/webhook-idempotency-test-guide.md`
    - `docs/00-production-release/monitoring/app-insights-kql-and-alerts.md`
    - `docs/00-production-release/operations/webhook-gdpr-replay-procedure.md`