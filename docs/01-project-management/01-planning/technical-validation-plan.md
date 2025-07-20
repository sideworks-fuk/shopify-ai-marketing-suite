# 技術検証計画書 - 事前動作確認

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: 本格開発前の各技術要素の動作確認

---

## 🎯 検証の目的

本格的な開発に入る前に、各技術要素が正しく動作することを確認し、技術的なリスクを早期に発見・解決する。

---

## 📊 検証項目と優先順位

### Phase 1: 基盤技術の確認（1-2日）

#### 1.1 Azure SQL Database 基本動作確認 ⭐⭐⭐⭐⭐
```yaml
所要時間: 2-3時間
検証内容:
  1. Azure Portal でのDB作成
     - Basic プラン (5 DTU)
     - ファイアウォール設定
  
  2. ローカルからの接続テスト
     - SSMS での接続
     - 簡単なテーブル作成
     ```sql
     CREATE TABLE TestTable (
         Id INT PRIMARY KEY,
         Name NVARCHAR(100),
         CreatedAt DATETIME
     );
     ```
  
  3. データのインポート/エクスポート
     - CSVインポートテスト
     - .bacpac エクスポート/インポート
  
成功基準:
  - SSMSから接続成功
  - CRUD操作が正常動作
  - インポート/エクスポート成功
```

#### 1.2 Azure App Service 基本デプロイ ⭐⭐⭐⭐⭐
```yaml
所要時間: 2-3時間
検証内容:
  1. 最小限のWeb API作成
     ```csharp
     [ApiController]
     [Route("api/[controller]")]
     public class HealthController : ControllerBase
     {
         [HttpGet]
         public IActionResult Get()
         {
             return Ok(new { 
                 status = "healthy",
                 timestamp = DateTime.UtcNow,
                 message = "API is running!"
             });
         }
     }
     ```
  
  2. Azure へのデプロイ
     - Visual Studio からの直接デプロイ
     - App Service プラン: B1 Basic
  
  3. 動作確認
     - ブラウザでアクセス
     - Postman でテスト
  
成功基準:
  - https://{app-name}.azurewebsites.net/api/health が200を返す
  - JSON レスポンスが正しく表示
```

### Phase 2: 統合テスト（1日）

#### 2.1 API から Azure SQL への接続 ⭐⭐⭐⭐⭐
```yaml
所要時間: 2時間
検証内容:
  1. Entity Framework Core 設定
     ```csharp
     services.AddDbContext<TestDbContext>(options =>
         options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));
     ```
  
  2. 簡単なCRUD API作成
     ```csharp
     [HttpGet("test-db")]
     public async Task<IActionResult> TestDatabase()
     {
         var count = await _context.TestTable.CountAsync();
         return Ok(new { recordCount = count });
     }
     ```
  
  3. 接続文字列の管理
     - App Service の設定で管理
     - Key Vault の使用（オプション）
  
成功基準:
  - APIからDBにアクセス成功
  - データの読み書きが正常動作
```

#### 2.2 Shopify API 接続テスト ⭐⭐⭐⭐
```yaml
所要時間: 3-4時間
検証内容:
  1. Shopify Partner アカウント準備
     - Development Store 作成
     - Custom App 作成
     - API キー取得
  
  2. 最小限のShopify API呼び出し
     ```csharp
     [HttpGet("test-shopify")]
     public async Task<IActionResult> TestShopify()
     {
         var service = new ShopifySharp.ProductService(myShopDomain, accessToken);
         var products = await service.ListAsync();
         return Ok(new { 
             productCount = products.Count(),
             firstProduct = products.FirstOrDefault()?.Title
         });
     }
     ```
  
  3. 認証フローの確認
     - OAuth 2.0 フロー
     - アクセストークン管理
  
成功基準:
  - Shopify からデータ取得成功
  - 商品情報が正しく表示
```

