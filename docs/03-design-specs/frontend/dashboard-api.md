# ダッシュボード API ドキュメント

対象: `frontend/src/lib/api/dashboard.ts`

## 概要
- ダッシュボードの集計・チャート・トップ商品・最近の注文の取得と、再集計のトリガー。

## 関数
- `getDashboardData(filters?: DashboardFilters): Promise<DashboardData>`
  - ベースURL: `NEXT_PUBLIC_API_URL || 'https://localhost:7059/api'`
  - クエリ: `startDate`, `endDate`, `storeId`
  - 返却: `DashboardData`（`summary`, `salesChart`, `topProducts`, `recentOrders`）
- `refreshDashboardData(storeId: string): Promise<void>`
  - `POST /dashboard/refresh` に `{ storeId }` を送信
- `generateMockDashboardData(): DashboardData`
  - 開発用モックデータ生成（直近7日分の売上など）

## 使用例
```ts
import { getDashboardData, refreshDashboardData } from '@/lib/api/dashboard';

const data = await getDashboardData({ dateRange: { start, end }, storeId: '1' });
await refreshDashboardData('1');
```

## 注意
- 認証ヘッダはコメントアウト済み。実運用では `Authorization` を付与。
- 本番では `NEXT_PUBLIC_API_URL` を設定して `localhost` を排除。
