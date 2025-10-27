# 🚀 Cursor MCP クイックスタートガイド

**所要時間**: 15分
 **対象**: 初めて MCP を使う開発者

------

## ⚡ 3ステップでスタート

### Step 1: MCP Server 起動（2分）

```bash
# プロジェクトルートで実行
cd /path/to/shopify-ai-marketing-suite

# MCP Server 起動
shopify app dev --mcp

# ✅ 成功メッセージ
# MCP Server started on http://localhost:8081
# Connected to store: fuk-dev1.myshopify.com
```

### Step 2: Cursor 接続（1分）

1. `Cmd+Shift+P` でコマンドパレット
2. `MCP: Connect to Server` と入力
3. `shopify-dev` を選択
4. 右下に `🧩 shopify-dev connected` が表示されたら成功

### Step 3: 動作確認（2分）

```bash
# Cursor のコマンドパレット (Cmd+K) で実行

# 1. ストア情報確認
/shopify store info

# 2. アプリ一覧表示
/shopify apps list

# 3. GraphQL クエリ実行
/shopify query { shop { name email } }
```

------

## 🎯 よく使うコマンド集

### 開発開始時

```bash
# 1. MCP Server 起動
shopify app dev --mcp

# 2. 認証確認
/shopify whoami

# 3. Webhook 状態確認
/shopify webhook list
```

### データ確認

```graphql
# 顧客データ（最新5件）
/shopify query {
  customers(first: 5, sortKey: CREATED_AT, reverse: true) {
    edges {
      node {
        id
        displayName
        email
        ordersCount
      }
    }
  }
}

# 注文データ（今日の注文）
/shopify query {
  orders(first: 10, query: "created_at:>=2025-10-25") {
    edges {
      node {
        id
        name
        totalPrice
        createdAt
      }
    }
  }
}

# 商品データ（在庫あり）
/shopify query {
  products(first: 10, query: "inventory_quantity:>0") {
    edges {
      node {
        id
        title
        totalInventory
      }
    }
  }
}
```

### Webhook 管理

```bash
# Webhook 一覧
/shopify webhook list

# Webhook 登録
/shopify webhook create --topic customers/data_request --address https://your-api.com/api/webhooks/customers/data_request

# Webhook テスト送信
/shopify webhook trigger customers/data_request

# Webhook 削除
/shopify webhook delete <webhook-id>
```

------

## 🔧 プロジェクト別活用例

### フロントエンド開発（Yuki）

#### 1. OAuth 認証のテスト

```bash
# OAuth URL 生成
/shopify oauth generate-url --redirect-uri http://localhost:3000/api/auth/callback

# 生成されたURLをブラウザで開いてテスト
```

#### 2. UI データの取得

```graphql
# ダッシュボード用データ
/shopify query {
  shop {
    name
    currencyCode
  }
  orders(first: 10) {
    edges {
      node {
        id
        totalPrice
        createdAt
      }
    }
  }
  customers(first: 5) {
    edges {
      node {
        id
        displayName
        ordersCount
      }
    }
  }
}
```

### バックエンド開発（Takashi）

#### 1. API エンドポイントのテスト

```bash
# Webhook 署名検証
/shopify webhook verify --topic customers/redact --body-file test-payload.json

# GraphQL スキーマ確認
/shopify graphql schema

# API レート制限確認
/shopify api limits
```

#### 2. データベース同期用クエリ

```graphql
# 全注文データ取得（ページネーション）
/shopify query {
  orders(first: 250, after: "cursor-here") {
    edges {
      node {
        id
        name
        email
        totalPrice
        createdAt
        lineItems(first: 10) {
          edges {
            node {
              id
              title
              quantity
              variant {
                id
                price
              }
            }
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

------

## 🐛 トラブルシューティング

### Q: 接続できない

```bash
# 1. MCP Server が起動しているか確認
ps aux | grep "shopify app dev"

# 2. ポートが空いているか確認
lsof -i :8081

# 3. 再起動
pkill -f "shopify app dev"
shopify app dev --mcp
```

### Q: 認証エラー

```bash
# 再認証
shopify auth login --store fuk-dev1.myshopify.com

# トークン確認
shopify whoami
```

### Q: GraphQL エラー

```bash
# スキーマ確認
/shopify graphql schema

# フィールド名を確認
# https://shopify.dev/docs/api/admin-graphql
```

------

## 📝 開発フロー例

### 朝の開発開始

```bash
# 1. プロジェクトディレクトリへ移動
cd ~/Projects/shopify-ai-marketing-suite

# 2. MCP Server 起動
shopify app dev --mcp

# 3. Cursor 起動・接続確認
# Cmd+Shift+P → "MCP: Connect to Server"

# 4. 認証確認
/shopify whoami

# 5. 開発開始!
```

### 機能開発中

```bash
# API 動作確認
/shopify query { ... }

# Webhook テスト
/shopify webhook trigger <topic>

# ログ確認
/shopify logs
```

### 開発終了時

```bash
# MCP Server 停止
Ctrl+C

# または
pkill -f "shopify app dev"
```

------

## 💡 Tips

### スニペット登録

Cursor の `.cursor/snippets.json`:

```json
{
  "Shopify Customer Query": {
    "prefix": "sq-customer",
    "body": [
      "/shopify query {",
      "  customers(first: ${1:10}) {",
      "    edges {",
      "      node {",
      "        id",
      "        displayName",
      "        email",
      "        ordersCount",
      "      }",
      "    }",
      "  }",
      "}"
    ]
  },
  "Shopify Order Query": {
    "prefix": "sq-order",
    "body": [
      "/shopify query {",
      "  orders(first: ${1:10}) {",
      "    edges {",
      "      node {",
      "        id",
      "        name",
      "        totalPrice",
      "        createdAt",
      "      }",
      "    }",
      "  }",
      "}"
    ]
  }
}
```

### エイリアス登録

`.bashrc` または `.zshrc`:

```bash
# MCP Server 起動
alias mcp-start='cd ~/Projects/shopify-ai-marketing-suite && shopify app dev --mcp'

# MCP Server 停止
alias mcp-stop='pkill -f "shopify app dev"'

# 認証確認
alias mcp-auth='shopify whoami'
```

------

## 📚 次に読むべきドキュメント

1. **OAuth 認証実装** → `docs/03-design-specs/integration/oauth-multitenancy.md`
2. **GDPR Webhook** → `docs/06-shopify/04-GDPR対応/`
3. **課金システム** → `docs/06-shopify/02-課金システム/`
4. **GraphQL API** → https://shopify.dev/docs/api/admin-graphql

------

**作成**: 2025-10-25
 **更新**: Kenji（PM）
