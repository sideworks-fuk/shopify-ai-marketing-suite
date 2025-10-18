# フロントエンド実装残リスト

作成日: 2025-09-04  
対象: Frontend (Next.js + TypeScript)

## 🔴 クリティカル - 本番リリースブロッカー

### 1. 認証システム統合
**ファイル**: `/frontend/src/app/(authenticated)/layout.tsx`
- **Line 14**: TODO - 実際の認証チェック実装が必要
- **現状**: プレースホルダー実装
- **必要作業**: 
  - Shopify OAuth トークン検証
  - セッション管理
  - リダイレクトロジック

### 2. モックデータの完全置換

#### 課金関連
**ファイル群**:
- `/frontend/src/contexts/SubscriptionContext.tsx` (Lines 59-116)
- `/frontend/src/hooks/useSubscription.ts` (Lines 41-95)  
- `/frontend/src/app/billing/page.tsx` (Lines 10-66)

**必要作業**:
```typescript
// 現在のモック
const MOCK_PLANS = [...]

// 必要な実装
const plans = await fetch('/api/subscription/plans').then(res => res.json())
```

#### ダッシュボードデータ
**ファイル**: `/frontend/src/app/(authenticated)/dashboard/page.tsx`
- **Line 97**: TODO - APIコール実装
- **必要作業**: 実際のダッシュボードAPI統合

### 3. GDPR準拠機能

**未実装機能**:
- Cookie同意バナーコンポーネント
- プライバシー設定ページ (`/privacy-settings`)
- データエクスポート機能 (`/data-export`)
- データ削除リクエスト機能

**必要コンポーネント作成**:
```typescript
// components/gdpr/CookieConsent.tsx
// components/gdpr/DataExport.tsx
// components/gdpr/PrivacySettings.tsx
// app/privacy/page.tsx
// app/terms/page.tsx
```

## 🟡 重要 - 機能制限の原因

### 1. API統合の不完全性

#### 使用状況データ
**ファイル**: `/frontend/src/hooks/useFeatureAccess.ts`
- **Lines 323-333**: モック使用状況データ
```typescript
// 現在
const mockUsageData = {
  activeCustomers: 150,
  products: 45,
  orders: 230
}

// 必要
const usageData = await fetch('/api/usage/current').then(res => res.json())
```

#### 環境依存のURL
**複数ファイル**: ハードコードされた `https://localhost:7140`
- **必要作業**: 環境変数化
```typescript
// 現在
const API_URL = 'https://localhost:7140'

// 必要
const API_URL = process.env.NEXT_PUBLIC_API_URL
```

### 2. 分析コンポーネントのTODO

#### 購買頻度分析
**ファイル**: `/frontend/src/components/dashboards/PurchaseFrequencyDetailAnalysis.tsx`
- **Line 230**: TODO - 実際のAPI実装

#### 年次比較分析
**ファイル**: `/frontend/src/components/dashboards/YearOverYearProductAnalysis.tsx`
- **Line 756**: TODO - APIパラメータサポート
- **Line 777**: TODO - カテゴリマスタ統合

#### 顧客分析
**ファイル**: `/frontend/src/components/dashboards/CustomerPurchaseAnalysis.tsx`
- **Line 350**: TODO - セグメント値のハードコード解消

### 3. 課金UI統合

#### BillingStatus コンポーネント
**ファイル**: `/frontend/src/components/billing/BillingStatus.tsx`
- **Lines 222, 231**: 使用量表示が "0 / limit"
- **Line 245**: 支払い方法がハードコード

**必要作業**:
```typescript
// 現在
<div>0 / {limit} products</div>

// 必要
<div>{usage.products} / {plan.limits.products} products</div>
```

## 🟠 改善必要 - 品質向上

### 1. 型定義の不整合
**ファイル**: `/frontend/src/types/featureSelection.ts`
- `yoy_comparison` vs `year_over_year` の命名不整合
- 統一が必要

### 2. エラーハンドリング強化
- 全APIコールに適切なエラーハンドリング追加
- ユーザーフレンドリーなエラーメッセージ
- リトライメカニズム

### 3. パフォーマンス最適化
- 大きなコンポーネントの遅延読み込み
- データキャッシング戦略
- バンドルサイズ最適化

## 📋 実装チェックリスト

### Phase 1: クリティカル（1週間）
- [ ] Shopify OAuth認証実装
- [ ] 全モックデータをAPI呼び出しに置換
- [ ] 環境変数設定（API URL等）
- [ ] GDPR基本コンポーネント作成

### Phase 2: 重要（1週間）
- [ ] 全TODO項目の解決
- [ ] エラーハンドリング実装
- [ ] 使用状況トラッキング実装
- [ ] プランアップグレード/ダウングレードフロー

### Phase 3: 品質向上（1週間）
- [ ] テスト実装
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ改善
- [ ] 国際化対応

## 実装優先順位

1. **認証システム** - アプリが動作しない
2. **モックデータ置換** - 実データが表示されない
3. **GDPR対応** - 法的要件
4. **TODO解決** - 機能完全性
5. **エラーハンドリング** - ユーザー体験
6. **テスト** - 品質保証

## 見積もり工数

| タスク | 工数 | 優先度 |
|--------|------|--------|
| 認証システム | 2日 | クリティカル |
| モックデータ置換 | 3日 | クリティカル |
| GDPR UI | 2日 | クリティカル |
| TODO解決 | 2日 | 高 |
| エラーハンドリング | 1日 | 高 |
| テスト実装 | 2日 | 中 |
| **合計** | **12日** | - |