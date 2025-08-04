# Shopify ECマーケティング分析アプリ - 統合開発計画書

## 📋 ドキュメント情報
- **作成日**: 2025年7月21日
- **最終更新**: 2025年7月21日
- **作成者**: AI Assistant  
- **バージョン**: v1.1
- **目的**: 8機能の効率的な実装計画と技術統合戦略

## 📝 改訂履歴
| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-07-21 | v1.0 | 初版作成 |
| 2025-07-21 | v1.1 | バックエンドAPI基盤構築完了、フロントエンド・バックエンド統合成功を反映 |

---

## 🎯 エグゼクティブサマリー

### プロジェクト概要
- **対象機能**: 8つの分析機能（初期リリース4機能 + Phase 2以降4機能）
- **開発期間**: 2週間（14日間）
- **開発手法**: 段階的実装による基盤共有とリスク分散
- **技術方針**: 80点実装戦略（完璧より動作を優先）

### 実装優先順位
1. **Phase 1 (Day 1-3)**: 月別売上統計、前年同月比
2. **Phase 2 (Day 4-6)**: 休眠顧客、購入頻度【商品】
3. **Phase 3 (Day 7-10)**: 購入回数、顧客購買、F階層傾向
4. **Phase 4 (Day 11-14)**: 組み合わせ商品、統合テスト

### 🆕 現在の進捗状況（2025年7月21日時点）
- ✅ **バックエンドAPI基盤構築**: ASP.NET Core 8.0 + Azure App Service構築完了
- ✅ **フロントエンド・バックエンド統合**: CORS設定完了、API接続テスト成功
- ✅ **モックデータサービス**: 顧客データモック実装完了
- 🔄 **次フェーズ**: 実データ統合準備、月別売上統計機能実装開始

---

## 📊 8機能の技術分析

### 機能別複雑度と依存関係

| 機能名 | 複雑度 | 主要テーブル | 依存関係 | 実装日数 |
|--------|--------|-------------|----------|----------|
| 月別売上統計 | ⭐⭐ | ProductMonthlyStats | なし | 1.5日 |
| 前年同月比 | ⭐⭐ | ProductMonthlyStats | 月別売上 | 0.5日 |
| 休眠顧客 | ⭐⭐⭐ | CustomerSummary | なし | 1.5日 |
| 購入頻度【商品】 | ⭐⭐⭐ | ProductPurchaseFrequency | なし | 1.5日 |
| 購入回数 | ⭐⭐⭐⭐ | purchase_frequency_analysis | なし | 2日 |
| 顧客購買 | ⭐⭐⭐⭐ | customer_analysis_details | 休眠顧客 | 2日 |
| F階層傾向 | ⭐⭐⭐⭐ | f_tier_monthly_details | 顧客購買 | 2日 |
| 組み合わせ商品 | ⭐⭐⭐⭐⭐ | product_combinations | なし | 2日 |

### 共通技術課題
1. **OrderItemsとProductsの関連付け** - ProductHandleでのマッピング
2. **バッチ処理時間の競合** - 午前2時に3機能が集中
3. **大量データのパフォーマンス** - インデックス戦略が必須
4. **マルチテナント対応** - StoreIdフィルタの徹底

---

## 🏗️ 技術アーキテクチャ

### システム構成図
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│  ASP.NET Core   │────▶│  Azure SQL DB   │
│   Frontend      │     │   Web API       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Batch Jobs     │     │  Shopify API    │
                        │  (Background)   │     │  (GraphQL)      │
                        └─────────────────┘     └─────────────────┘
```

### 共通基盤コンポーネント

#### 1. データベース層
```csharp
// 共通のDbContext設定
public class ShopifyDbContext : DbContext
{
    // 共通設定
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // グローバルフィルタ（マルチテナント対応）
        modelBuilder.Entity<Product>()
            .HasQueryFilter(p => p.StoreId == _currentStoreId);
    }
}
```

#### 2. サービス層基底クラス
```csharp
public abstract class BaseAnalyticsService
{
    protected readonly ShopifyDbContext _context;
    protected readonly ILogger _logger;
    protected readonly IMemoryCache _cache;
    
