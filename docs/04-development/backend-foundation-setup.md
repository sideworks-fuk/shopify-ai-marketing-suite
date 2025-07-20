# Phase 1: バックエンド基盤構築 - 実装タスクリスト

## 実装期間: Week 1（5営業日）

## Day 1: 開発環境セットアップ（月曜日）

### タスク1: .NET Web APIプロジェクト作成
- [ ] Visual Studio 2022または.NET CLI使用
- [ ] .NET 8 Web APIテンプレートでプロジェクト作成
- [ ] プロジェクト名: `ShopifyAnalytics.API`
- [ ] ソリューション構造の設定
  ```
  ShopifyAnalytics/
  ├── ShopifyAnalytics.API/       # Web APIプロジェクト
  ├── ShopifyAnalytics.Core/      # ビジネスロジック
  ├── ShopifyAnalytics.Data/      # データアクセス層
  └── ShopifyAnalytics.Tests/     # テストプロジェクト
  ```

### タスク2: 必要なNuGetパッケージのインストール
```xml
<!-- ShopifyAnalytics.API.csproj -->
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
<PackageReference Include="Serilog.AspNetCore" Version="8.0.0" />
```

### タスク3: PostgreSQL環境構築
- [ ] Docker Composeファイル作成
- [ ] 開発用PostgreSQLコンテナ起動
- [ ] pgAdminまたはDBeaver接続確認
- [ ] 開発用データベース作成: `shopify_analytics_dev`

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: shopify_user
      POSTGRES_PASSWORD: shopify_pass
      POSTGRES_DB: shopify_analytics_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Day 2: Entity Framework Core設定（火曜日）

### タスク4: データモデル作成
- [ ] Entitiesフォルダ作成
- [ ] 基本エンティティクラス実装
  - [ ] Product.cs
  - [ ] DailyProductSales.cs
  - [ ] MonthlyProductSales.cs
  - [ ] YearOverYearCache.cs

```csharp
// Models/Entities/Product.cs
public class Product
{
    public string ProductId { get; set; } = string.Empty;
    public long ShopifyProductId { get; set; }
    public string ProductTitle { get; set; } = string.Empty;
    public string? ProductType { get; set; }
    public string? Vendor { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public virtual ICollection<DailyProductSales> DailySales { get; set; } = new List<DailyProductSales>();
    public virtual ICollection<MonthlyProductSales> MonthlySales { get; set; } = new List<MonthlyProductSales>();
}
```

### タスク5: DbContext実装
- [ ] AnalyticsDbContext作成
- [ ] エンティティ設定（Fluent API）
- [ ] インデックス定義
- [ ] リレーションシップ設定

### タスク6: 初期マイグレーション
- [ ] 接続文字列設定（appsettings.json）
- [ ] 初期マイグレーション作成
- [ ] データベーススキーマ適用
- [ ] シードデータ準備（開発用）

## Day 3: 基本的なCRUD操作実装（水曜日）

### タスク7: リポジトリパターン実装
- [ ] IRepository<T>インターフェース定義
- [ ] GenericRepository<T>基底クラス実装
- [ ] IProductRepository定義
- [ ] ProductRepository実装

```csharp
// Data/Repositories/IProductRepository.cs
public interface IProductRepository : IRepository<Product>
{
    Task<Product?> GetByShopifyIdAsync(long shopifyProductId);
    Task<IEnumerable<Product>> GetActiveProductsAsync();
    Task<bool> ExistsAsync(long shopifyProductId);
    Task BulkUpsertAsync(IEnumerable<Product> products);
}
```

### タスク8: Unit of Work実装
- [ ] IUnitOfWork定義
- [ ] UnitOfWork実装
- [ ] トランザクション管理
- [ ] 依存性注入設定

### タスク9: 基本的なAPIエンドポイント
- [ ] ProductsController作成
- [ ] 基本的なGET/POST実装
- [ ] Swagger動作確認
- [ ] Postmanコレクション作成

## Day 4: Shopify API連携基盤（木曜日）

### タスク10: Shopify GraphQL Client設定
- [ ] IShopifyService定義
- [ ] ShopifyService基本実装
- [ ] HttpClient設定
- [ ] 認証ヘッダー処理

```csharp
// Services/IShopifyService.cs
public interface IShopifyService
{
    Task<List<ShopifyOrder>> GetOrdersAsync(DateTime startDate, DateTime endDate);
    Task<List<ShopifyProduct>> GetProductsAsync(int limit = 250);
    Task<ShopifyProduct?> GetProductByIdAsync(long productId);
    Task<int> GetOrderCountAsync(DateTime startDate, DateTime endDate);
}
```

### タスク11: GraphQLクエリ定義
- [ ] 注文データ取得クエリ
- [ ] 商品データ取得クエリ
- [ ] ページネーション対応
- [ ] エラーハンドリング

### タスク12: レート制限対策
- [ ] Pollyライブラリ導入
- [ ] 指数バックオフ実装
- [ ] レート制限監視
- [ ] リトライポリシー設定

## Day 5: 統合テストと最適化（金曜日）

### タスク13: 統合テスト環境構築
- [ ] テストデータベース設定
- [ ] インメモリデータベース設定
- [ ] WebApplicationFactory設定
- [ ] 基本的な統合テスト作成

### タスク14: ログとモニタリング
- [ ] Serilog設定
- [ ] 構造化ログ実装
- [ ] Application Insights設定（オプション）
- [ ] ヘルスチェックエンドポイント

### タスク15: Phase 1完了確認
- [ ] すべてのテスト実行
- [ ] コードレビュー
- [ ] ドキュメント更新
- [ ] Phase 2準備事項リストアップ

## 成果物チェックリスト

### コード成果物
- [ ] Web APIプロジェクト構造完成
- [ ] データモデル実装済み
- [ ] Entity Framework設定完了
- [ ] 基本的なCRUD API動作確認
- [ ] Shopify API連携基盤実装

### ドキュメント成果物
- [ ] API仕様書（Swagger）
- [ ] データベース設計書
- [ ] 開発環境構築手順書
- [ ] Shopify API連携ガイド

### 開発環境
- [ ] PostgreSQL起動確認
- [ ] マイグレーション適用済み
- [ ] Postmanコレクション作成
- [ ] 単体テスト実行可能

## リスクと対策

### 技術的リスク
1. **Shopify API認証エラー**
   - 対策: アクセストークン検証手順書作成
   - 予備: モックサービス準備

2. **Entity Framework性能問題**
   - 対策: インデックス最適化
   - 予備: 生SQLクエリ準備

3. **PostgreSQL接続エラー**
   - 対策: 接続プール設定最適化
   - 予備: 接続リトライ実装

## 次のフェーズへの準備

### Phase 2に必要な情報
- Shopify APIレスポンス構造の詳細分析結果
- パフォーマンステスト結果
- データ量見積もり
- バッチ処理要件の詳細化

### 引き継ぎ事項
- 未解決の技術課題
- 最適化の余地がある箇所
- セキュリティ考慮事項
- スケーラビリティ要件