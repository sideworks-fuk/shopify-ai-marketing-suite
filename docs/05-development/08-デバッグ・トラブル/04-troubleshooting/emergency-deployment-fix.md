# 緊急デプロイ修正手順

## 現在の問題
Error Code: 0x8007023e - ファイルまたはアセンブリが見つからない

## 解決手順

### オプション1: Kudu Console から手動確認

1. アクセス: `https://ec-ranger-backend-prod.scm.azurewebsites.net`
2. Debug console → CMD
3. 確認コマンド:
```cmd
cd D:\home\site\wwwroot
dir *.dll
dotnet --info
```

### オプション2: App Service を完全リセット

1. Azure Portal → App Service
2. 「停止」をクリック
3. 30秒待つ
4. 「開始」をクリック

### オプション3: デプロイソースを変更

1. デプロイセンター → 設定
2. ソース: GitHub
3. リポジトリを再選択
4. ブランチ: main
5. 保存

### オプション4: 手動デプロイ（ZIP Deploy）

PowerShellで実行:
```powershell
cd C:\source\git-h.fukuda1207\shopify-ai-marketing-suite\backend\ShopifyAnalyticsApi

# ビルド
dotnet publish -c Release -o ./publish

# ZIPファイル作成
Compress-Archive -Path ./publish/* -DestinationPath deploy.zip

# Azure CLI でデプロイ（またはKudu UIから）
```

Kudu UI からZIPアップロード:
1. `https://ec-ranger-backend-prod.scm.azurewebsites.net/ZipDeployUI`
2. deploy.zip をドラッグ&ドロップ

## 開発環境の使用（最速）

時間がない場合:
```
https://brave-sea-038f17a00.1.azurestaticapps.net/install
```

この環境は完全に動作しています。
