namespace ShopifyAnalyticsApi.Attributes
{
    /// <summary>
    /// デモモードでの書き込み操作を明示的に許可する属性
    /// 
    /// ⚠️ セキュリティ警告:
    /// この属性を使用するエンドポイントは最小限に留めること。
    /// デモモードでは基本的にすべての変更操作をブロックすべきです。
    /// 
    /// 使用例:
    /// - デモ用のサンプルデータ生成エンドポイント
    /// - デモモード専用の設定変更エンドポイント
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public class AllowDemoWriteAttribute : Attribute
    {
        /// <summary>
        /// 許可する理由（ドキュメント用）
        /// </summary>
        public string? Reason { get; set; }

        /// <summary>
        /// デモモードでの書き込み操作を明示的に許可
        /// </summary>
        public AllowDemoWriteAttribute()
        {
        }

        /// <summary>
        /// デモモードでの書き込み操作を明示的に許可（理由付き）
        /// </summary>
        /// <param name="reason">許可する理由</param>
        public AllowDemoWriteAttribute(string reason)
        {
            Reason = reason;
        }
    }
}

