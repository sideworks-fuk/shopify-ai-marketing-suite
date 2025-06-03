# 画面設計書

## 目次
1. 売上ダッシュボード
2. 顧客ダッシュボード
3. AIインサイト
4. 休眠顧客分析

---

## 1. 売上ダッシュボード
- ファイル: `src/app/sales/dashboard/page.tsx`, `src/components/dashboards/SalesDashboard.tsx`
- 主な構成:
  - KPIカード（売上/注文数/平均注文額/商品数）
  - 前年同月比グラフ
  - 商品売上ランキング
  - サブタブ: 商品別購入頻度分析、前年同月比（商品）、購入回数詳細分析
- 主要UI部品: `KPICard`, `Card`, `Tabs`, `BarChart`（Recharts）
- データ取得: DataService経由でShopifyAPIまたはモック
- 遷移: サブタブ切替、商品詳細モーダル

---

## 2. 顧客ダッシュボード
- ファイル: `src/app/customers/dashboard/page.tsx`, `src/components/dashboards/CustomerDashboard.tsx`
- 主な構成:
  - KPIカード（顧客数/新規/リピーター/VIP/休眠）
  - 顧客セグメント円グラフ
  - 顧客リスト・テーブル
  - 顧客詳細モーダル（購入履歴・推奨アクション）
  - サブタブ: セグメント分析、RFM分析
- 主要UI部品: `CustomerStatusBadge`, `Table`, `Dialog`, `Tabs`
- データ取得: モックデータ（`customerData.ts`）またはAPI
- 遷移: 顧客クリックで詳細モーダル、セグメント切替

---

## 3. AIインサイト
- ファイル: `src/app/ai-insights/page.tsx`, `src/components/dashboards/AIInsightsDashboard.tsx`
- 主な構成:
  - タブ: トレンド分析、異常検知、推奨施策、パフォーマンス
  - 売上予測チャート、商品トレンド分析、異常アラート、AI施策提案
  - KPI達成状況・レーダーチャート
- 主要UI部品: `Tabs`, `Card`, `AreaChart`, `LineChart`, `RadarChart`
- データ取得: DataService経由でShopifyAPIまたはモック
- 遷移: タブ切替、施策詳細表示

---

## 4. 休眠顧客分析
- ファイル: `src/components/dashboards/dormant/DormantCustomerList.tsx`, `src/components/dashboards/dormant/ReactivationInsights.tsx`
- 主な構成:
  - 休眠顧客リスト・フィルタ
  - 休眠理由分布グラフ
  - 復帰インサイト・推奨アクション
  - KPI（休眠率/平均休眠期間/復帰率/損失額/回復売上）
- 主要UI部品: `Table`, `Badge`, `Alert`, `Progress`, `Tabs`
- データ取得: モックデータ（`customerData.ts`）
- 遷移: 顧客選択→復帰施策提案、フィルタ切替

---

## 共通設計方針
- UI部品は `src/components/ui/` に集約
- サブディレクトリ分割で大規模画面を整理
- データ取得はDataService/ShopifyAPI/モックで切替
- 状態管理はAppContext/カスタムフック
- レスポンシブ・アクセシビリティ・型安全性を重視

---

*最終更新: 2025年5月25日（src構成・画面設計現状反映）*
*作成者: AI Assistant* 