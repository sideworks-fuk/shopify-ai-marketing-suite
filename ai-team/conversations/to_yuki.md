# Yukiへの依頼事項
From: Kenji (PM)
Date: 2025-08-24
Priority: 🚨緊急

## TypeScriptエラー修正依頼

Yukiさん、フロントエンドでTypeScriptエラーが発生しています。
至急修正をお願いします。

### エラー内容
```
npx tsc --noEmit
src/hooks/useFeatureAccess.ts:211:35 - error TS2345: Argument of type 'PlanId' is not assignable to parameter of type '"enterprise"'.
  Type '"starter"' is not assignable to type '"enterprise"'.

211     return feature.plans.includes(currentPlanId);
                                      ~~~~~~~~~~~~~

// 同様のエラーが6箇所
```

### 問題の原因
`feature.plans`の型定義が`['enterprise']`などの具体的な配列型になっているため、
`PlanId`型との互換性エラーが発生しています。

### 修正方法
```typescript
// 修正前
plans: ['enterprise'] as const

// 修正後
plans: ['enterprise'] as PlanId[]
```

または、型定義を修正：
```typescript
interface Feature {
  plans: PlanId[];  // ReadonlyArray<'enterprise'> ではなく PlanId[] にする
}
```

### 影響箇所
- `src/hooks/useFeatureAccess.ts` の以下の行:
  - 211行目
  - 230行目
  - 249行目
  - 260行目
  - 337行目
  - 348行目

## 以前の実装タスク（完了済み）

#### PlanSelectorコンポーネント
```typescript
// frontend/src/components/billing/PlanSelector.tsx
// プラン選択UI
// $50 Starter / $80 Professional / $100 Enterprise
```

#### BillingStatusコンポーネント
```typescript
// frontend/src/components/billing/BillingStatus.tsx
// 現在の課金状態表示
// トライアル期間の残り日数表示
```

#### TrialBannerコンポーネント
```typescript
// frontend/src/components/billing/TrialBanner.tsx
// トライアル期間中の通知バナー
// アップグレードへの誘導
```

### 2. 画面実装

#### /settings/billing ページ作成
- 課金プラン一覧表示
- 現在のプラン強調表示
- アップグレード/ダウングレードボタン
- 支払い履歴表示（可能なら）

#### UIフロー
1. プラン選択
2. Shopify課金承認画面へリダイレクト
3. 承認後のコールバック処理
4. 成功/失敗メッセージ表示

### 3. Context/Hook実装

#### SubscriptionContext
```typescript
// frontend/src/contexts/SubscriptionContext.tsx
export interface SubscriptionContextType {
  currentPlan: Plan | null;
  isTrialing: boolean;
  trialDaysLeft: number;
  canAccessFeature: (feature: string) => boolean;
  upgradePlan: (planId: string) => Promise<void>;
}
```

#### useSubscription Hook
```typescript
// frontend/src/hooks/useSubscription.ts
// 課金状態の管理
// APIとの通信
// リアルタイム更新
```

#### useFeatureAccess Hook
```typescript
// frontend/src/hooks/useFeatureAccess.ts
// 機能制限のチェック
// プランごとの機能アクセス制御
```

### 4. 機能制限UI

#### 制限表示の実装
- 無料トライアルの制限表示
- プランごとの機能差分表示
- アップグレード促進メッセージ

#### 実装例
```typescript
// 機能制限チェック
if (!canAccessFeature('advanced-analytics')) {
  return <UpgradePrompt feature="高度な分析機能" />;
}
```

---

## 技術仕様

### APIエンドポイント
```typescript
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140'

// 課金管理API
GET  /api/subscription/plans         // プラン一覧取得
GET  /api/subscription/current       // 現在の課金状態
POST /api/subscription/create        // 課金作成
POST /api/subscription/upgrade       // アップグレード
POST /api/subscription/cancel        // キャンセル
GET  /api/subscription/history       // 支払い履歴
```

### 状態管理
- Zustandまたは Context APIで課金状態を管理
- リアルタイム更新（WebSocket検討）
- ローカルストレージでキャッシュ

### デザイン要件
- Shopify Polarisに準拠
- レスポンシブ対応
- ダークモード対応（可能なら）

