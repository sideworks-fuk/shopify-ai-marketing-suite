using System.Collections.Generic;
using System.Linq; // Added for .Select() and .Where()

namespace ShopifyDataAnonymizer.Configuration
{
    public class AnonymizationConfig
    {
        /// <summary>
        /// 実際のShopify Customer CSVカラムに対応した匿名化設定
        /// </summary>
        public static readonly Dictionary<string, string> CustomerFieldMappings = new Dictionary<string, string>
        {
            // 基本個人情報 (匿名化対象)
            { "First Name", "FirstName" },
            { "Last Name", "LastName" },
            { "Email", "Email" },
            
            // 住所情報 (匿名化対象)
            { "Default Address Company", "Company" },
            { "Default Address Address1", "Address1" },   // 削除対象だが処理用
            { "Default Address Address2", "Address2" },   // 削除対象だが処理用
            { "Default Address City", "City" },
            { "Default Address Zip", "Zip" },             // 削除対象だが処理用
            
            // 電話番号 (マスク処理)
            { "Default Address Phone", "Phone" },
            { "Phone", "Phone" },
            
            // Metafields (匿名化対象)
            { "会社名 または 店舗名 (customer.metafields.orig_fields.company_store)", "Company" },
            
            // 備考/メモ (削除対象)
            { "Note", "Note" },
            
            // タグ (フィルタリング対象)
            { "Tags", "Tags" }
        };

        /// <summary>
        /// 匿名化処理をスキップして保持するフィールド
        /// </summary>
        public static readonly HashSet<string> PreservedFields = new HashSet<string>
        {
            "Customer ID",
            "Accepts Email Marketing",
            "Default Address Province Code",
            "Default Address Country Code", 
            "Accepts SMS Marketing",
            "Total Spent",
            "Total Orders",
            "Tax Exempt",
            "業種名 (customer.metafields.orig_fields.industry)"
        };

        /// <summary>
        /// 完全削除対象のフィールド
        /// </summary>
        public static readonly HashSet<string> DeletedFields = new HashSet<string>
        {
            "Default Address Address1",
            "Default Address Address2",
            "Default Address Zip",
            "Note"
        };

        /// <summary>
        /// タグのフィルタリング用許可リスト
        /// </summary>
        public static readonly HashSet<string> AllowedTags = new HashSet<string>
        {
            "VIP", "新規", "リピーター", "法人", "個人", "優良顧客", 
            "定期購入", "まとめ買い", "割引対象", "特別対応"
        };

        /// <summary>
        /// 地域名のランダム置換用リスト
        /// </summary>
        public static readonly List<string> JapaneseCities = new List<string>
        {
            "東京都", "大阪府", "愛知県", "神奈川県", "埼玉県", "千葉県", 
            "兵庫県", "北海道", "福岡県", "静岡県", "茨城県", "広島県"
        };

        /// <summary>
        /// 名前の匿名化用サフィックスリスト
        /// </summary>
        public static readonly List<string> LastNameSuffixes = new List<string>
        {
            "さん", "様", "氏", "君", "先生", "部長", "課長", "係長", "主任", "担当"
        };

        /// <summary>
        /// 名前の匿名化用ミドルネーム
        /// </summary>
        public static readonly List<string> NameMiddleParts = new List<string>
        {
            "テスト", "サンプル", "デモ", "試用", "仮名", "匿名"
        };

        public static readonly Dictionary<string, string> OrderFieldMappings = new Dictionary<string, string>
        {
            // メールアドレス
            { "Email", "Email" },
            
            // 名前
            { "Name", "Name" },
            { "Billing Name", "Name" },
            { "Shipping Name", "Name" },
            
            // 電話番号
            { "Billing Phone", "Phone" },
            { "Shipping Phone", "Phone" },
            { "Phone", "Phone" },
            
            // 会社名
            { "Billing Company", "Company" },
            { "Shipping Company", "Company" },
            
            // 住所
            { "Billing Street", "Address1" },
            { "Billing Address1", "Address1" },
            { "Billing Address2", "Address2" },
            { "Shipping Street", "Address1" },
            { "Shipping Address1", "Address1" },
            { "Shipping Address2", "Address2" },
            
            // 市区町村
            { "Billing City", "City" },
            { "Shipping City", "City" },
            
            // 郵便番号
            { "Billing Zip", "Zip" },
            { "Shipping Zip", "Zip" },
            
            // 都道府県
            { "Billing Province", "Province" },
            { "Shipping Province", "Province" },
            { "Billing Province Name", "Province" },
            { "Shipping Province Name", "Province" },
            
            // 国
            { "Billing Country", "Country" },
            { "Shipping Country", "Country" },
            
            // メモ・ノート
            { "Notes", "Notes" },
            
            // タグ
            { "Tags", "Tags" },
            
            // 従業員・担当者
            { "Employee", "Name" },
            
            // デバイスID
            { "Device ID", "DeviceId" },
            
            // 支払い参照
            { "Payment Reference", "PaymentRef" },
            { "Payment References", "PaymentRef" },
            
            // 領収書番号
            { "Receipt Number", "ReceiptNumber" },
            
            // ベンダー
            { "Vendor", "Vendor" }
        };

