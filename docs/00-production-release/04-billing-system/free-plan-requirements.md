# 無料プラン機能制限 要件定義書（参照用）

> **⚠️ 注意**: このファイルは参照用の簡易版です。  
> **正本**: `docs/06-shopify/02-課金システム/05-無料プラン機能制限/要件定義書.md`  
> 詳細な技術仕様や最新情報は正本を参照してください。

> **作成日**: 2025年8月24日  
> **バージョン**: 2.0  
> **状態**: 実装準備完了  
> **最終更新**: 2025年8月24日

## 1. 概要

### 1.1 目的
無料プランユーザーに対して、3つの主要機能から1つを選択して利用できる機能制限システムを実装する。これにより、価値を体験させながら有料プランへの移行を促進する。

### 1.2 ビジネス目標
- **コンバージョン率向上**: 無料ユーザーの有料プラン移行率30%達成
- **ユーザー体験最適化**: 各機能の価値を実際に体験可能
- **リテンション向上**: 30日ごとの機能変更により継続利用を促進
- **不正利用防止**: 権限制御の厳密化により複数アカウント悪用を防止

## 2. 機能要件

### 2.1 選択可能な3つの主要機能（分析3機能に統一）

#### 機能1: 休眠顧客分析
```
含まれる機能:
- 休眠顧客の自動検出（60日/90日/120日基準）
- 休眠理由の分析（購買パターン、季節性、商品カテゴリ）
- 復活可能性スコアリング（高/中/低）
- 復活施策の提案（割引、商品推奨、タイミング）

制限事項:
- 分析対象顧客数: 1,000名まで
- データ取得期間: 過去180日間
- レポート生成: 月2回まで
- 詳細分析: 上位100名のみ
- エクスポート: CSV形式のみ
```

#### 機能2: 前年同月比分析
```
含まれる機能:
- 売上高の前年同月比較
- 注文数・客単価・購買頻度の比較
- 商品カテゴリ別の成長率分析
- 顧客セグメント別の推移

制限事項:
- 比較期間: 最大12ヶ月
- 商品カテゴリ: 10カテゴリまで
- セグメント数: 5セグメントまで
- グラフ表示: 基本チャートのみ
- 自動レポート: 月1回
```

#### 機能3: 購入回数詳細分析
```
含まれる機能:
- 購入回数別の顧客分布（初回/2回/3回以上）
- リピート率の推移分析
- 購入間隔の分析（平均日数、分布）
- 次回購入予測（確率とタイミング）

制限事項:
- 分析対象: 過去6ヶ月の購買データ
- 顧客数: 2,000名まで
- 予測期間: 30日先まで
- セグメント分析: 基本3分類のみ
- アラート機能: なし
```

### 2.2 機能選択・変更ルール

#### 初回選択
- **タイミング**: アプリインストール後の初回ログイン時
- **UI**: ウェルカム画面で3機能を比較表示
- **選択必須**: 機能選択なしではアプリ利用不可

#### 機能変更
- **頻度**: 直近の変更から30日経過後に変更可能
- **判定ロジック**: `lastChangeDate + 30日 <= now()` (UTC基準)
- **即時反映**: 変更後即座に新機能が利用可能
- **データ保持**: 旧機能のデータは30日間保持
- **権限制御**: サーバー側ミドルウェアで厳密に判定（クライアント側は表示のみ）
- **競合対策**: 冪等トークンと楽観ロックによる多重変更防止

### 2.3 通知・案内

#### アプリ内通知
- 機能変更可能日の3日前にリマインダー
- 未使用機能の紹介（週1回）
- 有料プランアップグレード提案（月2回まで）

#### メール通知
- 月次利用レポート（選択機能の利用状況）
- 機能変更可能通知
- 他機能の成功事例紹介

## 3. 技術要件

### 3.1 データベース設計

