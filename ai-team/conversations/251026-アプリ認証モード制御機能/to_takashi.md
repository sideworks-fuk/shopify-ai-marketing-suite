# To: Takashi（Backend） - Day 4: グローバル読み取り専用ポリシー実装

## 🎯 Day 4 実装概要
**タスク**: グローバル読み取り専用ポリシーの実装  
**期間**: 2025-10-27（予定）  
**優先度**: 高（セキュリティ強化のため）

## 📋 実装タスク

### 1. グローバル読み取り専用フィルターの実装
**ファイル**: `backend/ShopifyAnalyticsApi/Filters/DemoReadOnlyFilter.cs`

**要件**:
- デモモード時の変更操作ブロック
- `[AllowDemoWrite]` 属性による例外許可
- 適切なエラーレスポンス
- ログ記録機能

**参考**: 設計書の `DemoReadOnlyFilter.cs` 実装例（lines 426-481）

### 2. 許可属性の実装
**ファイル**: `backend/ShopifyAnalyticsApi/Attributes/AllowDemoWriteAttribute.cs`

**要件**:
- デモモードでの書き込み操作を明示的に許可
- 理想的には使用しない（セキュリティのため）

### 3. フィルターの登録
**対象**: `Program.cs`

**要件**:
- グローバルフィルターとして登録
- 適切な順序での登録

## 🔧 技術仕様

### グローバル読み取り専用フィルターの実装ポイント

#### 1. デモモード判定
```csharp
public void OnActionExecuting(ActionExecutingContext context)
{
    var isReadOnly = context.HttpContext.Items["IsReadOnly"] as bool?;
    
    if (isReadOnly == true)
    {
        // デモモード時の処理
    }
}
```

#### 2. HTTPメソッド判定
```csharp
var httpMethod = context.HttpContext.Request.Method;

// デモモードでは変更操作（POST/PUT/PATCH/DELETE）をブロック
if (httpMethod == "POST" || httpMethod == "PUT" || 
    httpMethod == "PATCH" || httpMethod == "DELETE")
{
    // ブロック処理
}
```

#### 3. 例外許可の確認
```csharp
// [AllowDemoWrite]属性がある場合のみ許可
var allowDemoWrite = context.ActionDescriptor.EndpointMetadata
    .OfType<AllowDemoWriteAttribute>()
    .Any();

if (!allowDemoWrite)
{
    // ブロック処理
}
```

#### 4. エラーレスポンス
```csharp
context.Result = new JsonResult(new
{
    error = "Forbidden",
    message = "Write operations are not allowed in demo mode"
})
{
    StatusCode = 403
};
```

### 許可属性の実装

#### AllowDemoWriteAttribute.cs
```csharp
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class AllowDemoWriteAttribute : Attribute
{
    // 理想的にはこの属性を使用するエンドポイントはゼロ
    // セキュリティのため、明示的な許可が必要な場合のみ使用
}
```

### Program.csでの登録

#### フィルター登録
```csharp
services.AddControllers(options =>
{
    options.Filters.Add<DemoReadOnlyFilter>();
});
```

## 📚 参考ドキュメント
- **設計書**: `docs/03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-設計書.md`
- **実装計画**: `docs/03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-実装計画.md`

## ⏱️ スケジュール
- [ ] 09:00-10:00: グローバル読み取り専用フィルターの実装
- [ ] 10:00-11:00: 許可属性の実装
- [ ] 11:00-12:00: Program.csでの登録
- [ ] 14:00-15:00: テスト・デバッグ
- [ ] 15:00-16:00: 動作確認
- [ ] 16:00-17:00: 作業ログ・報告書作成

## 🧪 テスト要件
- デモモード時の変更操作ブロックテスト
- 許可属性の動作テスト
- エラーレスポンスの確認
- ログ記録の確認

## 📞 連絡事項
- 実装中に不明点があれば `to_kenji.md` に記載
- 進捗は `report_takashi.md` に日次で報告
- フロントエンドとの連携が必要な場合は `to_yuki.md` で相談

## 🎯 完了条件
1. グローバル読み取り専用フィルターが正常に動作する
2. デモモード時の変更操作が適切にブロックされる
3. 許可属性が適切に動作する
4. テストが正常に完了している

## ⚠️ 重要な注意事項
- **セキュリティ**: デモモードでは変更操作をデフォルトでブロック
- **例外許可**: `[AllowDemoWrite]` 属性は最小限の使用
- **ログ記録**: ブロックされた操作の詳細ログを記録
- **エラーハンドリング**: 適切なエラーレスポンスを返す

---

**依頼日時**: 2025-10-27 09:00  
**依頼者**: Kenji  
**緊急連絡先**: `to_kenji.md`