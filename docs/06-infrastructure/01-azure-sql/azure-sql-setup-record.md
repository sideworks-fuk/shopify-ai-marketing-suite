# Azure SQL Database 設定記録

## 📋 設定概要
- **作成日**: 2025年7月1日
- **目的**: Shopify AI Marketing Suite 技術検証
- **環境**: 開発環境

---

## 🔧 基本設定

| 設定名 | 設定値 |
| --- | --- |
| **データベース名** | `shopify-test-db` |
| **管理者ログイン** | `sqladmin` |
| **パスワード** | `ShopifyTest2025!` |
| **サーバー名** | `shopify-test-server` |
| **完全修飾サーバー名** | `shopify-test-server.database.windows.net` |
| **リソースグループ** | `ShopifyApp` |
| **サブスクリプション** | `ShopifyApp` |
| **リージョン** | `日本東部 (Japan East)` |

---

## 💰 料金プラン

| 設定名 | 設定値 |
| --- | --- |
| **サービスレベル** | `Basic` |
| **コンピューティングサイズ** | `Basic: 2 GB ストレージ` |
| **DTU** | `5 DTU` |
| **月額推定コスト** | `$5.53 (約700-800円)` |
| **バックアップストレージ** | `ローカル冗長バックアップストレージ` |

---

## 🌐 ネットワーク設定

| 設定名 | 設定値 |
| --- | --- |
| **接続方法** | `パブリック エンドポイント` |
| **接続ポリシー** | `既定 - Azure 内部で発生したすべてのクライアント接続...` |
| **Azureサービスアクセス許可** | `はい` |
| **現在のクライアントIP追加** | `はい (160.16.24.0)` |
| **TLSの最小バージョン** | `1.2` |

---

## 🔒 セキュリティ設定

| 設定名 | 設定値 |
| --- | --- |
| **Microsoft Defender for SQL** | `後で` |
| **台帳** | `構成されていません` |
| **サーバー ID** | `無効` |
| **Transparent Data Encryption (TDE)** | `サービス マネージド キー` |
| **Always Encrypted** | `無効` |

---

## 📑 追加設定

| 設定名 | 設定値 |
| --- | --- |
| **照合順序** | `日本語_CI_AS` |
| **メンテナンス期間** | `システムの既定値 (午後 5 時から午前 8 時)` |

---

## 🏷️ タグ

| 名前 | 値 |
| --- | --- |
| **環境** | `Development (データベース)` |
| **プロジェクト** | `ShopifyAIMarketing (データベース)` |
| **目的** | `TechnicalValidation (データベース)` |
| **作成日** | `2025-07-01 (データベース)` |
| **コストセンター** | `IT-Dev (データベース)` |
| **環境** | `Development (サーバー)` |
| **プロジェクト** | `ShopifyAIMarketing (サーバー)` |
| **目的** | `TechnicalValidation (サーバー)` |
| **作成日** | `2025-07-01 (サーバー)` |
| **コストセンター** | `IT-Dev (サーバー)` |

---

## 📝 接続情報

### SSMS接続用
```
サーバー名: shopify-test-server.database.windows.net
認証: SQL Server 認証
ログイン: sqladmin
パスワード: ShopifyTest2025!
```

### 接続文字列（ADO.NET）
```
Server=tcp:shopify-test-server.database.windows.net,1433;Initial Catalog=shopify-test-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyTest2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

---

## ⚠️ 注意事項

1. このドキュメントには機密情報（パスワード）が含まれています
2. 本番環境では異なるパスワードを使用してください
3. パスワードは定期的に変更してください
4. 接続文字列は環境変数やAzure Key Vaultで管理することを推奨

---

## 🔄 次のステップ

1. データベースの作成完了を待つ（約5-10分）
2. SSMSで接続テスト
3. テストテーブルの作成
4. App Serviceとの接続テスト

---

*このドキュメントは技術検証用の設定記録です。本番環境では異なる設定を使用してください。* 