---

## 成果物

1. 完成したコンポーネント群
   - PlanSelector
   - BillingStatus
   - TrialBanner
   - UpgradePrompt

2. 課金管理画面
   - /settings/billing

3. Context/Hooks
   - SubscriptionContext
   - useSubscription
   - useFeatureAccess

4. 基本的な動作確認完了

---

## 進捗報告

- 11:00 - コンポーネント実装状況
- 13:00 - 画面実装完了見込み
- 14:00 - 統合テスト準備完了

## 連携事項

### Takashiとの連携
- APIエンドポイントの確認
- 認証トークンの扱い
- エラーレスポンスの形式

### テスト時の注意
- ngrokでのテスト環境構築
- Shopifyテストストアでの動作確認
- 課金承認フローのモック対応

---

## 質問・ブロッカー

不明点があれば即座に連絡してください。
Takashiとの連携が必要な部分は調整します。

参考資料:
- `docs\06-shopify\02-課金システム\`
- Shopify Polaris デザインガイド
- 既存の設定画面実装

よろしくお願いします！

---

# 過去の作業指示履歴

## 2025年8月24日（土）- 無料プラン機能選択UI実装

【開発指示 - 無料プラン機能選択UI実装】

### 概要
ERISさんの文書統一が完了しました。以下の仕様で無料プラン機能選択UIを実装してください。

### 実装対象機能（分析3機能）
1. **休眠顧客分析** (dormant_analysis)
2. **前年同月比分析** (yoy_comparison)  
3. **購入回数詳細分析** (purchase_frequency)

### 実装ファイルパス（App Router準拠）
```
frontend/src/app/billing/free-plan-setup/page.tsx  # メインページ
frontend/src/components/billing/FeatureSelector.tsx  # 機能選択コンポーネント
frontend/src/components/billing/FeatureComparison.tsx  # 機能比較表
frontend/src/hooks/useFeatureSelection.ts  # カスタムフック
```

### API仕様（統一済み）
```typescript
// エンドポイント
GET  /api/feature-selection/current  // 現在の選択状態
POST /api/feature-selection/select   // 機能選択
GET  /api/feature-selection/available-features  // 利用可能機能一覧
GET  /api/feature-selection/usage/{feature}  // 使用状況

// レスポンス型（参考）
interface CurrentSelectionResponse {
  selectedFeature: 'dormant_analysis' | 'yoy_comparison' | 'purchase_frequency' | null;
  canChangeToday: boolean;
  nextChangeAvailableDate: string; // ISO 8601
  usageLimit: {
    remaining: number;
    total: number;
  };
}
```

### 実装要件

#### 必須要件
1. **権限制御**: フロントは表示制御のみ。実際の権限はAPIが判定
2. **30日制限表示**: 「次回変更可能まであとXX日」を明確に表示
3. **冪等性**: POST時は必ずX-Idempotency-Tokenヘッダーを送信
4. **エラーハンドリング**: 409（変更不可）時は理由とnextChangeDateを表示

#### UI要件
1. **初回選択画面**
   - 3機能の比較表（特徴・メリット明記）
   - ワンクリック選択（確認ダイアログ付き）
   - 「後で決める」オプション

2. **選択済み画面**
   - 現在選択中の機能を強調表示
   - 残り変更可能日数のカウントダウン
   - 他機能のプレビュー（ダミーデータ表示）

3. **アップグレード誘導**
   - 未選択機能アクセス時はUpgradePromptコンポーネント表示
   - /billing へのディープリンク

### スケジュール
- **Day 1 (8/26)**: 基盤実装（API連携、状態管理）
- **Day 2 (8/27)**: UI実装（選択画面、比較表）
- **Day 3 (8/28)**: 統合テスト、エラーハンドリング

### 注意事項
- TypeScriptの型定義を厳密に
- レスポンシブデザイン対応必須
- アクセシビリティ（ARIA属性）考慮
- キャッシュは5分TTL（SWR使用推奨）

### 進捗報告
- 毎日report_yuki.mdに進捗を記載
- ブロッカーは即座にto_kenji.mdへ

頑張ってください！質問があればいつでも連絡してください。

Kenji

## 2025年8月12日（火）12:40



