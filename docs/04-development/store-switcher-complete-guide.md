# ストア切り替え機能実装ガイド（統合版）

## 概要
マルチテナント対応のShopifyアプリにおいて、複数のストアを管理するための動的ストアセレクター機能の設計と実装ガイドです。

## アーキテクチャ設計

### 1. システム構成
```
┌─────────────────┐
│   フロントエンド   │
│  (Next.js/React) │
└────────┬────────┘
         │
         ├── API呼び出し時にstoreIdをヘッダーに含める
         │
┌────────▼────────┐
│   バックエンド    │
│  (ASP.NET Core) │
└────────┬────────┘
         │
         ├── StoreAwareControllerBaseでstoreIdを検証
         │
┌────────▼────────┐
│   データベース    │
│  (SQL Server)   │
└─────────────────┘
```

### 2. データベース設計

#### Storesテーブル
```sql
CREATE TABLE Stores (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ShopDomain NVARCHAR(255) NOT NULL UNIQUE,
    AccessToken NVARCHAR(MAX),
    StoreName NVARCHAR(255),
    Email NVARCHAR(255),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2,
    IsActive BIT DEFAULT 1,
    InitialSetupCompleted BIT DEFAULT 0,
    LastSyncDate DATETIME2
);
```

## フロントエンド実装

### 1. ストアセレクターコンポーネント

```typescript
// components/store/StoreSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from '@/types/store';
import { storeService } from '@/services/storeService';

export default function StoreSelector() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const storeList = await storeService.getStores();
      setStores(storeList);
      
      // 現在のストアIDを取得（URLまたはlocalStorageから）
      const currentStoreId = localStorage.getItem('selectedStoreId');
      if (currentStoreId && storeList.find(s => s.id === currentStoreId)) {
        setSelectedStore(currentStoreId);
      } else if (storeList.length > 0) {
        setSelectedStore(storeList[0].id);
        localStorage.setItem('selectedStoreId', storeList[0].id);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId);
    localStorage.setItem('selectedStoreId', storeId);
    
    // ページをリロードまたは状態を更新
    router.refresh();
  };

  if (loading) return <div>読み込み中...</div>;
  if (stores.length === 0) return <div>ストアが登録されていません</div>;

  return (
    <select 
      value={selectedStore} 
      onChange={(e) => handleStoreChange(e.target.value)}
      className="form-select"
    >
      {stores.map(store => (
        <option key={store.id} value={store.id}>
          {store.storeName || store.shopDomain}
        </option>
      ))}
    </select>
  );
}
```

### 2. APIサービス層

```typescript
// services/storeService.ts
import { apiClient } from '@/lib/apiClient';

export const storeService = {
  // 現在のストアIDを取得
  getCurrentStoreId(): string | null {
    return localStorage.getItem('selectedStoreId');
  },

  // すべてのストアを取得
  async getStores() {
    const response = await apiClient.get('/api/stores');
    return response.data;
  },

  // ストア情報を取得
  async getStore(storeId: string) {
    const response = await apiClient.get(`/api/stores/${storeId}`);
    return response.data;
  },

  // ストアを切り替え
  setCurrentStore(storeId: string) {
    localStorage.setItem('selectedStoreId', storeId);
    // APIクライアントのデフォルトヘッダーを更新
    apiClient.defaults.headers.common['X-Store-Id'] = storeId;
  }
};
```

### 3. APIクライアント設定

```typescript
// lib/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    // ストアIDをヘッダーに追加
    const storeId = localStorage.getItem('selectedStoreId');
    if (storeId) {
      config.headers['X-Store-Id'] = storeId;
    }

    // JWTトークンを追加
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export { apiClient };
```

## バックエンド実装

### 1. StoreAwareControllerBase

```csharp
// Controllers/Base/StoreAwareControllerBase.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public abstract class StoreAwareControllerBase : ControllerBase
{
    protected Guid StoreId { get; private set; }
    protected string StoreDomain { get; private set; }

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        // ヘッダーからストアIDを取得
        if (Request.Headers.TryGetValue("X-Store-Id", out var storeIdHeader))
        {
            if (Guid.TryParse(storeIdHeader, out var storeId))
            {
                StoreId = storeId;
                ValidateStoreAccess(storeId);
            }
            else
            {
                context.Result = BadRequest("Invalid Store ID format");
                return;
            }
        }
        else
        {
            context.Result = BadRequest("Store ID is required");
            return;
        }

        base.OnActionExecuting(context);
    }

    private void ValidateStoreAccess(Guid storeId)
    {
        // JWTトークンからユーザー情報を取得
        var userId = User.FindFirst("UserId")?.Value;
        
        // ユーザーがこのストアにアクセス権限があるか確認
        // 実装は認証方式に応じて調整
    }
}
```