    // 共通のエラーハンドリング
    protected async Task<T> ExecuteWithRetry<T>(Func<Task<T>> operation)
    {
        // リトライロジック実装
    }
}
```

#### 3. バッチ処理フレームワーク
```csharp
public abstract class BaseBackgroundJob : BackgroundService
{
    // 共通のスケジューリングロジック
    protected abstract TimeSpan GetScheduleTime();
    protected abstract Task ExecuteJob();
}
```

---

## 📅 2週間開発スケジュール

### Week 1: 基盤構築と基本機能

#### Day 0: Shopify連携準備（開発前）
- [ ] Shopify Partner アカウント作成
- [ ] 開発ストア作成
- [ ] Private App 設定（必要なスコープ設定）
- [ ] GraphQL API仕様確認

#### Day 1-2: 環境構築と月別売上統計
- [ ] Azure環境セットアップ
- [ ] .NET プロジェクト作成
- [ ] Shopify GraphQLクライアント実装
- [ ] ProductMonthlyStatsテーブル作成
- [ ] 月別売上統計API実装
- [ ] バッチ処理基盤構築

#### Day 3: 前年同月比（月別売上の拡張）
- [ ] 前年同月比計算ロジック
- [ ] YearOverYearCacheテーブル作成
- [ ] API拡張実装
- [ ] フロントエンド連携

#### Day 4-5: 休眠顧客分析
- [ ] CustomerSummaryテーブル作成
- [ ] セグメント分類ロジック
- [ ] リスク判定アルゴリズム
- [ ] 復帰施策管理機能

#### Day 6: 購入頻度【商品】
- [ ] ProductPurchaseFrequencyテーブル作成
- [ ] 転換率計算ロジック
- [ ] 商品フィルタリング機能

### Week 2: 高度分析と統合

#### Day 7-8: 購入回数分析
- [ ] 複雑な集計テーブル構築
- [ ] 顧客セグメント別分析
- [ ] 成長率計算

#### Day 9: 顧客購買分析
- [ ] LTV計算エンジン
- [ ] 顧客スコアリング
- [ ] アクション管理機能

#### Day 10: F階層傾向分析
- [ ] 階層定義と推移分析
- [ ] ヒートマップデータ生成
- [ ] 施策効果測定

#### Day 11-12: 組み合わせ商品
- [ ] アソシエーション分析実装
- [ ] キャッシュ戦略
- [ ] パフォーマンス最適化

#### Day 13-14: 統合テストとデプロイ
- [ ] 全機能統合テスト
- [ ] パフォーマンステスト
- [ ] Azure デプロイ
- [ ] 本番環境確認

---

## ⚡ バッチ処理スケジュール最適化

### 現状の問題
- 午前2時: 月別売上、前年同月比、購入頻度（3機能が競合）
- 午前3時: 休眠顧客
- 未定: その他4機能

### 最適化案
```
00:00 - 組み合わせ商品（最も重い処理）
01:00 - F階層傾向分析
02:00 - 月別売上統計 + 前年同月比（同じテーブル使用）
03:00 - 休眠顧客分析
04:00 - 購入頻度【商品】
05:00 - 購入回数分析
06:00 - 顧客購買分析
```

### 実装方法
```csharp
// appsettings.json
{
  "BatchJobs": {
    "ProductCombination": "0 0 * * *",      // 00:00
    "FTierAnalysis": "0 1 * * *",           // 01:00
    "MonthlySales": "0 2 * * *",            // 02:00
    "DormantCustomer": "0 3 * * *",         // 03:00
    "PurchaseFrequency": "0 4 * * *",       // 04:00
    "PurchaseCount": "0 5 * * *",           // 05:00
    "CustomerAnalysis": "0 6 * * *"         // 06:00
  }
}
```

---

## 🔧 共通技術実装パターン

### 1. ProductHandleマッピング問題の統一解決
```csharp
// 共通のマッピングサービス
public interface IProductMappingService
{
    Task<int?> GetProductIdByHandle(string handle);
    Task<Dictionary<string, int>> GetProductIdMap(List<string> handles);
}

// 実装
public class ProductMappingService : IProductMappingService
{
    private readonly IMemoryCache _cache;
    
    public async Task<int?> GetProductIdByHandle(string handle)
    {
        return await _cache.GetOrCreateAsync($"product_handle_{handle}", 
            async entry =>
            {
                entry.SlidingExpiration = TimeSpan.FromHours(1);
                return await _context.Products
                    .Where(p => p.Handle == handle)
                    .Select(p => (int?)p.Id)
                    .FirstOrDefaultAsync();
            });
    }
}
```

### 2. パフォーマンス最適化戦略
```csharp
// バッチ処理での分割実行
public async Task ProcessLargeDataSet<T>(
    IQueryable<T> query, 
    int batchSize = 1000,
    Func<List<T>, Task> processAction)
{
    int skip = 0;
    List<T> batch;
    
    do
    {
        batch = await query
            .Skip(skip)
            .Take(batchSize)
            .ToListAsync();
            
        if (batch.Any())
        {
            await processAction(batch);
            skip += batchSize;
        }
    } while (batch.Count == batchSize);
}
```

### 3. エラーハンドリングパターン
```csharp
public class AnalyticsException : Exception
{
    public string ErrorCode { get; set; }
    public Dictionary<string, object> Context { get; set; }
}

