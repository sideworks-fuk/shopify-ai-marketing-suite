# 画面ID体系リファレンス

## 🆔 画面ID命名規則

### ID体系
```
[カテゴリ]-[機能番号]-[画面種別]
```

- **カテゴリ**: PROD（商品）、CUST（顧客）、PURCH（購買）
- **機能番号**: 01～99（2桁）
- **画面種別**: 機能を表す短縮名

---

## 📊 画面ID一覧

### 初期リリース（Phase 1）

| 画面ID | 画面名 | 説明 | 設計書 |
|--------|--------|------|--------|
| **PROD-01-YOY** | 前年同月比分析【商品】 | 商品別の前年同月比較 | [詳細設計書](./PROD-01-YOY-detailed-design.md) |
| **PROD-03-BASKET** | 組み合わせ商品【商品】 | 同時購入される商品の分析 | 作成予定 |
| **CUST-01-DORMANT** | 休眠顧客分析【顧客】 | 休眠顧客の抽出と分析 | [詳細設計書](./CUST-01-DORMANT-detailed-design.md) |
| **PURCH-03-FTIER** | F階層傾向【購買】 | 購買頻度による顧客階層分析 | 作成予定 |

### Phase 2

| 画面ID | 画面名 | 説明 | 設計書 |
|--------|--------|------|--------|
| **PROD-02-FREQ** | 購入頻度分析【商品】 | 商品の購入頻度パターン分析 | 作成予定 |
| **PURCH-01-MONTHLY** | 月別売上統計【購買】 | 月次売上の推移と傾向分析 | [詳細設計書](./PURCH-01-MONTHLY-detailed-design.md) |

### Phase 3

| 画面ID | 画面名 | 説明 | 設計書 |
|--------|--------|------|--------|
| **CUST-02-ANALYSIS** | 顧客購買分析【顧客】 | 顧客の購買行動詳細分析 | 作成予定 |
| **PURCH-02-COUNT** | 購入回数分析【購買】 | 購入回数分布と傾向分析 | 作成予定 |

---

## 💻 実装での使用例

### 1. ブランチ命名
```bash
# 機能開発ブランチ
git checkout -b feature/PURCH-01-MONTHLY-api
git checkout -b feature/PURCH-01-MONTHLY-frontend

# バグ修正ブランチ  
git checkout -b bugfix/PROD-01-YOY-calculation-error
```

### 2. Pull Request / Issue
```markdown
# PR タイトル
[PURCH-01] feat: 月別売上統計APIの実装

# Issue タイトル
[CUST-01] bug: 休眠顧客の期間フィルタが正しく動作しない
```

### 3. コミットメッセージ
```bash
# 機能追加
git commit -m "feat(PURCH-01): Add monthly sales calculation service"

# バグ修正
git commit -m "fix(PROD-01): Correct year-over-year percentage calculation"

# リファクタリング
git commit -m "refactor(CUST-01): Optimize dormant customer query performance"
```

### 4. APIルーティング
```csharp
// Controllers/Analytics/MonthlyStatsController.cs
[Route("api/analytics/PURCH-01")]
[ApiController]
public class MonthlyStatsController : ControllerBase
{
    private const string SCREEN_ID = "PURCH-01-MONTHLY";
    // ...
}
```

### 5. フロントエンドルーティング
```typescript
// app/analytics/routes.ts
export const analyticsRoutes = {
  'PURCH-01-MONTHLY': '/sales/monthly-stats',
  'PROD-01-YOY': '/products/year-over-year',
  'CUST-01-DORMANT': '/customers/dormant',
  'PROD-03-BASKET': '/products/market-basket',
  'PURCH-03-FTIER': '/purchase/f-tier-trend',
} as const;
```

### 6. ログ・監視での使用
```csharp
// ログ出力
_logger.LogInformation("[{ScreenId}] User accessed screen: {UserId}", 
    "PURCH-01-MONTHLY", userId);

// Application Insights
_telemetryClient.TrackEvent("ScreenView", new Dictionary<string, string>
{
    { "ScreenId", "PURCH-01-MONTHLY" },
    { "UserId", userId },
    { "SessionId", sessionId }
});
```

### 7. エラーコード体系
```csharp
public static class ErrorCodes
{
    // PURCH-01-MONTHLY 関連エラー
    public const string PURCH01_DATA_NOT_FOUND = "PURCH-01-404";
    public const string PURCH01_INVALID_PARAMS = "PURCH-01-400";
    public const string PURCH01_CALC_ERROR = "PURCH-01-500";
    
    // PROD-01-YOY 関連エラー
    public const string PROD01_NO_PREV_YEAR_DATA = "PROD-01-404";
    public const string PROD01_INVALID_DATE_RANGE = "PROD-01-400";
}
```

### 8. テストファイル命名
```
tests/
├── backend/
│   ├── PURCH-01-MONTHLY/
│   │   ├── MonthlyStatsService.Tests.cs
│   │   └── MonthlyStatsController.Tests.cs
│   └── PROD-01-YOY/
│       ├── YearOverYearService.Tests.cs
│       └── YearOverYearController.Tests.cs
└── frontend/
    ├── PURCH-01-MONTHLY/
    │   └── MonthlyStats.test.tsx
    └── PROD-01-YOY/
        └── YearOverYear.test.tsx
```

---

## 📋 運用ガイドライン

### 新規画面追加時
1. カテゴリを決定（PROD/CUST/PURCH）
2. カテゴリ内で次の番号を割り当て
3. 画面種別の短縮名を決定
4. このドキュメントを更新

### 画面ID変更時
1. 影響範囲の調査（コード、ドキュメント、ログ）
2. 移行計画の作成
3. 段階的な移行実施
4. 旧IDからのリダイレクト設定

---

*作成日: 2025年7月21日*  
*最終更新: 2025年7月21日*  
*メンテナー: 開発チーム* 