# ストア切り替え機能不具合調査・修正 - 指示プロンプト

## 問題概要
ストア切り替えドロップダウンでストアを選択しても、各分析画面のデータが常にストアID=1のまま変わらない

## 症状
- ストア選択UI上では「テストストア」（ID=2）を選択
- しかし、API呼び出しや表示データは全てストアID=1のまま
- ページリロード後も問題が継続

## 調査手順

### 1. フロントエンド側の確認

#### 1.1 localStorage確認
ブラウザの開発者ツール > Console で実行：
```javascript
// 保存されているストアIDを確認
console.log('Saved Store ID:', localStorage.getItem('selectedStoreId'))
```

#### 1.2 API呼び出しパラメータ確認
ブラウザの開発者ツール > Network タブで：
- 各APIリクエストのURLを確認
- `storeId` パラメータが正しく付与されているか確認
- 例: `/api/customer/dormant?storeId=2` となっているか

#### 1.3 StoreContext の状態確認
React Developer Tools または以下のデバッグコードを追加：
```tsx
// 各分析画面のコンポーネントに一時的に追加
const { currentStore } = useStore()
console.log('Current Store in Component:', currentStore)
```

### 2. API設定の確認

#### 2.1 addStoreIdToParams 関数の動作確認
**ファイル**: `frontend/src/lib/api-config.ts`

```typescript
// 既存の実装を確認
export function getCurrentStoreId(): number {
  if (typeof window !== 'undefined') {
    const savedStoreId = localStorage.getItem('selectedStoreId')
    return savedStoreId ? parseInt(savedStoreId) : 1
  }
  return 1
}

// デバッグログを追加
export function addStoreIdToParams(params: URLSearchParams | Record<string, any>): URLSearchParams {
  const storeId = getCurrentStoreId()
  console.log('Getting store ID for API:', storeId) // デバッグ用
  
  const searchParams = params instanceof URLSearchParams 
    ? params 
    : new URLSearchParams(params)
  
  if (!searchParams.has('storeId')) {
    searchParams.set('storeId', storeId.toString())
    console.log('Added store ID to params:', storeId) // デバッグ用
  }
  
  return searchParams
}
```

### 3. 各分析画面のAPI呼び出し確認

#### 3.1 休眠顧客分析画面
**ファイル**: `frontend/src/app/customer-analysis/dormant/page.tsx`

確認ポイント：
```tsx
// fetchAnalysisData 関数内で addStoreIdToParams が使われているか
const params = addStoreIdToParams({
  startYear: dateRange.startYear,
  // ... 他のパラメータ
})
```

#### 3.2 購入回数分析画面
**ファイル**: `frontend/src/components/dashboards/PurchaseCountAnalysis.tsx`

確認ポイント：
```tsx
const params = addStoreIdToParams({
  period: conditions.period,
  // ... 他のパラメータ
})
```

#### 3.3 前年同月比画面
該当するコンポーネントで同様の確認

### 4. 修正案

#### 修正案1: 各API呼び出しでaddStoreIdToParamsを使用
```tsx
// 修正前
const response = await fetch(`${getApiUrl()}/api/analytics/dormant-customers?${params}`)

// 修正後
const params = addStoreIdToParams({
  // 既存のパラメータ
})
const response = await fetch(`${getApiUrl()}/api/analytics/dormant-customers?${params}`)
```

#### 修正案2: useStoreフックを直接使用
```tsx
import { useStore } from '@/contexts/StoreContext'

function AnalysisComponent() {
  const { currentStore } = useStore()
  
  const fetchData = async () => {
    const params = new URLSearchParams({
      storeId: currentStore?.id.toString() || '1',
      // 他のパラメータ
    })
    // API呼び出し
  }
}
```

#### 修正案3: API Clientレベルでの統一処理
```tsx
// api-client.ts を修正
class ApiClient {
  async request(endpoint: string, options?: RequestOptions) {
    // 自動的にstoreIdを付与
    const url = new URL(endpoint, getApiUrl())
    if (!url.searchParams.has('storeId')) {
      url.searchParams.set('storeId', getCurrentStoreId().toString())
    }
    // リクエスト処理
  }
}
```

### 5. テスト手順

1. **ストア切り替えテスト**
   - ストア1 → ストア2に切り替え
   - Network タブでAPI呼び出しを確認
   - `storeId=2` が含まれているか確認

2. **データ確認**
   - ストア2のテストデータが表示されているか
   - 特徴的なデータ（山田由美の休眠顧客など）が見えるか

3. **永続性テスト**
   - ページリロード後もストア2が選択されているか
   - APIパラメータも正しいか

## 期待される修正結果

1. ストア切り替えが全画面で正しく反映される
2. APIリクエストに正しいstoreIdが含まれる
3. 各ストアの固有データが表示される

## チェックリスト

- [ ] localStorage に正しいストアIDが保存されている
- [ ] getCurrentStoreId() が正しい値を返す
- [ ] 全てのAPI呼び出しで addStoreIdToParams を使用
- [ ] StoreContext の currentStore が正しく更新される
- [ ] ページリロード後も選択が維持される

---

**調査・修正担当者へ**: 上記の手順で問題を特定し、適切な修正を実施してください。修正後は全画面でのテストを必ず実施してください。