// グローバルエラーハンドラー
public class GlobalExceptionMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (AnalyticsException ex)
        {
            await HandleAnalyticsException(context, ex);
        }
    }
}
```

---

## 🚨 リスク管理

### 技術的リスクと対策

| リスク | 発生確率 | 影響度 | 対策 |
|--------|----------|--------|------|
| Shopify API制限 | 高 | 高 | レート制限対策、キャッシュ活用 |
| データ量によるパフォーマンス低下 | 中 | 高 | インデックス最適化、分割処理 |
| バッチ処理の競合 | 高 | 中 | 実行時間の分散化 |
| 複雑な分析アルゴリズムの実装遅延 | 中 | 中 | 簡易版から段階的実装 |
| Shopify APIからのデータ取得不可 | 低 | 高 | 代替データソース、計算による導出 |

### コンティンジェンシープラン
1. **組み合わせ商品分析が間に合わない場合**
   - 初期リリースから除外し、Phase 2へ
   - 代わりに他の機能を前倒し

2. **パフォーマンス問題が発生した場合**
   - リアルタイム処理を事前集計に変更
   - 表示データ量の制限（上位50件など）

3. **Shopify API連携で問題が発生した場合**
   - モックデータでの開発継続
   - 手動でのCSVインポート機能追加

---

## 📈 成功指標

### 技術KPI
- [ ] 全APIレスポンス時間 < 2秒
- [ ] バッチ処理成功率 > 99%
- [ ] システム稼働率 > 99.5%
- [ ] コードカバレッジ > 60%

### プロジェクトKPI
- [ ] 8機能中最低4機能の完全動作
- [ ] 初期リリース4機能の品質確保
- [ ] 2週間以内の開発完了
- [ ] 重大バグゼロでのリリース

---

## 🎯 次のステップ

### ✅ 完了済み（2025年7月21日）
1. ✅ Azure環境の準備（Azure App Service稼働中）
2. ✅ .NET プロジェクト作成（ShopifyTestApi稼働中）
3. ✅ フロントエンド・バックエンド統合（API接続成功）

### 🔄 実施中（今日〜明日）
1. **実データ統合準備**
   - Azure SQL Database接続設定
   - Entity Framework マイグレーション実行
   - Shopify GraphQL クライアント実装

2. **月別売上統計機能実装開始**
   - ProductMonthlyStatsテーブル作成
   - SalesAnalyticsController実装
   - フロントエンドAPI切り替え

### 📅 予定（今週中）
1. **Day 1-3完了目標**
   - 月別売上統計完全動作
   - 前年同月比機能実装
   - 休眠顧客分析API構築

2. **共通基盤強化**
   - ProductHandleマッピングサービス
   - バッチ処理フレームワーク
   - エラーハンドリング統一

---

## 📝 改訂履歴

| 日付 | バージョン | 変更内容 | 承認者 |
|------|------------|----------|--------|
| 2025-07-21 | v1.0 | 初版作成 | - |
| 2025-07-21 | v1.1 | バックエンドAPI基盤構築完了、フロントエンド・バックエンド統合成功を反映 | - |

---

## 🔗 関連ドキュメント

- [画面IDリファレンス](../../03-design-specs/screen-id-reference.md) - 全画面のID体系と使用ガイドライン
- [Shopify データ統合分析と設計書](../../03-design-specs/shopify-data-integration-design.md) - Shopify APIデータ取得の詳細設計
- [月別売上統計【購買】機能 詳細設計書](../../03-design-specs/PURCH-01-MONTHLY-detailed-design.md) - 実装開始予定
- [休眠顧客分析【顧客】機能 詳細設計書](../../03-design-specs/CUST-01-DORMANT-detailed-design.md) - Phase 2実装予定
- [前年同月比【商品】機能 詳細設計書](../../03-design-specs/PROD-01-YOY-detailed-design.md) - Phase 1実装予定

---

*このドキュメントは、8機能の詳細設計プロンプトを基に作成された統合開発計画です。実装時は各機能の詳細設計書を参照してください。* 