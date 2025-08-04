# Azure Static Web Apps 環境変数設定ガイド

## 現在の状況

Azure Static Web Appsで環境変数を設定済みとのことです。これで正しいアプローチです！

## 環境変数が反映される仕組み

### 1. Azure Static Web Appsでの設定
Azure Portalで設定した環境変数は、ビルド時とランタイムの両方で利用可能です。

設定場所：
1. Azure Portal → Static Web Apps
2. Configuration → Application settings
3. 以下を追加：
   - `NEXT_PUBLIC_BACKEND_URL`
   - `NEXT_PUBLIC_API_URL`

### 2. ビルドプロセス
Azure Static Web AppsのOryxビルダーが自動的に環境変数を注入します：
- ビルド時: Next.jsのビルドプロセスで使用
- ランタイム: クライアントサイドで使用

### 3. 現在の実装
`environments.ts`の実装により：
1. 環境変数が見つかった場合 → その値を使用
2. 見つからない場合 → デフォルト値を使用

## 追加の対応

### オプション1: 現在の実装のまま（推奨）
- Azure Static Web Appsの環境変数設定のみで動作
- コードの変更不要
- セキュアで柔軟

### オプション2: GitHub Actionsワークフローの修正
`develop_frontend.yml`に環境変数を追加することもできますが、Azure Static Web Appsで設定済みなら不要です。

## 確認方法

デプロイ後、ブラウザのコンソールで確認：
```javascript
// 開発者ツールのコンソールで実行
console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
console.log(process.env.NEXT_PUBLIC_API_URL)
```

## まとめ

✅ **Azure Static Web Appsで環境変数を設定済み** → これが正しい方法です
❌ **GitHub Secretsの設定** → 不要（Azure側で設定済みなら）
❌ **develop_frontend.ymlの修正** → 不要（Azure側で設定済みなら）

現在の設定で問題なくビルドできるはずです！