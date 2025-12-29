# ngrok コールバックプロキシ実装ガイド

## 作成日
2025-12-29

## 目的
ShopifyのOAuthコールバックが`localhost`に到達できない問題を解決するため、フロントエンドにコールバックプロキシを実装する。

---

## ⚠️ 問題の確認

### 問題点

**Shopifyはインターネット経由でコールバックURLにリダイレクトするため、`localhost`には到達できない**

現在の構成：
```
Shopify → インターネット → localhost:7088/api/shopify/callback ❌（到達不可）
```

### 現在の実装の問題

1. **バックエンドの`GetRedirectUri()`メソッド**:
   - 常にバックエンドURL（`localhost:7088`）を返している
   - ShopifyはこのURLに直接リダイレクトしようとするが、`localhost`には到達できない

2. **ngrokの設定**:
   - フロントエンド用ngrok URL: `https://unsavagely-repressive-terrance.ngrok-free.dev`
   - バックエンドは`localhost:7088`で動作（ngrokトンネルなし）

---

## ✅ 対策: フロントエンドコールバックプロキシ

### 構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    Shopify                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓ OAuthコールバック（インターネット経由）
┌─────────────────────────────────────────────────────────────┐
│  ngrok (HTTPS)                                               │
│  https://unsavagely-repressive-terrance.ngrok-free.dev      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  フロントエンド (localhost:3000)                             │
│  /api/shopify/callback (Next.js API Route)                  │
│         ↓                                                    │
│    すべてのクエリパラメータを転送                             │
│    localhostのバックエンドにプロキシ転送                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓ HTTP (localhost)
┌─────────────────────────────────────────────────────────────┐
│  バックエンド (localhost:7088)                               │
│  /api/shopify/callback                                       │
│         ↓                                                    │
│    OAuth処理完了後、フロントエンドの/auth/successにリダイレクト│
└─────────────────────────────────────────────────────────────┘
```

### 実装手順

#### Step 1: フロントエンドコールバックプロキシの復活

**ファイル**: `frontend/src/app/api/shopify/callback/route.ts`

`.backup`ファイルを復活して、以下の修正を加える：

1. **バックエンドURLの取得**:
   - ローカル開発環境では`https://localhost:7088`を使用
   - 環境変数`NEXT_PUBLIC_API_URL`から取得

2. **すべてのクエリパラメータの転送**:
   - `code`, `shop`, `state`, `hmac`, `timestamp`, `host`などをすべて転送

3. **バックエンドからのリダイレクト処理**:
   - バックエンドが返すリダイレクトURLをそのまま使用
   - フロントエンドの`/auth/success`へのリダイレクトを処理

#### Step 2: バックエンドの`GetRedirectUri()`を修正

**オプション1: フロントエンドURLを返す（推奨）**

```csharp
private string GetRedirectUri()
{
    // フロントエンドのコールバックプロキシURLを使用
    var frontendUrl = Environment.GetEnvironmentVariable("SHOPIFY_FRONTEND_BASEURL") ?? 
                      _configuration["Frontend:BaseUrl"];
    
    if (string.IsNullOrWhiteSpace(frontendUrl))
    {
        // フォールバック: ShopifyAppsテーブルから取得
        // または、現在のリクエストから推測
        frontendUrl = GetBaseUrl(); // 現在の実装を維持
    }
    
    var redirectUri = $"{frontendUrl.TrimEnd('/')}/api/shopify/callback";
    _logger.LogInformation("Redirect URI generated: FrontendUrl={FrontendUrl}, RedirectUri={RedirectUri}", 
        frontendUrl, redirectUri);
    
    return redirectUri;
}
```

**オプション2: 環境変数で切り替え（柔軟性重視）**

