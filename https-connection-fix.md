# HTTPSローカル接続エラー対処方法

## 問題
- バックエンドサーバーがHTTPS（https://localhost:7088）で起動している
- フロントエンドからの接続でネットワークエラーが発生
- YUKIさんの実装により自動的にHTTPに切り替わっているが、HTTPSで接続したい

## 原因
1. **自己署名証明書の問題**
   - ASP.NET Coreの開発用証明書がブラウザに信頼されていない
   
2. **CORS設定**
   - HTTPSとHTTPの混在による問題の可能性

## 解決方法

### 方法1: HTTPS証明書を信頼する（推奨）

1. **開発用証明書の信頼設定**
   ```bash
   # バックエンドディレクトリで実行
   cd backend/ShopifyAnalyticsApi
   
   # 開発用証明書を信頼
   dotnet dev-certs https --trust
   ```

2. **ブラウザで直接アクセス**
   - ブラウザで https://localhost:7088/api/health にアクセス
   - 証明書の警告が出たら「詳細設定」→「localhost（安全ではありません）にアクセス」
   - これでブラウザが証明書を記憶

3. **環境変数でHTTPS URLを強制**
   ```bash
   # frontend/.env.local を作成または編集
   NEXT_PUBLIC_API_URL=https://localhost:7088
   ```

### 方法2: 一時的にHTTPを使用（現在の実装）

YUKIさんが実装済みの方法：
- `api-config.ts`の70-76行目で自動的にHTTPに切り替え
- これで問題なく動作するはず

### 方法3: バックエンドのHTTPSを無効化

`backend/ShopifyAnalyticsApi/Properties/launchSettings.json`を編集：

```json
{
  "profiles": {
    "ShopifyAnalyticsApi": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "applicationUrl": "http://localhost:7088",  // HTTPSを削除
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

## 推奨対処

1. **開発環境では現在のHTTP自動切り替えを使用**（YUKIさん実装済み）
2. **HTTPSが必要な場合は方法1の証明書信頼を実行**
3. **本番環境では適切なSSL証明書を使用**

## 確認方法

```bash
# バックエンドが正しく起動しているか確認
curl http://localhost:7088/api/health
# または
curl https://localhost:7088/api/health --insecure

# フロントエンドで接続状態を確認
# ブラウザで http://localhost:3000/dev/backend-health-check にアクセス
```