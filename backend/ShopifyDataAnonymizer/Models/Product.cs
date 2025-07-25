// Models/Product.cs
using System;
using CsvHelper.Configuration.Attributes;
using CsvHelper.Configuration;

namespace ShopifyDataAnonymizer.Models
{
    public class Product
    {
        public string Handle { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string BodyHtml { get; set; } = string.Empty;
        public string Vendor { get; set; } = string.Empty;
        public string ProductCategory { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Tags { get; set; } = string.Empty;
        public string Published { get; set; } = string.Empty;
        
        // Option fields
        public string Option1Name { get; set; } = string.Empty;
        public string Option1Value { get; set; } = string.Empty;
        public string Option1LinkedTo { get; set; } = string.Empty;
        public string Option2Name { get; set; } = string.Empty;
        public string Option2Value { get; set; } = string.Empty;
        public string Option2LinkedTo { get; set; } = string.Empty;
        public string Option3Name { get; set; } = string.Empty;
        public string Option3Value { get; set; } = string.Empty;
        public string Option3LinkedTo { get; set; } = string.Empty;
        
        // Variant fields
        public string VariantSku { get; set; } = string.Empty;
        public string VariantGrams { get; set; } = string.Empty;
        public string VariantInventoryTracker { get; set; } = string.Empty;
        public string VariantInventoryPolicy { get; set; } = string.Empty;
        public string VariantFulfillmentService { get; set; } = string.Empty;
        public string VariantPrice { get; set; } = string.Empty;
        public string VariantCompareAtPrice { get; set; } = string.Empty;
        public string VariantRequiresShipping { get; set; } = string.Empty;
        public string VariantTaxable { get; set; } = string.Empty;
        public string VariantBarcode { get; set; } = string.Empty;
        
        // Image fields
        public string ImageSrc { get; set; } = string.Empty;
        public string ImagePosition { get; set; } = string.Empty;
        public string ImageAltText { get; set; } = string.Empty;
        
        // Gift Card
        public string GiftCard { get; set; } = string.Empty;
        
        // SEO fields
        public string SeoTitle { get; set; } = string.Empty;
        public string SeoDescription { get; set; } = string.Empty;
        
        // Google Shopping fields
        public string GoogleShoppingProductCategory { get; set; } = string.Empty;
        public string GoogleShoppingGender { get; set; } = string.Empty;
        public string GoogleShoppingAgeGroup { get; set; } = string.Empty;
        public string GoogleShoppingMpn { get; set; } = string.Empty;
        public string GoogleShoppingCondition { get; set; } = string.Empty;
        public string GoogleShoppingCustomProduct { get; set; } = string.Empty;
        public string GoogleShoppingCustomLabel0 { get; set; } = string.Empty;
        public string GoogleShoppingCustomLabel1 { get; set; } = string.Empty;
        public string GoogleShoppingCustomLabel2 { get; set; } = string.Empty;
        public string GoogleShoppingCustomLabel3 { get; set; } = string.Empty;
        public string GoogleShoppingCustomLabel4 { get; set; } = string.Empty;
        
        // Japanese Metafields (ストア特有)
        public string Function { get; set; } = string.Empty; // 機能
        public string Material { get; set; } = string.Empty; // 仕様・材質
        public string Size { get; set; } = string.Empty; // サイズ
        public string GoogleCustomProduct { get; set; } = string.Empty;
        public string RatingCount { get; set; } = string.Empty; // 商品評価数
        public string SiteSearch { get; set; } = string.Empty; // サイト内検索
        public string ColorPattern { get; set; } = string.Empty; // 色
        public string FoodProductForm { get; set; } = string.Empty; // 食料品の形態
        public string UserType { get; set; } = string.Empty; // ユーザーの種類
        public string ComplementaryProducts { get; set; } = string.Empty; // 付属商品
        public string RelatedProducts { get; set; } = string.Empty; // 関連商品
        public string RelatedProductsDisplay { get; set; } = string.Empty; // 関連商品の設定
        public string ProductSearchBoost { get; set; } = string.Empty; // 販売促進する商品を検索する
        
        // Additional Variant fields
        public string VariantImage { get; set; } = string.Empty;
        public string VariantWeightUnit { get; set; } = string.Empty;
        public string VariantTaxCode { get; set; } = string.Empty;
        public string CostPerItem { get; set; } = string.Empty;
        
        // Japan-specific pricing
        public string IncludedJapan { get; set; } = string.Empty;
        public string PriceJapan { get; set; } = string.Empty;
        public string CompareAtPriceJapan { get; set; } = string.Empty;
        
        // International pricing
        public string IncludedInternational { get; set; } = string.Empty;
        public string PriceInternational { get; set; } = string.Empty;
        public string CompareAtPriceInternational { get; set; } = string.Empty;
        
        public string Status { get; set; } = string.Empty;
    }

    public sealed class ProductMap : ClassMap<Product>
    {
        public ProductMap()
        {
            Map(m => m.Handle).Name("Handle");
            Map(m => m.Title).Name("Title");
            Map(m => m.BodyHtml).Name("Body (HTML)");
            Map(m => m.Vendor).Name("Vendor");
            Map(m => m.ProductCategory).Name("Product Category");
            Map(m => m.Type).Name("Type");
            Map(m => m.Tags).Name("Tags");
            Map(m => m.Published).Name("Published");
            
            Map(m => m.Option1Name).Name("Option1 Name");
            Map(m => m.Option1Value).Name("Option1 Value");
            Map(m => m.Option1LinkedTo).Name("Option1 Linked To");
            Map(m => m.Option2Name).Name("Option2 Name");
            Map(m => m.Option2Value).Name("Option2 Value");
            Map(m => m.Option2LinkedTo).Name("Option2 Linked To");
            Map(m => m.Option3Name).Name("Option3 Name");
            Map(m => m.Option3Value).Name("Option3 Value");
            Map(m => m.Option3LinkedTo).Name("Option3 Linked To");
            
            Map(m => m.VariantSku).Name("Variant SKU");
            Map(m => m.VariantGrams).Name("Variant Grams");
            Map(m => m.VariantInventoryTracker).Name("Variant Inventory Tracker");
            Map(m => m.VariantInventoryPolicy).Name("Variant Inventory Policy");
            Map(m => m.VariantFulfillmentService).Name("Variant Fulfillment Service");
            Map(m => m.VariantPrice).Name("Variant Price");
            Map(m => m.VariantCompareAtPrice).Name("Variant Compare At Price");
            Map(m => m.VariantRequiresShipping).Name("Variant Requires Shipping");
            Map(m => m.VariantTaxable).Name("Variant Taxable");
            Map(m => m.VariantBarcode).Name("Variant Barcode");
            
            Map(m => m.ImageSrc).Name("Image Src");
            Map(m => m.ImagePosition).Name("Image Position");
            Map(m => m.ImageAltText).Name("Image Alt Text");
            
            Map(m => m.GiftCard).Name("Gift Card");
            
            Map(m => m.SeoTitle).Name("SEO Title");
            Map(m => m.SeoDescription).Name("SEO Description");
            
            Map(m => m.GoogleShoppingProductCategory).Name("Google Shopping / Google Product Category");
            Map(m => m.GoogleShoppingGender).Name("Google Shopping / Gender");
            Map(m => m.GoogleShoppingAgeGroup).Name("Google Shopping / Age Group");
            Map(m => m.GoogleShoppingMpn).Name("Google Shopping / MPN");
            Map(m => m.GoogleShoppingCondition).Name("Google Shopping / Condition");
            Map(m => m.GoogleShoppingCustomProduct).Name("Google Shopping / Custom Product");
            Map(m => m.GoogleShoppingCustomLabel0).Name("Google Shopping / Custom Label 0");
            Map(m => m.GoogleShoppingCustomLabel1).Name("Google Shopping / Custom Label 1");
            Map(m => m.GoogleShoppingCustomLabel2).Name("Google Shopping / Custom Label 2");
            Map(m => m.GoogleShoppingCustomLabel3).Name("Google Shopping / Custom Label 3");
            Map(m => m.GoogleShoppingCustomLabel4).Name("Google Shopping / Custom Label 4");
            
            // Japanese Metafields
            Map(m => m.Function).Name("機能 (product.metafields.custom._function)");
            Map(m => m.Material).Name("仕様・材質 (product.metafields.custom._material)");
            Map(m => m.Size).Name("サイズ (product.metafields.custom._size)");
            Map(m => m.GoogleCustomProduct).Name("Google: Custom Product (product.metafields.mm-google-shopping.custom_product)");
            Map(m => m.RatingCount).Name("商品評価数 (product.metafields.reviews.rating_count)");
            Map(m => m.SiteSearch).Name("サイト内検索 (product.metafields.seo.hidden)");
            Map(m => m.ColorPattern).Name("色 (product.metafields.shopify.color-pattern)");
            Map(m => m.FoodProductForm).Name("食料品の形態 (product.metafields.shopify.food-product-form)");
            Map(m => m.UserType).Name("ユーザーの種類 (product.metafields.shopify.user-type)");
            Map(m => m.ComplementaryProducts).Name("付属商品 (product.metafields.shopify--discovery--product_recommendation.complementary_products)");
            Map(m => m.RelatedProducts).Name("関連商品 (product.metafields.shopify--discovery--product_recommendation.related_products)");
            Map(m => m.RelatedProductsDisplay).Name("関連商品の設定 (product.metafields.shopify--discovery--product_recommendation.related_products_display)");
            Map(m => m.ProductSearchBoost).Name("販売促進する商品を検索する (product.metafields.shopify--discovery--product_search_boost.queries)");
            
            Map(m => m.VariantImage).Name("Variant Image");
            Map(m => m.VariantWeightUnit).Name("Variant Weight Unit");
            Map(m => m.VariantTaxCode).Name("Variant Tax Code");
            Map(m => m.CostPerItem).Name("Cost per item");
            
            Map(m => m.IncludedJapan).Name("Included / Japan");
            Map(m => m.PriceJapan).Name("Price / Japan");
            Map(m => m.CompareAtPriceJapan).Name("Compare At Price / Japan");
            
            Map(m => m.IncludedInternational).Name("Included / International");
            Map(m => m.PriceInternational).Name("Price / International");
            Map(m => m.CompareAtPriceInternational).Name("Compare At Price / International");
            
            Map(m => m.Status).Name("Status");
        }
    }
}