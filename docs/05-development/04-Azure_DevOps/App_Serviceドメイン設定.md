# Azure App Service カスタムドメイン設定ガイド
## EC Ranger バックエンド - カスタムドメイン設定と変更方法

作成日: 2026年1月16日  
作成者: AI Assistant  
対象者: 福田様（本番環境構築担当）

---

## 📋 はじめに

Azure App Service（バックエンドAPI）でも、フロントエンドと同様にカスタムドメイン設定が可能です。  
カスタムドメインを使用することで、以下のメリットがあります：

- ✅ **セキュリティソフトによる誤検知回避**（Trend Microなど）
- ✅ **プロフェッショナルなURL**（`ec-ranger-backend.access-net.co.jp`）
- ✅ **SSL証明書の無料自動提供**（App Service Managed Certificate）
- ✅ **DNS管理の統一**（access-net.co.jp配下で管理）

---

## 🌐 ドメイン設定オプション

### 1. デフォルトドメイン（現状）
Azure App Serviceを作成すると、自動的に以下の形式のドメインが割り当てられます：
```
https://[app-name]-[suffix].japanwest-01.azurewebsites.net
例: https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net
```

**問題点：**
- ❌ Trend Microなどのセキュリティソフトでブロックされる可能性
- ❌ 長くて覚えにくい
- ❌ SSL証明書の不一致エラーが発生する場合がある

### 2. カスタムドメイン（推奨）

| 種類 | 例 | 用途 |
|------|-----|------|
| **サブドメイン** | ec-ranger-backend.access-net.co.jp | 本番環境バックエンド |
| **サブドメイン** | ec-ranger-api.access-net.co.jp | 別名（API用） |

**メリット：**
- ✅ セキュリティソフトによる誤検知回避
- ✅ 短くて覚えやすい
- ✅ SSL証明書が無料で自動提供される

---

## 🔧 カスタムドメインの設定方法

### 方法1: Azure Portal経由（推奨）

#### ステップ1: カスタムドメインの追加

1. **Azure Portalにログイン**
   ```
   https://portal.azure.com
   ```

2. **App Serviceリソースを選択**
   - リソースグループ `ec-ranger-prod` から
   - `ec-ranger-backend-prod` を選択

3. **カスタムドメインの追加**
   - 左メニューから「**カスタム ドメイン**」を選択
   - 「**+ カスタム ドメインの追加**」をクリック
   - ドメイン名を入力（例: `ec-ranger-backend.access-net.co.jp`）

4. **検証方法の選択**
   - **CNAME検証**（サブドメインの場合）← こちらを選択
   - **Aレコード検証**（ルートドメインの場合）

5. **DNS検証情報の確認**
   - Azure Portalに表示される **CNAMEレコード値** をメモ
   - 例: `ec-ranger-backend-prod.azurewebsites.net`

#### ステップ2: DNS設定（access-net.co.jp側）

**DNS管理者に依頼して、以下を設定してもらう：**

```
ホスト名: ec-ranger-backend
タイプ: CNAME
値: ec-ranger-backend-prod.azurewebsites.net
TTL: 3600（または任意）
```

**注意：**
- リージョン付きURL（`...japanwest-01.azurewebsites.net`）ではなく、
- **通常のURL（`.azurewebsites.net`）を指定**してください。

#### ステップ3: DNS検証の完了待機

- DNS設定後、**10分〜1時間**待機（DNS伝播のため）
- Azure Portalの「カスタム ドメイン」画面で検証状況を確認
- 「**検証済み**」になれば次のステップへ

#### ステップ4: SSL証明書のバインド

1. **App Service Managed Certificate を選択**
   - カスタムドメイン画面で「**TLS/SSL バインド**」をクリック
   - 「**+ TLS/SSL バインドの追加**」を選択
   - **証明書の種類**: `App Service Managed Certificate`（無料）
   - **プライベート証明書の種類**: `SNI SSL`
   - 「**追加**」をクリック

2. **証明書の発行待機**
   - 通常 **数分〜数時間**で証明書が発行されます
   - 「**証明書の状態**」が「**発行済み**」になれば完了

#### ステップ5: HTTPSリダイレクト設定

1. **HTTPS強制設定**
   - 左メニュー「**設定**」→「**構成（プレビュー）**」
   - 「**全般設定**」タブ
   - 「**HTTPS のみ**」を `オン` に設定
   - 「**保存**」をクリック

---

### 方法2: Azure CLI経由

```bash
# カスタムドメインの追加
az webapp config hostname add \
  --resource-group ec-ranger-prod \
  --webapp-name ec-ranger-backend-prod \
  --hostname ec-ranger-backend.access-net.co.jp

# SSL証明書のバインド（App Service Managed Certificate）
az webapp config ssl bind \
  --resource-group ec-ranger-prod \
  --name ec-ranger-backend-prod \
  --certificate-type AppServiceManaged \
  --hostname ec-ranger-backend.access-net.co.jp \
  --ssl-type SNI

# HTTPS強制設定
az webapp update \
  --resource-group ec-ranger-prod \
  --name ec-ranger-backend-prod \
  --https-only true
```

