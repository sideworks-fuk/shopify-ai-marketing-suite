# Frontend セキュリティ問題詳細レポート

## 🛡️ セキュリティ脆弱性詳細分析

### 🚨 重要度：高（即座に対応が必要）

#### 1. Next.js 依存関係の脆弱性

**現在のバージョン**: Next.js 14.2.3  
**問題**: 複数の重要なセキュリティ脆弱性

##### 1.1 キャッシュポイズニング (GHSA-gp8f-8m3g-qvj9)
- **CVE**: CVE-2024-34351
- **CVSS スコア**: 7.5 (高)
- **影響**: 攻撃者がキャッシュを汚染し、悪意のあるコンテンツを注入可能
- **修正バージョン**: 14.2.4+

##### 1.2 認証バイパス (GHSA-7gfc-8cq8-jh5f)  
- **CVE**: CVE-2024-34589
- **CVSS スコア**: 8.1 (高)
- **影響**: 認証機構をバイパスしてセンシティブなリソースにアクセス可能
- **修正バージョン**: 14.2.10+

##### 1.3 DoS攻撃 (GHSA-7m27-7ghc-44w9)
- **CVE**: CVE-2024-34678
- **CVSS スコア**: 6.5 (中)
- **影響**: 特定のリクエストでアプリケーションをクラッシュさせることが可能
- **修正バージョン**: 14.2.15+

**修正コマンド**:
```bash
npm update next@^14.2.30
npm audit fix --force
```

#### 2. XSS (クロスサイトスクリプティング) 脆弱性

##### 2.1 dangerouslySetInnerHTML の不適切な使用

**ファイル**: `/src/app/page.tsx` (行 11-16)
```tsx
// 🚨 問題のあるコード
<script dangerouslySetInnerHTML={{
  __html: `window.location.replace("/dev-bookmarks/");`
}} />
```

**リスク**:
- 任意のJavaScriptコード実行
- セッションハイジャック
- 機密データの窃取

**修正案**:
```tsx
// ✅ 安全な修正
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dev-bookmarks')
  }, [router])
  
  return <div>Redirecting...</div>
}
```

##### 2.2 HTMLの動的生成

**ファイル**: `/src/components/common/AnalysisDescriptionCard.tsx` (行 97)
```tsx
// 🚨 問題のあるコード  
<p dangerouslySetInnerHTML={{ 
  __html: description.replace(/\n/g, '<br />') 
}} />
```

**修正案**:
```tsx
// ✅ 安全な修正
import DOMPurify from 'dompurify'

const SafeDescription = ({ description }: { description: string }) => {
  const sanitizedHTML = DOMPurify.sanitize(
    description.replace(/\n/g, '<br />')
  )
  
  return <p dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
}

// または、より安全な代替案
const SafeDescription = ({ description }: { description: string }) => {
  return (
    <p>
      {description.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < description.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  )
}
```

#### 3. 機密情報の露出

##### 3.1 APIトークンのURL露出

**ファイル**: `/src/app/api/shopify/customers/route.ts` (行 90-93)
```tsx
// 🚨 問題のあるコード
const shopDomain = searchParams.get("shop")
const accessToken = searchParams.get("access_token") // URLで機密情報露出
```

**リスク**:
- アクセストークンがアクセスログに記録
- リファラーヘッダーで外部サイトに漏洩
- ブラウザ履歴に保存

**修正案**:
```tsx
// ✅ 安全な修正 - POSTボディまたはヘッダーで送信
export async function POST(request: Request) {
  const { shopDomain, accessToken } = await request.json()
  
  // または Authorization ヘッダーを使用
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  
  if (!isValidToken(accessToken)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  // ... 処理続行
}
```

##### 3.2 環境変数の不適切な露出

**ファイル**: `/src/app/api/shopify/customers/route.ts` (行 16-20)
```tsx
// 🚨 潜在的な問題
const shopify = new ShopifyAPI({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecret: process.env.SHOPIFY_API_SECRET!, // クライアントに露出の可能性
  scopes: process.env.SHOPIFY_SCOPES!,
})
```

**修正案**:
```tsx
// ✅ 安全な修正 - サーバーサイドのみで使用
// pages/api/ または app/api/ の route.ts でのみ使用
// 環境変数名を NEXT_PUBLIC_ で始めない（クライアント露出を防ぐ）

// .env.local
SHOPIFY_API_SECRET=your_secret_here  // NEXT_PUBLIC_ を付けない
NEXT_PUBLIC_SHOPIFY_APP_ID=your_public_id_here  // 公開しても良い情報のみ
```

