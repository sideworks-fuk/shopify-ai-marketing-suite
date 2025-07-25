# テストストア作成計画：実データ活用

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: CSVデータを使用したリアルなテストストア構築

---

## 🎯 プロジェクト概要

### 目標
実店舗のCSVデータを匿名化し、Shopifyテストストアに投入して、本番環境に近いデモ環境を構築する。

### 期待される成果
- 実データに基づく分析精度の検証
- リアルな顧客購買パターンの再現
- デモ時の説得力向上

---

## 📊 データ構成と匿名化要件

### 1. 商品データ（products.csv）
```csv
商品ID,商品名,カテゴリ,価格,在庫数,SKU,バーコード,説明
```

**匿名化項目：**
- 商品名 → 汎用的な名前に変換（例：「○○ブランド 化粧水」→「化粧水A」）
- SKU/バーコード → ランダム文字列に置換
- 説明文 → 汎用的な説明文に置換

### 2. 顧客データ（customers.csv）
```csv
顧客ID,氏名,メールアドレス,電話番号,住所,生年月日,会員ランク,累計購入額
```

**匿名化項目：**
- 氏名 → ダミー名前生成（山田太郎001など）
- メールアドレス → test001@example.com形式
- 電話番号 → 090-0000-0001形式
- 住所 → 都道府県・市区町村レベルまで（詳細住所は削除）
- 生年月日 → 年代のみ保持（1990年代など）

### 3. 注文データ（orders.csv）
```csv
注文ID,顧客ID,注文日時,商品ID,数量,単価,小計,送料,合計,支払方法,配送先
```

**匿名化項目：**
- 配送先 → 都道府県レベルに簡略化
- 日時 → 相対的な日付関係は維持（パターン分析のため）

---

## 🛠️ 匿名化ツール設計

### 1. ツール構成
```
data-anonymizer/
├── src/
│   ├── anonymizers/
│   │   ├── ProductAnonymizer.cs
│   │   ├── CustomerAnonymizer.cs
│   │   └── OrderAnonymizer.cs
│   ├── generators/
│   │   ├── NameGenerator.cs
│   │   ├── AddressGenerator.cs
│   │   └── ProductNameGenerator.cs
│   ├── mappers/
│   │   └── IdMapper.cs  # 元ID→新IDのマッピング管理
│   └── Program.cs
├── config/
│   └── anonymization-rules.json
└── output/
    ├── anonymized/
    └── mappings/
```

### 2. 匿名化ルール設定（JSON）
```json
{
  "customer": {
    "name": {
      "type": "pattern",
      "pattern": "テストユーザー{seq:5}"
    },
    "email": {
      "type": "pattern",
      "pattern": "test{seq:5}@demo-store.com"
    },
    "phone": {
      "type": "fixed",
      "value": "090-0000-0000"
    },
    "address": {
      "type": "partial",
      "keepLevel": "city"
    }
  },
  "product": {
    "name": {
      "type": "category_based",
      "mapping": {
        "化粧品": ["化粧水", "乳液", "美容液", "クリーム"],
        "健康食品": ["サプリA", "サプリB", "プロテイン"]
      }
    }
  }
}
```

### 3. 実装サンプル（C#）
```csharp
public class CustomerAnonymizer
{
    private readonly IdMapper _idMapper;
    private readonly NameGenerator _nameGen;
    private int _sequenceNumber = 1;
    
    public Customer Anonymize(Customer original)
    {
        var anonymized = new Customer
        {
            Id = _idMapper.GetOrCreateMapping("customer", original.Id),
            Name = _nameGen.GenerateName(_sequenceNumber),
            Email = $"test{_sequenceNumber:D5}@demo-store.com",
            Phone = "090-0000-0000",
            // 住所は都道府県・市区町村まで保持
            Address = ExtractCityLevel(original.Address),
            // 年代のみ保持
            AgeGroup = GetAgeGroup(original.BirthDate),
            TotalSpent = original.TotalSpent, // 金額は保持
            MemberRank = original.MemberRank   // ランクは保持
        };
        
        _sequenceNumber++;
        return anonymized;
    }
    
    private string ExtractCityLevel(string fullAddress)
    {
        // 正規表現で都道府県・市区町村を抽出
        var pattern = @"^(.+?[都道府県])(.+?[市区町村])";
        var match = Regex.Match(fullAddress, pattern);
        return match.Success ? match.Value : "東京都港区";
    }
}
```

---

