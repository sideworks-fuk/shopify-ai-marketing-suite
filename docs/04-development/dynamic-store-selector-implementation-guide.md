# 動的ストア選択機能 実装ガイド

## 📋 概要

TAKASHIさんが実装したストア切り替え機能を拡張し、ハードコーディングされたストア情報をデータベースのStoresテーブルから動的に取得できるようにします。

## 🚀 実装手順

### Step 1: 既存Storesテーブルの拡張（30分）

既にStoresテーブルが存在するため、動的ストア選択に必要な追加カラムをマイグレーションで追加します。

#### 1.1 マイグレーションファイル作成

```bash
cd backend/ShopifyAnalyticsApi
dotnet ef migrations add AddStoreMetadataColumns
```

#### 1.2 追加カラムのマイグレーション

**生成されたマイグレーションファイルを以下の内容で更新**:

```csharp
public partial class AddStoreMetadataColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Description カラムを追加
        migrationBuilder.AddColumn<string>(
            name: "Description",
            table: "Stores",
            maxLength: 500,
            nullable: true);

        // DataType カラムを追加（production/test）
        migrationBuilder.AddColumn<string>(
            name: "DataType",
            table: "Stores",
            maxLength: 50,
            nullable: false,
            defaultValue: "production");

        // IsActive カラムを追加
        migrationBuilder.AddColumn<bool>(
            name: "IsActive",
            table: "Stores",
            nullable: false,
            defaultValue: true);

        // Settings カラムを追加（JSON形式の追加設定用）
        migrationBuilder.AddColumn<string>(
            name: "Settings",
            table: "Stores",
            nullable: true);

        // 既存データの更新
        migrationBuilder.UpdateData(
            table: "Stores",
            keyColumn: "Id",
            keyValue: 1,
            columns: new[] { "Description", "DataType" },
            values: new object[] { "実データを使用したメイン分析環境", "production" });

        // テストストアデータを追加
        migrationBuilder.InsertData(
            table: "Stores",
            columns: new[] { "Id", "Name", "Description", "DataType", "IsActive", "CreatedAt", "UpdatedAt" },
            values: new object[,]
            {
                { 2, "テストストア", "2020-2025年のテストデータ環境", "test", true, DateTime.UtcNow, DateTime.UtcNow },
                { 3, "デモストア", "デモンストレーション用環境", "test", true, DateTime.UtcNow, DateTime.UtcNow }
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // 追加したストアデータを削除
        migrationBuilder.DeleteData(
            table: "Stores",
            keyColumn: "Id",
            keyValue: 2);

        migrationBuilder.DeleteData(
            table: "Stores",
            keyColumn: "Id",
            keyValue: 3);

        // カラムを削除
        migrationBuilder.DropColumn(name: "Description", table: "Stores");
        migrationBuilder.DropColumn(name: "DataType", table: "Stores");
        migrationBuilder.DropColumn(name: "IsActive", table: "Stores");
        migrationBuilder.DropColumn(name: "Settings", table: "Stores");
    }
}
```

#### 1.3 マイグレーション実行

```bash
dotnet ef database update
```

#### 1.4 既存データの確認と更新（必要に応じて）

```sql
-- 現在のストアデータを確認
SELECT * FROM Stores;

-- 必要に応じて既存データを更新
UPDATE Stores 
SET Description = '本番データ環境', 
    DataType = 'production', 
    IsActive = 1 
WHERE Id = 1;
```

### Step 2: バックエンドモデル更新（20分）

#### 2.1 既存Storeモデルの拡張

既存のStoreモデルに必要なプロパティを追加します。

**ファイル**: `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs`

```csharp
// 既存のStoreクラスに以下のプロパティを追加
public class Store
{
    // 既存のプロパティ...
    
    // 追加プロパティ
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [MaxLength(50)]
    public string DataType { get; set; } = "production"; // production or test
    
    public bool IsActive { get; set; } = true;
    
    public string? Settings { get; set; } // JSON形式の追加設定
}
```

#### 2.2 StoreDto作成

**ファイル**: `backend/ShopifyAnalyticsApi/Models/StoreDtos.cs` (新規作成)

