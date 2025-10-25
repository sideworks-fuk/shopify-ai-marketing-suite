# Azure Static Web Apps ドメイン設定ガイド
## EC Ranger - カスタムドメイン設定と変更方法

作成日: 2025年8月12日  
作成者: Kenji（プロジェクトマネージャー）  
対象者: 福田様（本番環境構築担当）

---

## 📋 はじめに

Azure Static Web Appsでは、柔軟なドメイン設定が可能です。
このガイドでは、ドメインの設定・変更・管理方法を詳しく説明します。

---

## 🌐 ドメイン設定オプション

### 1. デフォルトドメイン
Azure Static Web Appsを作成すると、自動的に以下の形式のドメインが割り当てられます：
```
https://[app-name].azurestaticapps.net
例: https://ec-ranger-frontend-prod.azurestaticapps.net
```

### 2. カスタムドメインの種類

| 種類 | 例 | 用途 |
|------|-----|------|
| **ルートドメイン** | ec-ranger.jp | メインのドメイン |
| **サブドメイン** | www.ec-ranger.jp | WWW付きドメイン |
| **サブドメイン** | app.ec-ranger.jp | アプリケーション用 |
| **複数ドメイン** | ec-ranger.com, ec-ranger.net | 複数ドメイン対応 |

---

## 🔧 カスタムドメインの設定方法

### 方法1: Azure Portal経由

1. **Azure Portalにログイン**
   ```
   https://portal.azure.com
   ```

2. **Static Web Appリソースを選択**
   - リソースグループから該当のStatic Web Appを選択

3. **カスタムドメインの追加**
   - 左メニューから「カスタムドメイン」を選択
   - 「+ 追加」をクリック
   - ドメイン名を入力（例: ec-ranger.jp）

4. **DNS検証方法を選択**
   - **CNAME検証**（サブドメインの場合）
   - **TXT検証**（ルートドメインの場合）

### 方法2: Azure CLI経由

```bash
# カスタムドメインの追加
az staticwebapp hostname set \
  --name ec-ranger-frontend-prod \
  --resource-group ec-ranger-prod-rg \
  --hostname ec-ranger.jp

# 検証トークンの取得
az staticwebapp hostname show \
  --name ec-ranger-frontend-prod \
  --resource-group ec-ranger-prod-rg \
  --hostname ec-ranger.jp
```

### 方法3: GitHub Actions経由

`.github/workflows/azure-static-web-apps.yml`に追加：
```yaml
- name: Configure custom domain
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    custom_domain: ec-ranger.jp
```

---

## 📝 DNS設定手順

### ルートドメインの設定（ec-ranger.jp）

#### Azure DNS使用の場合
```bash
# Aレコードの追加
az network dns record-set a add-record \
  --resource-group ec-ranger-prod-rg \
  --zone-name ec-ranger.jp \
  --record-set-name @ \
  --ipv4-address [Azure提供のIPアドレス]

# TXTレコードの追加（検証用）
az network dns record-set txt add-record \
  --resource-group ec-ranger-prod-rg \
  --zone-name ec-ranger.jp \
  --record-set-name @ \
  --value [Azure提供の検証トークン]
```

#### 外部DNS（お名前.com等）使用の場合

1. **Aレコード設定**
   ```
   ホスト名: @
   タイプ: A
   値: [Azure提供のIPアドレス]
   TTL: 3600
   ```

2. **TXTレコード設定**（検証用）
   ```
   ホスト名: @
   タイプ: TXT
   値: [Azure提供の検証トークン]
   TTL: 3600
   ```

### サブドメインの設定（www.ec-ranger.jp）

#### CNAMEレコード設定
```
ホスト名: www
タイプ: CNAME
値: ec-ranger-frontend-prod.azurestaticapps.net
TTL: 3600
```

---

## 🔄 ドメイン変更手順

### 既存ドメインから新しいドメインへの変更

#### 1. 新ドメインの追加（並行運用期間）
```bash
# 新ドメインを追加（既存ドメインは維持）
az staticwebapp hostname set \
  --name ec-ranger-frontend-prod \
  --resource-group ec-ranger-prod-rg \
  --hostname new-domain.jp
```

#### 2. DNS設定の更新
- 新ドメインのDNSレコードを設定
- 検証が完了するまで待機（通常10-30分）

#### 3. アプリケーション設定の更新
```bash
# 環境変数の更新
az staticwebapp appsettings set \
  --name ec-ranger-frontend-prod \
  --resource-group ec-ranger-prod-rg \
  --setting-names NEXT_PUBLIC_APP_URL=https://new-domain.jp
```

#### 4. Shopify設定の更新
- App URL: `https://new-domain.jp`
- Allowed redirection URLs: 新ドメインを追加
- Webhook URLs: 新ドメインに更新

