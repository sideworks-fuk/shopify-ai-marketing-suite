# 動的ストア選択機能 設計ドキュメント

## 📋 概要

TAKASHIさんが実装したストア切り替え機能を拡張し、Storesテーブルから動的にストア一覧を取得できるようにします。
これにより、新しいテストストアの追加が容易になり、管理の柔軟性が向上します。

## 🎯 改善ポイント

### 現在の実装
- ストア情報がハードコーディングされている
- 新しいストアの追加には、コード変更が必要

### 改善後
- データベースのStoresテーブルから動的に取得
- 管理画面やSQLでストアの追加・削除が可能
- ストア毎の詳細情報（説明、ステータス等）を管理

## 🏗️ アーキテクチャ設計

### データベース設計

#### Stores テーブル
```sql
CREATE TABLE Stores (
    Id INT PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    DataType NVARCHAR(50) NOT NULL, -- 'production' or 'test'
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    Settings NVARCHAR(MAX) -- JSON形式の追加設定
);

-- 初期データ
INSERT INTO Stores (Id, Name, Description, DataType, IsActive) VALUES
(1, '本番ストア', '実データを使用したメイン分析環境', 'production', 1),
(2, 'テストストア', '2020-2025年のテストデータ環境', 'test', 1),
(3, 'デモストア', 'デモンストレーション用環境', 'test', 1);
```

### API エンドポイント

#### 新規エンドポイント
```
GET /api/stores - 利用可能なストア一覧を取得
```

## 📝 実装変更内容

### 1. バックエンド実装

#### 1.1 Store モデル追加
**ファイル**: `backend/ShopifyAnalyticsApi/Models/StoreModels.cs`

```csharp
namespace ShopifyAnalyticsApi.Models
{
    public class Store
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string DataType { get; set; } // production or test
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string Settings { get; set; } // JSON string
    }

    public class StoreDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string DataType { get; set; }
        public bool IsActive { get; set; }
    }
}
```

#### 1.2 Store Service 追加
**ファイル**: `backend/ShopifyAnalyticsApi/Services/StoreService.cs`

```csharp
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Data;

namespace ShopifyAnalyticsApi.Services
{
    public interface IStoreService
    {
        Task<List<StoreDto>> GetActiveStoresAsync();
        Task<StoreDto> GetStoreByIdAsync(int storeId);
    }

    public class StoreService : IStoreService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<StoreService> _logger;

        public StoreService(ShopifyDbContext context, ILogger<StoreService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<StoreDto>> GetActiveStoresAsync()
        {
            try
            {
                var stores = await _context.Stores
                    .Where(s => s.IsActive)
                    .OrderBy(s => s.Id)
                    .Select(s => new StoreDto
                    {
                        Id = s.Id,
                        Name = s.Name,
                        Description = s.Description,
                        DataType = s.DataType,
                        IsActive = s.IsActive
                    })
                    .ToListAsync();

                _logger.LogInformation("アクティブなストア {Count} 件を取得しました", stores.Count);
                return stores;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア一覧の取得でエラーが発生しました");
                // フォールバック: ハードコーディングされたデフォルト値を返す
                return GetDefaultStores();
            }
        }

        public async Task<StoreDto> GetStoreByIdAsync(int storeId)
        {
            var store = await _context.Stores
                .Where(s => s.Id == storeId && s.IsActive)
                .Select(s => new StoreDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    DataType = s.DataType,
                    IsActive = s.IsActive
                })
                .FirstOrDefaultAsync();

            if (store == null)
            {
                _logger.LogWarning("ストアID {StoreId} が見つかりません", storeId);
                return GetDefaultStores().FirstOrDefault(s => s.Id == storeId);
            }

            return store;
        }

        private List<StoreDto> GetDefaultStores()
        {
            return new List<StoreDto>
            {
                new StoreDto
                {
                    Id = 1,
                    Name = "本番ストア",
                    Description = "実データを使用したメイン分析環境",
                    DataType = "production",
                    IsActive = true
                },
                new StoreDto
                {
                    Id = 2,
                    Name = "テストストア",
                    Description = "2020-2025年のテストデータ環境",
                    DataType = "test",
                    IsActive = true
                }
            };
        }
    }
}
```

