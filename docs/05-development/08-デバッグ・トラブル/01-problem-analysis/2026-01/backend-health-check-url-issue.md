# バックエンドヘルスチェックページのURL設定問題

**作成日**: 2026-01-03  
**問題**: バックエンドヘルスチェックページが `NEXT_PUBLIC_BACKEND_URL` を正しく読み込んでいない

---

## 📋 問題の概要

### 症状
- バックエンドは `https://localhost:44394` で起動している
- `env.local` に `NEXT_PUBLIC_BACKEND_URL=https://localhost:44394` が設定済み
- しかし、ヘルスチェックページでは「現在の設定: http://localhost:5000」と表示される
- 401 Unauthorized エラーが発生する

### 根本原因
`frontend/src/app/dev/backend-health-check/page.tsx` の Line 15 で、`NEXT_PUBLIC_API_URL` を参照しており、`NEXT_PUBLIC_BACKEND_URL` が無視されていた。

**問題のコード**:
```typescript
// ❌ 問題: NEXT_PUBLIC_API_URL を参照
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
```

---

## 🔧 修正内容

### 修正前
```typescript
// バックエンドURLの設定
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
```

### 修正後
```typescript
import { getApiUrl } from '@/lib/api-config'

// ✅ バックエンドURLの設定（NEXT_PUBLIC_BACKEND_URL を優先的に使用）
// getApiUrl() は NEXT_PUBLIC_BACKEND_URL → NEXT_PUBLIC_API_URL の順で参照します
const backendUrl = getApiUrl()
```

---

## 📊 環境変数の優先順位

`getApiUrl()` 関数は以下の優先順位で環境変数を参照します：

1. **`NEXT_PUBLIC_BACKEND_URL`** （最優先）
2. `NEXT_PUBLIC_API_URL` （フォールバック）
3. 環境設定ファイルからの取得

---

## ✅ 修正後の動作

### 期待される動作
1. `NEXT_PUBLIC_BACKEND_URL=https://localhost:44394` が設定されている場合
   - ヘルスチェックページに「現在の設定: https://localhost:44394」と表示される
   - ヘルスチェックが `https://localhost:44394/api/health` に対して実行される

2. `NEXT_PUBLIC_BACKEND_URL` が設定されていない場合
   - `NEXT_PUBLIC_API_URL` をフォールバックとして使用
   - それも設定されていない場合は、環境設定ファイルから取得

---

## 🧪 確認手順

### Step 1: 環境変数の確認
```bash
# frontend/.env.local を確認
cat frontend/.env.local | grep NEXT_PUBLIC_BACKEND_URL
```

**期待される出力**:
```
NEXT_PUBLIC_BACKEND_URL=https://localhost:44394
```

### Step 2: ブラウザのコンソールで確認
1. ヘルスチェックページを開く: `http://localhost:3000/dev/backend-health-check`
2. ブラウザの開発者ツール > Console タブを開く
3. 以下のログが表示されることを確認:
   ```
   🔍 [BackendHealthCheck] バックエンドURL: https://localhost:44394
   🔍 [BackendHealthCheck] NEXT_PUBLIC_BACKEND_URL: https://localhost:44394
   🔍 [BackendHealthCheck] NEXT_PUBLIC_API_URL: undefined
   ```

### Step 3: ヘルスチェックの実行
1. 「ヘルスチェック実行」ボタンをクリック
2. 「現在の設定: https://localhost:44394」と表示されることを確認
3. ヘルスチェックが成功することを確認（200 OK）

---

## 🔍 関連ファイル

- `frontend/src/app/dev/backend-health-check/page.tsx` - ヘルスチェックページ
- `frontend/src/lib/api-config.ts` - `getApiUrl()` 関数の実装
- `frontend/src/lib/config/environments.ts` - 環境設定
- `frontend/.env.local` - 環境変数設定ファイル

---

## 📝 注意事項

### Next.js の環境変数の読み込み
- `NEXT_PUBLIC_` プレフィックスが付いた環境変数は、クライアントサイドで使用可能
- 環境変数の変更後は、**Next.js 開発サーバーを再起動**する必要がある
- `.env.local` ファイルの変更後は、必ず `npm run dev` を再起動

### バックエンドURLの設定
- ローカル開発環境: `https://localhost:44394` または `http://localhost:5000`
- Azure開発環境: `https://shopifyapp-backend-develop-...azurewebsites.net`
- ステージング環境: `https://shopifytestapi20250720173320-...azurewebsites.net`

---

## 🚀 修正後の確認チェックリスト

- [ ] `frontend/.env.local` に `NEXT_PUBLIC_BACKEND_URL=https://localhost:44394` が設定されている
- [ ] Next.js 開発サーバーを再起動した
- [ ] ヘルスチェックページで「現在の設定: https://localhost:44394」と表示される
- [ ] ブラウザのコンソールで正しいURLがログ出力される
- [ ] ヘルスチェックが成功する（200 OK）
- [ ] 401 Unauthorized エラーが発生しない

---

**更新履歴**:
- 2026-01-03: 初版作成、問題の特定と修正内容を記載
