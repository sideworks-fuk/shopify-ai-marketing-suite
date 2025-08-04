# 環境変数読み込みトラブルシューティングガイド

## よくある問題と解決方法

### 1. ファイル名の確認

最も多い問題は、ファイル名の誤りです。

```bash
# ❌ 間違い
env.local         # ドットなし

# ✅ 正しい
.env.local        # ドットで始まる（隠しファイル）
```

**修正方法:**
```bash
# ファイル名を修正
mv env.local .env.local

# ファイルの存在確認
ls -la | grep .env
```

### 2. 環境変数の設定

#### 方法A: HTTPS使用フラグ（推奨）
```bash
# .env.local
NEXT_PUBLIC_USE_HTTPS=true
```

#### 方法B: API URLを直接指定
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://localhost:7088
```

### 3. Next.jsの再起動（必須）

環境変数を変更した後は、必ずNext.jsを再起動してください。

```bash
# 1. 現在のプロセスを停止（Ctrl+C）
# 2. 再起動
npm run dev
```

### 4. 動作確認

1. ブラウザで http://localhost:3000/dev/https-config-test にアクセス
2. 環境変数セクションを確認
3. API URLがHTTPSになっていることを確認

### 5. デバッグ方法

#### コンソールログの確認
ブラウザの開発者ツールでコンソールを開き、以下のようなログを確認：
```
🔍 Environment Check:
  - Current Environment: development
  - NEXT_PUBLIC_USE_HTTPS: true
  - API Base URL: https://localhost:7088
```

#### 環境変数の直接確認
```javascript
// ブラウザのコンソールで実行
console.log('NEXT_PUBLIC_USE_HTTPS:', process.env.NEXT_PUBLIC_USE_HTTPS)
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
```

### 6. トラブルシューティングチェックリスト

- [ ] ファイル名は `.env.local` になっているか（ドット付き）
- [ ] 環境変数名は `NEXT_PUBLIC_` で始まっているか
- [ ] Next.jsを再起動したか
- [ ] ブラウザのキャッシュをクリアしたか（Ctrl+Shift+R）
- [ ] `.env.local` ファイルがfrontendディレクトリ直下にあるか
- [ ] 環境変数に余分なスペースやクォートがないか

### 7. 環境変数の優先順位

現在の実装では、以下の優先順位で動作します：

1. `NEXT_PUBLIC_API_URL`（最優先）
2. `NEXT_PUBLIC_USE_HTTPS` フラグ
3. デフォルト設定（HTTP）

### 8. HTTPS証明書エラーの対処

HTTPSを使用する場合、証明書エラーが発生することがあります：

```bash
# バックエンドディレクトリで実行
cd backend/ShopifyAnalyticsApi
dotnet dev-certs https --trust

# ブラウザで直接アクセスして証明書を受け入れる
# https://localhost:7088
```

### 9. それでも解決しない場合

1. `.env.local` ファイルの内容を確認
   ```bash
   cat .env.local
   ```

2. Node.jsのプロセスを完全に終了
   ```bash
   # プロセスを確認
   ps aux | grep node
   
   # 必要に応じてkill
   killall node
   ```

3. node_modulesとキャッシュをクリア（最終手段）
   ```bash
   rm -rf .next node_modules
   npm install
   npm run dev
   ```

## サポート

問題が解決しない場合は、以下の情報と共に報告してください：

- `.env.local` ファイルの内容（秘密情報は除く）
- `npm run dev` の出力
- ブラウザのコンソールログ
- `/dev/https-config-test` ページのスクリーンショット