namespace ShopifyDataAnonymizer.Models
{
    public class MappingRecord
    {
        public required string FieldType { get; set; }
        public required string OriginalValue { get; set; }
        public required string AnonymizedValue { get; set; }
        public int Index { get; set; }
    }
}