#### UserFeatureSelections テーブル
```sql
-- 現在の選択状態を管理（アクティブなレコードは1店舗につき1件）
CREATE TABLE UserFeatureSelections (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    SelectedFeature NVARCHAR(50) NOT NULL, -- 'dormant_analysis', 'yoy_comparison', 'purchase_frequency'
    SelectionDate DATETIME2 NOT NULL,
    LastChangeDate DATETIME2 NULL,
    NextChangeAvailableDate DATETIME2 NOT NULL, -- 次回変更可能日時（UTC）
    ChangeCount INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    RowVersion ROWVERSION NOT NULL, -- 楽観ロック用
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT FK_UserFeatureSelections_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id),
    CONSTRAINT UQ_UserFeatureSelections_Active UNIQUE (StoreId, IsActive) WHERE IsActive = 1
);

-- 変更履歴を記録
CREATE TABLE FeatureSelectionChangeHistory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    PreviousFeature NVARCHAR(50) NULL,
    NewFeature NVARCHAR(50) NOT NULL,
    ChangeReason NVARCHAR(200) NULL,
    ChangedAt DATETIME2 DEFAULT GETUTCDATE(),
    ChangedBy NVARCHAR(100) NULL,
    IdempotencyToken NVARCHAR(100) NULL, -- 冪等性保証
    CONSTRAINT FK_ChangeHistory_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id)
);

-- インデックス
CREATE INDEX IX_UserFeatureSelections_StoreId_Active ON UserFeatureSelections(StoreId) WHERE IsActive = 1;
CREATE INDEX IX_UserFeatureSelections_NextChangeAvailableDate ON UserFeatureSelections(NextChangeAvailableDate);
CREATE INDEX IX_FeatureSelectionChangeHistory_StoreId_ChangedAt ON FeatureSelectionChangeHistory(StoreId, ChangedAt);
CREATE UNIQUE INDEX IX_FeatureSelectionChangeHistory_IdempotencyToken ON FeatureSelectionChangeHistory(IdempotencyToken) WHERE IdempotencyToken IS NOT NULL;
```

#### FeatureUsageLogsテーブル
```sql
CREATE TABLE FeatureUsageLogs (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    Feature NVARCHAR(50) NOT NULL,
    Action NVARCHAR(100) NOT NULL,
    EventType NVARCHAR(50) NOT NULL, -- 'usage', 'change', 'access_denied', 'limit_reached'
    BeforeState NVARCHAR(MAX) NULL, -- JSON形式で変更前の状態を記録
    AfterState NVARCHAR(MAX) NULL,  -- JSON形式で変更後の状態を記録
    UsageCount INT DEFAULT 1,
    UsageDate DATE NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    SessionId NVARCHAR(100) NULL,
    IpAddress NVARCHAR(50) NULL,
    UserAgent NVARCHAR(500) NULL,
    CONSTRAINT FK_UsageLogs_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id)
);

-- インデックス
CREATE INDEX IX_FeatureUsageLogs_StoreId_UsageDate ON FeatureUsageLogs(StoreId, UsageDate);
CREATE INDEX IX_FeatureUsageLogs_EventType ON FeatureUsageLogs(EventType);
```

### 3.2 API設計

#### 機能選択API
```typescript
// 現在の選択状態取得
GET /api/feature-selection/current
Response: {
  selectedFeature: 'dormant_analysis' | 'yoy_comparison' | 'purchase_frequency' | null,
  lastChangeDate: '2025-08-01T00:00:00Z',
  canChangeNow: boolean,
  nextChangeableDate: '2025-08-31T00:00:00Z',
  changeCount: number,
  reason: string | null, // 変更不可の理由
  daysUntilChange: number,
  currentPlan: 'free' | 'basic' | 'premium' | 'enterprise',
  hasFullAccess: boolean // 有料プランかどうか
}

// 機能選択・変更
POST /api/feature-selection/select
Headers: {
  'X-Idempotency-Token': string // 冪等性トークン（必須）
}
Body: {
  feature: 'dormant_analysis' | 'yoy_comparison' | 'purchase_frequency',
  rowVersion?: string // 楽観ロック用（更新時）
}
Response: {
  success: boolean,
  message: string,
  newSelection: {
    feature: string,
    activatedAt: string,
    nextChangeableDate: string
  }
}

// エラーレスポンス
409 Conflict: {
  error: 'change_not_allowed',
  message: '機能変更は30日経過後に可能です',
  nextChangeableDate: '2025-08-31T00:00:00Z',
  daysRemaining: 15
}

400 Bad Request: {
  error: 'invalid_feature_id',
  message: '無効な機能IDです',
  validFeatures: ['dormant_analysis', 'yoy_comparison', 'purchase_frequency']
}

429 Too Many Requests: {
  error: 'concurrent_modification',
  message: '同時に複数の変更リクエストが送信されました'
}

// 利用可能機能の詳細取得
GET /api/feature-selection/available-features
Response: {
  features: [
    {
      id: 'dormant_analysis',
      name: '休眠顧客分析',
      description: string,
      limits: object,
      currentUsage: object
    },
    // ... 他の機能
  ]
}
```

