# ストア切り替え機能 実装ガイド for TAKASHI

## 📌 実装概要

休眠顧客分析画面の実装が完了したTAKASHIさんに、開発・テスト用のストア切り替え機能を実装していただきます。
YUKIさんの条件設定パターンと同様に、段階的で分かりやすい実装を目指します。

## 🎯 実装タスク

### ステップ1: Context Provider 作成（30分）

#### 1.1 StoreContext.tsx を作成
**ファイル**: `frontend/src/contexts/StoreContext.tsx`

```tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface StoreInfo {
  id: number
  name: string
  description: string
  dataType: 'production' | 'test'
}

interface StoreContextType {
  currentStore: StoreInfo
  availableStores: StoreInfo[]
  switchStore: (storeId: number) => void
  isLoading: boolean
}

// ストア定義
const AVAILABLE_STORES: StoreInfo[] = [
  {
    id: 1,
    name: "本番ストア",
    description: "実際のデータ",
    dataType: "production"
  },
  {
    id: 2,
    name: "テストストア",
    description: "2020-2025年テストデータ",
    dataType: "test"
  }
]

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<StoreInfo>(AVAILABLE_STORES[0])
  const [isLoading, setIsLoading] = useState(false)

  // ローカルストレージから復元
  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId')
    if (savedStoreId) {
      const store = AVAILABLE_STORES.find(s => s.id === parseInt(savedStoreId))
      if (store) {
        setCurrentStore(store)
      }
    }
  }, [])

  const switchStore = (storeId: number) => {
    const store = AVAILABLE_STORES.find(s => s.id === storeId)
    if (!store) return

    setIsLoading(true)
    setTimeout(() => {
      setCurrentStore(store)
      localStorage.setItem('selectedStoreId', storeId.toString())
      setIsLoading(false)
      
      // ページリロードして新しいデータを取得
      window.location.reload()
    }, 500)
  }

  return (
    <StoreContext.Provider value={{
      currentStore,
      availableStores: AVAILABLE_STORES,
      switchStore,
      isLoading
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
```

### ステップ2: ストア選択UIコンポーネント（30分）

#### 2.1 StoreSelector.tsx を作成
**ファイル**: `frontend/src/components/common/StoreSelector.tsx`

```tsx
"use client"

import { useStore } from '@/contexts/StoreContext'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Store, Loader2 } from 'lucide-react'

export function StoreSelector() {
  const { currentStore, availableStores, switchStore, isLoading } = useStore()

  return (
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">ストア:</span>
      
      <Select
        value={currentStore.id.toString()}
        onValueChange={(value) => switchStore(parseInt(value))}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>切り替え中...</span>
            </div>
          ) : (
            <SelectValue>
              <div className="flex items-center gap-2">
                <span>{currentStore.name}</span>
                <Badge 
                  variant={currentStore.dataType === 'production' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {currentStore.dataType === 'production' ? '本番' : 'テスト'}
                </Badge>
              </div>
            </SelectValue>
          )}
        </SelectTrigger>
        
        <SelectContent>
          {availableStores.map((store) => (
            <SelectItem key={store.id} value={store.id.toString()}>
              <div className="flex items-center justify-between w-full">
                <span>{store.name}</span>
                <Badge 
                  variant={store.dataType === 'production' ? 'default' : 'secondary'}
                  className="ml-2 text-xs"
                >
                  {store.dataType === 'production' ? '本番' : 'テスト'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {store.description}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

### ステップ3: API設定の更新（20分）

#### 3.1 api-config.ts を更新
**ファイル**: `frontend/src/lib/api-config.ts`

```typescript
// 既存のコードに追加

// ストアIDを取得する関数を追加
export function getCurrentStoreId(): number {
  if (typeof window !== 'undefined') {
    const savedStoreId = localStorage.getItem('selectedStoreId')
    return savedStoreId ? parseInt(savedStoreId) : 1
  }
  return 1
}