```csharp
private string GetRedirectUri()
{
    // 環境変数でフロントエンドプロキシを使用するかどうかを制御
    var useFrontendProxy = Environment.GetEnvironmentVariable("SHOPIFY_USE_FRONTEND_PROXY") == "true";
    
    if (useFrontendProxy)
    {
        // フロントエンドのコールバックプロキシURLを使用
        var frontendUrl = Environment.GetEnvironmentVariable("SHOPIFY_FRONTEND_BASEURL") ?? 
                          _configuration["Frontend:BaseUrl"];
        
        if (!string.IsNullOrWhiteSpace(frontendUrl))
        {
            var redirectUri = $"{frontendUrl.TrimEnd('/')}/api/shopify/callback";
            _logger.LogInformation("Using frontend proxy: RedirectUri={RedirectUri}", redirectUri);
            return redirectUri;
        }
    }
    
    // デフォルト: バックエンドURLを使用（既存の実装）
    var backendUrl = Environment.GetEnvironmentVariable("SHOPIFY_BACKEND_BASEURL") ?? 
                     _configuration["Backend:BaseUrl"];
    
    if (string.IsNullOrWhiteSpace(backendUrl))
    {
        backendUrl = GetBaseUrl();
    }
    
    var backendRedirectUri = $"{backendUrl.TrimEnd('/')}/api/shopify/callback";
    _logger.LogInformation("Using backend direct: RedirectUri={RedirectUri}", backendRedirectUri);
    return backendRedirectUri;
}
```

#### Step 3: Shopify Partners Dashboardの設定

**Redirect URLs**に以下を追加：
- `https://unsavagely-repressive-terrance.ngrok-free.dev/api/shopify/callback`

**注意**: 既存のバックエンドURLは削除せず、両方を登録しておくことを推奨します。

---

## 📋 実装詳細

### フロントエンドコールバックプロキシの実装

**ファイル**: `frontend/src/app/api/shopify/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/config/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // すべてのクエリパラメータを取得
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    
    // 必須パラメータの検証
    const code = allParams.code;
    const shop = allParams.shop;
    const state = allParams.state;
    
    if (!code || !shop || !state) {
      console.error('❌ 必須パラメータが不足:', { code: !!code, shop: !!shop, state: !!state });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // バックエンドAPIのURLを取得
    const backendUrl = getBackendApiUrl();
    const backendCallbackUrl = `${backendUrl}/api/shopify/callback`;
    
    // すべてのパラメータをバックエンドに転送
    const backendParams = new URLSearchParams(allParams);
    const fullBackendUrl = `${backendCallbackUrl}?${backendParams.toString()}`;
    
    console.log('📤 バックエンドへ転送:', {
      url: backendCallbackUrl,
      paramCount: Object.keys(allParams).length,
      shop
    });
    
    // バックエンドAPIを呼び出し
    const backendResponse = await fetch(fullBackendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'X-Forwarded-Host': request.headers.get('host') || '',
      },
      redirect: 'manual' // リダイレクトを手動で処理
    });
    
    // リダイレクトレスポンスの処理
    if (backendResponse.status >= 300 && backendResponse.status < 400) {
      const location = backendResponse.headers.get('location');
      if (location) {
        console.log('↪️ バックエンドからのリダイレクト:', location);
        return NextResponse.redirect(location);
      }
    }
    
    // 成功レスポンスの処理
    if (backendResponse.ok) {
      // バックエンドが成功を返した場合、/auth/successにリダイレクト
      const frontendUrl = process.env.NEXT_PUBLIC_SHOPIFY_APP_URL || 
                         process.env.NEXT_PUBLIC_FRONTEND_URL || 
                         'http://localhost:3000';
      const successUrl = new URL('/auth/success', frontendUrl);
      successUrl.searchParams.set('shop', shop);
      successUrl.searchParams.set('state', state);
      
      return NextResponse.redirect(successUrl);
    }
    
    // エラーレスポンスの処理
    const errorData = await backendResponse.json().catch(() => ({}));
    console.error('❌ バックエンドエラー:', {
      status: backendResponse.status,
      error: errorData
    });
    
    return NextResponse.json(
      { error: 'OAuth callback processing failed', details: errorData },
      { status: backendResponse.status }
    );
    
  } catch (error) {
    console.error('❌ コールバック処理エラー:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## 🔧 環境変数の設定

### フロントエンド（`.env.local`）

```env
# バックエンドAPI URL（ローカル開発環境）
NEXT_PUBLIC_API_URL=https://localhost:7088

