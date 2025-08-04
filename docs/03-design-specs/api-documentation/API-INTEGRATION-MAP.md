# API統合マッピング設計書

## 📋 概要
このドキュメントは、Shopify ECマーケティング分析システムにおけるバックエンドAPIとフロントエンドの統合状況を管理します。

**最終更新日**: 2025-07-26  
**総エンドポイント数**: 23  
**実装済み**: 15 | **未実装**: 8

## 🔄 クイックステータス

| カテゴリ | エンドポイント数 | 実装済み | 実装率 | 主要な用途 |
|---------|----------------|----------|--------|-----------|
| **顧客分析** | 8 | 6 | 75.0% | 休眠顧客、顧客詳細、セグメント |
| **購買分析** | 6 | 6 | 100.0% | 購入回数、トレンド、セグメント別 |
| **分析系API** | 6 | 2 | 33.3% | 前年同月比、月別売上 |
| **システム** | 3 | 1 | 33.3% | ヘルスチェック、テスト |
| **合計** | **23** | **15** | **65.2%** |

## 📊 API統合マトリクス

### 🎯 顧客分析API (CustomerController)

| エンドポイント | メソッド | 実装状況 | フロントエンド利用箇所 | 主要機能 |
|--------------|---------|---------|---------------------|---------|
| `/api/customer/dashboard` | GET | ✅ 実装済 | `CustomerDashboard.tsx` | 顧客ダッシュボード |
| `/api/customer/segments` | GET | ✅ 実装済 | `CustomerSegmentAnalysis.tsx` | 顧客セグメント |
| `/api/customer/details` | GET | ✅ 実装済 | `CustomerPurchaseAnalysis.tsx` | 顧客詳細一覧 |
| `/api/customer/details/{id}` | GET | ✅ 実装済 | `CustomerDetail.tsx` | 特定顧客詳細 |
| `/api/customer/top` | GET | ✅ 実装済 | `TopCustomers.tsx` | トップ顧客 |
| `/api/customer/dormant` | GET | ✅ 実装済 | `DormantCustomerAnalysis.tsx` | 休眠顧客一覧 |
| `/api/customer/dormant/summary` | GET | ✅ 実装済 | `page.tsx (dormant)` | 休眠顧客サマリー |
| `/api/customer/dormant/detailed-segments` | GET | ⚠️ 部分実装 | `DormantPeriodFilter.tsx` | 期間別セグメント |

### 🛒 購買分析API (PurchaseController)

| エンドポイント | メソッド | 実装状況 | フロントエンド利用箇所 | 主要機能 |
|--------------|---------|---------|---------------------|---------|
| `/api/purchase/count-analysis` | GET | ✅ 実装済 | `PurchaseFrequencyDetailAnalysis.tsx` | 購入回数分析 |
| `/api/purchase/count-summary` | GET | ✅ 実装済 | `PurchaseFrequencyDetailAnalysis.tsx` | 購入回数サマリー |
| `/api/purchase/count-trends` | GET | ✅ 実装済 | `PurchaseFrequencyDetailAnalysis.tsx` | 購入回数トレンド |
| `/api/purchase/segment-analysis` | GET | ✅ 実装済 | `CustomerSegmentAnalysis.tsx` | セグメント別分析 |
| `/api/purchase/quick-stats` | GET | ✅ 実装済 | ダッシュボード各所 | クイック統計 |
| `/api/purchase/test` | GET | ✅ 実装済 | 開発テスト用 | 接続テスト |

### 📈 分析系API (AnalyticsController)

| エンドポイント | メソッド | 実装状況 | フロントエンド利用箇所 | 主要機能 |
|--------------|---------|---------|---------------------|---------|
| `/api/analytics/year-over-year` | GET | ✅ 実装済 | `YearOverYearProductAnalysis.tsx` | 前年同月比分析 |
| `/api/analytics/product-types` | GET | ✅ 実装済 | フィルター機能 | 商品タイプ一覧 |
| `/api/analytics/vendors` | GET | ❌ 未利用 | - | ベンダー一覧 |
| `/api/analytics/date-range` | GET | ❌ 未利用 | - | 分析可能期間 |
| `/api/analytics/monthly-sales` | GET | 🚧 実装中 | `MonthlyStatsAnalysis.tsx` | 月別売上統計 |
| `/api/analytics/monthly-sales/summary` | GET | ❌ 未実装 | - | 月別売上サマリー |

### 🔧 システムAPI

| エンドポイント | メソッド | 実装状況 | フロントエンド利用箇所 | 主要機能 |
|--------------|---------|---------|---------------------|---------|
| `/api/health` | GET | ✅ 実装済 | `ApiTestComponent.tsx` | ヘルスチェック |
| `/api/customer/test` | GET | ✅ 実装済 | 開発テスト用 | Customer API テスト |
| `/api/purchase/test` | GET | ✅ 実装済 | 開発テスト用 | Purchase API テスト |

## 🌐 フロントエンドAPI呼び出しパターン

### 主要なAPI呼び出し方法

#### 1. 統一APIクライアント (`src/lib/api-client.ts`)
```typescript
import { api } from "@/lib/api-client"

// 休眠顧客データ取得
const response = await api.dormantCustomers({
  storeId: 1,
  pageSize: 100,
  sortBy: 'DaysSinceLastPurchase'
})

// サマリー統計取得
const summary = await api.dormantSummary(1)
```

#### 2. 画面別利用状況
- **高頻度利用**: 休眠顧客分析、前年同月比分析
- **中頻度利用**: 購入回数分析、顧客詳細
- **低頻度利用**: システムAPI、テスト用API

#### 3. データサービス層 (`src/lib/data-service.ts`)
```typescript
// レガシーサービス（段階的に api-client.ts に移行中）
const analyticsData = await dataService.getAnalyticsData()
```

## 🚨 実装ギャップ分析

### 高優先度（早急な対応が必要）

1. **月別売上統計API** (`/api/analytics/monthly-sales`)
   - **状況**: バックエンド実装済み、フロントエンド接続未完了
   - **影響**: `MonthlyStatsAnalysis.tsx` がモックデータ使用中
   - **工数**: 1-2日

2. **詳細セグメントAPI** (`/api/customer/dormant/detailed-segments`)
   - **状況**: 接続不安定、エラーハンドリング要改善
   - **影響**: 期間別セグメント表示の不具合
   - **工数**: 0.5日

### 中優先度（計画的な実装）

3. **ベンダー・日付範囲API** 
   - **状況**: バックエンド実装済み、フロントエンド未利用
   - **影響**: フィルター機能の制限
   - **工数**: 1日

4. **月別売上サマリーAPI**
   - **状況**: バックエンド未実装
   - **影響**: サマリー機能の欠如
   - **工数**: 2-3日

### 低優先度（将来対応）

5. **新機能API群**
   - マーケットバスケット分析
   - AI推奨機能
   - 自動復帰施策

## 📚 詳細仕様リンク

- [APIエンドポイントカタログ](./api-endpoints-catalog.md)
- [フロントエンド利用状況詳細](./frontend-api-usage.md)
- [実装ステータス管理](./api-implementation-status.md)

## 🔄 更新履歴

| 日付 | 更新内容 | 更新者 |
|------|---------|--------|
| 2025-07-26 | 初版作成、全API調査完了 | AIアシスタントケンジ |

---

**注意**: このドキュメントは開発状況に応じて定期的に更新してください。新規API追加時や実装状況変更時は必ず反映してください。