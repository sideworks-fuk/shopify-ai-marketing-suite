# バックエンドURL DNS解決エラー修正手順

## 問題
- `ERR_NAME_NOT_RESOLVED` エラーが発生
- フロントエンドからバックエンドAPIに接続できない
- Swaggerは正常に開ける（バックエンドは起動している）

## 原因
フロントエンドが使用しているURL `https://ec-ranger-backend-prod-ghf3bbargbc4hfgh.japanwest-01.azurewebsites.net` が実際のApp ServiceのURLと異なる可能性があります。

## 解決手順

### ステップ1: Azure Portalで実際のURLを確認

1. Azure Portalにログイン
2. **App Service** → `ec-ranger-backend-prod` を選択
3. **概要** タブを開く
4. **URL** フィールドの値をコピー

**実際のURL例：**
```
https://ec-ranger-backend-prod-XXXXXXXX.japanwest-01.azurewebsites.net
```
（`XXXXXXXX` の部分が異なる可能性があります）

### ステップ2: フロントエンドの環境変数を修正

#### 方法A: Azure Static Web Appsの環境変数を修正（推奨）

1. Azure Portal → **Static Web Apps** → `white-island-08e0a6300` を選択
2. **構成** → **アプリケーション設定** を開く
3. `NEXT_PUBLIC_API_URL` を探す
4. 値を実際のURL（ステップ1で確認したURL）に変更
5. **保存** をクリック（自動的に再起動されます）

#### 方法B: GitHub Actionsワークフローファイルを修正（次回デプロイ時に反映）

以下のファイルを修正：

1. `.github/workflows/production_frontend.yml` (63行目)
2. `.github/workflows/production_deploy_all.yml` (155行目)

```yaml
# 修正前
NEXT_PUBLIC_API_URL: 'https://ec-ranger-backend-prod-ghf3bbargbc4hfgh.japanwest-01.azurewebsites.net'

# 修正後（実際のURLに置き換え）
NEXT_PUBLIC_API_URL: 'https://ec-ranger-backend-prod-実際のURL.japanwest-01.azurewebsites.net'
```

### ステップ3: 動作確認

1. ブラウザのキャッシュをクリア（Ctrl+Shift+R または Cmd+Shift+R）
2. インストールページにアクセス
3. ブラウザの開発者ツール（F12）→ ネットワーク タブでAPIリクエストを確認
4. `ERR_NAME_NOT_RESOLVED` エラーが解消されていることを確認

## 確認方法

### バックエンドが正しく動作しているか確認

ブラウザで直接アクセス：
```
https://[実際のURL]/swagger
https://[実際のURL]/hangfire
```

これらのURLが開ければ、バックエンドは正常に動作しています。

### フロントエンドで使用されているURLを確認

ブラウザのコンソール（F12）で：
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

または、インストールページのログで確認：
```
🔍 Using NEXT_PUBLIC_API_URL: [URL]
```

## 関連ドキュメント
- `backend-url-verification.md` - バックエンドURL確認手順
- `production-environment-summary.md` - 本番環境構成サマリー

