# Shopify Dev MCP Server 設定ガイド

## 作成日
2025-12-25

## 概要

[Shopify Dev MCP Server](https://shopify.dev/docs/apps/build/devmcp)は、AIアシスタント（Cursor等）がShopifyの最新のドキュメント、APIスキーマ、開発リソースにアクセスできるようにする公式ツールです。

このドキュメントでは、Cursorでの設定方法と、プロジェクトでの活用方法を説明します。

---

## 🎯 メリット

### 1. 最新のShopifyドキュメントへのアクセス
- AIアシスタントがShopify公式ドキュメントを自動検索
- 最新のAPI仕様に基づいた正確なコード生成

### 2. GraphQLスキーマの検証
- GraphQLクエリの構文チェック
- 存在しないフィールドやオペレーションの検出
- 必要なアクセススコープの確認

### 3. コンポーネントコードの検証
- Shopifyコンポーネント（Polaris等）の検証
- 存在しないプロパティや値の検出

### 4. 開発効率の向上
- ドキュメント検索時間の削減
- エラーの事前検出
- 正確なコード例の取得

---

## 📋 前提条件

- **Node.js 18以上**がインストールされていること
- **Cursor IDE**がインストールされていること
- CursorがMCP（Model Context Protocol）をサポートしていること

---

## 🛠️ 設定手順

### Step 1: Cursorの設定を開く

1. Cursorを開く
2. **Cursor** > **Settings** > **Cursor Settings** > **Tools and integrations** > **New MCP server** に移動

### Step 2: MCPサーバー設定を追加

以下の設定を追加します：

#### Windows環境（推奨設定）

**方法1: cmd /c を使用（推奨）**

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

**方法2: PowerShellを使用**

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "powershell",
      "args": ["-Command", "npx", "-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

**方法3: 直接npxを使用（Node.jsがPATHに含まれている場合）**

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

#### macOS/Linux環境

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

### Step 3: オプション設定（推奨）

計測データの送信を無効化する場合：

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@shopify/dev-mcp@latest"],
      "env": {
        "OPT_OUT_INSTRUMENTATION": "true"
      }
    }
  }
}
```

### Step 4: Cursorを再起動

設定を保存後、Cursorを再起動して設定を反映させます。

---

## ✅ 動作確認

### 1. MCPサーバーの接続確認

Cursorを再起動後、MCPサーバーが正常に接続されているか確認します。

### 2. テストクエリ

Cursorのチャットで以下のような質問を試してください：

```
ShopifyのOAuth認証フローについて教えてください
Admin GraphQL APIで顧客データを取得する方法を教えてください
```

AIアシスタントがShopify公式ドキュメントを参照して回答するはずです。

---

## 🎯 プロジェクトでの活用例

### 1. OAuth認証フローの実装

**質問例**:
```
ShopifyアプリのOAuth認証フローを実装する際のベストプラクティスを教えてください。
埋め込みアプリでのOAuth認証はどのように実装しますか？
```

**期待される効果**:
- 最新のOAuth実装方法の確認
- セキュリティベストプラクティスの適用
- エラーハンドリングの改善

### 2. GraphQLクエリの検証

**質問例**:
```
Admin GraphQL APIで顧客データを取得するクエリを作成してください。
必要なアクセススコープも教えてください。
```

**期待される効果**:
- 正確なGraphQLクエリの生成
- 必要なスコープの確認
- フィールド名の誤りの防止

### 3. Webhook実装の確認

**質問例**:
```
ShopifyのWebhookを登録する方法を教えてください。
HMAC検証の実装方法も教えてください。
```

**期待される効果**:
- 最新のWebhook実装方法の確認
- セキュリティ要件の理解
- エラーハンドリングの改善

### 4. コンポーネントの検証

**質問例**:
```
Polarisコンポーネントを使用してフォームを作成してください。
```

**期待される効果**:
- 正確なコンポーネントの使用
- プロパティ名の誤りの防止
- 最新のコンポーネントAPIの確認

---

## 🔧 利用可能なツール

Shopify Dev MCP Serverは以下のツールを提供します：

### 1. `learn_shopify_api`
Shopify APIの使用方法を学習し、正確なコードブロックを生成します。

**使用タイミング**: Shopify APIを使用する際は、まずこのツールを呼び出します。

### 2. `search_docs_chunks`
Shopify公式ドキュメント全体を検索します。

**使用タイミング**: 広範囲のトピックを調査する際に使用します。

### 3. `fetch_full_docs`
特定のドキュメントパスから完全なドキュメントを取得します。

**使用タイミング**: 特定のドキュメントの詳細を確認する際に使用します。

### 4. `introspect_graphql_schema`
Shopify GraphQLスキーマを探索・検索します。

**使用タイミング**: GraphQL開発時に、利用可能なフィールド、クエリ、ミューテーションを確認します。

### 5. `validate_graphql_codeblocks`
GraphQLコードブロックを検証します。

**使用タイミング**: GraphQLコードを生成・修正する際に使用します。

### 6. `validate_component_codeblocks`
Shopifyコンポーネントのコードブロックを検証します。

**使用タイミング**: コンポーネントコードを生成・修正する際に使用します。

### 7. `validate_theme_codeblocks`
Liquidコードブロックを検証します。

**使用タイミング**: Liquidファイルを生成する際に使用します（自己完結型ファイルのみ）。

### 8. `validate_theme`
テーマディレクトリ全体を検証します。

**使用タイミング**: 完全なテーマを検証する際に使用します。

---

## 📚 サポートされているAPI

Shopify Dev MCP Serverは以下のAPIをサポートしています：

- **Admin GraphQL API**
- **Customer Account API**
- **Functions**
- **Liquid**
- **Partner API**
- **Payment Apps API**
- **Polaris Web Components**
- **POS UI Extensions**
- **Storefront API**

---

## 🚀 今後の開発での活用

### インストールフロー改善

現在のインストールフロー問題の解決に活用できます：

```
Shopifyアプリのインストールフローで、OAuth認証後にストア情報を保存する方法を教えてください。
埋め込みアプリでのOAuth認証フローで、redirect_uriはどのように設定すべきですか？
```

### API実装の正確性向上

GraphQLクエリやAPI呼び出しの正確性を向上させます：

```
Admin GraphQL APIで顧客データを取得する際のページネーション処理を教えてください。
必要なアクセススコープも確認してください。
```

### コンポーネント開発の効率化

Polarisコンポーネントの使用を正確にします：

```
PolarisのCardコンポーネントを使用して、顧客情報を表示するコンポーネントを作成してください。
```

---

## 🔧 トラブルシューティング

### Windows環境でのエラー対処

#### エラー1: `TAR_ENTRY_ERROR` または `EPERM: operation not permitted`

**原因**: npmキャッシュの破損またはファイルロック

**解決方法**:

1. **npmキャッシュのクリア**:
```powershell
npm cache clean --force
```

2. **npxキャッシュのクリア**:
```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx" -ErrorAction SilentlyContinue
```

3. **Cursorを再起動**して再度試行

#### エラー2: `Cannot find module './error'`

**原因**: 不完全なパッケージインストール

**解決方法**:

1. **npxキャッシュを完全にクリア**:
```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx" -ErrorAction SilentlyContinue
```

2. **グローバルインストールを試行**（オプション）:
```powershell
npm install -g @shopify/dev-mcp@latest
```

3. **設定をグローバルインストール版に変更**:
```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "shopify-dev-mcp"
    }
  }
}
```

#### エラー3: `Unexpected end of JSON input` または `Unexpected token 'C'`

**原因**: コマンド実行時のパス問題

**解決方法**:

1. **設定を `cmd /c` に変更**（`/k` の代わり）:
```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

