# 課金システム設計書

## 作成日：2025年8月12日
## 作成者：Kenji (プロジェクトマネージャー)
## レビュー：Takashi, Yuki

## 1. 概要

### 1.1 目的
Shopifyアプリに月額サブスクリプション課金機能を実装し、収益化を実現する。

### 1.2 対象プラン
| プラン名 | 月額料金 | 無料期間 | 主な機能 |
|---------|---------|---------|---------|
| Starter | $50 | 7日間 | 基本分析、月次レポート |
| Professional | $80 | 7日間 | 高度な分析、週次レポート、API連携 |
| Enterprise | $100 | 14日間 | 全機能、カスタマイズ、優先サポート |

## 2. システムアーキテクチャ

### 2.1 コンポーネント構成
```
┌─────────────────────────────────────────────────────┐
│                  フロントエンド                      │
│  - React/TypeScript                                  │
│  - 課金状態表示                                      │
│  - プラン選択UI                                      │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────┐
│                  バックエンドAPI                     │
│  - ASP.NET Core Web API                             │
│  - 課金状態管理                                      │
│  - Shopify API連携                                   │
└────────────────┬────────────────────────────────────┘
                 │
         ┌───────┴───────┬─────────────┐
         │               │             │
┌────────▼──────┐ ┌─────▼──────┐ ┌───▼────────┐
│ Azure SQL DB  │ │ Shopify API │ │ Webhook    │
│ - 課金履歴    │ │ - 課金作成  │ │ - 状態更新 │
│ - プラン情報  │ │ - 状態確認  │ │ - 通知処理 │
└───────────────┘ └─────────────┘ └────────────┘
```

### 2.2 データフロー

#### 2.2.1 新規課金フロー
1. ユーザーがプラン選択
2. バックエンドでShopify課金URL生成
3. Shopifyの課金承認画面へリダイレクト
4. 承認後、Webhookで通知受信
5. データベースの課金状態を更新
6. アプリの全機能を有効化

#### 2.2.2 課金状態確認フロー
1. アプリ起動時に課金状態を確認
2. 有効期限と機能制限をチェック
3. 期限切れの場合は更新を促す

## 3. データベース設計

### 3.1 テーブル構成

#### SubscriptionPlans（プランマスタ）
```sql
CREATE TABLE SubscriptionPlans (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    Currency NVARCHAR(3) DEFAULT 'USD',
    TrialDays INT DEFAULT 7,
    Features NVARCHAR(MAX), -- JSON形式で機能リスト
    MaxStores INT DEFAULT 1,
    MaxProducts INT DEFAULT NULL,
    MaxOrders INT DEFAULT NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);
```

#### StoreSubscriptions（ストア別課金情報）
```sql
CREATE TABLE StoreSubscriptions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    PlanId INT NOT NULL,
    ShopifyChargeId BIGINT UNIQUE,
    Status NVARCHAR(50) NOT NULL, -- pending, active, cancelled, expired, frozen
    TrialStartsAt DATETIME2,
    TrialEndsAt DATETIME2,
    CurrentPeriodStart DATETIME2,
    CurrentPeriodEnd DATETIME2,
    CancelledAt DATETIME2,
    CancellationReason NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (StoreId) REFERENCES Stores(Id),
    FOREIGN KEY (PlanId) REFERENCES SubscriptionPlans(Id),
    INDEX IX_StoreSubscriptions_StoreId (StoreId),
    INDEX IX_StoreSubscriptions_Status (Status)
);
```

#### BillingHistory（課金履歴）
```sql
CREATE TABLE BillingHistory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    SubscriptionId INT NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Currency NVARCHAR(3) DEFAULT 'USD',
    Status NVARCHAR(50) NOT NULL, -- paid, pending, failed, refunded
    InvoiceUrl NVARCHAR(500),
    PaymentMethod NVARCHAR(100),
    TransactionDate DATETIME2 NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (StoreId) REFERENCES Stores(Id),
    FOREIGN KEY (SubscriptionId) REFERENCES StoreSubscriptions(Id),
    INDEX IX_BillingHistory_StoreId (StoreId),
    INDEX IX_BillingHistory_TransactionDate (TransactionDate)
);
```

### 3.2 初期データ
```sql
-- プランマスタの初期データ
INSERT INTO SubscriptionPlans (Name, Price, TrialDays, Features, MaxStores, MaxProducts, MaxOrders)
VALUES 
('Starter', 50.00, 7, '{"features":["基本分析","月次レポート","メール通知"]}', 1, 1000, 5000),
('Professional', 80.00, 7, '{"features":["高度な分析","週次レポート","API連携","優先サポート"]}', 3, 10000, 50000),
('Enterprise', 100.00, 14, '{"features":["全機能","カスタマイズ","専任サポート","無制限API"]}', NULL, NULL, NULL);
```

## 4. API設計

### 4.1 エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/subscription/plans | 利用可能なプラン一覧取得 |
| GET | /api/subscription/current | 現在の課金状態取得 |
| POST | /api/subscription/create | 新規課金作成 |
| POST | /api/subscription/upgrade | プランアップグレード |
| POST | /api/subscription/cancel | 課金キャンセル |
| GET | /api/subscription/history | 課金履歴取得 |
| POST | /api/webhook/subscription | Shopify Webhook受信 |

