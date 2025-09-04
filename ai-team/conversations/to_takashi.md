# Takashiへの依頼事項
From: Kenji (PM)
Date: 2025-08-24
Priority: 最優先

## 本日の課金システム実装依頼

Takashiさん、本日は課金システムのバックエンド実装を完了させる必要があります。
以下のタスクを優先順位順に実装してください。

## 実装タスク（10:00-14:00）

### 1. GraphQL API完全実装（最優先）
既存の`SubscriptionController.cs`と`ShopifySubscriptionService.cs`を完成させてください。

**必要な実装:**
- RecurringApplicationCharge作成処理
- 課金承認URL生成
- 承認状態確認（Callback処理）
- 課金アクティベート処理

**参考:**
- `docs\06-shopify\02-課金システム\02-技術仕様\GraphQL_API最新仕様.md`
- Shopify公式ドキュメント

### 2. Webhook処理実装
以下のWebhookイベントハンドラーを実装:
- `app_subscriptions/update` - 課金状態更新
- `app_subscriptions/cancel` - キャンセル処理
- `app/uninstalled` - アプリアンインストール時の処理

**注意事項:**
- 署名検証を必ず実装
- 冪等性を考慮（重複処理防止）
- エラー時のリトライ機構

### 3. データベース処理
- StoreSubscriptionsテーブルへの保存・更新
- BillingHistoryテーブルへの履歴記録
- WebhookEventsテーブルへのイベント記録

### 4. エラーハンドリング
- Rate Limit対策（429エラー）
- ネットワークエラー時のリトライ
- 適切なログ記録

## 以前のエラー（解決済みか要確認）
### 1. StoreAwareControllerBase コンストラクターエラー
- Controllers/SubscriptionController.cs:29

### 2. ShopifyDbContext プロパティ不足
- `StoreSubscriptions`
- `SubscriptionPlans`

### 3. GetStoreId メソッド未定義
- Controllers/SubscriptionController.cs:45, 133, 239, 301, 341

## テスト要件
- 単体テストの作成（最低限の動作確認）
- Postmanでの動作確認用コレクション作成

## 成果物
1. 完成したControllerとService
2. Webhook処理クラス
3. 基本的な単体テスト
4. API動作確認結果

## 進捗報告
- 11:00 - 実装状況の中間報告
- 13:00 - 実装完了見込みの報告
- 14:00 - 完了報告とテスト結果

## 質問・ブロッカー
不明点があれば即座に連絡してください。
Yukiとの連携が必要な部分は調整します。

よろしくお願いします！

---

## 🚨 緊急：バックエンドエラー修正依頼
From: Kenji (PM)
Date: 2025-08-24 15:00

Takashiさん、バックエンドでコンパイルエラーが発生しています。
至急修正をお願いします。

### エラー内容
```
重大度レベル: エラー (アクティブ)
コード: CS0101
説明: 名前空間 'ShopifyAnalyticsApi.Models' は既に 'WebhookEvent' の定義を含んでいます
ファイル: C:\source\git-h.fukuda1207\shopify-ai-marketing-suite\backend\ShopifyAnalyticsApi\Models\WebhookModels.cs
行: 10
```

### 問題の原因
`WebhookEvent`クラスが重複定義されています：
1. `Models\WebhookEvent.cs`（新規作成）
2. `Models\WebhookModels.cs`（既存）

### 修正方法
以下のいずれかの対応をお願いします：
1. 既存の`WebhookModels.cs`の`WebhookEvent`クラスを削除
2. 新規作成した`WebhookEvent.cs`を削除して既存を使用
3. クラス名を変更して競合を解消

### 緊急度
統合テストがブロックされているため、至急の対応をお願いします。

---

## 2025年8月24日（土）- 無料プラン機能制限API実装

【開発指示 - 無料プラン機能制限バックエンド実装】

### 概要
ERISさんの文書統一が完了しました。以下の仕様で無料プラン機能制限のAPIを実装してください。

### 実装対象機能（分析3機能）
1. **休眠顧客分析** (dormant_analysis)
2. **前年同月比分析** (yoy_comparison)  
3. **購入回数詳細分析** (purchase_frequency)