#### 1.3 Store Controller 追加
**ファイル**: `backend/ShopifyAnalyticsApi/Controllers/StoreController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StoreController : ControllerBase
    {
        private readonly IStoreService _storeService;
        private readonly ILogger<StoreController> _logger;

        public StoreController(IStoreService storeService, ILogger<StoreController> logger)
        {
            _storeService = storeService;
            _logger = logger;
        }

        /// <summary>
        /// アクティブなストア一覧を取得
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<StoreDto>>>> GetStores()
        {
            try
            {
                var stores = await _storeService.GetActiveStoresAsync();
                
                return Ok(new ApiResponse<List<StoreDto>>
                {
                    Success = true,
                    Data = stores,
                    Message = "ストア一覧を正常に取得しました"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア一覧取得でエラーが発生しました");
                
                return StatusCode(500, new ApiResponse<List<StoreDto>>
                {
                    Success = false,
                    Data = null,
                    Message = "ストア一覧の取得中にエラーが発生しました"
                });
            }
        }

        /// <summary>
        /// 特定のストア情報を取得
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<StoreDto>>> GetStore(int id)
        {
            try
            {
                var store = await _storeService.GetStoreByIdAsync(id);
                
                if (store == null)
                {
                    return NotFound(new ApiResponse<StoreDto>
                    {
                        Success = false,
                        Data = null,
                        Message = $"ストアID {id} が見つかりません"
                    });
                }
                
                return Ok(new ApiResponse<StoreDto>
                {
                    Success = true,
                    Data = store,
                    Message = "ストア情報を正常に取得しました"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア情報取得でエラーが発生しました. StoreId: {StoreId}", id);
                
                return StatusCode(500, new ApiResponse<StoreDto>
                {
                    Success = false,
                    Data = null,
                    Message = "ストア情報の取得中にエラーが発生しました"
                });
            }
        }
    }
}
```

#### 1.4 Program.cs 更新
```csharp
// サービス登録に追加
builder.Services.AddScoped<IStoreService, StoreService>();
```

### 2. フロントエンド実装

#### 2.1 StoreContext.tsx の更新
**ファイル**: `frontend/src/contexts/StoreContext.tsx`

```tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getApiUrl } from '@/lib/api-config'

interface StoreInfo {
  id: number
  name: string
  description: string
  dataType: 'production' | 'test'
  isActive: boolean
}

interface StoreContextType {
  currentStore: StoreInfo | null
  availableStores: StoreInfo[]
  switchStore: (storeId: number) => void
  isLoading: boolean
  error: string | null
}

// フォールバック用のデフォルトストア
const DEFAULT_STORES: StoreInfo[] = [
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
  const [currentStore, setCurrentStore] = useState<StoreInfo | null>(null)
  const [availableStores, setAvailableStores] = useState<StoreInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ストア一覧を取得
  const fetchStores = async () => {
    try {
      setError(null)
      const response = await fetch(`${getApiUrl()}/api/store`)
      
      if (!response.ok) {
        throw new Error('ストア一覧の取得に失敗しました')
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setAvailableStores(result.data)
        return result.data
      } else {
        throw new Error(result.message || 'ストアデータが取得できませんでした')
      }
    } catch (error) {
      console.error('ストア一覧取得エラー:', error)
      setError(error instanceof Error ? error.message : 'ストア一覧の取得に失敗しました')
      
      // エラー時はデフォルト値を使用
      setAvailableStores(DEFAULT_STORES)
      return DEFAULT_STORES
    }
  }

  // 初期化
  useEffect(() => {
    const initializeStores = async () => {
      setIsLoading(true)
      
      // ストア一覧を取得
      const stores = await fetchStores()
      
      // 保存されたストアIDまたはデフォルトを選択
      const savedStoreId = localStorage.getItem('selectedStoreId')
      let selectedStore = null
      
      if (savedStoreId) {
        selectedStore = stores.find(s => s.id === parseInt(savedStoreId))
      }
      
      if (!selectedStore && stores.length > 0) {
        selectedStore = stores[0]
      }
      
      if (selectedStore) {
        setCurrentStore(selectedStore)
      }
      
      setIsLoading(false)
    }
    
    initializeStores()
  }, [])

  const switchStore = (storeId: number) => {
    const store = availableStores.find(s => s.id === storeId)
    if (!store) return

    setIsLoading(true)
    
    // ストア切り替え
    setCurrentStore(store)
    localStorage.setItem('selectedStoreId', storeId.toString())
    
    // ページリロードして新しいデータを取得
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <StoreContext.Provider value={{
      currentStore,
      availableStores,
      switchStore,
      isLoading,
      error
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
```

