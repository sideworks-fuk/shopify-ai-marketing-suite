# ERISさんへの連絡事項
From: Kenji (PM)
Date: 2025-08-24

## 文書統一作業ありがとうございました！

ERISさん、

無料プラン機能制限の文書統一作業、誠にありがとうございました。
すべての指摘事項を確認し、開発チームへの指示に反映させました。

### 反映した主要改善点

✅ **技術設計**
- 権限制御の一元化（サーバー側ミドルウェア）
- 30日制限の厳密化（UTC統一）
- 冪等トークン＋楽観ロック実装
- 監査ログ（変更前後の記録）
- Shopify Webhook連携

✅ **DB/スキーマ**
- UserFeatureSelections/FeatureUsageLogs/FeatureLimits統一
- ユニーク制約の明確化
- 履歴テーブル分離の検討

✅ **API仕様**
- エンドポイント統一（/api/feature-selection/...）
- 明確なエラーコード定義（409/400/429）
- 上限情報の同送仕様

✅ **フロントエンド**
- App Router準拠のパス構成
- frontend/src/app/billing/free-plan-setup/page.tsx

### 開発チームへの指示完了

- **Yukiさん**: フロントエンド実装詳細を`to_yuki.md`に記載
- **Takashiさん**: バックエンド実装詳細を`to_takashi.md`に記載
- **チーム全体**: 実装開始連絡を`to_all.md`に記載

### APIレスポンス型/ミドルウェア雛形について

> 要望があれば、APIレスポンス型（TypeScript/C#）の雛形と、ミドルウェアの最小実装例も追記します。

はい、お願いします！特に以下の部分の雛形があると助かります：
1. TypeScript側のAPI型定義（完全版）
2. C#側のレスポンスDTO定義
3. FeatureAccessMiddlewareの最小実装例
4. 冪等性トークン検証の実装例

これらがあれば、Yuki/Takashiの実装がよりスムーズに進められます。

### 今後のスケジュール

- 8/26（月）: 実装開始
- 8/30（金）: 実装完了
- 9/2（月）: Shopifyアプリ申請提出

ERISさんの詳細なレビューのおかげで、手戻りなく実装を進められそうです。
本当にありがとうございました！

引き続きよろしくお願いいたします。

Kenji

---

## 付録: 無料プラン機能選択 実装雛形（API型/DTO/ミドルウェア/冪等性）

### 1) TypeScript API 型定義（frontend 用）
```ts
// types/featureSelection.ts

export type FeatureType =
  | 'dormant_analysis'
  | 'yoy_comparison'
  | 'purchase_frequency';

export type ChangeErrorCode =
  | 'change_not_allowed'
  | 'invalid_feature_id'
  | 'concurrent_modification';

export interface FeatureSelectionResponse {
  selectedFeature: FeatureType | null;
  lastChangeDate?: string | null;
  nextChangeAvailableDate?: string | null;
  canChangeToday: boolean;
  changeCount: number;
  reason?: string | null; // 例: 'remaining_days:12'
  currentPlan?: 'free' | 'basic' | 'premium' | 'enterprise';
  hasFullAccess?: boolean;
}

export interface SelectFeatureRequest {
  feature: FeatureType;
  rowVersion?: string; // 楽観ロック用（任意）
}

export interface FeatureInfo {
  feature: FeatureType;
  activatedAt: string; // ISO8601
  nextChangeableDate?: string;
}

export interface SelectFeatureResult {
  success: boolean;
  message: string;
  newSelection?: FeatureInfo;
  errorCode?: ChangeErrorCode;
}

export interface AvailableFeature {
  id: FeatureType;
  name: string;
  description: string;
  limits: Record<string, number | string>;
  currentUsage?: Record<string, number>;
}

export interface FeatureUsageResponse {
  current: Record<string, number>;
  limits: Record<string, number>;
}
```