```csharp
namespace ShopifyAnalyticsApi.Models
{
    public class StoreDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string DataType { get; set; }
        public bool IsActive { get; set; }
    }
}
```

### Step 3: バックエンドサービス実装（30分）

#### 3.1 StoreService.cs 作成

**ファイル**: `backend/ShopifyAnalyticsApi/Services/StoreService.cs`

```csharp
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Data;
using Microsoft.EntityFrameworkCore;

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

### Step 4: APIコントローラー実装（20分）

#### 4.1 StoreController.cs 作成

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

#### 4.2 Program.cs 更新

```csharp
// サービス登録に追加
builder.Services.AddScoped<IStoreService, StoreService>();
```

### Step 5: フロントエンド更新（40分）

#### 5.1 StoreContext.tsx 更新

**主な変更点**:
- ハードコーディングされたストア情報を削除
- API呼び出しを追加
- エラーハンドリング強化

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

#### 5.2 StoreSelector.tsx 更新

**エラー表示とローディング状態の改善**:

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

### Step 6: テストとデバッグ（30分）

#### 6.1 動作確認手順

1. **データベース確認**
   ```sql
   SELECT * FROM Stores;
   ```

2. **API動作確認**
   ```bash
   # ストア一覧取得
   curl http://localhost:5000/api/store
   
   # 特定ストア取得
   curl http://localhost:5000/api/store/2
   ```

3. **フロントエンド動作確認**
   - 初回表示でAPIからストア一覧を取得
   - ストア切り替えが動作
   - エラー時にフォールバック表示

#### 6.2 トラブルシューティング

**APIが404エラーの場合**:
- コントローラーが正しく登録されているか確認
- ルーティングの設定を確認

**ストアが表示されない場合**:
- ブラウザの開発者ツールでネットワークタブを確認
- コンソールエラーを確認

**データベースエラーの場合**:
- マイグレーションが正しく実行されたか確認
- 接続文字列を確認

### Step 7: 新しいストアの追加（オプション）

#### 7.1 SQL で新しいストアを追加

```sql
INSERT INTO Stores (Id, Name, Description, DataType, IsActive, CreatedAt, UpdatedAt) 
VALUES 
(4, 'パフォーマンステスト用', '大量データのパフォーマンステスト環境', 'test', 1, GETDATE(), GETDATE()),
(5, 'デモストア2', '特定業界向けデモデータ', 'test', 1, GETDATE(), GETDATE());
```

#### 7.2 管理画面（将来実装）

将来的には管理画面からストアの追加・編集・削除ができるようになります。

## ✅ 実装チェックリスト

### バックエンド
- [ ] Storesテーブル作成（マイグレーション）
- [ ] Store モデル追加
- [ ] StoreService 実装
- [ ] StoreController 実装
- [ ] Program.cs にサービス登録
- [ ] 初期データ投入確認

### フロントエンド
- [ ] StoreContext.tsx 更新（API呼び出し対応）
- [ ] StoreSelector.tsx 更新（エラーハンドリング追加）
- [ ] ローディング状態の確認
- [ ] エラー時のフォールバック確認

### テスト
- [ ] API エンドポイントの動作確認
- [ ] 3つ以上のストアでの動作確認
- [ ] エラー時のフォールバック確認
- [ ] 新規ストア追加後の動作確認

## 🎯 期待される成果

1. **柔軟性向上**: SQLでストアを追加するだけで選択肢に表示
2. **管理性向上**: データベースで一元管理
3. **拡張性**: 将来の管理UI実装が容易
4. **信頼性**: API障害時もフォールバックで動作継続

## 📝 実装のポイント

1. **エラーハンドリング**: API障害時もアプリが動作するようフォールバック実装
2. **パフォーマンス**: ストア一覧は初回のみ取得してキャッシュ
3. **互換性**: 既存の実装を壊さないよう注意

---

**実装担当**: 次の実装者  
**想定工数**: 3-4時間  
**優先度**: 中（開発効率のさらなる向上）  
**前提条件**: TAKASHIさんの基本実装が完了していること