#### 2.3 フロントエンドからの API 呼び出し ⭐⭐⭐⭐
```yaml
所要時間: 2時間
検証内容:
  1. CORS 設定
     ```csharp
     services.AddCors(options =>
     {
         options.AddPolicy("AllowFrontend",
             builder => builder.WithOrigins("http://localhost:3000")
                               .AllowAnyMethod()
                               .AllowAnyHeader());
     });
     ```
  
  2. Next.js からの呼び出し
     ```typescript
     const response = await fetch('https://{api-url}/api/health');
     const data = await response.json();
     console.log(data);
     ```
  
  3. 認証ヘッダーの追加（簡易版）
     ```typescript
     const response = await fetch('https://{api-url}/api/test-db', {
         headers: {
             'Authorization': 'Bearer test-token'
         }
     });
     ```
  
成功基準:
  - CORSエラーなし
  - データ取得成功
  - コンソールに結果表示
```

### Phase 3: 応用テスト（オプション・1日）

#### 3.1 バッチ処理の動作確認 ⭐⭐⭐
```yaml
所要時間: 2-3時間
検証内容:
  1. Hangfire 設定
  2. 簡単な定期ジョブ作成
  3. Azure での動作確認
  
成功基準:
  - ジョブが定期実行される
  - ログで確認可能
```

#### 3.2 パフォーマンステスト ⭐⭐⭐
```yaml
所要時間: 2時間
検証内容:
  1. 1000件のテストデータ作成
  2. API レスポンス時間測定
  3. DB クエリ最適化確認
  
成功基準:
  - API応答 < 1秒
  - 同時接続10で安定動作
```

#### 3.3 エラーハンドリング確認 ⭐⭐
```yaml
所要時間: 1時間
検証内容:
  1. 例外処理の実装
  2. ログ出力確認（Application Insights）
  3. エラーレスポンスの統一
  
成功基準:
  - エラー時も適切なレスポンス
  - ログが正しく記録される
```

---

## 📅 実施スケジュール案

### 最速プラン（2日間）
```
Day 1 AM: Azure SQL + App Service 基本確認
Day 1 PM: DB接続 + 簡単なAPI作成
Day 2 AM: Shopify接続テスト
Day 2 PM: フロントエンド統合テスト
```

### 標準プラン（3日間）
```
Day 1: Phase 1 完了（基盤技術）
Day 2: Phase 2 完了（統合テスト）
Day 3: Phase 3 実施（応用テスト）+ 問題対応
```

---

## 🛠️ 必要な準備

### アカウント・環境
- [ ] Azure アカウント（無料枠でOK）
- [ ] Shopify Partner アカウント
- [ ] Visual Studio 2022 or VS Code
- [ ] .NET 8 SDK
- [ ] Node.js 18+
- [ ] SSMS or Azure Data Studio

### 最小限のコード準備
- [ ] .NET Web API テンプレートプロジェクト
- [ ] Next.js スタータープロジェクト
- [ ] テスト用SQLスクリプト

---

## ⚠️ よくある問題と対策

### 1. Azure SQL 接続エラー
```
問題: ファイアウォールでブロック
対策: Azure Portal で IP アドレスを許可
```

### 2. CORS エラー
```
問題: フロントエンドからAPIアクセス不可
対策: API側で適切なCORS設定
```

### 3. Shopify API レート制限
```
問題: 429 Too Many Requests
対策: リトライロジック実装、キャッシュ活用
```

### 4. デプロイ失敗
```
問題: ビルドエラー
対策: ローカルでビルド確認、.NET バージョン確認
```

---

## 📊 検証完了チェックリスト

### 必須項目
- [ ] Azure SQL に接続できる
- [ ] App Service にデプロイできる
- [ ] API から DB にアクセスできる
- [ ] Shopify API を呼び出せる
- [ ] フロントエンドから API を呼び出せる

### 確認済み項目
- [ ] 接続文字列の管理方法
- [ ] エラー時の挙動
- [ ] 基本的なセキュリティ設定
- [ ] ログの出力先

---

## 🎯 次のステップ

検証完了後：
1. 本格的な DB スキーマ設計
2. 詳細な API 設計
3. 認証・認可の実装
4. CI/CD パイプライン構築

---

## 📝 メモ・気づき

検証中に発見した問題や改善点を記録：
- 
- 
- 

---

*このドキュメントは検証の進捗に合わせて更新してください* 