---

## 💰 SSL証明書のコスト

### App Service Managed Certificate（無料）

✅ **完全無料**で自動提供されるSSL証明書  
✅ 自動更新（手動作業不要）  
✅ ワイルドカード証明書にも対応（`*.access-net.co.jp`）

**条件：**
- App Service プランが **Basic 以上**であること
- カスタムドメインが検証済みであること
- CNAMEレコードで正しく設定されていること

**注意：**
- 証明書の発行に **数分〜数時間**かかる場合があります
- 一度発行されれば、自動的に更新されます

---

## 🔄 ドメイン変更後の必須作業

### 1. アプリケーション設定の更新

**Azure Portal経由：**
- App Service → **設定** → **構成（プレビュー）** → **アプリケーション設定**
- 以下の環境変数を更新：
  - `AllowedOrigins`: フロントエンドURL（必要に応じて）
  - `Shopify:AppUrl`: 新ドメイン（必要に応じて）

**注意：**
- OAuth認証やWebhook URLは **Shopify側の設定**で更新が必要です

### 2. Shopify設定の更新（重要）

**Shopify Partner Dashboard で以下を更新：**

1. **App URL**
   ```
   旧: https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net
   新: https://ec-ranger-backend.access-net.co.jp
   ```

2. **Allowed redirection URLs**
   - 旧URLを削除
   - 新URLを追加
   ```
   https://ec-ranger-backend.access-net.co.jp/api/auth/callback
   https://ec-ranger-backend.access-net.co.jp/api/oauth/redirect
   ```

3. **Webhook URLs**
   - すべてのWebhook URLを新ドメインに更新
   ```
   https://ec-ranger-backend.access-net.co.jp/api/webhooks/app/uninstalled
   https://ec-ranger-backend.access-net.co.jp/api/webhooks/app_subscriptions/update
   https://ec-ranger-backend.access-net.co.jp/api/webhooks/app_subscriptions/cancelled
   ```

### 3. フロントエンド環境変数の更新

**GitHub Environment Variables を更新：**

- `NEXT_PUBLIC_API_URL`: 新バックエンドURLに更新
  ```
  旧: https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net
  新: https://ec-ranger-backend.access-net.co.jp
  ```

**更新方法：**
1. GitHubリポジトリ → **Settings** → **Environments**
2. 対象環境（`development`, `staging`, `production`）を選択
3. **Variables** タブで `NEXT_PUBLIC_API_URL` を更新

### 4. CORS設定の確認

バックエンドのCORS設定で、フロントエンドのドメインが許可されているか確認：

```csharp
// Program.cs の CORS設定例
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "https://brave-sea-038f17a00.1.azurestaticapps.net",
            "https://ec-ranger.access-net.co.jp" // フロントエンドのカスタムドメイン（将来）
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});
```

---

## 🚨 注意事項

### ドメイン変更時の影響

| 項目 | 影響 | 対策 |
|------|------|------|
| **OAuth認証** | 認証エラー発生 | Shopify設定を**即座に**更新 |
| **Webhook** | 通知失敗 | すべてのWebhook URLを**即座に**更新 |
| **API連携** | 接続エラー | フロントエンド環境変数を更新 |
| **CORS** | フロントエンドからアクセス不可 | CORS設定を確認・更新 |
| **ブックマーク** | 旧URLが無効に | 必要に応じてリダイレクト設定 |

### ダウンタイムを最小化する方法

1. **並行運用期間の設定**
   - 新旧ドメイン両方を有効に維持
   - 最低 **1週間**の並行運用を推奨

2. **段階的移行スケジュール**
   ```
   Day 1: 新ドメイン追加・DNS設定
   Day 2-7: 並行運用（両方のURLで動作確認）
   Day 8: Shopify設定・環境変数更新
   Day 15: 旧ドメインの削除検討（必要に応じて）
   ```

3. **事前テスト**
   - 新ドメインでAPI動作確認
   - OAuth認証フローのテスト
   - Webhookの動作確認

---

## 📊 ドメイン管理ベストプラクティス

### 推奨構成

```
本番環境（バックエンド）: ec-ranger-backend.access-net.co.jp
ステージング（バックエンド）: ec-ranger-backend-staging.access-net.co.jp
開発環境（バックエンド）: ec-ranger-backend-dev.access-net.co.jp

本番環境（フロントエンド）: ec-ranger.access-net.co.jp
ステージング（フロントエンド）: ec-ranger-staging.access-net.co.jp
開発環境（フロントエンド）: ec-ranger-dev.access-net.co.jp
```

### DNSプロバイダーの選択

| プロバイダー | メリット | デメリット |
|------------|---------|-----------|
| **Azure DNS** | Azure統合、API管理 | 追加コスト（月額約200円/ゾーン） |
| **お名前.com** | 日本語サポート、低価格 | 管理画面が複雑 |
| **Cloudflare** | 無料、高速、DDoS対策 | 設定がやや複雑 |

