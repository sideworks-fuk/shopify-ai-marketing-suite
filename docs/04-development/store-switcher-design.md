# ストア切り替え機能 設計ドキュメント

## 📋 概要

### 目的
開発・テスト時にストア1（本番データ）とストア2（テストデータ）を手動で切り替えられる機能を実装。
将来的にはShopify OAuth認証により自動的にストアが決定される予定。

### 対象画面
- 前年同月比【商品】画面
- 購入回数分析【購買】画面  
- 休眠顧客分析【顧客】画面
- その他すべての分析画面

## 🎯 要件定義

### 機能要件
1. **ストア選択UI**: ヘッダー部分でストアを選択可能
2. **リアルタイム切り替え**: 選択後、即座にデータが切り替わる
3. **状態保持**: ブラウザリロード後も選択状態を維持
4. **視覚的表示**: 現在のストアが明確に分かる
5. **開発専用**: 本番環境では非表示（将来対応）

### 非機能要件
- **応答性**: 切り替え時3秒以内でデータ更新
- **互換性**: 既存APIとの完全互換性
- **拡張性**: 将来のShopify認証への移行容易性

## 🏗️ アーキテクチャ設計

### 全体構成
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend     │    │    Database     │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │StoreSelector│ │    │ │Store Context│ │    │ │  Store 1    │ │
│ │   Component │ │    │ │   Service   │ │    │ │   Data      │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│        │        │    │        │        │    │ ┌─────────────┐ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ │  Store 2    │ │
│ │Store Context│ │    │ │   API       │ │    │ │ Test Data   │ │
│ │  Provider   │ │◄───┤ │Controllers  │ │◄───┤ └─────────────┘ │
│ └─────────────┘ │    │ └─────────────┘ │    │                 │
│        │        │    │                 │    │                 │
│ ┌─────────────┐ │    │                 │    │                 │
│ │ Analysis    │ │    │                 │    │                 │
│ │ Components  │ │    │                 │    │                 │
│ └─────────────┘ │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎨 フロントエンド実装

### 1. Store Context Provider

**ファイル**: `src/contexts/StoreContext.tsx`

```tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface StoreInfo {
  id: number
  name: string
  description: string
  dataType: 'production' | 'test'
  isActive: boolean
}

interface StoreContextType {
  currentStore: StoreInfo
  availableStores: StoreInfo[]
  switchStore: (storeId: number) => void
  isLoading: boolean
}

const AVAILABLE_STORES: StoreInfo[] = [
  {
    id: 1,
    name: "本番ストア",
    description: "実データを使用したメイン分析環境",
    dataType: "production",
    isActive: true
  },
  {
    id: 2,
    name: "テストストア",
    description: "2020-2025年のテストデータ環境",
    dataType: "test", 
    isActive: true
  }
]

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<StoreInfo>(AVAILABLE_STORES[0])
  const [isLoading, setIsLoading] = useState(false)

  // 初期化：ローカルストレージから前回選択を復元
  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId')
    if (savedStoreId) {
      const store = AVAILABLE_STORES.find(s => s.id === parseInt(savedStoreId))
      if (store) {
        setCurrentStore(store)
      }
    }
  }, [])

  const switchStore = async (storeId: number) => {
    const store = AVAILABLE_STORES.find(s => s.id === storeId)
    if (!store) return

    setIsLoading(true)
    
    try {
      // ストア切り替え
      setCurrentStore(store)
      
      // ローカルストレージに保存
      localStorage.setItem('selectedStoreId', storeId.toString())
      
      // 分析データのクリア（次回取得時に新しいストアのデータを取得）
      // キャッシュクリアの実装はここに追加
      
      console.log(`ストア切り替え完了: ${store.name} (ID: ${storeId})`)
    } catch (error) {
      console.error('ストア切り替えエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StoreContext.Provider value={{
      currentStore,
      availableStores: AVAILABLE_STORES,
      switchStore,
      isLoading
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
```

### 2. Store Selector Component

**ファイル**: `src/components/common/StoreSelector.tsx`

