# データ同期デバッグ - 確認すべきバックエンドコントローラー

**作成日**: 2026-01-03  
**目的**: データ同期ボタンのデバッグで確認すべきコントローラーとエンドポイントを明確化

---

## 🎯 最優先で確認すべきコントローラー

### 1. `SyncController.cs` ⭐ 最重要

**ファイルパス**: `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs`

**関連エンドポイント**:

#### 1.1 `POST /api/sync/initial` - 初期同期開始
- **メソッド**: `StartInitialSync` (Line 54-110)
- **用途**: 「同期を開始」ボタンから呼び出される
- **確認ポイント**:
  - ✅ リクエストが到達しているか
  - ✅ `StoreId` が正しく取得できているか（`StoreId` プロパティ）
  - ✅ 認証が成功しているか（`[Authorize]` 属性）
  - ✅ `SyncStatus` レコードが作成されているか
  - ✅ HangFireジョブが登録されているか
  - ✅ レスポンスで `syncId` が返されているか

**デバッグログ追加推奨箇所**:
```csharp
[HttpPost("initial")]
public async Task<IActionResult> StartInitialSync([FromBody] InitialSyncRequest request)
{
    _logger.LogInformation("🔵 [SyncController] POST /api/sync/initial 呼び出し開始");
    _logger.LogInformation("🔵 [SyncController] StoreId: {StoreId}", StoreId);
    _logger.LogInformation("🔵 [SyncController] Request: {Request}", JsonSerializer.Serialize(request));
    
    // ... 既存の処理 ...
    
    _logger.LogInformation("🔵 [SyncController] SyncStatus作成完了: SyncId={SyncId}, JobId={JobId}", syncStatus.Id, jobId);
}
```

#### 1.2 `GET /api/sync/status/{syncId}` - 同期ステータス取得
- **メソッド**: `GetSyncStatus` (Line 432-525)
- **用途**: 同期進捗画面でポーリングされる
- **確認ポイント**:
  - ✅ リクエストが到達しているか
  - ✅ `syncId` が正しく取得できているか
  - ✅ 認証が成功しているか
  - ✅ `SyncStatus` レコードが存在するか
  - ✅ ストアIDが一致しているか（セキュリティチェック）
  - ✅ ステータスが正しく返されているか

**デバッグログ追加推奨箇所**:
```csharp
[HttpGet("status/{syncId}")]
public async Task<IActionResult> GetSyncStatus(int syncId)
{
    _logger.LogInformation("🟢 [SyncController] GET /api/sync/status/{SyncId} 呼び出し開始", syncId);
    _logger.LogInformation("🟢 [SyncController] StoreId: {StoreId}", StoreId);
    
    // ... 既存の処理 ...
    
    _logger.LogInformation("🟢 [SyncController] SyncStatus取得完了: Status={Status}, Progress={Progress}", 
        syncStatus.Status, syncStatus.ProcessedRecords);
}
```

#### 1.3 `POST /api/sync/trigger` - 手動同期開始
- **メソッド**: `TriggerSync` (Line 344-428)
- **用途**: 「今すぐ同期を実行」ボタンから呼び出される（現在は未使用）
- **確認ポイント**:
  - ✅ リクエストが到達しているか
  - ✅ `Type` パラメータが正しく取得できているか
  - ✅ HangFireジョブが登録されているか

---

## 🔐 認証関連コントローラー

### 2. `AuthModeMiddleware.cs` ⭐ 重要

**ファイルパス**: `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs`

**確認ポイント**:
- ✅ リクエストが認証を通過しているか
- ✅ `StoreId` が正しく設定されているか（`context.Items["StoreId"]`）
- ✅ 認証モード（OAuth/Demo/Developer）が正しく判定されているか
- ✅ 401エラーが発生していないか

**デバッグログ追加推奨箇所**:
```csharp
// Line 30付近（InvokeAsync メソッドの開始）
_logger.LogInformation("🔐 [AuthModeMiddleware] リクエスト受信: Path={Path}, Method={Method}", 
    context.Request.Path, context.Request.Method);

// Line 320付近（認証成功後）
if (authResult != null && authResult.IsValid)
{
    _logger.LogInformation("🔐 [AuthModeMiddleware] 認証成功: AuthMode={AuthMode}, StoreId={StoreId}", 
        authResult.AuthMode, authResult.StoreId);
}
```

---

## 🏪 ストア関連コントローラー

### 3. `StoreController.cs` - ストア一覧取得

**ファイルパス**: `backend/ShopifyAnalyticsApi/Controllers/StoreController.cs`

**関連エンドポイント**:

