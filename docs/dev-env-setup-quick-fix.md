# 開発環境 HTTPS設定 - クイックフィックス

## 問題
- `env.local`ファイルを設定したが環境変数が読み込まれない
- HTTPSを使いたいがHTTPに切り替わってしまう

## 解決方法

### 1. ファイル名を修正（最も可能性が高い原因）
```bash
cd frontend
# ドットで始まる正しいファイル名に変更
mv env.local .env.local
```

### 2. Next.jsを再起動
```bash
# Ctrl+C で停止してから
npm run dev
```

### 3. 環境変数を確認
`.env.local`ファイルに以下を追加：
```bash
# HTTPSを強制使用
NEXT_PUBLIC_USE_HTTPS=true
```

### 4. ブラウザで確認
- http://localhost:3000/dev/https-config-test にアクセス
- 環境変数が正しく読み込まれているか確認

## それでも動作しない場合

### 方法A: 直接API URLを指定
`.env.local`に：
```bash
NEXT_PUBLIC_API_URL=https://localhost:7088
```

### 方法B: キャッシュクリア
```bash
# .next ディレクトリを削除
rm -rf .next
npm run dev
```

## 注意事項
- 環境変数の変更後は必ずNext.jsの再起動が必要
- ファイル名は必ず `.env.local`（ドットで始まる）
- `env.local`（ドットなし）では読み込まれない