# StoreID決定フロー分析

## 概要
フロントエンドで使用される `storeId` がどのタイミングで決まるかを調査した結果をまとめます。

## 実行日
2025-10-23

## 問題
検証環境の顧客休眠画面で `?storeId=2` でアクセスされているが、この値がどこから来ているか不明でした。

```
🔍 Endpoint: /api/customer/dormant?storeId=2&pageSize=200&sortBy=DaysSinceLastPurchase&descending=true
```

## StoreID取得の仕組み

### 1. getCurrentStoreId() 関数
**場所**: `frontend/src/lib/api-config.ts`

```typescript
export function getCurrentStoreId(): number {
  if (typeof window !== 'undefined') {
    // Phase 2: currentStoreIdのみを使用
    const currentStoreId = localStorage.getItem('currentStoreId')
    return currentStoreId ? parseInt(currentStoreId) : 1
  }
  return 1
}
```

**動作**:
- ブラウザ環境で `localStorage` から `currentStoreId` を取得
- 値が存在すればそれを使用、なければデフォルトの `1` を返す

### 2. currentStoreId が設定されるタイミング

#### タイミング1: アプリ起動時（AuthProvider）
**場所**: `frontend/src/components/providers/AuthProvider.tsx` (Line 58-62)

```typescript
// Phase 2: currentStoreIdのみを使用
const savedStoreId = localStorage.getItem('currentStoreId')
const storeId = savedStoreId ? parseInt(savedStoreId, 10) : 1

console.log('🏪 Store ID:', storeId)
setCurrentStoreId(storeId)
```

**動作**:
- アプリ起動時に localStorage から取得
- 存在しない場合は `1` をデフォルト値として使用

---

#### タイミング2: OAuth認証成功後
**場所**: `frontend/src/app/auth/success/page.tsx` (Line 50-55)

```typescript
// 現在のストアを設定
const storeId = parseInt(searchParams?.get('storeId') || '1');
setCurrentStore(storeId);

// LocalStorageに保存
localStorage.setItem('currentStoreId', storeId.toString());
```

**動作**:
- OAuth認証後のリダイレクトURLに含まれる `storeId` パラメータを取得
- localStorage に保存（この値が以降のアクセスで使用される）

**例**:
```
https://your-app.azurestaticapps.net/auth/success?storeId=2
→ localStorage に currentStoreId=2 が保存される
```

---

#### タイミング3: ストア切り替え時
**場所**: `frontend/src/contexts/StoreContext.tsx` (Line 93-107)

```typescript
const switchStore = (storeId: number) => {
  const store = availableStores.find(s => s.id === storeId)
  if (!store) return

  setIsLoading(true)
  setTimeout(() => {
    setCurrentStore(store)
    // Phase 2: currentStoreIdのみを使用
    localStorage.setItem('currentStoreId', storeId.toString())
    setIsLoading(false)
    
    // ページリロードして新しいデータを取得
    window.location.reload()
  }, 500)
}
```

**動作**:
- ユーザーが画面上でストアを切り替えたとき
- localStorage に新しい storeId を保存し、ページをリロード

---

#### タイミング4: ログイン時
**場所**: `frontend/src/components/providers/AuthProvider.tsx` (Line 94-105)

```typescript
const login = async (storeId: number) => {
  try {
    await authClient.authenticate(storeId)
    
    setIsAuthenticated(true)
    setCurrentStoreId(storeId)
    
    // LocalStorageにstoreIdを保存
    localStorage.setItem('currentStoreId', storeId.toString())
    
    console.log('✅ ログイン成功')
  } catch (error: any) {
    // エラー処理
  }
}
```

**動作**:
- 明示的なログイン処理時に storeId を保存

---

#### タイミング5: マイグレーション時
**場所**: `frontend/src/lib/localstorage-migration.ts` (Line 26-31)

```typescript
// selectedStoreId → currentStoreId への移行
const selectedStoreId = localStorage.getItem('selectedStoreId');
const currentStoreId = localStorage.getItem('currentStoreId');

if (selectedStoreId && !currentStoreId) {
  // selectedStoreIdがあり、currentStoreIdがない場合は移行
  localStorage.setItem('currentStoreId', selectedStoreId);
  console.log('✅ LocalStorage移行: selectedStoreId → currentStoreId');
}
```