#### 3.1 `GET /api/store` - ストア一覧取得
- **メソッド**: `GetActiveStores` (Line 29-72)
- **用途**: 開発者モードでストア選択時に使用
- **確認ポイント**:
  - ✅ リクエストが到達しているか
  - ✅ アクティブなストアが返されているか
  - ✅ 認証が成功しているか（`[AllowAnonymous]` が設定されているため、認証なしでもアクセス可能）

---

## 📊 同期サービス

### 4. `ShopifyDataSyncService.cs` ⭐ 重要

**ファイルパス**: `backend/ShopifyAnalyticsApi/Services/ShopifyDataSyncService.cs`

**確認ポイント**:
- ✅ `StartInitialSync` メソッドが呼び出されているか
- ✅ `UseSimulation` の値が正しいか（`false` であるべき）
- ✅ `store.AccessToken` が存在するか
- ✅ `RunInitialSyncWithJobs` が実行されているか（シミュレーションモードでない場合）
- ✅ 実際のジョブクラス（`_customerSyncJob`, `_productSyncJob`, `_orderSyncJob`）が呼び出されているか

**デバッグログ追加推奨箇所**:
```csharp
public async Task StartInitialSync(int storeId, InitialSyncOptions syncOptions)
{
    _logger.LogInformation("🟡 [ShopifyDataSyncService] StartInitialSync開始: StoreId={StoreId}", storeId);
    
    var useSimulation = _configuration.GetValue<bool>("Shopify:UseSimulation", false);
    _logger.LogInformation("🟡 [ShopifyDataSyncService] UseSimulation={UseSimulation}", useSimulation);
    
    if (useSimulation || string.IsNullOrEmpty(store.AccessToken))
    {
        _logger.LogWarning("🟡 [ShopifyDataSyncService] シミュレーションモードで実行: UseSimulation={UseSimulation}, HasAccessToken={HasAccessToken}", 
            useSimulation, !string.IsNullOrEmpty(store.AccessToken));
    }
    else
    {
        _logger.LogInformation("🟡 [ShopifyDataSyncService] 実際の同期モードで実行");
    }
}
```

---

## 🔄 HangFireジョブ

### 5. `ShopifyCustomerSyncJob.cs`, `ShopifyProductSyncJob.cs`, `ShopifyOrderSyncJob.cs`

**ファイルパス**:
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs`
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs`
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs`

**確認ポイント**:
- ✅ HangFireジョブが登録されているか
- ✅ ジョブが実行されているか
- ✅ ジョブが成功しているか
- ✅ エラーが発生していないか

**確認方法**:
- HangFireダッシュボードで確認: `https://{backend-url}/hangfire`
- Application Insights でログを確認

---

## 📋 デバッグチェックリスト

### Phase 1: リクエスト到達確認

- [ ] `POST /api/sync/initial` が呼び出されているか
  - Application Insights またはログファイルで確認
  - `SyncController.StartInitialSync` のログを確認

- [ ] `GET /api/sync/status/{syncId}` が呼び出されているか
  - Application Insights またはログファイルで確認
  - `SyncController.GetSyncStatus` のログを確認

### Phase 2: 認証確認

- [ ] `AuthModeMiddleware` で認証が成功しているか
  - `StoreId` が正しく設定されているか
  - 認証モードが正しく判定されているか

- [ ] `SyncController` で `StoreId` が取得できているか
  - `StoreId` プロパティの値を確認

### Phase 3: 同期処理確認

- [ ] `ShopifyDataSyncService.StartInitialSync` が呼び出されているか
  - `UseSimulation` の値が `false` であることを確認
  - `store.AccessToken` が存在することを確認

- [ ] 実際のジョブクラスが呼び出されているか
  - `_customerSyncJob.SyncCustomers()` が呼び出されているか
  - `_productSyncJob.SyncProducts()` が呼び出されているか
  - `_orderSyncJob.SyncOrders()` が呼び出されているか

- [ ] HangFireジョブが登録・実行されているか
  - HangFireダッシュボードで確認
  - ジョブのステータスを確認

### Phase 4: データ保存確認

- [ ] `Customers` テーブルにデータが保存されているか
- [ ] `Products` テーブルにデータが保存されているか
- [ ] `Orders` テーブルにデータが保存されているか

---

## 🔍 デバッグログの追加方法

### 1. SyncController にログを追加