### 2) C# DTO 定義（backend 用）
```csharp
// DTOs/FeatureSelectionDtos.cs
namespace ShopifyAnalyticsApi.DTOs;

public sealed class FeatureSelectionResponse
{
    public string? SelectedFeature { get; set; }
    public DateTime? LastChangeDate { get; set; }
    public DateTime? NextChangeAvailableDate { get; set; }
    public bool CanChangeToday { get; set; }
    public int ChangeCount { get; set; }
    public string? Reason { get; set; }
    public string? CurrentPlan { get; set; }
    public bool? HasFullAccess { get; set; }
}

public sealed class SelectFeatureRequest
{
    public string Feature { get; set; } = string.Empty; // 'dormant_analysis' 等
    public string? RowVersion { get; set; }
}

public sealed class FeatureInfo
{
    public string Feature { get; set; } = string.Empty;
    public DateTime ActivatedAt { get; set; }
    public DateTime? NextChangeableDate { get; set; }
}

public sealed class SelectFeatureResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public FeatureInfo? NewSelection { get; set; }
    public string? ErrorCode { get; set; } // change_not_allowed 等
}

public sealed class AvailableFeature
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, object> Limits { get; set; } = new();
    public Dictionary<string, int>? CurrentUsage { get; set; }
}

public sealed class FeatureUsageResponse
{
    public Dictionary<string, int> Current { get; set; } = new();
    public Dictionary<string, int> Limits { get; set; } = new();
}
```

### 3) 機能アクセス ミドルウェア（最小実装例）
```csharp
// Middleware/FeatureAccessMiddleware.cs
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;

public sealed class FeatureAccessMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly IFeatureSelectionService _service;

    public FeatureAccessMiddleware(RequestDelegate next, IMemoryCache cache, IFeatureSelectionService service)
    {
        _next = next;
        _cache = cache;
        _service = service;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 例: ルート or ヘッダ等から対象機能を判定（実装都合で差し替え）
        string? requestedFeature = context.Request.Headers["X-Requested-Feature"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(requestedFeature))
        {
            await _next(context);
            return; // 判定対象外のエンドポイント
        }

        int storeId = GetStoreId(context);

        // 短TTLキャッシュ
        var cacheKey = $"feature_access_{storeId}";
        var selection = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return await _service.GetCurrentSelectionAsync(storeId);
        });

        bool hasAccess = selection?.SelectedFeature?.Equals(requestedFeature, StringComparison.OrdinalIgnoreCase) == true
                         || (selection?.HasFullAccess ?? false);

        if (!hasAccess)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = "feature_not_available",
                selectedFeature = selection?.SelectedFeature,
                upgradeUrl = "/settings/billing"
            }));
            return;
        }

        await _next(context);
    }

    private static int GetStoreId(HttpContext context)
    {
        var claim = context.User.FindFirst("StoreId")?.Value;
        if (claim is null || !int.TryParse(claim, out var storeId))
            throw new UnauthorizedAccessException("Store ID not found");
        return storeId;
    }
}
```

### 4) 冪等性トークン検証（最小実装例）
```csharp
// Filters/IdempotencyFilter.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public interface IIdempotencyStore
{
    // true: 記録成功（未使用）/ false: 既使用
    Task<bool> TryRegisterAsync(int storeId, string token, TimeSpan ttl);
}

public sealed class IdempotencyFilter : IAsyncActionFilter
{
    private readonly IIdempotencyStore _store;
    public IdempotencyFilter(IIdempotencyStore store) => _store = store;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var token = http.Request.Headers["X-Idempotency-Token"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(token))
        {
            context.Result = new BadRequestObjectResult(new { error = "missing_idempotency_token" });
            return;
        }

        int storeId = http.User.FindFirst("StoreId") is { } c && int.TryParse(c.Value, out var s) ? s : 0;
        if (storeId == 0)
        {
            context.Result = new UnauthorizedObjectResult(new { error = "store_not_found" });
            return;
        }

        var ok = await _store.TryRegisterAsync(storeId, token, TimeSpan.FromHours(1));
        if (!ok)
        {
            context.Result = new ObjectResult(new { error = "concurrent_modification" }) { StatusCode = 429 };
            return;
        }

        await next();
    }
}
```

```sql
-- （任意）DB で冪等性トークンを保持する場合の例
CREATE TABLE IdempotencyKeys (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    Token NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_Idempotency_Store_Token UNIQUE (StoreId, Token)
);
```

必要に応じて、各コードの配置パスやDI登録サンプルも追記します。ご指定ください。