        /// <summary>
        /// フィールドタイプに基づいて匿名化された値を生成します
        /// </summary>
        public static string GenerateAnonymizedValue(string fieldType, int index)
        {
            return fieldType switch
            {
                "Email" => $"test-user-{index:D3}@example.com",
                "FirstName" => $"テストユーザー{index:D3}",
                "LastName" => $"ユーザー{index:D3}",
                "Name" => $"テストユーザー{index:D3}",
                "Address1" => "", // 削除
                "Address2" => "", // 削除
                "City" => GetRandomCity(index),
                "ProvinceCode" => $"JP-{(index % 47) + 1:D2}",
                "CountryCode" => "JP",
                "Province" => GetRandomCity(index),
                "Country" => "日本",
                "Zip" => "", // 削除
                "Phone" => GeneratePhoneNumber(index),
                "Company" => $"テスト企業{(char)('A' + (index % 26))}{index % 100:D2}",
                "Note" => "", // 削除
                "Notes" => "", // 削除
                "Tags" => FilterTags("", index), // タグフィルタリング
                "NoteAttributes" => "",
                "DeviceId" => $"device-{index:D6}",
                "PaymentRef" => $"payment-ref-{index:D6}",
                "ReceiptNumber" => $"receipt-{index:D6}",
                "Vendor" => $"テストベンダー{(char)('A' + (index % 26))}{index % 100:D2}",
                _ => $"Unknown{index}"
            };
        }

        /// <summary>
        /// 元の名前を「テスト＋元の名前」形式で匿名化
        /// </summary>
        public static string GenerateAnonymizedNameWithPrefix(string originalName, string fieldType, int index)
        {
            if (string.IsNullOrWhiteSpace(originalName))
            {
                return GenerateAnonymizedValue(fieldType, index);
            }
            
            if (fieldType == "FirstName")
            {
                // 名前の場合: テスト + 元の名前
                return $"テスト{originalName}";
            }
            else if (fieldType == "LastName")
            {
                // 姓の場合: テスト + 元の姓
                return $"テスト{originalName}";
            }
            else
            {
                // その他: テスト + 元の値
                return $"テスト{originalName}";
            }
        }

        /// <summary>
        /// 会社名を「テスト＋元の会社名」形式で匿名化
        /// </summary>
        public static string GenerateAnonymizedCompanyWithPrefix(string originalCompany, int index)
        {
            if (string.IsNullOrWhiteSpace(originalCompany))
            {
                return $"テスト企業{(char)('A' + (index % 26))}{index % 100:D2}";
            }

            // テスト + 元の会社名の形式
            return $"テスト{originalCompany}";
        }

        /// <summary>
        /// ランダムな日本の都市名を取得
        /// </summary>
        private static string GetRandomCity(int index)
        {
            return JapaneseCities[index % JapaneseCities.Count];
        }

        /// <summary>
        /// タグをフィルタリングして安全なもののみ残す
        /// </summary>
        public static string FilterTags(string originalTags, int index)
        {
            if (string.IsNullOrWhiteSpace(originalTags))
            {
                // デフォルトタグを生成
                var defaultTags = new[] { "新規", "テスト顧客" };
                return string.Join(",", defaultTags);
            }

            var tags = originalTags.Split(',').Select(t => t.Trim());
            var filteredTags = tags.Where(tag => AllowedTags.Contains(tag)).ToList();
            
            if (!filteredTags.Any())
            {
                filteredTags.Add("一般顧客");
            }

            return string.Join(",", filteredTags);
        }

        /// <summary>
        /// より現実的な郵便番号を生成します（削除対象だが処理用）
        /// </summary>
        private static string GenerateZipCode(int index)
        {
            return $"{index % 1000:D3}-{(index % 9000) + 1000:D4}";
        }

        /// <summary>
        /// より現実的な電話番号を生成します（マスク処理）
        /// </summary>
        private static string GeneratePhoneNumber(int index)
        {
            // 日本の携帯電話番号でマスク処理
            var lastFour = (index % 9000) + 1000;
            return $"090-****-{lastFour:D4}";
        }

