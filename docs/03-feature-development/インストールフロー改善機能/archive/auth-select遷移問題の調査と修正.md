# `/auth/select`遷移問題の調査と修正

## 作成日
2025-01-27

## 問題の概要
OAuth認証とデモモードの選択画面（`/auth/select`）に遷移しなくなった。

## 原因調査

### 1. リダイレクト条件の確認
`frontend/src/app/page.tsx`のリダイレクト条件：

```typescript
const authConfig = getAuthModeConfig()
const isDevelopment = authConfig.environment === 'development'
const allowsDemo = authConfig.authMode === 'all_allowed' || authConfig.authMode === 'demo_allowed'

if (isDevelopment && allowsDemo && !shop) {
  router.replace('/auth/select')
}
```

### 2. `getAuthModeConfig()`の実装確認
`frontend/src/lib/config/environments.ts`の`getAuthModeConfig()`：

```typescript
const defaultAuthModes: Record<Environment, AuthMode> = {
  production: 'oauth_required',
  staging: 'demo_allowed',
  development: 'all_allowed' // ⚠️ 問題: AllAllowedモードは削除済み
}
```

### 3. 問題の特定

**問題点**:
1. `AllAllowed`モードは2025-12-26に削除されたが、`getAuthModeConfig()`のデフォルト値が`'all_allowed'`のまま
2. `NEXT_PUBLIC_ENVIRONMENT`が設定されていない場合、`'development'`になるが、`NEXT_PUBLIC_AUTH_MODE`が設定されていない場合、`'all_allowed'`になる
3. しかし、`AllAllowed`モードは削除されているため、実際の動作と不一致が発生

## 修正内容

### 1. `getAuthModeConfig()`のデフォルト値を修正
`frontend/src/lib/config/environments.ts`:

```typescript
const defaultAuthModes: Record<Environment, AuthMode> = {
  production: 'oauth_required',
  staging: 'demo_allowed',
  development: 'demo_allowed' // all_allowedからdemo_allowedに変更
}
```

### 2. デバッグログの追加
`frontend/src/app/page.tsx`にデバッグログを追加：

```typescript
console.log('🔍 [ルートページ] 認証設定確認:', {
  environment: authConfig.environment,
  authMode: authConfig.authMode,
  isDevelopment,
  allowsDemo,
  shop,
  NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
  NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
})
```

## 修正後の動作

### 開発環境での動作
1. `NEXT_PUBLIC_ENVIRONMENT=development`（または未設定でデフォルト`development`）
2. `NEXT_PUBLIC_AUTH_MODE`が未設定の場合、`demo_allowed`が使用される
3. `isDevelopment = true`、`allowsDemo = true`（`demo_allowed`のため）
4. `shop`パラメータがない場合、`/auth/select`にリダイレクト

### 環境変数の設定

**開発環境（`.env.local`）**:
```bash
NEXT_PUBLIC_ENVIRONMENT=development
# NEXT_PUBLIC_AUTH_MODEは未設定でOK（デフォルトでdemo_allowedが使用される）
```

**明示的に設定する場合**:
```bash
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_AUTH_MODE=demo_allowed
```

## 検証方法

1. ブラウザで`http://localhost:3000/`にアクセス
2. 開発者ツールのコンソールで以下のログを確認：
   ```
   🔍 [ルートページ] 認証設定確認: {
     environment: 'development',
     authMode: 'demo_allowed',
     isDevelopment: true,
     allowsDemo: true,
     shop: null,
     ...
   }
   ```
3. `/auth/select`ページにリダイレクトされることを確認

## 関連ファイル

- `frontend/src/app/page.tsx` - ルートページのリダイレクトロジック
- `frontend/src/lib/config/environments.ts` - 認証モード設定の取得
- `frontend/src/app/auth/select/page.tsx` - 認証選択画面

## 参考

- [認証モード見直し提案](../05-development/01-環境構築/認証モード見直し提案.md)
- [AllAllowedモード仕様書](../05-development/01-環境構築/AllAllowedモード仕様書.md)（削除済み）
