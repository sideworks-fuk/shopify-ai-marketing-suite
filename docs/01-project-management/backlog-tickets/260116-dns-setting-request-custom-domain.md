# Backlogチケット: バックエンドAPI用カスタムドメインDNS設定依頼

## 📋 チケット情報

**タイトル**: バックエンドAPI用カスタムドメインDNS設定依頼（本番・開発環境）

**優先度**: 🔴 High  
**担当**: アクセスネット社（DNS管理者）  
**起票日**: 2026年1月16日  
**期限**: 2026年1月下旬（希望）  
**関連**: Azure App Service カスタムドメイン設定

---

## 🎯 背景

現在、Azure App Serviceで動作しているバックエンドAPIに以下の問題が発生しています：

### 問題点
1. **SSL証明書エラー（ERR_SSL_PROTOCOL_ERROR）**
   - リージョン付きドメイン（`*.japanwest-01.azurewebsites.net`）でSSL証明書の不一致エラーが発生
   - Trend Microなどのセキュリティソフトによるブロックが発生する可能性

2. **URLの長さ・覚えにくさ**
   - 自動生成ドメインが長く、運用上の不便がある
   - 例: `ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net`

### 解決策
アクセスネット社のドメイン（`access-net.co.jp`）配下にサブドメインを追加し、カスタムドメインとして設定することで、上記の問題を解決します。

---

## 📝 依頼内容

### DNS設定依頼

以下の2つのサブドメインに対して、**CNAMEレコード**と**TXTレコード**の設定をお願いします。

**TXTレコードについて**:
- 必須ではありませんが、**セキュリティ強化のため推奨**です
- サブドメイン乗っ取り防止（Subdomain Takeover Prevention）のための検証IDです
- CNAMEレコードのみでも動作しますが、TXTレコードを追加することでセキュリティが向上します

#### 1. 本番環境

**サブドメイン名**: `ec-ranger-api.access-net.co.jp`

**現在アクセス可能なURL**: `ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net`

**CNAMEレコード設定**:
```
ホスト名: ec-ranger-api
タイプ: CNAME
値: ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net
TTL: 3600（または任意）
```

**TXTレコード設定**（推奨・セキュリティ強化）:
```
ホスト名: asuid.ec-ranger-api
タイプ: TXT
値: 9C537559321017FE79B8808DC497CF63AF5FF5FB1D3B7FE4E0F146BD5149D6D1
TTL: 3600（または任意）
```

**注意事項**:
- **リージョン付きURL（`*.japanwest-01.azurewebsites.net`）を指定**してください
- リージョンなしURL（`*.azurewebsites.net`）はアクセスできません
- TXTレコードの値は、Azure Portalでカスタムドメイン追加時に表示されます（後日共有します）

#### 2. 開発環境

**サブドメイン名**: `ec-ranger-api-dev.access-net.co.jp`

**現在アクセス可能なURL**: `shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`

**CNAMEレコード設定**:
```
ホスト名: ec-ranger-api-dev
タイプ: CNAME
値: shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
TTL: 3600（または任意）
```

**TXTレコード設定**（推奨・セキュリティ強化）:
```
ホスト名: asuid.ec-ranger-api-dev
タイプ: TXT
値: 154182C5F8E4E30951759D2AE1F9DE07A997B541F9850065D1254ABC313096DF
TTL: 3600（または任意）
```

**注意事項**:
- **リージョン付きURL（`*.japanwest-01.azurewebsites.net`）を指定**してください
- リージョンなしURL（`*.azurewebsites.net`）はアクセスできません
- TXTレコードは必須ではありませんが、セキュリティ強化のため推奨です

---

## ✅ 当社側の対応（Azure側設定）

**重要**: Azure Portalでカスタムドメインを追加する際に、Azureが自動的に提示する**CNAME値とTXT値を必ず確認**してください。  
その値が上記のリージョン付きURLと異なる場合は、Azure Portalに表示される値を使用してください。