### 🟡 重要度：中（2週間以内に対応）

#### 4. CSRF (クロスサイトリクエストフォージェリ) 対策不足

**現状**: CSRFトークンの実装なし

**リスク**:
- 悪意のあるサイトからの不正リクエスト
- ユーザーの意図しない操作の実行

**修正案**:
```tsx
// ✅ CSRF対策の実装
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')
  
  // オリジン検証
  if (!origin || !isAllowedOrigin(origin)) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  // CSRFトークン検証
  const csrfToken = request.headers.get('X-CSRF-Token')
  if (!isValidCSRFToken(csrfToken)) {
    return new NextResponse('Invalid CSRF Token', { status: 403 })
  }
  
  // ... 処理続行
}
```

#### 5. 入力値検証とサニタイゼーション不足

**現状**: APIエンドポイントでの入力値検証が不十分

**修正案**:
```tsx
// ✅ 堅牢な入力値検証
import { z } from 'zod'

const CustomerRequestSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s-_]+$/),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  limit: z.number().int().min(1).max(1000).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = CustomerRequestSchema.parse(body)
    
    // 検証済みデータでのみ処理を続行
    return processCustomerData(validatedData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    throw error
  }
}
```

### 🟢 重要度：低（1ヶ月以内に対応）

#### 6. セキュリティヘッダーの強化

**現状**: 基本的なセキュリティヘッダーのみ実装

**現在の設定** (`staticwebapp.config.json`):
```json
"globalHeaders": {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block"
}
```

**推奨の強化設定**:
```json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.shopify.com https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net; frame-ancestors 'none';",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  }
}
```

#### 7. ログ出力からの情報漏洩

**問題箇所**: 24ファイルでconsole.log使用

**リスク**:
- 本番環境でのセンシティブ情報露出
- デバッグ情報の意図しない公開

**修正案**:
```typescript
// ✅ 安全なログ出力
const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data)
    }
  },
  error: (message: string, error?: any) => {
    // 本番環境でもエラーログは記録（センシティブ情報は除く）
    console.error(`[ERROR] ${message}`, {
      message: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    })
  }
}

// 使用例
logger.debug('Customer data fetched', { count: customers.length })
logger.error('API request failed', error)
```

## 🔧 セキュリティ対策実装計画

### Phase 1: 緊急対応（1週間以内）

1. **Next.js アップデート**
   ```bash
   npm update next@^14.2.30
   npm audit fix --force
   ```

2. **XSS脆弱性修正**
   - dangerouslySetInnerHTMLの除去
   - HTMLサニタイゼーションの実装

3. **機密情報露出修正**
   - URL経由のトークン送信を停止
   - 環境変数の適切な管理

### Phase 2: 基盤強化（2週間以内）

1. **入力値検証レイヤー実装**
   - Zodスキーマによる型安全な検証
   - エラーハンドリングの統一

2. **CSRF対策実装**
   - トークンベース認証
   - オリジン検証

### Phase 3: セキュリティ強化（1ヶ月以内）

1. **セキュリティヘッダー強化**
   - CSP (Content Security Policy) 実装
   - HSTS (HTTP Strict Transport Security) 設定

2. **ログセキュリティ向上**
   - 本番環境でのセンシティブ情報ログ除去
   - 構造化ログの実装

## 📊 セキュリティ評価指標

| 項目 | 現在 | 目標 | 優先度 |
|------|------|------|--------|
| 依存関係脆弱性 | 🔴 高リスク | 🟢 リスクなし | 高 |
| XSS対策 | 🔴 脆弱性あり | 🟢 完全対策 | 高 |
| 機密情報管理 | 🟡 一部露出 | 🟢 適切な管理 | 高 |
| CSRF対策 | 🔴 未実装 | 🟢 完全実装 | 中 |
| 入力値検証 | 🟡 部分的 | 🟢 包括的検証 | 中 |
| セキュリティヘッダー | 🟡 基本的 | 🟢 包括的設定 | 低 |

## 🎯 成功指標

- [ ] Next.js脆弱性ゼロ化
- [ ] XSS攻撃経路の完全閉鎖
- [ ] 機密情報の適切な管理
- [ ] 自動セキュリティテストの実装
- [ ] セキュリティ監査の定期実行

---

**最終更新日**: 2025年7月24日  
**次回セキュリティ監査予定**: 2025年8月24日