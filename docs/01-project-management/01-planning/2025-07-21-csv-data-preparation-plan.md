# CSVデータ準備・匿名化実行プラン

## 📅 最終更新: 2025年7月20日 [[memory:3773065]]

---

## 🎯 **目標**

実際のShopify顧客CSVデータを安全に匿名化してバックエンドAzure SQL Databaseに投入し、前年同月比・休眠顧客分析機能のリアルデータテストを実現する。

---

## 📊 **実際のCSVデータ構成**

### **顧客CSV実カラム構成**
```yaml
🔍 Shopify顧客エクスポートカラム (22項目):
  1. Customer ID                    # 必須: 一意識別子
  2. First Name                     # 匿名化: ランダム名前生成
  3. Last Name                      # 匿名化: ランダム苗字生成  
  4. Email                          # 匿名化: test-{id}@example.com
  5. Accepts Email Marketing        # 保持: マーケティング分析用
  6. Default Address Company        # 匿名化: ランダム企業名
  7. Default Address Address1       # 匿名化: 住所削除
  8. Default Address Address2       # 匿名化: 住所削除
  9. Default Address City           # 匿名化: ランダム都市名
  10. Default Address Province Code # 保持: 地域分析用
  11. Default Address Country Code  # 保持: 国別分析用
  12. Default Address Zip           # 匿名化: 削除
  13. Default Address Phone         # 匿名化: マスク処理
  14. Phone                         # 匿名化: マスク処理
  15. Accepts SMS Marketing         # 保持: マーケティング分析用
  16. Total Spent                   # 保持: 重要な分析指標
  17. Total Orders                  # 保持: 重要な分析指標
  18. Note                          # 削除: プライバシー配慮
  19. Tax Exempt                    # 保持: 顧客属性分析用
  20. Tags                          # 部分保持: 一般的なタグのみ
  21. 会社名 または 店舗名 (metafield) # 匿名化: ランダム企業名
  22. 業種名 (metafield)            # 保持: 業界分析用
```

---

## 🛠️ **詳細匿名化戦略**

### **🔒 完全匿名化項目**
```yaml
個人識別情報:
  First Name: "テスト" + 連番
  Last Name: "ユーザー" + 連番
  Email: "test-user-{sequential_id}@example.com"
  
住所情報:
  Address1: 削除 → NULL
  Address2: 削除 → NULL  
  Zip: 削除 → NULL
  
電話番号:
  Phone: "090-****-{random4digit}"
  Default Address Phone: 同上
  
その他:
  Note: 削除 → NULL
  会社名 または 店舗名: "テスト企業{random_id}"
```

### **✅ 分析用保持項目**
```yaml
統計・分析重要データ:
  Customer ID: 匿名化後も一意性保持
  Total Spent: 金額分析の核心データ
  Total Orders: 購買頻度分析用
  
地域・属性データ:
  Province Code: 地域別分析用
  Country Code: 国別分析用 (日本中心想定)
  業種名: 業界別分析用
  
マーケティングデータ:
  Accepts Email Marketing: セグメント分析用
  Accepts SMS Marketing: セグメント分析用
  Tax Exempt: 顧客属性分析用
```

### **🎯 部分匿名化項目**
```yaml
Tags処理:
  保持対象: "VIP", "新規", "リピーター", "法人", "個人" など
  削除対象: 個人的なメモや固有名詞
  処理方法: 許可リストベースでフィルタリング

City処理:
  処理方法: 東京都、大阪府など一般的な都市名にランダム置換
  保持理由: 地域性分析の価値維持
```

---

## 📈 **期待されるデータ品質**

### **投入後のCustomersテーブル**
```sql
-- 期待される匿名化済みCustomersテーブル例
CREATE TABLE Customers (
    Id INT PRIMARY KEY,                    -- Customer ID (保持)
    FirstName NVARCHAR(50),               -- "テストユーザー001"
    LastName NVARCHAR(50),                -- "ユーザー001" 
    Email NVARCHAR(255),                  -- "test-user-001@example.com"
    Company NVARCHAR(100),                -- "テスト企業A"
    City NVARCHAR(50),                    -- "東京都"
    ProvinceCode NVARCHAR(10),            -- "JP-13" (保持)
    CountryCode NVARCHAR(10),             -- "JP" (保持)
    Phone NVARCHAR(20),                   -- "090-****-1234"
    AcceptsEmailMarketing BIT,            -- TRUE/FALSE (保持)
    AcceptsSMSMarketing BIT,              -- TRUE/FALSE (保持)
    TotalSpent DECIMAL(10,2),             -- 実金額 (保持)
    TotalOrders INT,                      -- 実注文数 (保持)
    TaxExempt BIT,                        -- TRUE/FALSE (保持)
    Tags NVARCHAR(500),                   -- "VIP,リピーター" (フィルタ済み)
    Industry NVARCHAR(100),               -- "小売業" (保持)
    CreatedAt DATETIME2,                  -- 実際の作成日時 (保持)
    UpdatedAt DATETIME2                   -- 更新日時
);
```

