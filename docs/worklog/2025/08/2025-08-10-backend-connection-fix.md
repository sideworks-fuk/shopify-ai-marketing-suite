# 作業ログ: バックエンド接続エラーの修正

## 作業日時
2025-08-10

## 問題の詳細
フロントエンドからバックエンドAPIへの接続時に、HTTP/HTTPSプロトコルの不一致によるエラーが発生。

### エラー内容
```
バックエンド接続エラー
バックエンドサーバーに接続できません

エラー: ネットワーク接続エラー
1. バックエンドサーバー（http://localhost:7088）が起動していることを確認してください
```

## 原因分析

### 環境変数の不一致
1. `.env.local`の設定:
   - `NEXT_PUBLIC_USE_HTTPS=true`
   - `NEXT_PUBLIC_BACKEND_URL=https://localhost:7088`

2. `api-config.ts`のデフォルト動作:
   - HTTPSが設定されていてもHTTPにフォールバック
   - ハードコーディングされた`http://localhost:7088`

3. エラーメッセージのハードコーディング:
   - `BackendConnectionStatus.tsx`に`http://localhost:7088`がハードコーディング

## 修正内容

### 1. BackendConnectionStatus.tsxの修正
```typescript
// 変更前
<li>バックエンドサーバー（http://localhost:7088）を起動</li>

// 変更後
<li>バックエンドサーバー（{getApiUrl()}）を起動</li>
```

### 2. 推奨される追加修正

#### api-config.tsの改善
環境変数`NEXT_PUBLIC_BACKEND_URL`を最優先で使用するように修正：

```typescript
export const getApiUrl = () => {
  // 環境変数で明示的に指定されている場合は最優先
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.log('✅ Using NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // 以降は既存のロジック
  // ...
}
```

## 解決策

### 開発者向けの設定ガイド

#### HTTPSを使用する場合（推奨）
1. `.env.local`に以下を設定:
```env
NEXT_PUBLIC_USE_HTTPS=true
NEXT_PUBLIC_BACKEND_URL=https://localhost:7088
```

2. バックエンドの証明書設定:
```bash
cd backend/ShopifyAnalyticsApi
dotnet dev-certs https --trust
```

3. ブラウザで`https://localhost:7088`にアクセスして証明書を受け入れる

#### HTTPを使用する場合（証明書エラー回避）
1. `.env.local`に以下を設定:
```env
NEXT_PUBLIC_USE_HTTPS=false
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

2. バックエンドをHTTPで起動:
```bash
cd backend/ShopifyAnalyticsApi
dotnet run --urls "http://localhost:5000"
```

## テスト手順
1. `/dev/backend-health-check`にアクセス
2. 「ヘルスチェック実行」をクリック
3. HTTPとHTTPS両方のエンドポイントをテスト
4. 成功したプロトコルを`.env.local`に設定

## 今後の改善提案
1. 環境変数の優先順位を明確化
2. プロトコル自動検出機能の実装
3. エラーメッセージの動的生成
4. 開発環境セットアップスクリプトの作成

## 関連ファイル
- `/frontend/.env.local`
- `/frontend/src/lib/api-config.ts`
- `/frontend/src/components/common/BackendConnectionStatus.tsx`
- `/frontend/src/app/dev/backend-health-check/page.tsx`

---
記録者: Kenji (AI開発チームリーダー)