### 3.3 権限制御とキャッシュ戦略

#### サーバー側ミドルウェア
```csharp
public class FeatureAccessMiddleware
{
    // すべてのAPIリクエストで権限チェック
    public async Task InvokeAsync(HttpContext context)
    {
        var storeId = GetStoreId(context);
        var requestedFeature = GetRequestedFeature(context);
        
        // キャッシュから権限情報取得（TTL: 5分）
        var access = await _cache.GetOrSetAsync(
            $"feature_access_{storeId}",
            () => _service.GetFeatureAccess(storeId),
            TimeSpan.FromMinutes(5)
        );
        
        if (!access.HasAccess(requestedFeature))
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new {
                error = "feature_not_available",
                selectedFeature = access.SelectedFeature,
                upgradeUrl = "/settings/billing"
            }));
            return;
        }
        
        await _next(context);
    }
}
```

#### キャッシュ無効化戦略
```csharp
public class CacheInvalidationService
{
    public async Task InvalidateFeatureCache(int storeId)
    {
        // 機能変更時に即座にキャッシュクリア
        await _cache.RemoveAsync($"feature_access_{storeId}");
        
        // CDNキャッシュもパージ（該当する場合）
        await _cdn.PurgeAsync($"/api/stores/{storeId}/features/*");
    }
}
```

### 3.4 フロントエンド実装

#### コンポーネント構成
```
/components/free-plan/
├── FeatureSelector.tsx      # 機能選択UI
├── FeatureComparison.tsx    # 3機能比較表
├── ChangeFeatureModal.tsx   # 機能変更モーダル
├── UsageLimitAlert.tsx      # 使用制限アラート
└── UpgradePrompt.tsx        # アップグレード促進
```

#### 状態管理（Zustand）
```typescript
interface FeatureSelectionState {
  selectedFeature: FeatureType | null;
  lastChangeDate: Date | null;
  nextChangeableDate: Date | null;
  canChangeNow: boolean;
  daysUntilChange: number;
  usageLimits: Record<string, any>;
  hasFullAccess: boolean; // 有料プランかどうか（表示用のみ）
  
  // Actions
  selectFeature: (feature: FeatureType, idempotencyToken: string) => Promise<void>;
  checkChangeEligibility: () => Promise<boolean>;
  getFeatureUsage: () => Promise<FeatureUsage>;
  refreshAccessStatus: () => Promise<void>; // キャッシュ更新
}

// 注意: フロントエンドのhasAccessは表示制御のみに使用
// 実際のアクセス制御はサーバー側で行う
```

## 4. Shopify課金連動

### 4.1 Webhook処理
```csharp
public class ShopifyWebhookHandler
{
    // APP_SUBSCRIPTIONS_UPDATE webhook
    public async Task HandleSubscriptionUpdate(ShopifyWebhook webhook)
    {
        var subscription = webhook.Data.AppSubscription;
        var storeId = GetStoreId(webhook.ShopDomain);
        
        switch (subscription.Status)
        {
            case "ACTIVE":
                if (subscription.Plan != "FREE")
                {
                    // 有料プラン：全機能を即座に解放
                    await _service.UnlockAllFeatures(storeId);
                    await _cache.InvalidateFeatureCache(storeId);
                }
                break;
                
            case "CANCELLED":
            case "EXPIRED":
                // 無料プランに戻る：直近の選択機能のみ有効
                await _service.RestoreFreePlanLimitations(storeId);
                await _cache.InvalidateFeatureCache(storeId);
                break;
        }
        
        // 監査ログに記録
        await _auditLog.LogSubscriptionChange(storeId, subscription);
    }
}
```