```tsx
"use client"

import { useStore } from '@/contexts/StoreContext'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Store, Database, TestTube, Loader2 } from 'lucide-react'

export function StoreSelector() {
  const { currentStore, availableStores, switchStore, isLoading } = useStore()

  // 本番環境では非表示（将来実装）
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_ENABLE_STORE_SWITCHER) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="w-4 h-4" />
        <span>ストア:</span>
      </div>
      
      <Select
        value={currentStore.id.toString()}
        onValueChange={(value) => switchStore(parseInt(value))}
        disabled={isLoading}
      >
        <SelectTrigger className="w-48">
          <SelectValue>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentStore.dataType === 'production' ? (
                <Database className="w-4 h-4 text-blue-600" />
              ) : (
                <TestTube className="w-4 h-4 text-orange-600" />
              )}
              <span>{currentStore.name}</span>
              <Badge variant={currentStore.dataType === 'production' ? 'default' : 'secondary'}>
                {currentStore.dataType === 'production' ? '本番' : 'テスト'}
              </Badge>
            </div>
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {availableStores.map((store) => (
            <SelectItem key={store.id} value={store.id.toString()}>
              <div className="flex items-center gap-2">
                {store.dataType === 'production' ? (
                  <Database className="w-4 h-4 text-blue-600" />
                ) : (
                  <TestTube className="w-4 h-4 text-orange-600" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium">{store.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {store.description}
                  </span>
                </div>
                <Badge variant={store.dataType === 'production' ? 'default' : 'secondary'}>
                  {store.dataType === 'production' ? '本番' : 'テスト'}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

### 3. API Hook の拡張

**ファイル**: `src/hooks/useStoreAwareApi.ts`

```tsx
import { useStore } from '@/contexts/StoreContext'
import { getApiUrl } from '@/lib/api-config'

export function useStoreAwareApi() {
  const { currentStore } = useStore()

  const buildApiUrl = (endpoint: string, params?: Record<string, any>) => {
    const baseUrl = getApiUrl()
    const url = new URL(`${baseUrl}${endpoint}`)
    
    // ストアIDを自動追加
    url.searchParams.set('storeId', currentStore.id.toString())
    
    // 追加パラメータ
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString())
        }
      })
    }
    
    return url.toString()
  }

  const fetchWithStore = async (endpoint: string, options: RequestInit = {}) => {
    const url = buildApiUrl(endpoint)
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  return {
    currentStoreId: currentStore.id,
    currentStoreName: currentStore.name,
    buildApiUrl,
    fetchWithStore
  }
}
```

### 4. ヘッダーコンポーネントの更新

**ファイル**: `src/components/layout/Header.tsx`

```tsx
import { StoreSelector } from '@/components/common/StoreSelector'

export function Header() {
  return (
    <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* 左側: ロゴ等 */}
          <div className="flex items-center gap-4">
            {/* 既存のロゴやナビゲーション */}
          </div>
          
          {/* 右側: ストア選択 */}
          <div className="flex items-center gap-4">
            <StoreSelector />
            {/* 既存のユーザーメニュー等 */}
          </div>
        </div>
      </div>
    </header>
  )
}
```

## 🔧 バックエンド実装

### 1. Store Context Middleware

**ファイル**: `backend/ShopifyAnalyticsApi/Middleware/StoreContextMiddleware.cs`

```csharp
public class StoreContextMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<StoreContextMiddleware> _logger;

    public StoreContextMiddleware(RequestDelegate next, ILogger<StoreContextMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // クエリパラメータからstoreIdを取得
        if (context.Request.Query.TryGetValue("storeId", out var storeIdValue))
        {
            if (int.TryParse(storeIdValue, out var storeId))
            {
                // リクエストコンテキストにストアIDを保存
                context.Items["StoreId"] = storeId;
                _logger.LogDebug("ストアコンテキスト設定: StoreId = {StoreId}", storeId);
            }
        }
        else
        {
            // デフォルトはストア1
            context.Items["StoreId"] = 1;
            _logger.LogDebug("デフォルトストアコンテキスト設定: StoreId = 1");
        }

        await _next(context);
    }
}
```

### 2. Store Context Service

**ファイル**: `backend/ShopifyAnalyticsApi/Services/StoreContextService.cs`

```csharp
public interface IStoreContextService
{
    int GetCurrentStoreId();
    string GetCurrentStoreName();
    bool IsTestStore();
}

