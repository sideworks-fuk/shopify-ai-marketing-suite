# 404エラー - useEffect複数回実行問題

## 作成日
2025-12-28

## 目的
`AuthSuccessPage`の`useEffect`が3回実行され、3回目で`storeId: null`になる問題を調査する。

---

## 問題の概要

### 症状
1. `[AuthSuccess] 処理開始`が3回実行されている
2. 1回目・2回目: `storeId: '19'` ✅
3. 3回目: `storeId: null` ❌

### ログの詳細
```
🚀 [AuthSuccess] 処理開始: {shop: 'xn-fbkq6e5da0fpb.myshopify.com', storeId: '19', success: 'true'}  // 1回目
🚀 [AuthSuccess] 処理開始: {shop: 'xn-fbkq6e5da0fpb.myshopify.com', storeId: '19', success: 'true'}  // 2回目
🚀 [AuthSuccess] 処理開始: {shop: 'xn-fbkq6e5da0fpb.myshopify.com', storeId: null, success: null}    // 3回目 ❌
```

---

## 原因の分析

### 問題1: コンポーネントの再マウント

**可能性**:
- Next.jsのApp Routerで`useSearchParams`を使用すると、URLパラメータが変更されるたびにコンポーネントが再レンダリングされる
- 開発モードでStrict Modeが有効になっている場合、コンポーネントが2回マウントされる
- リダイレクト処理中にコンポーネントが再マウントされる

**影響**:
- `hasProcessedRef.current`が`false`にリセットされる
- `useEffect`が再度実行される

---

### 問題2: `hasProcessedRef`のチェックが機能していない

**現在の実装**:
```typescript
const hasProcessedRef = useRef(false);

useEffect(() => {
  if (hasProcessedRef.current) {
    console.log('⏸️ [AuthSuccess] 既に処理済みのため、スキップ');
    return;
  }
  
  hasProcessedRef.current = true;
  // ...
}, []);
```

**問題**:
- コンポーネントが再マウントされると、`useRef`がリセットされる
- `hasProcessedRef.current`が`false`に戻る
- `useEffect`が再度実行される

---

### 問題3: 3回目で`storeId: null`になる原因

**可能性**:
1. URLパラメータが変更された（リダイレクト処理中）
2. `searchParams`が更新された
3. コンポーネントが再マウントされた時点で、URLパラメータがまだ設定されていない

---

## 解決策

### 解決策1: `sessionStorage`を使用して処理状態を永続化

**実装**:
```typescript
useEffect(() => {
  // sessionStorageから処理状態を確認
  const processedKey = 'auth_success_processed';
  const processed = typeof window !== 'undefined' 
    ? sessionStorage.getItem(processedKey) 
    : null;
  
  if (processed === 'true') {
    console.log('⏸️ [AuthSuccess] 既に処理済みのため、スキップ');
    return;
  }
  
  // 処理開始をマーク
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(processedKey, 'true');
  }
  
  // ...
}, []);
```

**メリット**:
- コンポーネントが再マウントされても、処理状態が保持される
- ブラウザのタブを閉じるまで有効

**デメリット**:
- タブを閉じるまで処理が実行されない

---

### 解決策2: URLパラメータを最初に取得してから処理

**実装**:
```typescript
useEffect(() => {
  // URLパラメータを最初に取得
  const shop = searchParams?.get('shop');
  const storeId = searchParams?.get('storeId');
  const success = searchParams?.get('success');
  
  // 必須パラメータが揃うまで待つ
  if (!shop || !storeId || !success) {
    console.log('⏸️ [AuthSuccess] 必須パラメータが揃っていません。待機中...');
    return;
  }
  
  // 処理済みチェック（URLパラメータを含める）
  const processedKey = `auth_success_processed_${shop}_${storeId}`;
  const processed = typeof window !== 'undefined' 
    ? sessionStorage.getItem(processedKey) 
    : null;
  
  if (processed === 'true') {
    console.log('⏸️ [AuthSuccess] 既に処理済みのため、スキップ');
    return;
  }
  
  // 処理開始をマーク
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(processedKey, 'true');
  }
  
  // ...
}, [searchParams]);
```

**メリット**:
- URLパラメータが揃ってから処理を開始
- 同じ`shop`と`storeId`の組み合わせで1回だけ処理

**デメリット**:
- `searchParams`を依存配列に含めるため、URLパラメータが変更されるたびに実行される可能性がある

---

### 解決策3: `useRef`と`sessionStorage`を組み合わせる

**実装**:
```typescript
const hasProcessedRef = useRef(false);

useEffect(() => {
  // 既に処理済みの場合はスキップ
  if (hasProcessedRef.current) {
    console.log('⏸️ [AuthSuccess] 既に処理済みのため、スキップ（useRef）');
    return;
  }
  
  // sessionStorageからも確認
  const processedKey = 'auth_success_processed';
  const processed = typeof window !== 'undefined' 
    ? sessionStorage.getItem(processedKey) 
    : null;
  
  if (processed === 'true') {
    console.log('⏸️ [AuthSuccess] 既に処理済みのため、スキップ（sessionStorage）');
    hasProcessedRef.current = true; // useRefも更新
    return;
  }
  
  // URLパラメータを取得
  const shop = searchParams?.get('shop');
  const storeId = searchParams?.get('storeId');
  const success = searchParams?.get('success');
  
  // 必須パラメータが揃うまで待つ
  if (!shop || !storeId || !success) {
    console.log('⏸️ [AuthSuccess] 必須パラメータが揃っていません。待機中...', { shop, storeId, success });
    return;
  }
  
  // 処理開始をマーク
  hasProcessedRef.current = true;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(processedKey, 'true');
  }
  
  // ...
}, [searchParams]);
```

**メリット**:
- `useRef`と`sessionStorage`の両方でチェック
- コンポーネントが再マウントされても処理状態が保持される
- URLパラメータが揃ってから処理を開始

---

## 推奨される解決策

**解決策3**を推奨します。理由：
1. `useRef`と`sessionStorage`の両方でチェックできる
2. コンポーネントが再マウントされても処理状態が保持される
3. URLパラメータが揃ってから処理を開始できる

---

## 参考資料

- [ログ分析結果と問題特定](./404エラー-ログ分析結果と問題特定.md)
- [ProcessOAuthSuccessAsync実行確認](./404エラー-ProcessOAuthSuccessAsync実行確認.md)

---

## 更新履歴

- 2025-12-28: 初版作成（useEffect複数回実行問題）