**動作**:
- 旧バージョンの `selectedStoreId` から新バージョンの `currentStoreId` へ移行
- アプリ起動時に自動実行

---

## フロー図

```
【初回アクセス】
1. OAuth認証
   ↓
2. /auth/success?storeId=2 にリダイレクト
   ↓
3. localStorage.setItem('currentStoreId', '2')
   ↓
4. ダッシュボードへ移動

【2回目以降のアクセス】
1. アプリ起動
   ↓
2. AuthProvider が localStorage から currentStoreId を取得
   ↓ (値: 2)
3. getCurrentStoreId() が呼ばれる
   ↓
4. API呼び出し: /api/customer/dormant?storeId=2
```

## 検証環境で storeId=2 になっている理由

### 最も可能性の高いシナリオ

1. **OAuth認証時に storeId=2 が設定された**
   - Shopify OAuth のリダイレクト時に `storeId=2` が含まれていた
   - `/auth/success` ページで localStorage に保存された

2. **手動でストアを切り替えた**
   - ストア切り替えUI（もし実装されている場合）で Store #2 を選択した

3. **開発/テスト時に手動設定した**
   - ブラウザの開発者ツールで localStorage を直接変更した

### 確認方法

ブラウザの開発者ツールで以下を確認：

```javascript
// Chrome/Edge DevTools Console で実行
localStorage.getItem('currentStoreId')
// → "2" が返ってくる

// 全ての localStorage を確認
console.log(localStorage)
```

### storeId をリセットする方法

```javascript
// 開発者ツール Console で実行
localStorage.setItem('currentStoreId', '1')
location.reload()
```

## 使用箇所

`getCurrentStoreId()` は以下のファイルで使用されています：

1. `frontend/src/app/customers/dormant/page.tsx` - 休眠顧客分析
2. `frontend/src/lib/api-client.ts` - API呼び出し全般
3. `frontend/src/lib/auth-client.ts` - 認証処理
4. `frontend/src/components/dashboards/DormantCustomerAnalysis.tsx` - 休眠顧客ダッシュボード
5. その他多数のコンポーネント

## 改善提案

### 1. デバッグログの追加

`getCurrentStoreId()` 関数にログを追加して、どこで storeId が決定されているか追跡しやすくする：

```typescript
export function getCurrentStoreId(): number {
  if (typeof window !== 'undefined') {
    const currentStoreId = localStorage.getItem('currentStoreId')
    const storeId = currentStoreId ? parseInt(currentStoreId) : 1
    console.log('🏪 [getCurrentStoreId] StoreID:', storeId, 'from localStorage:', currentStoreId)
    return storeId
  }
  console.log('🏪 [getCurrentStoreId] Server-side, using default: 1')
  return 1
}
```

### 2. StoreID 確認UI の追加

開発環境で現在の storeId を表示するUI：

```tsx
// 開発環境のみ表示
{process.env.NODE_ENV === 'development' && (
  <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded shadow">
    StoreID: {getCurrentStoreId()}
  </div>
)}
```

### 3. 環境別のデフォルト storeId

環境変数で制御できるようにする：

```typescript
export function getCurrentStoreId(): number {
  if (typeof window !== 'undefined') {
    const currentStoreId = localStorage.getItem('currentStoreId')
    const envDefaultStoreId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || '1'
    return currentStoreId ? parseInt(currentStoreId) : parseInt(envDefaultStoreId)
  }
  return 1
}
```

## まとめ

- **storeId の保存場所**: ブラウザの `localStorage` の `currentStoreId` キー
- **決定タイミング**: OAuth認証後、ストア切り替え時、ログイン時
- **検証環境で storeId=2**: 過去のOAuth認証またはストア切り替えで保存された値が使用されている
- **確認方法**: ブラウザの開発者ツールで `localStorage.getItem('currentStoreId')` を実行
- **リセット方法**: `localStorage.setItem('currentStoreId', '1')` を実行してリロード

## 関連ファイル

- `frontend/src/lib/api-config.ts` - getCurrentStoreId() 定義
- `frontend/src/components/providers/AuthProvider.tsx` - 認証と初期化
- `frontend/src/contexts/StoreContext.tsx` - ストア管理
- `frontend/src/app/auth/success/page.tsx` - OAuth後の処理
- `frontend/src/lib/localstorage-migration.ts` - マイグレーション処理