### 4.2 ゲーティング処理
```typescript
// 機能アクセス時のゲーティング
function FeatureGate({ feature, children }) {
  const { selectedFeature, hasFullAccess } = useFeatureSelection();
  
  // 有料プランなら常にアクセス可能（表示用）
  if (hasFullAccess) {
    return children;
  }
  
  // 無料プラン：選択機能のみ表示
  if (selectedFeature === feature) {
    return children;
  }
  
  // 未選択機能：アップグレード促進
  return (
    <UpgradePrompt
      feature={feature}
      message="この機能を利用するには、有料プランにアップグレードするか、設定から機能を切り替えてください"
      showPreview={true} // 軽量プレビューを表示
    />
  );
}
```

## 5. 実装フェーズ

### Phase 1: バックエンド実装（3日間）
**担当**: -
- [ ] データベーステーブル作成（履歴テーブル含む）
- [ ] 権限制御ミドルウェア実装
- [ ] API エンドポイント実装（冪等性・楽観ロック対応）
- [ ] Shopify Webhook連動実装
- [ ] キャッシュ戦略実装
- [ ] 監査ログ機能実装
- [ ] 単体テスト作成

### Phase 2: フロントエンド実装（2日間）
**担当**: -
- [ ] コンポーネント作成（ゲーティング対応）
- [ ] 状態管理実装（表示制御のみ）
- [ ] API統合（エラーハンドリング強化）
- [ ] アップグレード促進UI
- [ ] 機能プレビュー実装
- [ ] UIテスト

### Phase 3: 統合テスト（1日間）
**担当**: 全員
- [ ] E2Eテストシナリオ実行
- [ ] エッジケーステスト
- [ ] パフォーマンステスト
- [ ] セキュリティテスト

## 6. 成功指標（KPI）

### 技術指標
- **応答時間**: 機能切り替えAPI < 500ms
- **エラー率**: < 0.1%
- **可用性**: 99.9%以上

### ビジネス指標
- **機能選択率**: インストール後24時間以内に90%以上
- **機能変更率**: 月間20%以上のユーザーが機能変更を実施
- **アップグレード率**: 3ヶ月以内に30%が有料プランへ移行

## 7. リスクと対策

### リスク1: 機能選択の複雑性
- **リスク**: ユーザーが適切な機能を選択できない
- **対策**: 
  - 詳細な機能比較表の提供
  - 業種別推奨機能の提示
  - 7日間のお試し期間設定

### リスク2: データ移行の問題
- **リスク**: 機能変更時のデータ損失
- **対策**:
  - 30日間のデータ保持期間
  - 変更前の確認ダイアログ
  - データエクスポート機能

### リスク3: 不正利用とセキュリティ
- **リスク**: 複数アカウントでの機能使い分け、クライアント改ざん
- **対策**:
  - IPアドレス監視とレート制限
  - デバイスフィンガープリント
  - 利用パターン分析
  - **クライアント改ざん防止**: フロントエンドの権限情報は表示のみ、実際の判定はサーバー側
  - **多端末同時操作**: 冪等トークンで最初の操作のみ受理、以降は429/409エラー

### リスク4: 競合状態
- **リスク**: 同時変更による不整合
- **対策**:
  - 楽観ロック（RowVersion）による競合検出
  - 冪等トークンによる重複防止
  - 単一フライト化による並列ガード

## 8. 将来の拡張性

### 検討事項
1. **機能の部分解放**: 特定期間のキャンペーンで2機能同時利用
2. **ポイント制**: 利用量に応じたポイント付与と機能アンロック
3. **紹介プログラム**: 他店舗紹介で追加機能解放
4. **季節限定機能**: 繁忙期向けの特別機能提供

## 9. 承認事項

### レビュー担当者
- [ ] 福田様: ビジネス要件承認
- [ ] 技術実装可能性確認
- [ ] UI/UX実装確認
- [ ] 浜地様: デザイン承認

### 次のアクション
1. この要件定義書のレビューと承認
2. 詳細設計書の作成
3. 実装スケジュールの確定
4. 開発環境での実装開始

---

**最終更新**: 2025年8月24日 21:30 - ERISレビュー反映完了  
**次回レビュー**: 2025年8月26日 10:00  

## 変更履歴
- v2.0 (2025-08-24): ERISレビューを反映
  - 30日制限の厳密化（UTC基準）
  - 権限制御のサーバー側一元化
  - 競合対策（冪等性・楽観ロック）
  - 監査ログ強化
  - Shopify Webhook連動詳細化