# フロントエンドURL（ngrok経由）
NEXT_PUBLIC_SHOPIFY_APP_URL=https://unsavagely-repressive-terrance.ngrok-free.dev
```

### バックエンド（環境変数で設定）

**ローカル開発環境での設定**:

```powershell
# PowerShell
$env:SHOPIFY_USE_FRONTEND_PROXY = "true"
$env:SHOPIFY_FRONTEND_BASEURL = "https://unsavagely-repressive-terrance.ngrok-free.dev"
```

**注意**: `appsettings.Development.json`は現在使用されていないため、環境変数で設定してください。

**Azure App Serviceでの設定**（デプロイ時）:
- `SHOPIFY_USE_FRONTEND_PROXY`: `true`
- `SHOPIFY_FRONTEND_BASEURL`: `https://unsavagely-repressive-terrance.ngrok-free.dev`（または実際のフロントエンドURL）

---

## 🧪 テスト手順

### 1. フロントエンドコールバックプロキシのテスト

```bash
# フロントエンドを起動
cd frontend
npm run dev

# 別ターミナルでngrokを起動
ngrok http 3000
```

### 2. OAuth認証フローのテスト

1. ブラウザで `https://unsavagely-repressive-terrance.ngrok-free.dev/install?shop=your-dev-store.myshopify.com` にアクセス
2. 「接続を開始」ボタンをクリック
3. Shopify OAuth認証画面で権限を承認
4. フロントエンドの`/api/shopify/callback`にリダイレクトされることを確認
5. バックエンドの`/api/shopify/callback`にプロキシ転送されることを確認（ログで確認）
6. `/auth/success`ページにリダイレクトされることを確認

### 3. ログ確認ポイント

**フロントエンドログ**:
```
📤 バックエンドへ転送: { url: 'https://localhost:7088/api/shopify/callback', ... }
↪️ バックエンドからのリダイレクト: /auth/success?shop=xxx&storeId=xxx&success=true
```

**バックエンドログ**:
```
Redirect URI generated: FrontendUrl=https://unsavagely-repressive-terrance.ngrok-free.dev, RedirectUri=https://unsavagely-repressive-terrance.ngrok-free.dev/api/shopify/callback
OAuth callback processing started. Shop: xxx
Built embedded app URL (direct to /auth/success): https://unsavagely-repressive-terrance.ngrok-free.dev/auth/success?shop=xxx&storeId=xxx&success=true
```

---

## 📝 設定確認チェックリスト

- [ ] フロントエンドの`/api/shopify/callback/route.ts`が実装されている
- [ ] バックエンドの`GetRedirectUri()`がフロントエンドURLを返すように修正されている
- [ ] 環境変数`SHOPIFY_FRONTEND_BASEURL`が設定されている（または`Frontend:BaseUrl`が設定されている）
- [ ] Shopify Partners DashboardのRedirect URLsにフロントエンドのngrok URLが登録されている
- [ ] フロントエンドのngrokトンネルが起動している（ポート3000）
- [ ] バックエンドが`localhost:7088`で動作している
- [ ] テストでOAuth認証フローが正常に動作することを確認

---

## 📚 関連ドキュメント

- [ngrok設定ガイド](./ngrok設定ガイド.md)
- [ngrok-ローカルテスト設定手順](./ngrok-ローカルテスト設定手順.md)
- [ngrok-ローカルテスト-SQL更新](./ngrok-ローカルテスト-SQL更新.md)
- [インストール機能設計書](../../03-feature-development/インストールフロー改善機能/インストール機能設計書.md)

---

## 📝 更新履歴

- 2025-12-29: 初版作成
  - コールバックプロキシ実装ガイドを追加
  - 問題点と対策を明確化
  - 実装手順とテスト手順を追加
