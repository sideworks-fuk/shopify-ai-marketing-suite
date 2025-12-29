# 404エラー - read_all_orders仕様調査

## 作成日
2025-12-28

## 目的
Shopify公式ドキュメントを確認し、`read_all_orders`スコープの仕様をまとめる。

---

## read_all_ordersスコープの概要

### 基本仕様

**`read_all_orders`スコープとは**:
- アプリが過去60日間を超えるすべての注文データにアクセスするための特別な権限
- デフォルトでは、アプリは直近60日以内の注文データにのみアクセス可能
- この制限を超えて全注文データにアクセスするには、`read_all_orders`スコープの許可が必要

**デフォルトの制限**:
- `read_orders`スコープ: 過去60日間の注文データにのみアクセス可能
- `read_all_orders`スコープ: すべての注文データ（過去60日間を超える）にアクセス可能

---

## カスタムアプリとパブリックアプリの違い

### カスタムアプリ（Custom App / Private App）

**重要**: Shopify管理画面で作成されたカスタムアプリ（旧称: プライベートアプリ）は、**デフォルトで`read_all_orders`スコープが付与されています**。

**特徴**:
- 追加のリクエストは不要
- Shopify Partner Dashboardでの申請は不要
- アプリ作成時に自動的に`read_all_orders`スコープが利用可能

