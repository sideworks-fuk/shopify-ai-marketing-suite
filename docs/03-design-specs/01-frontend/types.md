# 型定義解説

対象:
- `frontend/src/types/billing.ts`
- `frontend/src/types/featureSelection.ts`
- `frontend/src/types/dashboard.ts`

## billing.ts
- `BillingPlan`: 価格、通貨、課金間隔、機能一覧、上限（商品数・注文数）、人気フラグ
- `Subscription`: 現在の購読状態。期間・試用・解約時刻など
- `BillingInfo`: 画面向けにまとめた購読情報
- `PlanChangeRequest`: プラン変更要求（適用開始日時を任意指定）

## featureSelection.ts
- `FeatureType`: 提供機能の列挙（休眠/前年同月比/購入回数）
- `FeatureSelectionResponse`: 現在選択、次回変更日、当日可否、現在プラン、フルアクセス
- `SelectFeatureRequest/Result`: 選択操作のI/O
- `AvailableFeature`: UI向けに名前/説明/上限/使用状況
- `FeatureUsageResponse`: 使用量と上限
- `FEATURE_DETAILS`: 各機能の説明・恩恵・アイコン

## dashboard.ts
- `DashboardSummary`: 売上/注文/KPI と変化率
- `SalesChartData`: 日別の売上・注文
- `Product`, `Order`: 上位商品・最近の注文のエンティティ
- `DashboardData`: 画面用にまとめたデータ構造
- `DashboardFilters`: 取得フィルタ（日付範囲・storeId）
