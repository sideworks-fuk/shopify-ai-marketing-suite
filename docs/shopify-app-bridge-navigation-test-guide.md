# Shopify App Bridge Navigation テストガイド

## 概要
Shopify App Bridge Navigationの基本的なテスト方法について説明します。

## 前提条件
- Shopifyの開発ストアへのアクセス
- ngrokまたは同様のトンネリングツール（ローカルテスト用）
- バックエンドAPI（実装済み）
- フロントエンドの基本実装

## 1. バックエンドのテスト

### 1.1 CSPヘッダーの確認

```bash
# PowerShellまたはBashで実行
curl -I https://localhost:7296/health

# 確認すべきヘッダー
# Content-Security-Policy: frame-ancestors https://*.myshopify.com https://admin.shopify.com
```

### 1.2 API エンドポイントのテスト

```bash
# JWTトークンを取得（既存の認証フローを使用）
$token = "YOUR_JWT_TOKEN"

# 設定エンドポイントのテスト
curl -H "Authorization: Bearer $token" https://localhost:7296/api/embeddedapp/config

# 期待されるレスポンス:
{
  "apiKey": "1e0006b3edc9ffc5c745d6817e666a18",
  "host": "",
  "forceRedirect": true,
  "storeId": "your-store-id",
  "features": {
    "dormantAnalysis": true,
    "yearOverYear": true,
    "purchaseCount": true,
    "monthlyStats": true
  },
  "navigation": {
    "items": [
      { "label": "ダッシュボード", "destination": "/" },
      { "label": "休眠顧客分析", "destination": "/customer-analysis/dormant" },
      { "label": "前年同月比", "destination": "/product-analysis/year-over-year" },
      { "label": "購入回数分析", "destination": "/purchase-analysis/count" }
    ]
  }
}
```

## 2. フロントエンドの基本実装

### 2.1 最小限のApp Bridge実装

```typescript
// app/shopify/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ShopifyEmbeddedApp() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // URLパラメータから情報を取得
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    const host = params.get('host');
    
    // 埋め込み確認
    const isEmbedded = window !== window.parent;
    
    console.log('Shopify Embedded App Loaded:', {
      shop,
      host,
      isEmbedded,
      url: window.location.href
    });
    
    // バックエンドから設定を取得
    fetchConfig();
  }, []);
  
  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/embeddedapp/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Shopify-Shop-Domain': new URLSearchParams(window.location.search).get('shop') || ''
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch config');
      
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err.message);
      console.error('Config fetch error:', err);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Shopify AI Marketing Suite</h1>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}
      
      {config ? (
        <div>
          <h2>アプリ設定</h2>
          <pre>{JSON.stringify(config, null, 2)}</pre>
          
          <h2>利用可能な機能</h2>
          <ul>
            {config.features && Object.entries(config.features).map(([key, value]) => (
              <li key={key}>{key}: {value ? '✅' : '❌'}</li>
            ))}
          </ul>
          
          <h2>ナビゲーション</h2>
          <ul>
            {config.navigation?.items?.map((item, index) => (
              <li key={index}>
                <a href={item.destination}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>設定を読み込み中...</p>
      )}
    </div>
  );
}
```

### 2.2 埋め込み判定ヘルパー

```typescript
// utils/shopify-embed.ts
export function getShopifyEmbedContext() {
  if (typeof window === 'undefined') {
    return { isEmbedded: false, shop: null, host: null };
  }
  
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop');
  const host = params.get('host');
  const embedded = params.get('embedded');
  
  const isEmbedded = (
    embedded === '1' || 
    window !== window.parent ||
    !!shop
  );
  
  return { isEmbedded, shop, host };
}
```

## 3. ローカルテスト手順

### 3.1 ngrokでトンネリング

```bash
# バックエンド用
ngrok http 7296 --host-header="localhost:7296"

# フロントエンド用
ngrok http 3000
```

### 3.2 テスト用HTMLファイル

