# Quick Ship Tracker - API仕様書

## 概要
Quick Ship TrackerのREST API仕様書です。すべてのAPIはJWT認証を使用します。

**ベースURL**: `https://api.quickshiptracker.com`
**認証**: Bearer Token (JWT)

## 認証API

### POST /api/auth/login
Shopify OAuth認証の開始

**Request**
```json
{
  "shop": "example.myshopify.com"
}
```

**Response**
```json
{
  "authUrl": "https://example.myshopify.com/admin/oauth/authorize?..."
}
```

### GET /api/auth/callback
OAuth認証コールバック

**Query Parameters**
- `code`: 認証コード
- `shop`: ショップドメイン
- `state`: CSRF防止用トークン

**Response**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "shop": {
    "id": "123",
    "name": "Example Shop",
    "domain": "example.myshopify.com",
    "planName": "Free"
  }
}
```

### POST /api/auth/logout
ログアウト

**Response**
```json
{
  "success": true
}
```

## 注文API

### GET /api/orders
注文一覧取得

**Headers**
```
Authorization: Bearer {token}
```

**Query Parameters**
- `page`: ページ番号（デフォルト: 1）
- `limit`: 取得件数（デフォルト: 50、最大: 250）
- `status`: フィルタ（all, pending, shipped）
- `search`: 検索キーワード

**Response**
```json
{
  "orders": [
    {
      "id": "12345",
      "orderNumber": "#1001",
      "customerName": "John Doe",
      "email": "john@example.com",
      "totalPrice": "100.00",
      "currency": "USD",
      "createdAt": "2025-09-06T10:00:00Z",
      "fulfillmentStatus": "pending",
      "trackingInfo": {
        "carrier": "USPS",
        "trackingNumber": "9400100000000000000000",
        "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=9400100000000000000000",
        "shippedAt": "2025-09-06T12:00:00Z"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### GET /api/orders/{orderId}
注文詳細取得

**Response**
```json
{
  "id": "12345",
  "orderNumber": "#1001",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "shippingAddress": {
    "name": "John Doe",
    "address1": "123 Main St",
    "address2": "Apt 4",
    "city": "New York",
    "province": "NY",
    "country": "US",
    "zip": "10001"
  },
  "lineItems": [
    {
      "id": "1",
      "title": "Product Name",
      "variantTitle": "Size: M",
      "quantity": 2,
      "price": "50.00"
    }
  ],
  "totalPrice": "100.00",
  "currency": "USD",
  "fulfillmentStatus": "pending",
  "financialStatus": "paid",
  "createdAt": "2025-09-06T10:00:00Z",
  "trackingInfo": null
}
```

## トラッキングAPI

### POST /api/tracking
トラッキング情報登録

**Request**
```json
{
  "orderId": "12345",
  "carrier": "USPS",
  "trackingNumber": "9400100000000000000000",
  "notifyCustomer": true
}
```

**Response**
```json
{
  "success": true,
  "tracking": {
    "id": "67890",
    "orderId": "12345",
    "carrier": "USPS",
    "trackingNumber": "9400100000000000000000",
    "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=9400100000000000000000",
    "createdAt": "2025-09-06T12:00:00Z"
  }
}
```

**エラーレスポンス（プラン制限）**
```json
{
  "error": "PLAN_LIMIT_EXCEEDED",
  "message": "You have reached your monthly tracking limit. Please upgrade your plan.",
  "currentUsage": 10,
  "planLimit": 10
}
```

### PUT /api/tracking/{trackingId}
トラッキング情報更新

**Request**
```json
{
  "carrier": "FedEx",
  "trackingNumber": "123456789012"
}
```

### DELETE /api/tracking/{trackingId}
トラッキング情報削除

**Response**
```json
{
  "success": true
}
```

### POST /api/tracking/bulk
一括トラッキング登録

**Request**
```json
{
  "trackings": [
    {
      "orderId": "12345",
      "carrier": "USPS",
      "trackingNumber": "9400100000000000000000"
    },
    {
      "orderId": "12346",
      "carrier": "FedEx",
      "trackingNumber": "123456789012"
    }
  ]
}
```

**Response**
```json
{
  "success": 2,
  "failed": 0,
  "results": [
    {
      "orderId": "12345",
      "success": true,
      "trackingId": "67890"
    },
    {
      "orderId": "12346",
      "success": true,
      "trackingId": "67891"
    }
  ]
}
```

## 課金API

### GET /api/billing/plans
料金プラン一覧取得

**Response**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "trackingLimit": 10,
      "features": [
        "10 trackings/month",
        "Basic support"
      ]
    },
    {
      "id": "basic",
      "name": "Basic",
      "price": 9.99,
      "currency": "USD",
      "trackingLimit": 100,
      "features": [
        "100 trackings/month",
        "Email support",
        "Bulk upload"
      ]
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 29.99,
      "currency": "USD",
      "trackingLimit": -1,
      "features": [
        "Unlimited trackings",
        "Priority support",
        "Bulk upload",
        "API access",
        "Custom carriers"
      ]
    }
  ],
  "currentPlan": "free",
  "usage": {
    "current": 5,
    "limit": 10,
    "resetDate": "2025-10-01T00:00:00Z"
  }
}
```

### POST /api/billing/subscribe
プラン購読

**Request**
```json
{
  "planId": "basic"
}
```

**Response**
```json
{
  "confirmationUrl": "https://example.myshopify.com/admin/charges/12345/confirm"
}
```

### POST /api/billing/cancel
プラン解約

**Response**
```json
{
  "success": true,
  "message": "Subscription cancelled. You will have access until the end of the billing period."
}
```

### GET /api/billing/usage
使用状況取得

**Response**
```json
{
  "planId": "basic",
  "planName": "Basic",
  "usage": {
    "trackings": {
      "current": 45,
      "limit": 100,
      "percentage": 45
    }
  },
  "billingCycle": {
    "start": "2025-09-01T00:00:00Z",
    "end": "2025-09-30T23:59:59Z"
  },
  "nextBilling": {
    "date": "2025-10-01T00:00:00Z",
    "amount": 9.99,
    "currency": "USD"
  }
}
```

## Webhook API

### POST /api/webhooks/app/uninstalled
アプリアンインストール通知

**Headers**
```
X-Shopify-Hmac-Sha256: {signature}
X-Shopify-Topic: app/uninstalled
X-Shopify-Shop-Domain: example.myshopify.com
```

**Request**
```json
{
  "id": 12345,
  "name": "Example Shop",
  "email": "shop@example.com"
}
```

### POST /api/webhooks/customers/data_request
顧客データリクエスト（GDPR）

**Request**
```json
{
  "shop_id": 12345,
  "shop_domain": "example.myshopify.com",
  "customer": {
    "id": 67890,
    "email": "customer@example.com"
  },
  "data_request": {
    "id": 9876
  }
}
```

### POST /api/webhooks/customers/redact
顧客データ削除（GDPR）

**Request**
```json
{
  "shop_id": 12345,
  "shop_domain": "example.myshopify.com",
  "customer": {
    "id": 67890,
    "email": "customer@example.com"
  }
}
```

### POST /api/webhooks/shop/redact
ショップデータ削除（GDPR）

**Request**
```json
{
  "shop_id": 12345,
  "shop_domain": "example.myshopify.com"
}
```

## エラーレスポンス

### 共通エラー形式
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    // Additional error details
  }
}
```

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| UNAUTHORIZED | 401 | 認証が必要 |
| FORBIDDEN | 403 | アクセス権限なし |
| NOT_FOUND | 404 | リソースが見つからない |
| VALIDATION_ERROR | 400 | 入力データが不正 |
| PLAN_LIMIT_EXCEEDED | 402 | プラン制限超過 |
| RATE_LIMIT_EXCEEDED | 429 | レート制限超過 |
| INTERNAL_ERROR | 500 | サーバーエラー |

### レート制限

- 認証済みリクエスト: 2リクエスト/秒
- バルク操作: 10リクエスト/分

**レート制限ヘッダー**
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 1567123456
```

## 開発者向け情報

### 認証フロー

1. ユーザーが `/api/auth/login` にショップドメインをPOST
2. ShopifyのOAuth URLにリダイレクト
3. ユーザーが承認後、`/api/auth/callback` にリダイレクト
4. JWTトークンを発行して返却
5. 以降のAPIリクエストでJWTトークンを使用

### JWTトークン構造

```json
{
  "sub": "shop_123",
  "shop": "example.myshopify.com",
  "planId": "basic",
  "iat": 1567123456,
  "exp": 1567209856
}
```

### Webhookの検証

1. `X-Shopify-Hmac-Sha256` ヘッダーの値を取得
2. リクエストボディをHMAC-SHA256でハッシュ化
3. シークレットキーを使用して署名を検証

### サンプルコード

**認証リクエスト（TypeScript）**
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    shop: 'example.myshopify.com'
  })
});

const { authUrl } = await response.json();
window.location.href = authUrl;
```

**APIリクエスト（TypeScript）**
```typescript
const token = localStorage.getItem('token');

const response = await fetch('/api/orders', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});

const { orders } = await response.json();
```

---
*作成日: 2025-09-06*
*更新日: 2025-09-06*