#### 5. 旧ドメインのリダイレクト設定
`staticwebapp.config.json`に追加：
```json
{
  "routes": [
    {
      "route": "/*",
      "rewrite": "/index.html",
      "headers": {
        "X-Robots-Tag": "noindex"
      }
    }
  ],
  "globalHeaders": {
    "Location": "https://new-domain.jp"
  }
}
```

#### 6. 旧ドメインの削除（移行完了後）
```bash
az staticwebapp hostname delete \
  --name ec-ranger-frontend-prod \
  --resource-group ec-ranger-prod-rg \
  --hostname old-domain.jp
```

---

## ⚙️ 高度な設定

### 複数ドメインの管理

Azure Static Web Appsは複数のカスタムドメインをサポート：

```bash
# 複数ドメインの追加
az staticwebapp hostname set --name ec-ranger-frontend-prod --hostname ec-ranger.jp
az staticwebapp hostname set --name ec-ranger-frontend-prod --hostname ec-ranger.com
az staticwebapp hostname set --name ec-ranger-frontend-prod --hostname ec-ranger.net
```

### ワイルドカードサブドメイン

```bash
# *.ec-ranger.jpの設定
az staticwebapp hostname set \
  --name ec-ranger-frontend-prod \
  --hostname "*.ec-ranger.jp"
```

### SSL証明書

- **自動SSL**: Azure Static Web Appsが自動的に無料SSL証明書を提供
- **カスタムSSL**: Enterprise Edgeプランで独自証明書の使用可能

---

## 🚨 注意事項

### ドメイン変更時の影響

| 項目 | 影響 | 対策 |
|------|------|------|
| **SEO** | 検索順位への影響 | 301リダイレクト設定 |
| **ユーザーアクセス** | ブックマークが無効に | 移行案内ページ設置 |
| **OAuth認証** | 認証エラー発生 | Shopify設定更新必須 |
| **Webhook** | 通知失敗 | URL即座更新必要 |
| **API連携** | 接続エラー | CORS設定更新 |

### ダウンタイムを最小化する方法

1. **並行運用期間の設定**
   - 新旧ドメイン両方を有効に
   - 最低1週間の並行運用推奨

2. **段階的移行**
   ```
   Day 1: 新ドメイン追加・テスト
   Day 2-7: 並行運用
   Day 8: 旧ドメインにリダイレクト設定
   Day 30: 旧ドメイン削除
   ```

3. **事前告知**
   - ユーザーへの事前通知
   - Shopifyストアオーナーへの案内

---

## 📊 ドメイン管理ベストプラクティス

### 推奨構成

```
本番環境: ec-ranger.jp
          www.ec-ranger.jp（ec-ranger.jpへリダイレクト）

ステージング: staging.ec-ranger.jp

開発環境: dev.ec-ranger.jp
```

### DNSプロバイダーの選択

| プロバイダー | メリット | デメリット |
|------------|---------|-----------|
| **Azure DNS** | Azure統合、API管理 | 追加コスト |
| **Cloudflare** | 無料、高速、DDoS対策 | 設定が複雑 |
| **お名前.com** | 日本語サポート | 管理画面が複雑 |

---

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 1. DNS検証が失敗する
```bash
# DNS伝播状況を確認
nslookup ec-ranger.jp
dig TXT ec-ranger.jp

# 解決策
- TTLを短く設定（300秒）
- 24-48時間待機
```

#### 2. SSL証明書エラー
```bash
# 証明書の状態確認
az staticwebapp show \
  --name ec-ranger-frontend-prod \
  --query "customDomains[].validationStatus"

# 解決策
- DNS設定を再確認
- 証明書の再発行をトリガー
```

#### 3. リダイレクトループ
```json
// staticwebapp.config.json
{
  "routes": [
    {
      "route": "/*",
      "rewrite": "/index.html"
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/_app/*"]
  }
}
```

---

## 📝 チェックリスト

### ドメイン変更前
- [ ] 新ドメインのDNS管理権限確認
- [ ] SSL証明書の準備（必要な場合）
- [ ] Shopify App設定の確認
- [ ] バックアップ取得
- [ ] 関係者への通知

### ドメイン変更中
- [ ] 新ドメインをAzure Static Web Appsに追加
- [ ] DNS レコード設定
- [ ] DNS検証完了確認
- [ ] SSL証明書の確認
- [ ] アプリケーション動作確認

### ドメイン変更後
- [ ] Shopify設定更新
- [ ] Webhook URL更新
- [ ] 環境変数更新
- [ ] リダイレクト設定
- [ ] SEO対策（サーチコンソール更新等）

---

## 📚 参考資料

- [Azure Static Web Apps カスタムドメイン](https://docs.microsoft.com/azure/static-web-apps/custom-domain)
- [Azure DNS ドキュメント](https://docs.microsoft.com/azure/dns/)
- [Shopify App URL Requirements](https://shopify.dev/apps/auth/oauth/getting-started#requirements)

---

**最終更新**: 2025年8月12日 15:30  
**作成者**: Kenji（プロジェクトマネージャー）