---

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 1. DNS検証が失敗する

**症状：**
- Azure Portalで「検証済み」にならない
- `ERR_NAME_NOT_RESOLVED` エラー

**解決策：**
```bash
# DNS伝播状況を確認
nslookup ec-ranger-backend.access-net.co.jp
dig CNAME ec-ranger-backend.access-net.co.jp

# 確認ポイント
- CNAMEレコードが正しく設定されているか
- リージョン付きURL（...japanwest-01...）を使っていないか
- TTLを短く設定（300秒）して再試行
- 24-48時間待機（DNS伝播のため）
```

#### 2. SSL証明書が発行されない

**症状：**
- 証明書の状態が「発行中」のまま
- `ERR_SSL_PROTOCOL_ERROR` エラー

**解決策：**
```bash
# 証明書の状態確認
az webapp config ssl list \
  --resource-group ec-ranger-prod \
  --query "[].{Name:name, State:state, Thumbprint:thumbprint}"

# 解決策
- DNS設定を再確認（CNAMEが正しく設定されているか）
- App ServiceプランがBasic以上であることを確認
- 証明書の再発行をトリガー（Azure Portal → カスタムドメイン → 証明書の削除 → 再追加）
```

#### 3. HTTPSリダイレクトが機能しない

**症状：**
- HTTPでアクセスしてもHTTPSにリダイレクトされない
- 混在コンテンツエラー

**解決策：**
```bash
# HTTPS強制設定の確認
az webapp config show \
  --resource-group ec-ranger-prod \
  --name ec-ranger-backend-prod \
  --query "httpsOnly"

# 解決策
- 「HTTPS のみ」を `true` に設定
- App Serviceを再起動
```

---

## 📝 チェックリスト

### ドメイン設定前
- [ ] サブドメイン名の決定（例: `ec-ranger-backend.access-net.co.jp`）
- [ ] DNS管理者への依頼準備（CNAMEレコード設定）
- [ ] App ServiceプランがBasic以上であることを確認
- [ ] 現在のShopify設定（App URL、Webhook URL）をメモ
- [ ] 関係者への通知

### ドメイン設定中
- [ ] Azure Portalでカスタムドメインを追加
- [ ] CNAMEレコードをDNS側で設定
- [ ] DNS検証完了確認（10分〜1時間待機）
- [ ] SSL証明書（App Service Managed Certificate）をバインド
- [ ] HTTPS強制設定を有効化
- [ ] 新ドメインでAPI動作確認

### ドメイン設定後
- [ ] Shopify App URLを更新
- [ ] Shopify Allowed redirection URLsを更新
- [ ] Shopify Webhook URLsを更新
- [ ] フロントエンド環境変数（`NEXT_PUBLIC_API_URL`）を更新
- [ ] CORS設定を確認・更新
- [ ] OAuth認証フローのテスト
- [ ] Webhookの動作確認
- [ ] 並行運用期間の設定（1週間推奨）

---

## 📚 参考資料

- [Azure App Service カスタムドメイン](https://docs.microsoft.com/azure/app-service/app-service-web-tutorial-custom-domain)
- [App Service Managed Certificate](https://docs.microsoft.com/azure/app-service/configure-ssl-certificate#create-a-free-managed-certificate-preview)
- [Shopify App URL Requirements](https://shopify.dev/apps/auth/oauth/getting-started#requirements)
- [Azure DNS ドキュメント](https://docs.microsoft.com/azure/dns/)

---

## 💡 よくある質問（FAQ）

### Q1: SSL証明書は本当に無料ですか？

**A:** はい。**App Service Managed Certificate**は完全無料で、自動更新も行われます。  
条件として、App ServiceプランがBasic以上である必要があります。

### Q2: Trend Microによるブロックは回避できますか？

**A:** はい。カスタムドメイン（`ec-ranger-backend.access-net.co.jp`）を使用することで、  
セキュリティソフトによる誤検知を大幅に減らすことができます。

### Q3: 旧URL（`.japanwest-01.azurewebsites.net`）は削除できますか？

**A:** はい、削除可能です。ただし、**すべての設定を新ドメインに移行してから**削除することを推奨します。  
並行運用期間（1週間以上）を設けてから削除するのが安全です。

### Q4: 証明書の発行にどれくらいかかりますか？

**A:** 通常 **数分〜数時間**です。DNS設定が正しく反映されていれば、  
比較的早く（10分〜30分程度）発行されることが多いです。

### Q5: 複数のカスタムドメインを設定できますか？

**A:** はい。1つのApp Serviceに複数のカスタムドメインを設定できます。  
例: `ec-ranger-backend.access-net.co.jp` と `api.ec-ranger.access-net.co.jp`

---

**最終更新**: 2026年1月16日 08:40  
**作成者**: AI Assistant
