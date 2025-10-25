# テストストア作成タスクリスト

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: 実データを使用したテストストア作成の詳細タスク

---

## 📅 全体スケジュール（5日間）

### 準備フェーズ（Day 0）
- [ ] 既存の匿名化ツールの受領と確認
- [ ] CSVファイルサンプルの受領
- [ ] データ構造の分析
- [ ] Shopify Partnerアカウント作成

---

## 🔧 Day 1: 匿名化ツール設計・拡張

### AM（4時間）
- [ ] 既存ツールのコードレビュー
  - 実装済み機能の確認
  - 不足機能の洗い出し
  - 拡張ポイントの特定

- [ ] CSVデータ分析
  ```csharp
  // データプロファイリングスクリプト
  public class DataProfiler
  {
      public DataProfile AnalyzeCsv(string filePath)
      {
          // 行数、列数
          // データ型推定
          // NULL値の割合
          // ユニーク値の数
          // 統計情報（数値型の場合）
      }
  }
  ```

### PM（4時間）
- [ ] 匿名化設計書作成
  - 各フィールドの匿名化方法定義
  - IDマッピング戦略
  - データ整合性維持方法

- [ ] プロジェクト構成作成
  ```
  DataAnonymizer/
  ├── DataAnonymizer.Core/      # 匿名化ロジック
  ├── DataAnonymizer.CLI/       # コマンドラインツール
  ├── DataAnonymizer.Tests/     # ユニットテスト
  └── DataAnonymizer.Shopify/   # Shopify連携
  ```

---

## 💻 Day 2: 匿名化ツール実装

### AM（4時間）
- [ ] コアライブラリ実装
  ```csharp
  // 基本インターフェース
  public interface IAnonymizer<T>
  {
      T Anonymize(T original);
      Task<List<T>> AnonymizeBatch(List<T> originals);
  }
  ```

- [ ] 商品匿名化実装
  - カテゴリベースの商品名生成
  - 価格帯の維持
  - SKU/バーコード生成

- [ ] 顧客匿名化実装
  - 名前生成（姓名リストから組み合わせ）
  - メールアドレス生成
  - 住所の部分匿名化

### PM（4時間）
- [ ] 注文匿名化実装
  - 日付の相対的調整
  - ID関連性の維持
  - 金額の微調整（±5%ランダム）

- [ ] IDマッピング機能
  ```csharp
  public class IdMappingService
  {
      // 双方向マッピング
      private BiDictionary<string, string> _mappings;
      
      public string GetAnonymizedId(string originalId) { }
      public string GetOriginalId(string anonymizedId) { }
      public void SaveToFile(string path) { }
      public void LoadFromFile(string path) { }
  }
  ```

---

## 🧪 Day 3: テストと調整

### AM（4時間）
- [ ] ユニットテスト作成
  - 各匿名化クラスのテスト
  - IDマッピングのテスト
  - エッジケースの確認

- [ ] 統合テスト
  ```csharp
  [Test]
  public async Task FullAnonymizationFlow_ShouldMaintainDataIntegrity()
  {
      // 1. CSVロード
      // 2. 匿名化実行
      // 3. 関連性チェック
      // 4. 統計的特性の確認
  }
  ```

### PM（4時間）
- [ ] 実データでの検証
  - サンプルデータで匿名化実行
  - 結果の目視確認
  - 統計分析（購買パターンが維持されているか）

- [ ] パフォーマンス最適化
  - 大量データ処理の確認
  - メモリ使用量の最適化
  - 並列処理の実装

---

## 🚀 Day 4: Shopify連携実装

### AM（4時間）
- [ ] Shopify開発ストア作成
  - ストア設定
  - Custom App作成
  - API認証情報取得

- [ ] インポーター実装
  ```csharp
  public class ShopifyImporter
  {
      private readonly ShopifyService _service;
      
      public async Task ImportProducts(string csvPath)
      {
          var products = LoadFromCsv<Product>(csvPath);
          await _service.BulkCreateProducts(products);
      }
  }
  ```

### PM（4時間）
- [ ] バッチ処理実装
  - Rate Limit対応
  - エラーハンドリング
  - 進捗表示

- [ ] リトライロジック
  ```csharp
  public class RetryPolicy
  {
      public async Task<T> ExecuteAsync<T>(
          Func<Task<T>> action,
          int maxRetries = 3)
      {
          // 指数バックオフ
          // エラーログ
          // 最終エラー時の処理
      }
  }
  ```

---

## 📊 Day 5: データ投入と検証

### AM（4時間）
- [ ] データ投入実行
  1. 商品データ投入（最初に実行）
  2. 顧客データ投入
  3. 注文データ投入（最後に実行）

- [ ] 投入モニタリング
  ```
  商品投入: 500/1000 (50%) [=====>     ] ETA: 10分
  成功: 498, エラー: 2
  ```

### PM（4時間）
- [ ] データ検証
  - Shopify管理画面での確認
  - API経由でのデータ取得テスト
  - 関連性の確認

- [ ] 分析画面での動作確認
  - 前年同月比分析の表示
  - 休眠顧客分析の表示
  - データの整合性確認

---

## 🔍 品質チェックリスト

### 匿名化品質
- [ ] 個人を特定できる情報が残っていない
- [ ] 統計的な購買パターンが維持されている
- [ ] データの関連性が保たれている

### Shopifyデータ品質
- [ ] 全データが正しくインポートされている
- [ ] 商品バリエーションが適切
- [ ] 顧客の注文履歴が正しい
- [ ] 在庫数が反映されている

### パフォーマンス
- [ ] インポート速度が許容範囲内
- [ ] メモリ使用量が適切
- [ ] エラー率が1%未満

---

## 🛠️ 必要なツール・ライブラリ

### .NET ライブラリ
```xml
<PackageReference Include="CsvHelper" Version="30.0.1" />
<PackageReference Include="Bogus" Version="34.0.2" />  <!-- ダミーデータ生成 -->
<PackageReference Include="ShopifySharp" Version="6.4.0" />
<PackageReference Include="Polly" Version="7.2.4" />  <!-- リトライポリシー -->
<PackageReference Include="Serilog" Version="3.0.1" />  <!-- ログ -->
```

### 開発環境
- Visual Studio 2022 / VS Code
- .NET 8 SDK
- Git
- Postman（API テスト用）

---

## 📝 成果物

1. **匿名化ツール**
   - 実行可能ファイル（.exe）
   - 設定ファイルテンプレート
   - 使用マニュアル

2. **匿名化済みデータ**
   - products_anonymized.csv
   - customers_anonymized.csv
   - orders_anonymized.csv
   - id_mappings.json

3. **Shopifyテストストア**
   - URL: https://[store-name].myshopify.com
   - 管理者アカウント情報
   - API認証情報

4. **ドキュメント**
   - 匿名化仕様書
   - データマッピング表
   - 運用手順書

---

## 🚨 リスクと対策

| リスク | 影響度 | 対策 |
|-------|--------|------|
| 匿名化不足 | 高 | 複数人でのレビュー実施 |
| API制限超過 | 中 | 適切なRate Limit実装 |
| データ不整合 | 高 | トランザクション処理実装 |
| 大量データでのメモリ不足 | 中 | ストリーミング処理実装 |

---

これで5日間での実装が可能です！ 