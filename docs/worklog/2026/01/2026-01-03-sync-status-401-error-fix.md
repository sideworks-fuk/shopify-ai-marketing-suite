# 作業ログ: データ同期機能 401エラー修正

## 作業情報
- 開始日時: 2026-01-03 01:00:00
- 完了日時: 2026-01-03 01:01:37
- 所要時間: 約2時間
- 担当: 福田＋AI Assistant

## 作業概要
データ同期機能で発生していた `GET /api/sync/status/{id}` の401 Unauthorizedエラーを修正しました。

## 問題の原因

### 🔴 根本原因
**ステータスポーリング時に認証ヘッダー（Authorization）が付与されていなかった**

| 項目 | 値 |
|------|-----|
| エラーエンドポイント | `GET /api/sync/status/{id}` |
| HTTPステータス | 401 Unauthorized |
| 原因 | 認証トークンが渡されていない |

### 問題箇所
1. `frontend/src/app/setup/syncing/page.tsx` (41行目)
   - `fetch()` を直接使用しており、認証ヘッダーが付与されていない
2. `frontend/src/components/dashboard/SyncStatusWidget.tsx` (36行目)
   - `syncApi.getStatus()` が認証なしでAPIを呼び出している

## 実施内容

### 1. `frontend/src/app/setup/syncing/page.tsx` の修正

**変更内容**:
- `useAuth()` フックを追加して `getApiClient()` を取得
- `fetchSyncStatus()` を認証付きAPIクライアント（`apiClient.request()`）を使用するように変更
- `handleRetry()` も同様に認証付きAPIクライアントを使用
- エラーハンドリングを改善（401エラーを適切に表示）

**修正前**:
```typescript
const response = await fetch(`${getApiUrl()}/api/sync/status/${syncId}`)
```

**修正後**:
```typescript
const apiClient = getApiClient()
const data = await apiClient.request<SyncStatus>(`/api/sync/status/${syncId}`, {
  method: 'GET',
})
```

### 2. `frontend/src/components/dashboard/SyncStatusWidget.tsx` の修正

**変更内容**:
- `useAuth()` フックを追加
- `fetchStatus()` を認証付きAPIクライアントを使用するように変更
- `handleQuickSync()` も同様に認証付きAPIクライアントを使用
- `isApiClientReady` をチェックして、APIクライアントが準備完了するまで待機

**修正前**:
```typescript
const data = await syncApi.getStatus();
```

**修正後**:
```typescript
const apiClient = getApiClient();
const data = await apiClient.request<SyncStatusData>('/api/sync/status', {
  method: 'GET',
});
```

### 3. エラーハンドリングの改善

**変更内容**:
- 401エラーの場合に「認証エラー: 再ログインしてください」と表示
- 404エラーの場合に「同期IDが見つかりません」と表示
- その他のエラーも適切に表示

**修正例**:
```typescript
catch (err: any) {
  // 401エラーの場合は認証エラーとして表示
  if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
    setError('認証エラー: 再ログインしてください')
  } else if (err?.message?.includes('404') || err?.message?.includes('Not Found')) {
    setError('同期IDが見つかりません')
  } else {
    setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
  }
  console.error('❌ 同期状態の取得エラー:', err)
}
```

## 成果物

### 修正したファイル
- `frontend/src/app/setup/syncing/page.tsx`
  - 認証付きAPIクライアントを使用するように修正
  - エラーハンドリングを改善
- `frontend/src/components/dashboard/SyncStatusWidget.tsx`
  - 認証付きAPIクライアントを使用するように修正
  - APIクライアントの準備完了を待機する処理を追加

### 変更点の詳細

#### `frontend/src/app/setup/syncing/page.tsx`
1. **import追加**: `useAuth`, `useCallback` をインポート
2. **認証フック追加**: `const { getApiClient, isApiClientReady } = useAuth()`
3. **fetchSyncStatus()修正**: 
   - `useCallback` でメモ化して無限ループを防止
   - 認証付きAPIクライアントを使用