### **分析可能項目の確保**
```yaml
顧客セグメント分析:
  ✅ 購買金額別: Total Spent ベース
  ✅ 購買頻度別: Total Orders ベース  
  ✅ 地域別: Province Code ベース
  ✅ 業界別: Industry ベース
  ✅ マーケティング許可別: Email/SMS Marketing ベース

休眠顧客分析:
  ✅ 最終購入日算出用データ保持
  ✅ 購買履歴との整合性確保
  ✅ 金額・頻度セグメント維持
```

---

## 🚀 **匿名化実行手順 (改訂版)**

### **Step 1: 匿名化ツール準備 (10分)**
```bash
# 既存shopify-data-anonymizer活用
cd ../shopify-data-anonymizer

# 顧客CSVカラム対応の設定ファイル作成
cat > config/customer-anonymization-rules.json << EOF
{
  "customerFields": {
    "anonymize": [
      "First Name", "Last Name", "Email", 
      "Default Address Company", "Default Address Address1", 
      "Default Address Address2", "Default Address Zip",
      "Default Address Phone", "Phone", "Note",
      "会社名 または 店舗名 (customer.metafields.orig_fields.company_store)"
    ],
    "preserve": [
      "Customer ID", "Accepts Email Marketing", 
      "Default Address Province Code", "Default Address Country Code",
      "Accepts SMS Marketing", "Total Spent", "Total Orders",
      "Tax Exempt", "業種名 (customer.metafields.orig_fields.industry)"
    ],
    "filter": ["Tags"]
  }
}
EOF
```

### **Step 2: CSVデータ検証 (5分)**
```bash
# ヘッダー確認
head -1 customers.csv | tr ',' '\n' | nl

# データ量確認  
wc -l customers.csv

# サンプルデータ確認
head -3 customers.csv
```

### **Step 3: 匿名化実行 (15分)**
```bash
# カスタム匿名化実行
dotnet run anonymize-customers \
  --input customers.csv \
  --output anonymized_customers.csv \
  --config config/customer-anonymization-rules.json \
  --preserve-analytics

# 結果検証
echo "匿名化前後の行数比較:"
wc -l customers.csv anonymized_customers.csv

echo "匿名化結果サンプル:"
head -3 anonymized_customers.csv
```

### **Step 4: Azure SQL Database投入 (20分)**
```bash
# バックエンドAPI経由で投入
cd ../shopify-ai-marketing-suite-backend

# 投入実行
dotnet run import-customers \
  --file ../shopify-data-anonymizer/anonymized_customers.csv \
  --verify \
  --batch-size 100

# 投入結果確認
dotnet run test-customer-data
```

---

## 🔐 **セキュリティ・品質保証**

### **匿名化検証項目**
```yaml
✅ 個人情報完全削除確認:
  - 実名・メールアドレス削除確認
  - 住所詳細情報削除確認
  - 電話番号マスク確認

✅ 分析データ整合性確認:
  - Total Spent合計値一致
  - Total Orders合計値一致  
  - 地域分布比率維持
  - 業界分布比率維持

✅ データ関連性保持確認:
  - Customer ID一意性確認
  - NULL値適切処理確認
  - 文字エンコーディング確認
```

### **完了後即座削除対象**
```bash
# セキュリティのため処理完了後即座削除
rm customers.csv                    # 元ファイル
rm anonymized_customers.csv         # 中間ファイル  
rm data/staging/*                   # 作業用ファイル

# 保持対象（開発期間中）
keep: mapping.csv                   # ID対応表
keep: anonymization-log.txt         # 処理ログ
```

---

## 📋 **実行準備チェックリスト (更新版)**

### **✅ 環境準備**
- [ ] shopify-data-anonymizer動作確認
- [ ] 顧客CSVカラム対応設定ファイル作成
- [ ] Azure SQL Database接続確認
- [ ] バックエンドCustomer APIエンドポイント確認

### **📥 CSVデータ受け取り準備**
- [ ] 22カラム構成CSV受け取り準備
- [ ] データ量・品質確認手順準備
- [ ] セキュアな一時保存場所確保

### **🔄 処理・検証準備**  
- [ ] 匿名化ルール詳細設定完了
- [ ] 投入後品質検証SQLクエリ準備
- [ ] 処理ログ・監査証跡取得準備

**🎯 実CSVカラム対応完了！顧客データ受け取り準備完了！** 