**参考**: [Shopify Community Discussion](https://community.shopify.dev/t/read-all-orders-scope-in-custom-apps-created-in-admin/4361/7)

---

### パブリックアプリ（Public App）

**重要**: パブリックアプリの場合は、Shopifyの承認が必要です。

**取得手順**:
1. **パートナーダッシュボードでのリクエスト**:
   - Shopifyパートナーダッシュボードにログイン
   - 対象のアプリを選択
   - アプリの設定ページで「すべての注文へのアクセスをリクエスト」オプションを見つける
   - 必要な理由を記載してリクエストを送信

2. **Shopifyによる承認**:
   - Shopifyがリクエストを審査
   - 承認されると、`read_all_orders`スコープが利用可能になる

3. **アプリのスコープ設定の更新**:
   - アプリの設定ファイル（例: `shopify.app.toml`）や環境変数に`read_all_orders`スコープを追加
   - 既存のスコープ（`read_orders`や`write_orders`など）と組み合わせて設定

4. **マーチャントの再承認**:
   - 新しいスコープを適用するため、マーチャントがアプリを再インストールまたは再承認する必要がある

---

## API Access Requestでの申請

### 申請方法

**Shopify Partner Dashboardでの申請**:
1. Shopifyパートナーダッシュボードにログイン
2. 対象のアプリを選択
3. **「API Access Request」**セクションに移動
4. **「すべての注文範囲を読み込む」**（Read all order scopes）を選択
5. 必要な理由を記載してリクエストを送信

**申請後のプロセス**:
- Shopifyがリクエストを審査
- 承認されると、アプリで`read_all_orders`スコープが利用可能になる
- 承認には時間がかかる場合がある

---

## スコープの設定方法

### 1. shopify.app.tomlでの設定

```toml
[access_scopes]
scopes = "read_all_orders,read_orders,read_products,read_customers"
```

### 2. 環境変数での設定

```bash
SHOPIFY_SCOPES=read_all_orders,read_orders,read_products,read_customers
```

### 3. appsettings.jsonでの設定

```json
{
  "Shopify": {
    "Scopes": "read_all_orders,read_orders,read_products,read_customers"
  }
}
```

**注意**: `read_all_orders`は`read_orders`と組み合わせて使用する必要があります。

---

## インストール画面での表示

### 表示の違い

**`read_orders`スコープのみの場合**:
- インストール画面に表示されるアクセス権: **"過去60日間のすべての注文詳細"** (All order details from the past 60 days)

**`read_all_orders`スコープが含まれる場合**:
- インストール画面に表示されるアクセス権: **"すべての注文詳細"** (All order details)

**表示の決定要因**:
- OAuth URLの`scope`パラメータに`read_all_orders`が含まれているか
- Shopify Partner Dashboardでの申請状態
- アプリのタイプ（カスタムアプリ vs パブリックアプリ）

---

## カスタムアプリでの特別な動作

### デフォルトでの`read_all_orders`スコープ

**カスタムアプリの場合**:
- Shopify管理画面で作成されたカスタムアプリは、デフォルトで`read_all_orders`スコープが付与されている
- 追加のリクエストは不要
- ただし、OAuth URLの`scope`パラメータに`read_all_orders`が含まれていない場合、実際のアクセス権は`read_orders`のみになる可能性がある

**重要な注意点**:
- カスタムアプリでも、OAuth URLの`scope`パラメータに`read_all_orders`が含まれていない場合、実際のアクセス権は`read_orders`のみになる
- インストール画面の表示は、Shopify Partner Dashboardでの申請状態やアプリのタイプに基づいて決定される可能性がある

---

## 現在の状況との関連

### 検証環境（ECレンジャー(local)）

**アプリの組織**: FUK
**アプリタイプ**: カスタムアプリ
**表示**: "すべての注文詳細" ✅ 表示される

**考えられる原因**:
- カスタムアプリのため、デフォルトで`read_all_orders`スコープが付与されている
- Shopify Partner Dashboardでの申請状態が承認済み
- インストール画面の表示が、アプリのタイプや申請状態に基づいて決定されている

---

### 本番環境（EC Ranger-xn-fbkq6e5da0fpb）

**アプリの組織**: アクセスネット
**アプリタイプ**: カスタムアプリ
**表示**: "すべての注文詳細" ❌ 表示されない

**考えられる原因**:
- カスタムアプリでも、アプリの組織や申請状態によって表示が異なる可能性
- Shopify Partner Dashboardでの申請状態が異なる可能性
- OAuth URLの`scope`パラメータに`read_all_orders`が含まれていないため、実際のアクセス権は`read_orders`のみ

---

## 問題の原因（推測）

### 可能性1: OAuth URLの`scope`パラメータの違い

**検証環境**:
- OAuth URLに`read_all_orders`が含まれている可能性
- インストール画面の表示が、OAuth URLの`scope`パラメータに基づいて決定される

**本番環境**:
- OAuth URLに`read_all_orders`が含まれていない
- インストール画面の表示が、OAuth URLの`scope`パラメータに基づいて決定される

**確認方法**: OAuthフローのログを確認

---

### 可能性2: Shopify Partner Dashboardでの申請状態の違い

**検証環境**:
- 「すべての注文範囲を読み込む」が承認されている
- インストール画面の表示が、申請状態に基づいて決定される

**本番環境**:
- 「すべての注文範囲を読み込む」が承認されていない、または承認プロセスが異なる
- インストール画面の表示が、申請状態に基づいて決定される

**確認方法**: API Access Requestの承認状態を確認

---

### 可能性3: アプリの組織による表示ロジックの違い

**検証環境**:
- FUK管理アプリ → カスタムアプリとして認識され、デフォルトで`read_all_orders`が表示される

**本番環境**:
- アクセスネット管理アプリ → カスタムアプリとして認識されない、または表示ロジックが異なる

**確認方法**: Shopifyサポートに問い合わせ

---

## 推奨対応

### 1. OAuthフローのログ確認（最優先）

**目的**: 実際にOAuth URLに含まれるスコープを確認

**確認項目**:
- 検証環境のOAuth URLに`read_all_orders`が含まれているか
- 本番環境のOAuth URLに`read_all_orders`が含まれているか
- 両環境でリクエストされるスコープが一致しているか

---

### 2. API Access Requestの承認状態確認

**目的**: 申請状態が異なるか確認

**確認項目**:
- 検証環境で「すべての注文範囲を読み込む」が承認されているか
- 本番環境で「すべての注文範囲を読み込む」が承認されているか
- 両環境で承認状態が一致しているか

---

### 3. appsettings.jsonの更新（必要に応じて）

**目的**: 両環境で`read_all_orders`スコープをリクエストするように設定を統一

**実施方法**:
- 検証環境と本番環境の`appsettings.json`に`read_all_orders`を追加
- バックエンドを再デプロイ
- 動作確認

**注意**: カスタムアプリの場合、OAuth URLに`read_all_orders`が含まれていなくても、実際のアクセス権は`read_all_orders`になる可能性がある。ただし、インストール画面の表示は、OAuth URLの`scope`パラメータに基づいて決定される可能性がある。

---

## 参考資料

- [Shopify API Access Scopes Documentation](https://shopify.dev/api/usage/access-scopes)
- [Shopify Community Discussion: read_all_orders scope in custom apps](https://community.shopify.dev/t/read-all-orders-scope-in-custom-apps-created-in-admin/4361/7)
- [Shopify Community: read-all-orders permission not behaving as expected](https://community.shopify.com/c/shopify-apps/read-all-orders-permission-not-behaving-as-expected/m-p/2093665)

---

## 更新履歴

- 2025-12-28: 初版作成（read_all_orders仕様調査）