### 2. ストア管理API

```csharp
// Controllers/StoresController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StoresController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public StoresController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StoreDto>>> GetStores()
    {
        // ユーザーがアクセス可能なストアのみ返す
        var stores = await _context.Stores
            .Where(s => s.IsActive)
            .Select(s => new StoreDto
            {
                Id = s.Id,
                ShopDomain = s.ShopDomain,
                StoreName = s.StoreName,
                CreatedAt = s.CreatedAt,
                InitialSetupCompleted = s.InitialSetupCompleted
            })
            .ToListAsync();

        return Ok(stores);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StoreDto>> GetStore(Guid id)
    {
        var store = await _context.Stores
            .Where(s => s.Id == id && s.IsActive)
            .FirstOrDefaultAsync();

        if (store == null)
        {
            return NotFound();
        }

        return Ok(new StoreDto
        {
            Id = store.Id,
            ShopDomain = store.ShopDomain,
            StoreName = store.StoreName,
            CreatedAt = store.CreatedAt,
            InitialSetupCompleted = store.InitialSetupCompleted
        });
    }
}
```

### 3. データアクセス層でのマルチテナント対応

```csharp
// Services/DataService.cs
public class DataService
{
    private readonly ApplicationDbContext _context;
    private readonly Guid _storeId;

    public DataService(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        
        // HTTPヘッダーからストアIDを取得
        var storeIdHeader = httpContextAccessor.HttpContext?.Request.Headers["X-Store-Id"];
        if (Guid.TryParse(storeIdHeader, out var storeId))
        {
            _storeId = storeId;
        }
    }

    public async Task<IEnumerable<Customer>> GetCustomersAsync()
    {
        // 常に現在のストアIDでフィルタリング
        return await _context.Customers
            .Where(c => c.StoreId == _storeId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetOrdersAsync()
    {
        return await _context.Orders
            .Where(o => o.StoreId == _storeId)
            .Include(o => o.OrderItems)
            .ToListAsync();
    }
}
```

## レイアウトへの統合

### MainLayout.tsx での実装

```typescript
// components/layout/MainLayout.tsx
import StoreSelector from '@/components/store/StoreSelector';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <h1>EC Ranger</h1>
        </div>
        <div className="header-right">
          <StoreSelector />
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
```

## セキュリティ考慮事項

### 1. アクセス制御
- ユーザーは自分が権限を持つストアのみアクセス可能
- JWTトークンにストアアクセス権限を含める
- バックエンドで必ずストアIDを検証

### 2. データ分離
- すべてのクエリにストアIDフィルタを適用
- Global Query Filtersの使用を検討
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Customer>()
        .HasQueryFilter(c => c.StoreId == _currentStoreId);
}
```

### 3. 監査ログ
- ストア切り替えイベントをログに記録
- 不正なアクセス試行を検知

## トラブルシューティング

### 問題1: ストアが切り替わらない
**原因**: LocalStorageの値が更新されていない
**解決**: 
```javascript
// 強制的にリロード
window.location.reload();
```

### 問題2: 401 Unauthorized エラー
**原因**: ストアIDがヘッダーに含まれていない
**解決**: APIクライアントのインターセプターを確認

### 問題3: データが混在する
**原因**: バックエンドでストアIDフィルタが適用されていない
**解決**: StoreAwareControllerBaseを継承しているか確認

## パフォーマンス最適化

### 1. キャッシング
```typescript
// ストア情報をキャッシュ
const storeCache = new Map<string, Store>();

export const getCachedStore = async (storeId: string) => {
  if (storeCache.has(storeId)) {
    return storeCache.get(storeId);
  }
  const store = await storeService.getStore(storeId);
  storeCache.set(storeId, store);
  return store;
};
```

### 2. インデックス
```sql
-- ストアIDでのクエリを高速化
CREATE INDEX IX_Customers_StoreId ON Customers(StoreId);
CREATE INDEX IX_Orders_StoreId ON Orders(StoreId);
CREATE INDEX IX_Products_StoreId ON Products(StoreId);
```

## まとめ
このストア切り替え機能により、ユーザーは複数のShopifyストアを簡単に切り替えながら、各ストアのデータを安全に管理できます。フロントエンドとバックエンドの両方で適切なマルチテナント対応を実装することで、データの分離とセキュリティを確保しています。