# GitHub Actions ビルドエラー修正ガイド

## エラー内容

1. **Node.jsバージョンエラー**
   ```
   npm warn EBADENGINE Unsupported engine {
     package: '@shopify/polaris@13.9.5',
     required: { node: '>=20.10.0' },
     current: { node: 'v18.20.8', npm: '10.8.2' }
   }
   ```

2. **環境変数エラー**
   ```
   Error: NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_API_URL environment variable is required
   ```

## 修正内容

### 1. Node.jsバージョン指定
- `.nvmrc`ファイル作成: `20.10.0`
- `package.json`に`engines`フィールド追加

### 2. ビルド時の環境変数処理
`src/lib/config/environments.ts`を修正：
- ビルド時（`typeof window === 'undefined'`）の処理を追加
- 環境変数が見つからない場合のフォールバック処理
- 本番環境のデフォルトURL設定

### 3. GitHub Secretsの設定が必要
以下の環境変数をGitHub Secretsに追加してください：

```
NEXT_PUBLIC_BACKEND_URL=https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
NEXT_PUBLIC_API_URL=https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
```

または、Azure Static Web Appsの環境変数として設定：
1. Azure Portal → Static Web Apps
2. Configuration → Application settings
3. 上記の環境変数を追加

## Azure Static Web AppsでのNode.jsバージョン

Azure Static Web AppsのOryxビルダーは`.nvmrc`ファイルを読んでNode.jsバージョンを決定します。

## 確認事項

1. GitHub Actionsのワークフローで環境変数が正しく設定されているか
2. Azure Static Web Appsの環境変数設定
3. Node.js 20.10.0以上がビルド環境で使用されているか