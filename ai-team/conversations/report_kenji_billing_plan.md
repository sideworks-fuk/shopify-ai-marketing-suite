# 課金システム実装計画 - Kenjiからの提案

## To: 福田様、小野様、チーム全員
## 日付: 2025年8月24日

## 📌 本日の最重要目標への対応

ご連絡いただいた「課金の仕組みの要件定義、実装、テスト完了」について、以下の計画を提案します。

## 🎯 課金システム実装の現状分析

### 完了済み（8月中旬の作業）
1. **基盤実装**
   - `SubscriptionController.cs` - 課金APIコントローラー
   - `ShopifySubscriptionService.cs` - GraphQL課金サービス
   - 環境設定（ngrok、CORS）完了

2. **ドキュメント整備**
   - `/docs/06-shopify/02-課金システム/` 配下の技術文書
   - GraphQL API仕様調査
   - システム設計書作成済み

### 未完了タスク
1. **要件定義の最終化**
   - 価格帯の決定（$50/$80/$100案）
   - 無料トライアル期間（7日 or 14日）
   - 課金トリガーのタイミング

2. **実装の残作業**
   - GraphQL mutationの完全実装
   - Webhook処理（課金確認/キャンセル）
   - フロントエンド課金画面の完成

3. **テスト**
   - E2Eテストシナリオ作成
   - Shopifyテストストアでの検証
   - エラーハンドリング確認

## 📋 本日の実行計画（優先順位順）

### Phase 1: 要件定義確定（〜12:00）
**担当**: Kenji + 小野様

1. **価格プラン決定**
   ```
   Basic Plan: $50/月
   - 基本分析機能
   - 月間1,000注文まで
   
   Professional Plan: $80/月
   - 全分析機能
   - 月間10,000注文まで
   - APIアクセス
   
   Enterprise Plan: $100/月
   - 無制限
   - 優先サポート
   - カスタマイズ対応
   ```

2. **無料トライアル**
   - 14日間（Shopify推奨）
   - 全機能利用可能
   - クレジットカード登録不要

3. **課金フロー**
   - インストール時: トライアル開始
   - 14日後: 自動的に課金開始
   - プラン変更: いつでも可能

### Phase 2: 実装完了（12:00〜16:00）
**担当**: Takashi（バックエンド）、Yuki（フロントエンド）

#### バックエンド（Takashi）
```csharp
// 実装必須項目
1. AppSubscriptionCreate mutation実装
2. AppSubscriptionLineItemUpdate mutation（プラン変更）
3. Webhook処理
   - app_subscriptions/update
   - app_subscriptions/cancelled
4. 課金状態管理API
```

#### フロントエンド（Yuki）
```typescript
// 実装必須項目
1. 課金プラン選択画面
2. 現在のプラン表示
3. アップグレード/ダウングレードUI
4. トライアル残日数表示
```

### Phase 3: テスト実施（16:00〜18:00）
**担当**: 全員

1. **シナリオテスト**
   - 新規インストール→トライアル開始
   - トライアル期限切れ→課金開始
   - プラン変更（アップグレード/ダウングレード）
   - キャンセル処理

2. **エラーケーステスト**
   - 決済失敗
   - Webhook遅延
   - 重複課金防止

## 🔧 技術的実装詳細

### GraphQL Mutations（優先実装）

```graphql
# 1. サブスクリプション作成
mutation AppSubscriptionCreate($input: AppSubscriptionCreateInput!) {
  appSubscriptionCreate(input: $input) {
    appSubscription {
      id
      status
      currentPeriodEnd
    }
    confirmationUrl
    userErrors {
      field
      message
    }
  }
}

# 2. プラン変更
mutation AppSubscriptionLineItemUpdate($input: AppSubscriptionLineItemUpdateInput!) {
  appSubscriptionLineItemUpdate(input: $input) {
    appSubscription {
      id
      lineItems {
        id
        plan {
          pricingDetails
        }
      }
    }
  }
}
```

### 必要なデータベース変更

```sql
-- Subscriptionsテーブル（既存を確認）
CREATE TABLE IF NOT EXISTS Subscriptions (
    Id INT PRIMARY KEY IDENTITY,
    StoreId INT NOT NULL,
    ShopifySubscriptionId NVARCHAR(255),
    PlanType NVARCHAR(50), -- 'basic', 'professional', 'enterprise'
    Status NVARCHAR(50), -- 'trial', 'active', 'cancelled'
    TrialEndsAt DATETIME2,
    CurrentPeriodEnd DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (StoreId) REFERENCES Stores(Id)
);
```

## ⚠️ リスクと対策

### リスク1: 時間不足
**対策**: MVPに絞る
- 固定プラン1つ（$80）でスタート
- プラン変更は後日実装
- 基本的な課金フローのみ

### リスク2: Shopify審査要件
**対策**: 必須要件確認
- 無料トライアル必須
- キャンセル処理必須
- 返金ポリシー明記

### リスク3: テスト環境
**対策**: 
- Shopifyパートナーダッシュボードのテストストア使用
- 開発ストアで全フロー確認

## 📊 成功指標（本日18:00時点）

- [ ] 価格プラン確定
- [ ] GraphQL mutation実装完了
- [ ] 課金画面UI完成
- [ ] E2Eテスト3シナリオ以上成功
- [ ] Webhookハンドラー実装

## 🚀 アクションアイテム（即座に開始）

### 10:00-10:30 キックオフ
1. チーム全体で計画共有
2. 不明点の解消
3. 役割分担確認

### 10:30-12:00 要件定義
1. 小野様と価格決定
2. 技術仕様確定
3. UI/UXワイヤーフレーム

### 12:00-16:00 実装スプリント
1. バックエンド実装（Takashi）
2. フロントエンド実装（Yuki）
3. 進捗を1時間ごとに共有

### 16:00-18:00 テスト&修正
1. 統合テスト実施
2. バグ修正
3. ドキュメント更新

## 💬 質問と確認事項

### 小野様への確認
1. 価格は$50/$80/$100で決定でよろしいですか？
2. 無料トライアルは14日間でよろしいですか？
3. 返金ポリシーはどのように設定しますか？

### 福田様への確認
1. 本日18:00までの完了は必須でしょうか？
2. MVPとして最小限の実装でも問題ないでしょうか？
3. 本番環境へのデプロイは本日中に必要ですか？

## チームメッセージ

本日は課金システムの完成に向けて集中的に取り組みます。
不明点は即座に共有し、協力して進めましょう。

18:00には動作する課金システムをお見せできるよう、全力で取り組みます！

---
Kenji（AIプロジェクトマネージャー）
2025年8月24日 17:30