DNS設定完了後、以下の作業を当社で実施します：

1. **Azure Portalでカスタムドメイン追加**
   - 本番環境: `ec-ranger-api.access-net.co.jp`
   - 開発環境: `ec-ranger-api-dev.access-net.co.jp`
   - Azure Portalに表示されるCNAME値とTXT値を確認し、DNS管理者に共有（必要に応じて）
   - **本番環境・開発環境のTXT値は既に確認済み**（上記に記載）

2. **SSL証明書のバインド**
   - App Service Managed Certificate（無料）を使用
   - 自動的にSSL証明書を発行・バインド

3. **HTTPS強制設定**
   - すべてのHTTPリクエストをHTTPSにリダイレクト

4. **動作確認**
   - 新ドメインでのAPI動作確認
   - SSL証明書の確認

5. **設定更新**（必要に応じて）
   - Shopify App設定の更新（Webhook URL等）
   - フロントエンド環境変数の更新

---

## 📅 スケジュール

| 作業 | 担当 | 予定日 |
|------|------|--------|
| DNS設定依頼 | 当社 | 2026-01-16 |
| **DNS設定作業** | **アクセスネット社** | **依頼後1週間以内** |
| Azureカスタムドメイン設定 | 当社 | DNS設定完了後 |
| SSL証明書バインド | 当社（自動） | DNS検証完了後 |
| 動作確認 | 当社 | SSL証明書発行後 |

---

## 🔗 参考情報

### 現在のURL（問題発生中）

- **本番環境**: `ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net`
- **開発環境**: `shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`

### 設定後のURL（目標）

- **本番環境**: `https://ec-ranger-api.access-net.co.jp`
- **開発環境**: `https://ec-ranger-api-dev.access-net.co.jp`

---

## ❓ 質問・確認事項

DNS設定作業前に、以下をご確認ください：

1. **サブドメイン名の確認**
   - `ec-ranger-api.access-net.co.jp`（本番）
   - `ec-ranger-api-dev.access-net.co.jp`（開発）
   - いずれも問題ありませんか？

2. **DNS伝播時間**
   - 設定完了から反映まで、どの程度かかりますか？
   - （通常10分〜数時間程度）

3. **DNS設定完了の通知**
   - 設定完了後、ご連絡いただけますでしょうか？

---

## 📞 連絡先

ご質問や確認事項がございましたら、お気軽にお問い合わせください。

---

## 💬 追加コメント（2026年1月16日）

### CNAMEレコードについて
- CNAMEレコードの設定値は確認済みです
- 正式な依頼は後日実施予定です（期限に余裕があります）

### TXTレコード設定の追加依頼

CNAMEレコードの設定に加えて、**TXTレコードの設定もお願いしたい**です。

**理由**:
- Azure App Serviceのセキュリティ推奨事項として、サブドメイン乗っ取り防止（Subdomain Takeover Prevention）のため
- CNAMEレコードのみでも動作しますが、TXTレコードを追加することでセキュリティが向上します
- Azure Portalでも「TXTレコードにドメイン確認IDを追加すると、未解決のDNSエントリを防ぐことができ、サブドメインの乗っ取りを回避するのに役立ちます」と推奨されています

**設定内容**（上記「依頼内容」セクションに詳細記載）:
- 本番環境: `asuid.ec-ranger-api` → `9C537559321017FE79B8808DC497CF63AF5FF5FB1D3B7FE4E0F146BD5149D6D1`
- 開発環境: `asuid.ec-ranger-api-dev` → `154182C5F8E4E30951759D2AE1F9DE07A997B541F9850065D1254ABC313096DF`

**優先度**:
- CNAMEレコード: 必須（カスタムドメイン動作に必要）
- TXTレコード: 推奨（セキュリティ強化のため）

CNAMEレコードとTXTレコードの両方を設定していただけると幸いです。  
ご都合の良いタイミングで対応いただければ問題ありません。

---

**最終更新**: 2026年1月16日  
**作成者**: 福田