### データベース設計（統一済み）
```sql
-- UserFeatureSelections: 現在の選択状態（IsActive=1はStoreId毎に1件）
-- FeatureUsageLogs: 使用/変更/制限の記録
-- FeatureLimits: 制限マスタ
-- FeatureSelectionChangeHistory: 履歴

-- マイグレーションファイル配置先
docs/04-development/03-データベース/マイグレーション/2025-08-26-free-plan-feature-selection.sql
```

### API実装仕様

#### エンドポイント
```csharp
// FeatureSelectionController.cs
[Route("api/feature-selection")]
public class FeatureSelectionController : StoreAwareControllerBase
{
    // GET /api/feature-selection/current
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentSelection()
    
    // POST /api/feature-selection/select
    [HttpPost("select")]
    public async Task<IActionResult> SelectFeature([FromBody] SelectFeatureRequest request)
    
    // GET /api/feature-selection/available-features
    [HttpGet("available-features")]
    public async Task<IActionResult> GetAvailableFeatures()
    
    // GET /api/feature-selection/usage/{feature}
    [HttpGet("usage/{feature}")]
    public async Task<IActionResult> GetFeatureUsage(string feature)
}
```

#### レスポンス型
```csharp
public class CurrentSelectionResponse
{
    public string? SelectedFeature { get; set; } // 'dormant_analysis' | 'yoy_comparison' | 'purchase_frequency' | null
    public bool CanChangeToday { get; set; }
    public DateTime NextChangeAvailableDate { get; set; } // UTC
    public UsageLimit UsageLimit { get; set; }
}

public class UsageLimit
{
    public int Remaining { get; set; }
    public int Total { get; set; }
}
```

### 必須実装要件

#### 1. 権限制御ミドルウェア
```csharp
// サーバー側で「プラン×選択機能」を必ず判定
public class FeatureAccessMiddleware
{
    // フロントからのリクエストはここで必ず検証
    // 無料プランの場合：選択された1機能のみアクセス可
    // 有料プランの場合：全機能アクセス可
}
```

#### 2. 30日制限の厳密管理
- すべてUTCで管理
- 切替判定: `lastChangeDate + 30日 <= now`
- 月初リセットではなく「30日後」

#### 3. 冪等性とロック
- POST /selectは`X-Idempotency-Token`必須
- 楽観ロック（RowVersion使用）
- 同一StoreIdからの同時POSTは単一フライト化

#### 4. 監査ログ
```csharp
// FeatureUsageLogsに記録
public class FeatureUsageLog
{
    public string EventType { get; set; } // 'change' | 'access' | 'limit_reached'
    public string? BeforeFeature { get; set; }
    public string? AfterFeature { get; set; }
    public string Result { get; set; } // 'success' | 'limited' | 'error'
    public DateTime CreatedAt { get; set; } // UTC
}
```

#### 5. エラーコード仕様
- 409 Conflict + `change_not_allowed`: 30日未満の変更
- 400 BadRequest + `invalid_feature_id`: 無効な機能ID
- 429 TooManyRequests: 同時リクエスト制限

### Shopify Webhook連携
```csharp
// APP_SUBSCRIPTIONS_UPDATE処理
public async Task HandleSubscriptionUpdate(WebhookPayload payload)
{
    if (payload.Plan == "free")
    {
        // 無料化：直近の選択機能だけ有効化
    }
    else
    {
        // 有料化：即全機能解放
    }
}
```

### キャッシュ戦略
- 選択状態は5分TTLでキャッシュ
- 変更時はサーバー側から確実に無効化
- MemoryCacheまたはRedis使用

### スケジュール
- **Day 1 (8/26)**: DB構築、基本API実装
- **Day 2 (8/27)**: ビジネスロジック、Webhook連携
- **Day 3 (8/28)**: 統合テスト、パフォーマンス最適化

### テスト要件
- 単体テスト全ケースカバレッジ70%以上
- 統合テスト：初回選択→利用→変更不可→期日後変更
- 並行性テスト：同時POST処理の検証

### 注意事項
- Entity Frameworkのマイグレーション管理
- トランザクション処理の適切な実装
- 適切なログ出力（Application Insights連携）

### 進捗報告
- 毎日report_takashi.mdに進捗を記載
- ブロッカーは即座にto_kenji.mdへ

参考資料:
- `/docs/06-shopify/02-課金システム/05-無料プラン機能制限/`
- ERISさんの開発指示プロンプト

頑張ってください！質問があればいつでも連絡してください。

Takashi