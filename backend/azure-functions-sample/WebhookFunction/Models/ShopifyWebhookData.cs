using Newtonsoft.Json;

namespace WebhookFunction.Models;

public class ShopifyWebhookData
{
    [JsonProperty("topic")]
    public string? Topic { get; set; }

    [JsonProperty("shop_domain")]
    public string? ShopDomain { get; set; }

    [JsonProperty("created_at")]
    public DateTime? CreatedAt { get; set; }

    [JsonProperty("data")]
    public object? Data { get; set; }

    [JsonProperty("webhook_id")]
    public string? WebhookId { get; set; }

    [JsonProperty("api_version")]
    public string? ApiVersion { get; set; }

    /// <summary>
    /// Raw webhook headers for signature validation
    /// </summary>
    public Dictionary<string, string>? Headers { get; set; }

    /// <summary>
    /// Store ID for multi-tenant processing
    /// </summary>
    public string? StoreId { get; set; }
}

public class ShopifyOrderData
{
    [JsonProperty("id")]
    public long Id { get; set; }

    [JsonProperty("email")]
    public string? Email { get; set; }

    [JsonProperty("created_at")]
    public DateTime? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [JsonProperty("total_price")]
    public decimal? TotalPrice { get; set; }

    [JsonProperty("subtotal_price")]
    public decimal? SubtotalPrice { get; set; }

    [JsonProperty("total_tax")]
    public decimal? TotalTax { get; set; }

    [JsonProperty("currency")]
    public string? Currency { get; set; }

    [JsonProperty("financial_status")]
    public string? FinancialStatus { get; set; }

    [JsonProperty("fulfillment_status")]
    public string? FulfillmentStatus { get; set; }

    [JsonProperty("customer")]
    public ShopifyCustomerData? Customer { get; set; }

    [JsonProperty("line_items")]
    public List<ShopifyLineItemData>? LineItems { get; set; }
}

public class ShopifyCustomerData
{
    [JsonProperty("id")]
    public long Id { get; set; }

    [JsonProperty("email")]
    public string? Email { get; set; }

    [JsonProperty("first_name")]
    public string? FirstName { get; set; }

    [JsonProperty("last_name")]
    public string? LastName { get; set; }

    [JsonProperty("orders_count")]
    public int? OrdersCount { get; set; }

    [JsonProperty("total_spent")]
    public decimal? TotalSpent { get; set; }

    [JsonProperty("created_at")]
    public DateTime? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}

public class ShopifyLineItemData
{
    [JsonProperty("id")]
    public long Id { get; set; }

    [JsonProperty("product_id")]
    public long? ProductId { get; set; }

    [JsonProperty("variant_id")]
    public long? VariantId { get; set; }

    [JsonProperty("title")]
    public string? Title { get; set; }

    [JsonProperty("variant_title")]
    public string? VariantTitle { get; set; }

    [JsonProperty("sku")]
    public string? Sku { get; set; }

    [JsonProperty("vendor")]
    public string? Vendor { get; set; }

    [JsonProperty("quantity")]
    public int Quantity { get; set; }

    [JsonProperty("price")]
    public decimal? Price { get; set; }

    [JsonProperty("total_discount")]
    public decimal? TotalDiscount { get; set; }
}

public class ShopifyProductData
{
    [JsonProperty("id")]
    public long Id { get; set; }

    [JsonProperty("title")]
    public string? Title { get; set; }

    [JsonProperty("body_html")]
    public string? BodyHtml { get; set; }

    [JsonProperty("vendor")]
    public string? Vendor { get; set; }

    [JsonProperty("product_type")]
    public string? ProductType { get; set; }

    [JsonProperty("created_at")]
    public DateTime? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [JsonProperty("published_at")]
    public DateTime? PublishedAt { get; set; }

    [JsonProperty("handle")]
    public string? Handle { get; set; }

    [JsonProperty("tags")]
    public string? Tags { get; set; }

    [JsonProperty("status")]
    public string? Status { get; set; }

    [JsonProperty("variants")]
    public List<ShopifyVariantData>? Variants { get; set; }
}

public class ShopifyVariantData
{
    [JsonProperty("id")]
    public long Id { get; set; }

    [JsonProperty("title")]
    public string? Title { get; set; }

    [JsonProperty("option1")]
    public string? Option1 { get; set; }

    [JsonProperty("option2")]
    public string? Option2 { get; set; }

    [JsonProperty("option3")]
    public string? Option3 { get; set; }

    [JsonProperty("sku")]
    public string? Sku { get; set; }

    [JsonProperty("requires_shipping")]
    public bool RequiresShipping { get; set; }

    [JsonProperty("taxable")]
    public bool Taxable { get; set; }

    [JsonProperty("featured_image")]
    public object? FeaturedImage { get; set; }

    [JsonProperty("available")]
    public bool Available { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("public_title")]
    public string? PublicTitle { get; set; }

    [JsonProperty("options")]
    public List<string>? Options { get; set; }

    [JsonProperty("price")]
    public decimal? Price { get; set; }

    [JsonProperty("weight")]
    public decimal? Weight { get; set; }

    [JsonProperty("compare_at_price")]
    public decimal? CompareAtPrice { get; set; }

    [JsonProperty("inventory_management")]
    public string? InventoryManagement { get; set; }

    [JsonProperty("inventory_policy")]
    public string? InventoryPolicy { get; set; }

    [JsonProperty("inventory_quantity")]
    public int? InventoryQuantity { get; set; }
}