#### 2.2 StoreSelector.tsx の更新
**ファイル**: `frontend/src/components/common/StoreSelector.tsx`

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
import { Store, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function StoreSelector() {
  const { currentStore, availableStores, switchStore, isLoading, error } = useStore()

  // 初期ローディング中
  if (isLoading && !currentStore) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">ストア読み込み中...</span>
      </div>
    )
  }

  // エラー表示
  if (error && availableStores.length === 0) {
    return (
      <Alert variant="destructive" className="w-fit">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // 現在のストアが選択されていない場合
  if (!currentStore) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">ストア:</span>
      
      <Select
        value={currentStore.id.toString()}
        onValueChange={(value) => switchStore(parseInt(value))}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px]">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>切り替え中...</span>
            </div>
          ) : (
            <SelectValue>
              <div className="flex items-center gap-2">
                <span>{currentStore.name}</span>
                <Badge 
                  variant={currentStore.dataType === 'production' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {currentStore.dataType === 'production' ? '本番' : 'テスト'}
                </Badge>
              </div>
            </SelectValue>
          )}
        </SelectTrigger>
        
        <SelectContent>
          {availableStores.map((store) => (
            <SelectItem key={store.id} value={store.id.toString()} disabled={!store.isActive}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={!store.isActive ? 'text-muted-foreground' : ''}>
                    {store.name}
                  </span>
                  <Badge 
                    variant={store.dataType === 'production' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {store.dataType === 'production' ? '本番' : 'テスト'}
                  </Badge>
                  {!store.isActive && (
                    <Badge variant="outline" className="text-xs">
                      無効
                    </Badge>
                  )}
                </div>
                {store.description && (
                  <div className="text-xs text-muted-foreground">
                    {store.description}
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* エラー時の控えめな表示 */}
      {error && availableStores.length > 0 && (
        <span className="text-xs text-amber-600">
          (オフラインモード)
        </span>
      )}
    </div>
  )
}
```

## 🔗 データベースマイグレーション

### Migration ファイル
**ファイル**: `backend/ShopifyAnalyticsApi/Migrations/AddStoresTable.cs`

```csharp
public partial class AddStoresTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Stores",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false),
                Name = table.Column<string>(maxLength: 100, nullable: false),
                Description = table.Column<string>(maxLength: 500, nullable: true),
                DataType = table.Column<string>(maxLength: 50, nullable: false),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETDATE()"),
                Settings = table.Column<string>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Stores", x => x.Id);
            });

        // 初期データ投入
        migrationBuilder.InsertData(
            table: "Stores",
            columns: new[] { "Id", "Name", "Description", "DataType", "IsActive" },
            values: new object[,]
            {
                { 1, "本番ストア", "実データを使用したメイン分析環境", "production", true },
                { 2, "テストストア", "2020-2025年のテストデータ環境", "test", true }
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Stores");
    }
}
```

## 🚀 拡張性

### 将来的な管理機能

```tsx
// 管理画面でのストア追加UI例
export function StoreManagement() {
  const [stores, setStores] = useState<StoreInfo[]>([])
  
  const addStore = async (newStore: Partial<StoreInfo>) => {
    const response = await fetch(`${getApiUrl()}/api/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStore)
    })
    // ...
  }
  
  const updateStore = async (storeId: number, updates: Partial<StoreInfo>) => {
    const response = await fetch(`${getApiUrl()}/api/store/${storeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    // ...
  }
  
  // UI実装...
}
```

### Shopify認証時の自動ストア作成

```csharp
public async Task<Store> CreateStoreFromShopifyAuth(ShopifyAuthInfo authInfo)
{
    var newStore = new Store
    {
        Id = GenerateStoreId(), // 自動採番
        Name = authInfo.ShopName,
        Description = $"Shopify店舗: {authInfo.ShopDomain}",
        DataType = "production",
        IsActive = true,
        Settings = JsonSerializer.Serialize(new
        {
            shopDomain = authInfo.ShopDomain,
            accessToken = authInfo.AccessToken,
            webhookUrl = authInfo.WebhookUrl
        })
    };
    
    _context.Stores.Add(newStore);
    await _context.SaveChangesAsync();
    
    return newStore;
}
```

## ✅ 実装チェックリスト

### バックエンド
- [ ] Stores テーブル作成（Migration）
- [ ] Store モデル追加
- [ ] StoreService 実装
- [ ] StoreController 実装
- [ ] Program.cs にサービス登録
- [ ] 初期データ投入

### フロントエンド
- [ ] StoreContext.tsx 更新（API呼び出し対応）
- [ ] StoreSelector.tsx 更新（エラーハンドリング追加）
- [ ] ローディング・エラー時のUI改善

### テスト
- [ ] API エンドポイントの動作確認
- [ ] ストア一覧取得の確認
- [ ] エラー時のフォールバック動作確認
- [ ] 新規ストア追加後の動作確認

## 📈 メリット

1. **柔軟性向上**: 新しいテストストアをコード変更なしで追加可能
2. **管理性向上**: データベースで一元管理
3. **拡張性**: 将来的な管理UI追加が容易
4. **信頼性**: エラー時のフォールバック機構

---

**実装担当**: TAKASHIさん（継続）または次の実装者  
**想定工数**: 3-4時間  
**優先度**: 中（開発効率のさらなる向上）