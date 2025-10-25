# Dashboard ページ実装

対象: `frontend/src/app/(authenticated)/dashboard/page.tsx`

## 概要
- 概況サマリー、売上推移、上位商品、最近の注文を表示するトップページ。
- 現状はモック `mockDashboardData` を用い、API呼び出しはTODO。

## 主な構成
- ローディングスケルトン
- サマリーカード 4種（売上/注文/平均注文額/コンバージョン）
- 売上推移チャート
- 上位商品/最近の注文の2カラム

## 今後の統合
- `lib/api/dashboard.ts` の `getDashboardData` を使用
- フィルタ（日付、storeId）は `DashboardFilters` 経由

### 擬似コード
```tsx
useEffect(() => {
  (async () => {
    setLoading(true);
    const data = await getDashboardData({ dateRange: { start, end }, storeId });
    setData(data);
    setLoading(false);
  })();
}, [start, end, storeId]);
```

## 注意
- 認証保護配下での表示が前提。
- フロントからのAPI URLは `NEXT_PUBLIC_API_URL` を推奨に統一。