## 📤 Shopifyへのデータ投入

### 1. Shopify Admin API使用
```csharp
public class ShopifyDataImporter
{
    private readonly ShopifyService _shopify;
    
    public async Task ImportProducts(List<Product> products)
    {
        foreach (var batch in products.Batch(50)) // 50件ずつ
        {
            var shopifyProducts = batch.Select(p => new ProductCreateRequest
            {
                Title = p.Name,
                BodyHtml = p.Description,
                Vendor = "Demo Store",
                ProductType = p.Category,
                Variants = new[]
                {
                    new ProductVariantCreateRequest
                    {
                        Price = p.Price,
                        InventoryQuantity = p.Stock,
                        SKU = p.SKU
                    }
                }
            });
            
            await _shopify.Product.CreateAsync(shopifyProducts);
            await Task.Delay(500); // Rate limit対策
        }
    }
}
```

### 2. バルクインポート戦略
- **商品**: Shopify Admin API（50件/バッチ）
- **顧客**: Shopify Admin API（50件/バッチ）
- **注文**: 代替アプローチが必要（詳細は注意事項参照）

---

## 📅 実装スケジュール

### Phase 1: 匿名化ツール完成（3日）
```
Day 1: 既存ツールの確認と拡張設計
- 現在の実装状況確認
- 不足機能の洗い出し
- 拡張計画作成

Day 2: 匿名化ロジック実装
- 商品名匿名化
- 顧客情報匿名化
- IDマッピング機能

Day 3: テストと調整
- サンプルデータでテスト
- 匿名化結果の確認
- バグ修正
```

### Phase 2: Shopify投入（2日）
```
Day 4: インポート機能実装
- Shopify API連携
- バッチ処理実装
- エラーハンドリング

Day 5: データ投入実行
- テストストアへの投入
- データ検証
- 最終調整
```

---

## 🔍 データ検証項目

### 1. 匿名化の確認
- [ ] 個人情報が完全に除去されているか
- [ ] データの統計的特性が保持されているか
- [ ] ID関連性が維持されているか

### 2. Shopifyストアの確認
- [ ] 全商品が正しく登録されているか
- [ ] 顧客データが適切に反映されているか
- [ ] 注文履歴が正しく紐付いているか
- [ ] 分析画面でデータが表示されるか

---

## ⚠️ 注意事項

### 1. Shopifyの制限事項
- **注文の日付**: 過去日付での注文作成は不可（代替方法は下記参照）
- **API制限**: 2リクエスト/秒を厳守
- **データ量**: Development Storeは50,000商品まで

### 2. 法的配慮
- 匿名化後も統計的に個人が特定されないよう注意
- 実データの取り扱いは機密保持契約に準拠
- 匿名化済みデータのみテストストアに投入

### 3. 技術的配慮
```csharp
// IDマッピングの永続化（重要）
public class IdMapper
{
    private Dictionary<string, Dictionary<string, string>> _mappings;
    
    public void SaveMappings(string filePath)
    {
        var json = JsonSerializer.Serialize(_mappings, 
            new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(filePath, json);
    }
    
    public void LoadMappings(string filePath)
    {
        if (File.Exists(filePath))
        {
            var json = File.ReadAllText(filePath);
            _mappings = JsonSerializer.Deserialize<
                Dictionary<string, Dictionary<string, string>>>(json);
        }
    }
}
```

### 4. 過去日付注文データの取り扱い
**重要**: Shopifyでは過去日付での注文作成ができません。
詳細な代替方法については [Shopify過去日付注文データの取り扱いガイド](./shopify-order-date-workaround.md) を参照してください。

推奨アプローチ：
- 直近1ヶ月の注文：Shopifyに作成（メタフィールドで実日付保存）
- 過去の注文データ：分析DB専用テーブルに保存
- 分析時：両方のデータソースを統合して表示

---

## 🎉 期待される成果

1. **リアルなデモ環境**
   - 実際の購買パターンを反映
   - 説得力のあるデータ分析結果

2. **開発効率の向上**
   - 実データでのテストが可能
   - エッジケースの発見

3. **顧客への訴求力**
   - 実店舗データに基づく分析
   - 具体的な改善提案が可能

---

## 📝 次のステップ

1. **既存の匿名化ツールの共有を受ける**
2. **CSVファイルのサンプル確認**
3. **Shopify Partnerアカウントの準備**
4. **Development Storeの作成**

この計画で、5日間で実データに基づくテストストアが構築可能です！ 