```html
<!-- test-shopify-embed.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Shopify Embed Test</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    iframe { 
      border: 1px solid #ccc; 
      width: 100%;
      height: 600px;
    }
    .controls {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="controls">
    <h2>Shopify埋め込みテスト</h2>
    <p>Shop: example.myshopify.com</p>
    <button onclick="reloadFrame()">リロード</button>
  </div>
  
  <iframe 
    id="app-frame"
    src="http://localhost:3000/shopify?shop=example.myshopify.com&host=ZXhhbXBsZS5teXNob3BpZnkuY29t&embedded=1"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
  </iframe>
  
  <script>
    function reloadFrame() {
      document.getElementById('app-frame').src += '';
    }
    
    // iframeからのメッセージを受信
    window.addEventListener('message', (event) => {
      console.log('Parent received message:', event.data);
    });
  </script>
</body>
</html>
```

### 3.3 PostmanまたはHTTPクライアントでのテスト

```http
### 1. 通常のJWT認証でテスト
GET https://localhost:7296/api/embeddedapp/config
Authorization: Bearer YOUR_JWT_TOKEN
X-Shopify-Shop-Domain: example.myshopify.com

### 2. セッショントークンモックでテスト
GET https://localhost:7296/api/embeddedapp/config
Authorization: Bearer session-token:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXN0IjoiZXhhbXBsZS5teXNob3BpZnkuY29tIiwiYXVkIjoiMWUwMDA2YjNlZGM5ZmZjNWM3NDVkNjgxN2U2NjZhMTgiLCJleHAiOjE3MzMwMDAwMDB9.mock-signature
```

## 4. Shopify開発ストアでのテスト

### 4.1 アプリ設定
1. Shopify Partnersダッシュボードにログイン
2. アプリの設定画面で：
   - App URL: `https://your-ngrok-url.ngrok.io/shopify`
   - Allowed redirection URL(s): 
     - `https://your-ngrok-url.ngrok.io/shopify`
     - `https://your-ngrok-url.ngrok.io/auth/callback`

### 4.2 開発ストアでのインストール
1. 開発ストアの管理画面にログイン
2. 「アプリ」→「アプリを管理」
3. 開発中のアプリをインストール
4. アプリをクリックして埋め込み表示を確認

## 5. デバッグ方法

### 5.1 ブラウザコンソールでの確認

```javascript
// 埋め込み状態の確認
console.log('Is embedded:', window !== window.parent);
console.log('URL params:', new URLSearchParams(window.location.search).toString());

// CSPエラーの確認
// Consoleタブでエラーメッセージを確認

// ネットワークリクエストの確認
// NetworkタブでAPIリクエストとレスポンスを確認
```

### 5.2 よくある問題と解決策

#### CSPエラー
```
Refused to frame 'https://app.com' because an ancestor violates the following Content Security Policy directive
```
**解決策**: バックエンドのCSPヘッダーを確認

#### CORS エラー
```
Access to fetch at 'https://api.com' from origin 'https://shop.myshopify.com' has been blocked by CORS policy
```
**解決策**: CORSの設定にShopifyドメインを追加

#### 認証エラー
```
401 Unauthorized
```
**解決策**: トークンの有効性とミドルウェアの動作を確認

## 6. 最小限の動作確認チェックリスト

- [ ] CSPヘッダーが正しく設定されている
- [ ] `/api/embeddedapp/config`が200を返す
- [ ] iframeでアプリが表示される
- [ ] URLパラメータ（shop, host）が取得できる
- [ ] 埋め込み判定が正しく動作する
- [ ] ナビゲーションリンクが表示される

## 7. 次のステップ

1. **App Bridge CDN版の実装**（最もシンプル）
```html
<script src="https://unpkg.com/@shopify/app-bridge@3"></script>
```

2. **React版の実装**（推奨）
```bash
npm install @shopify/app-bridge-react
```

3. **完全な統合**
- セッショントークン認証
- App Bridgeナビゲーション
- トースト通知
- モーダルダイアログ

このガイドに従えば、基本的なShopify App Bridge Navigationの動作確認が可能です。