public class StoreContextService : IStoreContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<StoreContextService> _logger;

    public StoreContextService(
        IHttpContextAccessor httpContextAccessor,
        ILogger<StoreContextService> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public int GetCurrentStoreId()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.Items.TryGetValue("StoreId", out var storeIdObj) == true)
        {
            return (int)storeIdObj;
        }

        _logger.LogWarning("ストアIDが設定されていません。デフォルト値1を使用します。");
        return 1; // デフォルト
    }

    public string GetCurrentStoreName()
    {
        return GetCurrentStoreId() switch
        {
            1 => "本番ストア",
            2 => "テストストア",
            _ => "不明なストア"
        };
    }

    public bool IsTestStore()
    {
        return GetCurrentStoreId() == 2;
    }
}
```

### 3. 既存コントローラーの更新例

**ファイル**: `backend/ShopifyAnalyticsApi/Controllers/PurchaseController.cs`

```csharp
[HttpGet("count-analysis")]
public async Task<ActionResult<ApiResponse<PurchaseCountAnalysisResponse>>> GetPurchaseCountAnalysis(
    [FromQuery] PurchaseCountAnalysisRequest request)
{
    try
    {
        // ストアコンテキストから自動的にstoreIdを取得
        var storeId = _storeContextService.GetCurrentStoreId();
        request.StoreId = storeId;

        _logger.LogInformation("購入回数分析データ取得開始. StoreId: {StoreId} ({StoreName})", 
            storeId, _storeContextService.GetCurrentStoreName());

        // 既存の処理...
        var result = await _purchaseCountAnalysisService.GetPurchaseCountAnalysisAsync(request);

        return Ok(new ApiResponse<PurchaseCountAnalysisResponse>
        {
            Success = true,
            Data = result,
            Message = $"購入回数分析データを正常に取得しました。({_storeContextService.GetCurrentStoreName()})"
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "購入回数分析データ取得でエラーが発生. StoreId: {StoreId}", 
            _storeContextService.GetCurrentStoreId());
        return StatusCode(500, new ApiResponse<PurchaseCountAnalysisResponse>
        {
            Success = false,
            Data = null,
            Message = "購入回数分析データ取得中にエラーが発生しました。"
        });
    }
}
```

## 🔗 統合・設定

### 1. App.tsx への Provider 追加

**ファイル**: `src/app/layout.tsx`

```tsx
import { StoreProvider } from '@/contexts/StoreContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  )
}
```

### 2. Program.cs への Middleware 追加

**ファイル**: `backend/ShopifyAnalyticsApi/Program.cs`

```csharp
// サービス登録
builder.Services.AddScoped<IStoreContextService, StoreContextService>();
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

// ミドルウェア登録
app.UseMiddleware<StoreContextMiddleware>();

// 既存のミドルウェア...
app.UseRouting();
app.MapControllers();
```

## 🧪 テスト方法

### 1. 手動テスト手順

1. **初期状態確認**
   - アプリ起動後、ヘッダーにストア選択UIが表示される
   - デフォルトで「本番ストア」が選択されている

2. **ストア切り替えテスト**
   - ドロップダウンから「テストストア」を選択
   - ローディングアニメーションが表示される
   - 分析画面のデータが切り替わる

3. **状態保持テスト**
   - テストストアを選択した状態でブラウザをリロード
   - リロード後もテストストアが選択されている

4. **API呼び出し確認**
   - Network タブで API リクエストを確認
   - `storeId=2` パラメータが自動追加されている

### 2. 分析画面別テスト

| 画面 | 本番ストア | テストストア |
|------|------------|--------------|
| 前年同月比【商品】 | 実データの商品売上 | 2020-2025年テストデータ |
| 購入回数分析【購買】 | 実際の顧客購入パターン | 設計された5階層パターン |
| 休眠顧客分析【顧客】 | 実際の休眠顧客 | 山田由美等の設計パターン |

## 🚀 将来のShopify認証連携

### OAuth 連携時の変更点

```tsx
// 将来の実装例
export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<StoreInfo | null>(null)
  const { shopifyAuth } = useShopifyAuth() // 将来実装

  useEffect(() => {
    if (shopifyAuth.isAuthenticated) {
      // Shopify認証情報からストア情報を取得
      const storeInfo = {
        id: shopifyAuth.shop.id,
        name: shopifyAuth.shop.name,
        description: shopifyAuth.shop.domain,
        dataType: 'production' as const,
        isActive: true
      }
      setCurrentStore(storeInfo)
    } else {
      // 開発環境では手動選択を継続
      // 既存のロジック...
    }
  }, [shopifyAuth])

  // 認証時は手動切り替えを無効化
  const switchStore = shopifyAuth.isAuthenticated 
    ? () => console.log('認証時はストア切り替えできません')
    : manualSwitchStore

  // ...
}
```

## ✅ 実装チェックリスト

### フロントエンド（YUKIさん担当）
- [ ] StoreContext Provider 実装
- [ ] StoreSelector Component 実装  
- [ ] useStoreAwareApi Hook 実装
- [ ] Header Component 更新
- [ ] layout.tsx に Provider 追加
- [ ] 既存分析コンポーネントでストア対応API使用

### バックエンド（必要時）
- [ ] StoreContextMiddleware 実装
- [ ] StoreContextService 実装
- [ ] Program.cs 設定追加
- [ ] 既存コントローラーのストア対応確認

### テスト
- [ ] ストア切り替え動作確認
- [ ] 状態保持確認
- [ ] API パラメータ確認
- [ ] 各分析画面でのデータ切り替え確認

---

**実装担当**: YUKIさん  
**想定工数**: 4-6時間  
**優先度**: 中（開発効率向上のため）  
**将来対応**: Shopify OAuth 認証との統合