        #region 商品匿名化設定

        /// <summary>
        /// 商品フィールドマッピング設定
        /// </summary>
        public static readonly Dictionary<string, string> ProductFieldMappings = new Dictionary<string, string>
        {
            { "Handle", "Handle" },
            { "Title", "Title" },
            { "Body (HTML)", "BodyHtml" },
            { "Vendor", "Vendor" },
            { "Product Category", "ProductCategory" },
            { "Type", "Type" },
            { "Tags", "Tags" },
            { "Published", "Published" },
            
            // Option fields
            { "Option1 Name", "Option1Name" },
            { "Option1 Value", "Option1Value" },
            { "Option1 Linked To", "Option1LinkedTo" },
            { "Option2 Name", "Option2Name" },
            { "Option2 Value", "Option2Value" },
            { "Option2 Linked To", "Option2LinkedTo" },
            { "Option3 Name", "Option3Name" },
            { "Option3 Value", "Option3Value" },
            { "Option3 Linked To", "Option3LinkedTo" },
            
            // Variant fields
            { "Variant SKU", "VariantSku" },
            { "Variant Grams", "VariantGrams" },
            { "Variant Inventory Tracker", "VariantInventoryTracker" },
            { "Variant Inventory Policy", "VariantInventoryPolicy" },
            { "Variant Fulfillment Service", "VariantFulfillmentService" },
            { "Variant Price", "VariantPrice" },
            { "Variant Compare At Price", "VariantCompareAtPrice" },
            { "Variant Requires Shipping", "VariantRequiresShipping" },
            { "Variant Taxable", "VariantTaxable" },
            { "Variant Barcode", "VariantBarcode" },
            
            // Image fields
            { "Image Src", "ImageSrc" },
            { "Image Position", "ImagePosition" },
            { "Image Alt Text", "ImageAltText" },
            
            // Gift Card
            { "Gift Card", "GiftCard" },
            
            // SEO fields
            { "SEO Title", "SeoTitle" },
            { "SEO Description", "SeoDescription" },
            
            // Google Shopping fields
            { "Google Shopping / Google Product Category", "GoogleShoppingProductCategory" },
            { "Google Shopping / Gender", "GoogleShoppingGender" },
            { "Google Shopping / Age Group", "GoogleShoppingAgeGroup" },
            { "Google Shopping / MPN", "GoogleShoppingMpn" },
            { "Google Shopping / Condition", "GoogleShoppingCondition" },
            { "Google Shopping / Custom Product", "GoogleShoppingCustomProduct" },
            { "Google Shopping / Custom Label 0", "GoogleShoppingCustomLabel0" },
            { "Google Shopping / Custom Label 1", "GoogleShoppingCustomLabel1" },
            { "Google Shopping / Custom Label 2", "GoogleShoppingCustomLabel2" },
            { "Google Shopping / Custom Label 3", "GoogleShoppingCustomLabel3" },
            { "Google Shopping / Custom Label 4", "GoogleShoppingCustomLabel4" },
            
            // Japanese Metafields (ストア特有)
            { "機能 (product.metafields.custom._function)", "Function" },
            { "仕様・材質 (product.metafields.custom._material)", "Material" },
            { "サイズ (product.metafields.custom._size)", "Size" },
            { "Google: Custom Product (product.metafields.mm-google-shopping.custom_product)", "GoogleCustomProduct" },
            { "商品評価数 (product.metafields.reviews.rating_count)", "RatingCount" },
            { "サイト内検索 (product.metafields.seo.hidden)", "SiteSearch" },
            { "色 (product.metafields.shopify.color-pattern)", "ColorPattern" },
            { "食料品の形態 (product.metafields.shopify.food-product-form)", "FoodProductForm" },
            { "ユーザーの種類 (product.metafields.shopify.user-type)", "UserType" },
            { "付属商品 (product.metafields.shopify--discovery--product_recommendation.complementary_products)", "ComplementaryProducts" },
            { "関連商品 (product.metafields.shopify--discovery--product_recommendation.related_products)", "RelatedProducts" },
            { "関連商品の設定 (product.metafields.shopify--discovery--product_recommendation.related_products_display)", "RelatedProductsDisplay" },
            { "販売促進する商品を検索する (product.metafields.shopify--discovery--product_search_boost.queries)", "ProductSearchBoost" },
            
            // Additional Variant fields
            { "Variant Image", "VariantImage" },
            { "Variant Weight Unit", "VariantWeightUnit" },
            { "Variant Tax Code", "VariantTaxCode" },
            { "Cost per item", "CostPerItem" },
            
            // Japan-specific pricing
            { "Included / Japan", "IncludedJapan" },
            { "Price / Japan", "PriceJapan" },
            { "Compare At Price / Japan", "CompareAtPriceJapan" },
            
            // International pricing
            { "Included / International", "IncludedInternational" },
            { "Price / International", "PriceInternational" },
            { "Compare At Price / International", "CompareAtPriceInternational" },
            
            { "Status", "Status" }
        };