// APIパラメータにstoreIdを自動追加する関数
export function addStoreIdToParams(params: URLSearchParams | Record<string, any>): URLSearchParams {
  const searchParams = params instanceof URLSearchParams 
    ? params 
    : new URLSearchParams(params)
  
  // storeIdが既に設定されていない場合のみ追加
  if (!searchParams.has('storeId')) {
    searchParams.set('storeId', getCurrentStoreId().toString())
  }
  
  return searchParams
}
```

### ステップ4: 既存コンポーネントの更新（20分）

#### 4.1 休眠顧客分析コンポーネントの例
**ファイル**: `frontend/src/components/dashboards/DormantCustomerAnalysis.tsx`

```tsx
// import に追加
import { addStoreIdToParams } from '@/lib/api-config'

// fetchAnalysisData 関数内で使用
const fetchAnalysisData = async () => {
  try {
    setIsLoading(true)
    
    // 既存のパラメータ設定
    const params = {
      startYear: dateRange.startYear,
      startMonth: dateRange.startMonth,
      endYear: dateRange.endYear,
      endMonth: dateRange.endMonth,
      inactiveDays: thresholdDays
    }
    
    // storeIdを自動追加
    const searchParams = addStoreIdToParams(params)
    
    const response = await fetch(
      `${getApiUrl()}/api/analytics/dormant-customers?${searchParams}`
    )
    
    // 以下既存の処理...
  } catch (error) {
    // エラー処理...
  }
}
```

### ステップ5: レイアウトへの統合（10分）

#### 5.1 app/layout.tsx を更新
**ファイル**: `frontend/src/app/layout.tsx`

```tsx
import { StoreProvider } from '@/contexts/StoreContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <StoreProvider>
          {/* 既存のProvider */}
          {children}
        </StoreProvider>
      </body>
    </html>
  )
}
```

#### 5.2 ヘッダーコンポーネントを更新
**ファイル**: 適切なヘッダーコンポーネント（DashboardLayout等）

```tsx
import { StoreSelector } from '@/components/common/StoreSelector'

// ヘッダーの適切な場所に追加
<div className="flex items-center gap-4">
  {/* 既存のヘッダー要素 */}
  <StoreSelector />
</div>
```

### ステップ6: 動作確認（30分）

#### 6.1 テスト手順
1. **初期表示確認**
   - ヘッダーに「本番ストア」が表示される
   
2. **ストア切り替え**
   - ドロップダウンから「テストストア」を選択
   - ローディング表示後、ページがリロード
   - データが切り替わることを確認

3. **永続化確認**
   - ブラウザをリロード
   - 「テストストア」が選択されたままであることを確認

4. **API確認**
   - ブラウザの開発者ツール > Network タブ
   - APIリクエストに `storeId=2` が含まれることを確認

#### 6.2 画面別確認項目

| 画面 | ストア1（本番） | ストア2（テスト） |
|------|-----------------|-------------------|
| 休眠顧客分析 | 実際の休眠顧客 | 山田由美（350日休眠）等 |
| 購入回数分析 | 実際の購入分布 | 5階層の設計パターン |
| 前年同月比 | 実際の売上データ | 2020-2025年の完全データ |

## 📝 実装チェックリスト

### 必須タスク
- [ ] StoreContext.tsx 作成
- [ ] StoreSelector.tsx 作成
- [ ] api-config.ts に関数追加
- [ ] layout.tsx に Provider 追加
- [ ] ヘッダーに StoreSelector 配置
- [ ] 少なくとも1つの分析画面でテスト

### 推奨タスク
- [ ] 全分析画面での適用
- [ ] エラーハンドリング追加
- [ ] ローディング中のUI改善

## 💡 実装のコツ

1. **シンプルに始める**
   - まずは基本機能の動作を優先
   - ページリロードでの切り替えでOK

2. **段階的に適用**
   - 最初は休眠顧客分析画面のみ
   - 動作確認後、他の画面へ展開

3. **エラー対応**
   - storeId=2 でデータがない場合の処理
   - ネットワークエラー時の対応

## 🎯 期待される成果

- **開発効率向上**: テストデータと本番データの即座切り替え
- **テスト品質向上**: 設計されたテストパターンでの動作確認
- **デモ準備**: ストア2の豊富なデータでデモ実施可能

---

**実装担当**: TAKASHIさん  
**想定工数**: 2-3時間  
**優先度**: 中（開発効率向上）  
**サポート**: 不明な点はケンジまで！