# SyncType設定仕様の整理

## 問題の概要

手動同期ボタンで実行しても、データベースに`SyncType`が`initial`で登録されている問題が発生。

## 現在の実装状況

### バックエンド実装

#### 1. 初期同期エンドポイント (`/api/sync/initial`)
- **場所**: `SyncController.cs` - `StartInitialSync`メソッド
- **SyncType設定**: `SyncType = "initial"`
- **用途**: 初期設定画面から実行される同期

```csharp
var syncStatus = new SyncStatus
{
    StoreId = currentStore.Id,
    SyncType = "initial",  // ✅ 正しく設定
    Status = "pending",
    StartDate = DateTime.UtcNow,
    SyncPeriod = request.SyncPeriod,
    CurrentTask = "準備中"
};
```

#### 2. 手動同期エンドポイント (`/api/sync/trigger`)
- **場所**: `SyncController.cs` - `TriggerSync`メソッド
- **SyncType設定**: `SyncType = "manual"`
- **用途**: 手動同期タブから実行される同期

```csharp
var syncStatus = new SyncStatus
{
    StoreId = currentStore.Id,
    SyncType = "manual",  // ✅ 正しく設定
    EntityType = request.Type == "all" ? "All" : ...,
    Status = "running",
    StartDate = DateTime.UtcNow,
    ProcessedRecords = 0,
    TotalRecords = 0
};
```

#### 3. スケジュール同期（将来実装予定）
- **SyncType設定**: `SyncType = "scheduled"`
- **用途**: Hangfireの定期ジョブから実行される同期
- **現状**: 未実装

### フロントエンド実装

#### 問題点
- **現在の実装**: `handleStartSync`関数が常に`/api/sync/initial`を呼んでいる
- **影響**: 手動同期タブから実行しても、初期同期として登録される

```typescript
// ❌ 現在の実装（問題あり）
data = await apiClient.request<any>('/api/sync/initial', {
  method: 'POST',
  body: requestBodyString,
})
```

## SyncTypeの定義と用途

| SyncType | 値 | 用途 | エンドポイント | リクエストボディ |
|---------|-----|------|---------------|----------------|
| **初期同期** | `"initial"` | 初期設定画面から実行 | `/api/sync/initial` | `{ syncPeriod: '3months' \| '6months' \| '1year' \| 'all' }` |
| **手動同期** | `"manual"` | 手動同期タブから実行 | `/api/sync/trigger` | `{ type: 'all' \| 'products' \| 'customers' \| 'orders' }` |
| **スケジュール同期** | `"scheduled"` | Hangfire定期ジョブから実行 | （未実装） | - |

## 修正方針

### 1. フロントエンドの修正

`handleStartSync`関数を修正し、現在のタブに応じて適切なエンドポイントを呼ぶようにする。

```typescript
const handleStartSync = async () => {
  // ...
  
  // タブに応じてエンドポイントとリクエストボディを決定
  if (activeTab === 'trigger') {
    // 手動同期タブの場合
    const requestBody = { 
      type: syncPeriod === 'all' ? 'all' : 
            syncPeriod === '3months' ? 'all' :  // 暫定: 期間指定は'all'として扱う
            syncPeriod === '6months' ? 'all' :
            syncPeriod === '1year' ? 'all' : 'all'
    }
    data = await apiClient.request<any>('/api/sync/trigger', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  } else {
    // 初期設定タブの場合
    const requestBody = { syncPeriod }
    data = await apiClient.request<any>('/api/sync/initial', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  }
}
```

### 2. リクエストボディの違い

- **初期同期**: `{ syncPeriod: '3months' | '6months' | '1year' | 'all' }`
- **手動同期**: `{ type: 'all' | 'products' | 'customers' | 'orders' }`

**注意**: 手動同期の`type`フィールドは、同期するデータタイプ（全データ/商品のみ/顧客のみ/注文のみ）を指定します。期間指定は現在の実装ではサポートされていません。

### 3. 手動同期の期間指定について

現在の`/api/sync/trigger`エンドポイントは期間指定をサポートしていません。期間指定が必要な場合は：

1. **オプション1**: エンドポイントを拡張して期間指定を追加
2. **オプション2**: 手動同期では常に`type: 'all'`として実行（最新データのみ取得）

## 実装チェックリスト

- [ ] フロントエンド: `handleStartSync`関数を修正してタブに応じたエンドポイントを呼ぶ
- [ ] フロントエンド: 手動同期タブでは`/api/sync/trigger`を呼ぶ
- [ ] フロントエンド: 初期設定タブでは`/api/sync/initial`を呼ぶ
- [ ] テスト: 手動同期タブから実行して`SyncType = "manual"`が設定されることを確認
- [ ] テスト: 初期設定タブから実行して`SyncType = "initial"`が設定されることを確認
- [ ] （将来）スケジュール同期の実装

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs`
  - `StartInitialSync`メソッド（初期同期）
  - `TriggerSync`メソッド（手動同期）
- `frontend/src/app/setup/initial/page.tsx`
  - `handleStartSync`関数（修正が必要）