4. **handleRetry()修正**: 認証付きAPIクライアントを使用
5. **useEffect修正**: 
   - `isApiClientReady` をチェックして待機
   - `fetchSyncStatus` を依存配列に追加（ESLint警告解消）

#### `frontend/src/components/dashboard/SyncStatusWidget.tsx`
1. **import追加**: `useAuth`, `useCallback` をインポート
2. **認証フック追加**: `const { getApiClient, isApiClientReady } = useAuth()`
3. **fetchStatus()修正**: 
   - `useCallback` でメモ化して無限ループを防止
   - 認証付きAPIクライアントを使用
4. **handleQuickSync()修正**: 認証付きAPIクライアントを使用
5. **useEffect修正**: 
   - `isApiClientReady` をチェックして待機
   - `fetchStatus` を依存配列に追加（ESLint警告解消）

## テスト項目

### 必須テスト（未実施・要確認）
1. [ ] 「今すぐ同期を実行」をクリック
2. [ ] 開発者ツールで `GET /api/sync/status/{id}` が **200 OK** を返すことを確認
3. [ ] 「同期IDが見つかりません」エラーが表示されないことを確認
4. [ ] 同期進捗が更新される（0% → 50% → 100%）
5. [ ] 完了後、データカウントが更新される（顧客データ、注文データ、商品データ）

### エッジケースの確認（未実施・要確認）
1. [ ] 同期中に画面をリロードしても状態が保持される
2. [ ] 長時間の同期でもトークン切れが発生しない
3. [ ] 同期完了後、再度同期を実行できる

## 課題・注意点

### 残課題
1. **テスト未実施**: 修正後の動作確認が必要
2. **`services/syncService.ts`**: 現在未使用だが、将来使用される可能性があるため、同様の修正が必要
3. **`lib/api/sync.ts`**: `syncApi` クラスも認証が必要な可能性があるが、`SyncStatusWidget` で直接修正したため、現状は問題なし

### 注意点
1. **APIクライアントの初期化待機**: `isApiClientReady` をチェックして、APIクライアントが準備完了するまで待機する必要がある
2. **認証トークンの自動付与**: `getApiClient()` から取得した `ApiClient` インスタンスは、Shopify App Bridgeのセッショントークンを自動的に付与する
3. **エラーメッセージの改善**: 401エラーと404エラーを区別して、適切なメッセージを表示

## 関連ファイル
- 作業指示書: `docs/08-shopify/01-申請関連/データ同期機能 エラー調査・修正 作業指示書.md`（要作成）
- 修正ファイル: `frontend/src/app/setup/syncing/page.tsx`
- 修正ファイル: `frontend/src/components/dashboard/SyncStatusWidget.tsx`
- 認証プロバイダー: `frontend/src/components/providers/AuthProvider.tsx`
- APIクライアント: `frontend/src/lib/api-client.ts`

## 参考情報

### 認証フロー
1. `useAuth()` フックから `getApiClient()` を取得
2. `getApiClient()` が返す `ApiClient` インスタンスは、Shopify App Bridgeのセッショントークンを自動的に取得・付与
3. `apiClient.request()` を呼び出すと、`Authorization: Bearer {token}` ヘッダーが自動的に付与される

### 認証付きAPIクライアントの使用方法
```typescript
const { getApiClient, isApiClientReady } = useAuth();

// APIクライアントが準備完了するまで待機
if (!isApiClientReady) {
  return;
}

// 認証付きAPIリクエスト
const apiClient = getApiClient();
const data = await apiClient.request('/api/sync/status/4', {
  method: 'GET',
});
```

## 次のステップ

1. **Staging環境でのテスト**: 修正をStaging環境にデプロイして動作確認
2. **開発者ツールでの確認**: Networkタブで `Authorization` ヘッダーが付与されていることを確認
3. **エラーログの確認**: Application Insightsで401エラーが解消されたことを確認
4. **`services/syncService.ts` の修正**: 将来使用される可能性があるため、同様の修正を検討

---

**更新日**: 2026-01-03
**ステータス**: ✅ 修正完了（テスト未実施）