        /// <summary>
        /// 商品の保持するフィールド（匿名化せず元の値を保持）
        /// </summary>
        public static readonly HashSet<string> ProductPreservedFields = new HashSet<string>
        {
            "Variant Price",
            "Variant Compare At Price",
            "Variant Grams",
            "Variant Inventory Policy",
            "Variant Fulfillment Service",
            "Variant Requires Shipping",
            "Variant Taxable",
            "Published",
            "Gift Card",
            "Variant Weight Unit",
            "Cost per item",
            "Price / Japan",
            "Compare At Price / Japan",
            "Included / Japan",
            "Price / International",
            "Compare At Price / International",
            "Included / International",
            "Status",
            "商品評価数 (product.metafields.reviews.rating_count)",
            "Google Shopping / Google Product Category",
            "Google Shopping / Gender",
            "Google Shopping / Age Group",
            "Google Shopping / Condition",
            "色 (product.metafields.shopify.color-pattern)",
            "食料品の形態 (product.metafields.shopify.food-product-form)",
            "ユーザーの種類 (product.metafields.shopify.user-type)"
        };

        /// <summary>
        /// 商品の削除するフィールド（機密性の高い情報）
        /// </summary>
        public static readonly HashSet<string> ProductDeletedFields = new HashSet<string>
        {
            "Body (HTML)",
            "Variant SKU", 
            "Variant Barcode",
            "Image Src",
            "Google Shopping / MPN",
            "付属商品 (product.metafields.shopify--discovery--product_recommendation.complementary_products)",
            "関連商品 (product.metafields.shopify--discovery--product_recommendation.related_products)",
            "関連商品の設定 (product.metafields.shopify--discovery--product_recommendation.related_products_display)",
            "販売促進する商品を検索する (product.metafields.shopify--discovery--product_search_boost.queries)",
            "サイト内検索 (product.metafields.seo.hidden)",
            "Variant Image"
        };

        /// <summary>
        /// 商品タイプのサンプルリスト
        /// </summary>
        public static readonly List<string> ProductTypes = new List<string>
        {
            "電子機器", "家具", "衣類", "アクセサリー", "本", "食品", "化粧品", "スポーツ用品",
            "キッチン用品", "文房具", "おもちゃ", "園芸用品", "自動車用品", "ペット用品", "健康用品"
        };

        /// <summary>
        /// ベンダー名のサンプルリスト
        /// </summary>
        public static readonly List<string> VendorNames = new List<string>
        {
            "テストメーカーA", "テストメーカーB", "テストメーカーC", "テストメーカーD", "テストメーカーE",
            "サンプル商事", "デモ工業", "試作株式会社", "実験企業", "開発会社"
        };

        /// <summary>
        /// 商品名を「テスト＋元の商品名」形式で匿名化
        /// </summary>
        public static string GenerateAnonymizedProductTitle(string originalTitle, int index)
        {
            if (string.IsNullOrWhiteSpace(originalTitle))
            {
                return $"テスト商品{(char)('A' + (index % 26))}{index % 100:D2}";
            }

            return $"テスト{originalTitle}";
        }

        /// <summary>
        /// 商品ハンドルを匿名化
        /// </summary>
        public static string GenerateAnonymizedProductHandle(string originalHandle, int index)
        {
            if (string.IsNullOrWhiteSpace(originalHandle))
            {
                return $"test-product-{index:D4}";
            }

            return $"test-{originalHandle}";
        }

        /// <summary>
        /// ベンダー名を匿名化
        /// </summary>
        public static string GenerateAnonymizedVendor(string originalVendor, int index)
        {
            if (string.IsNullOrWhiteSpace(originalVendor))
            {
                return VendorNames[index % VendorNames.Count];
            }

            return $"テスト{originalVendor}";
        }

        /// <summary>
        /// 商品タイプを匿名化
        /// </summary>
        public static string GenerateAnonymizedProductType(string originalType, int index)
        {
            if (string.IsNullOrWhiteSpace(originalType))
            {
                return ProductTypes[index % ProductTypes.Count];
            }

            return $"テスト{originalType}";
        }

        #endregion
    }
} 