```csharp
// backend/ShopifyAnalyticsApi/Controllers/SyncController.cs

[HttpPost("initial")]
public async Task<IActionResult> StartInitialSync([FromBody] InitialSyncRequest request)
{
    _logger.LogInformation("🔵 [SyncController] ========================================");
    _logger.LogInformation("🔵 [SyncController] POST /api/sync/initial 呼び出し開始");
    _logger.LogInformation("🔵 [SyncController] StoreId: {StoreId}", StoreId);
    _logger.LogInformation("🔵 [SyncController] Request: {Request}", JsonSerializer.Serialize(request));
    _logger.LogInformation("🔵 [SyncController] Timestamp: {Timestamp}", DateTime.UtcNow);
    
    try
    {
        // ... 既存の処理 ...
        
        _logger.LogInformation("🔵 [SyncController] SyncStatus作成完了: SyncId={SyncId}, JobId={JobId}", syncStatus.Id, jobId);
        _logger.LogInformation("🔵 [SyncController] ========================================");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "🔵 [SyncController] エラー発生: {Message}", ex.Message);
        throw;
    }
}
```

### 2. AuthModeMiddleware にログを追加

```csharp
// backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs

public async Task InvokeAsync(...)
{
    var path = context.Request.Path.Value?.ToLower() ?? "";
    
    // 同期関連のリクエストのみログ出力
    if (path.Contains("/api/sync"))
    {
        _logger.LogInformation("🔐 [AuthModeMiddleware] 同期リクエスト受信: Path={Path}, Method={Method}", 
            path, context.Request.Method);
    }
    
    // ... 既存の処理 ...
    
    if (authResult != null && authResult.IsValid)
    {
        if (path.Contains("/api/sync"))
        {
            _logger.LogInformation("🔐 [AuthModeMiddleware] 認証成功: AuthMode={AuthMode}, StoreId={StoreId}, Path={Path}", 
                authResult.AuthMode, authResult.StoreId, path);
        }
    }
}
```

### 3. ShopifyDataSyncService にログを追加

```csharp
// backend/ShopifyAnalyticsApi/Services/ShopifyDataSyncService.cs

public async Task StartInitialSync(int storeId, InitialSyncOptions syncOptions)
{
    _logger.LogInformation("🟡 [ShopifyDataSyncService] ========================================");
    _logger.LogInformation("🟡 [ShopifyDataSyncService] StartInitialSync開始: StoreId={StoreId}", storeId);
    _logger.LogInformation("🟡 [ShopifyDataSyncService] SyncOptions: {Options}", JsonSerializer.Serialize(syncOptions));
    
    var useSimulation = _configuration.GetValue<bool>("Shopify:UseSimulation", false);
    _logger.LogInformation("🟡 [ShopifyDataSyncService] UseSimulation={UseSimulation}", useSimulation);
    
    // ... 既存の処理 ...
}
```

---

## 📊 Application Insights クエリ例

### 同期開始リクエストの確認

```kql
traces
| where message contains "SyncController" and message contains "POST /api/sync/initial"
| project timestamp, message, customDimensions
| order by timestamp desc
| take 50
```

### 同期ステータス取得リクエストの確認

```kql
traces
| where message contains "SyncController" and message contains "GET /api/sync/status"
| project timestamp, message, customDimensions
| order by timestamp desc
| take 50
```

### 認証エラーの確認

```kql
traces
| where message contains "AuthModeMiddleware" and (message contains "401" or message contains "Unauthorized")
| project timestamp, message, customDimensions
| order by timestamp desc
| take 50
```

### シミュレーションモードの確認

```kql
traces
| where message contains "UseSimulation" or message contains "シミュレーション"
| project timestamp, message, customDimensions
| order by timestamp desc
| take 50
```

---

## 🎯 優先順位

### 🔴 最優先（必須確認）

1. **`SyncController.cs`**
   - `POST /api/sync/initial` - 同期開始
   - `GET /api/sync/status/{syncId}` - ステータス取得

2. **`AuthModeMiddleware.cs`**
   - 認証が成功しているか
   - `StoreId` が正しく設定されているか

### 🟡 重要（問題が発生した場合）

3. **`ShopifyDataSyncService.cs`**
   - 実際の同期処理が実行されているか
   - シミュレーションモードでないか

4. **HangFireジョブ**
   - ジョブが登録・実行されているか

### 🟢 補助的（必要に応じて）

5. **`StoreController.cs`**
   - 開発者モードでストア一覧が取得できているか

---

## 📚 関連ファイル

- `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs` - 同期コントローラー
- `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs` - 認証ミドルウェア
- `backend/ShopifyAnalyticsApi/Services/ShopifyDataSyncService.cs` - 同期サービス
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs` - 顧客同期ジョブ
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs` - 商品同期ジョブ
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs` - 注文同期ジョブ
- `backend/ShopifyAnalyticsApi/Controllers/StoreController.cs` - ストアコントローラー

---

**更新履歴**:
- 2026-01-03: 初版作成