2. **または、PowerShellを使用**:
```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "powershell",
      "args": ["-Command", "npx", "-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

#### エラー4: 接続が確立されない

**解決方法**:

1. **Node.jsのバージョン確認**（18以上が必要）:
```powershell
node --version
```

2. **npxが正常に動作するか確認**:
```powershell
npx --version
```

3. **手動でMCPサーバーを起動してテスト**:
```powershell
npx -y @shopify/dev-mcp@latest
```

### 一般的な対処手順

1. **npmキャッシュのクリア**
2. **Cursorの完全再起動**（すべてのウィンドウを閉じて再起動）
3. **設定の再確認**（JSON構文エラーがないか確認）
4. **別の実行方法を試行**（`cmd /c`、PowerShell、直接npx）

---

## ⚠️ 注意事項

### 1. ネットワーク接続
MCPサーバーはShopify公式ドキュメントにアクセスするため、インターネット接続が必要です。

### 2. 認証不要
MCPサーバー自体は認証を必要としませんが、Shopify APIを使用する際は適切な認証が必要です。

### 3. ローカル実行
MCPサーバーはローカル環境で実行され、認証情報は保存されません。

### 4. Windows環境での注意
- `cmd /k` の代わりに `cmd /c` を使用することを推奨
- ファイル権限の問題が発生する場合は、管理者権限でCursorを実行
- npmキャッシュの問題が続く場合は、グローバルインストールを検討

---

## 🔗 関連リソース

- [Shopify Dev MCP Server公式ドキュメント](https://shopify.dev/docs/apps/build/devmcp)
- [Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps)
- [Storefront MCP](https://shopify.dev/docs/apps/build/storefront-mcp)

---

## 📝 更新履歴

- 2025-12-25: 初版作成

---

## 💡 推奨事項

### 開発開始時
1. MCPサーバーが正常に接続されているか確認
2. 使用するAPIについて`learn_shopify_api`を呼び出す
3. GraphQLクエリを生成する際は`validate_graphql_codeblocks`を使用

### コードレビュー時
1. GraphQLクエリの検証
2. コンポーネントコードの検証
3. API使用例の確認

### トラブルシューティング時
1. 公式ドキュメントの検索
2. APIスキーマの確認
3. ベストプラクティスの確認