### 4.2 API詳細

#### 4.2.1 プラン一覧取得
```http
GET /api/subscription/plans
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": 1,
        "name": "Starter",
        "price": 50.00,
        "currency": "USD",
        "trialDays": 7,
        "features": ["基本分析", "月次レポート", "メール通知"],
        "limits": {
          "stores": 1,
          "products": 1000,
          "orders": 5000
        }
      }
    ],
    "currentPlan": {
      "id": 1,
      "name": "Starter",
      "status": "active",
      "trialEndsAt": "2025-08-19T00:00:00Z",
      "currentPeriodEnd": "2025-09-12T00:00:00Z"
    }
  }
}
```

#### 4.2.2 課金作成
```http
POST /api/subscription/create
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "planId": 2,
  "returnUrl": "https://app.example.com/subscription/success"
}

Response:
{
  "success": true,
  "data": {
    "confirmationUrl": "https://store.myshopify.com/admin/charges/confirm",
    "chargeId": 1234567890
  }
}
```

## 5. フロントエンド実装

### 5.1 コンポーネント構成

#### 5.1.1 SubscriptionProvider
```typescript
// contexts/SubscriptionContext.tsx
interface SubscriptionContextType {
  currentPlan: SubscriptionPlan | null;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  daysRemainingInTrial: number;
  canAccessFeature: (feature: string) => boolean;
  upgradePlan: (planId: number) => Promise<void>;
  cancelSubscription: () => Promise<void>;
}
```

#### 5.1.2 PlanSelector
```typescript
// components/billing/PlanSelector.tsx
interface PlanSelectorProps {
  plans: SubscriptionPlan[];
  currentPlanId?: number;
  onSelectPlan: (planId: number) => void;
}
```

#### 5.1.3 BillingStatus
```typescript
// components/billing/BillingStatus.tsx
interface BillingStatusProps {
  subscription: CurrentSubscription;
  onUpgrade: () => void;
  onCancel: () => void;
}
```

### 5.2 機能制限の実装
```typescript
// hooks/useFeatureAccess.ts
export function useFeatureAccess(feature: string): boolean {
  const { currentPlan, hasActiveSubscription } = useSubscription();
  
  if (!hasActiveSubscription) {
    return false;
  }
  
  return currentPlan?.features.includes(feature) ?? false;
}

// 使用例
function AdvancedAnalytics() {
  const hasAccess = useFeatureAccess('advanced_analytics');
  
  if (!hasAccess) {
    return <UpgradePrompt feature="高度な分析" />;
  }
  
  return <AnalyticsComponent />;
}
```

## 6. セキュリティ考慮事項

### 6.1 認証・認可
- すべての課金APIはJWT認証必須
- ストアIDの検証を必ず実施
- 管理者権限のみ課金操作可能

### 6.2 Webhook検証
```csharp
// Shopify Webhookの署名検証
public bool VerifyWebhookSignature(string body, string signature)
{
    var secret = _configuration["Shopify:WebhookSecret"];
    var calculatedSignature = ComputeHmacSha256(body, secret);
    return signature == calculatedSignature;
}
```

### 6.3 データ保護
- 課金情報の暗号化保存
- PCI DSS準拠（カード情報は保存しない）
- 監査ログの記録

## 7. 実装スケジュール

### Phase 1: 基礎実装（2日間）
**8月13日（火）**
- [ ] データベーステーブル作成
- [ ] Entity Frameworkモデル生成
- [ ] 基本APIエンドポイント実装

**8月14日（水）**
- [ ] Shopify API連携実装
- [ ] Webhook処理実装
- [ ] 単体テスト作成

### Phase 2: フロントエンド実装（2日間）
**8月15日（木）**
- [ ] SubscriptionContext実装
- [ ] 課金画面UI作成
- [ ] プラン選択コンポーネント

**8月16日（金）**
- [ ] 機能制限ロジック実装
- [ ] 統合テスト
- [ ] デプロイ準備

## 8. テスト計画

### 8.1 単体テスト
- 課金状態の計算ロジック
- Webhook署名検証
- 機能アクセス制御

### 8.2 統合テスト
- 新規課金フロー全体
- プランアップグレード
- 課金キャンセル
- トライアル期限切れ

### 8.3 テストシナリオ
1. 新規ユーザーの無料トライアル開始
2. トライアル中のプラン変更
3. トライアル期限切れ後の課金
4. 月次更新の自動処理
5. キャンセルと再開

## 9. 監視・運用

### 9.1 監視項目
- 課金成功率
- エラー率
- Webhook処理遅延
- API応答時間

### 9.2 アラート設定
- 課金失敗率が5%超過
- Webhook処理エラー
- データベース不整合検出

### 9.3 バックアップ
- 課金データの日次バックアップ
- トランザクションログの30日保持

## 10. 今後の拡張計画

### 10.1 追加機能候補
- 年払いプラン（20%割引）
- 従量課金オプション
- クーポン・割引コード
- アフィリエイトプログラム

### 10.2 最適化項目
- 課金画面のA/Bテスト
- コンバージョン率改善
- チャーン率分析

---

**承認**
- プロジェクトマネージャー: Kenji
- バックエンドエンジニア: Takashi
- フロントエンドエンジニア: Yuki
- 承認日: 2025年8月12日