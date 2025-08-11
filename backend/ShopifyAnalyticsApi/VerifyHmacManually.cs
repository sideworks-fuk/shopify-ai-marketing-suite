using System;
using System.Security.Cryptography;
using System.Text;

namespace ShopifyAnalyticsApi
{
    /// <summary>
    /// HMAC手動検証用のスタンドアロンクラス
    /// </summary>
    public class VerifyHmacManually
    {
        public static void Main()
        {
            // 実際のShopifyコールバックデータ（2025-01-13記録）
            var actualData = new
            {
                code = "f995556a3a0fc6a02526e92e9d5229cc",
                shop = "fuk-dev4.myshopify.com",
                state = "pvdcJqsr8A5WwCwfwvn2hANHuUJLRFfd",
                timestamp = "1754925455",
                receivedHmac = "73e68ab6c6542254b70a4e9966fda6b8cc3528652e7167c2d45bb59e79ea5941"
            };

            var apiSecret = "be83457b1f63f4c9b20d3ea5e62b5ef0";

            Console.WriteLine("=== Shopify HMAC検証テスト ===");
            Console.WriteLine($"受信HMAC: {actualData.receivedHmac}");
            Console.WriteLine($"APIシークレット: {apiSecret}");
            Console.WriteLine();

            // 方法1: UTF-8エンコーディング + 辞書順
            TestMethod1(actualData, apiSecret);

            // 方法2: ASCIIエンコーディング + 辞書順
            TestMethod2(actualData, apiSecret);

            // 方法3: パラメータ順序を保持
            TestMethod3(actualData, apiSecret);

            // 方法4: URLクエリ文字列の順序
            TestMethod4(actualData, apiSecret);
        }

        static void TestMethod1(dynamic data, string apiSecret)
        {
            Console.WriteLine("方法1: UTF-8エンコーディング + 辞書順");
            
            var queryString = $"code={data.code}&shop={data.shop}&state={data.state}&timestamp={data.timestamp}";
            Console.WriteLine($"クエリ文字列: {queryString}");

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryString));
            var computedHmac = BitConverter.ToString(hash).Replace("-", "").ToLower();
            
            Console.WriteLine($"計算HMAC: {computedHmac}");
            Console.WriteLine($"一致: {computedHmac == data.receivedHmac}");
            Console.WriteLine();
        }

        static void TestMethod2(dynamic data, string apiSecret)
        {
            Console.WriteLine("方法2: ASCIIエンコーディング + 辞書順");
            
            var queryString = $"code={data.code}&shop={data.shop}&state={data.state}&timestamp={data.timestamp}";
            Console.WriteLine($"クエリ文字列: {queryString}");

            var ascii = new ASCIIEncoding();
            using var hmac = new HMACSHA256(ascii.GetBytes(apiSecret));
            var hash = hmac.ComputeHash(ascii.GetBytes(queryString));
            var computedHmac = BitConverter.ToString(hash).Replace("-", "").ToLower();
            
            Console.WriteLine($"計算HMAC: {computedHmac}");
            Console.WriteLine($"一致: {computedHmac == data.receivedHmac}");
            Console.WriteLine();
        }

        static void TestMethod3(dynamic data, string apiSecret)
        {
            Console.WriteLine("方法3: URL記載順（code, shop, state, hmac, timestamp）");
            
            // URLに記載されている順序で構築
            var queryString = $"code={data.code}&shop={data.shop}&state={data.state}&timestamp={data.timestamp}";
            Console.WriteLine($"クエリ文字列: {queryString}");

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryString));
            var computedHmac = BitConverter.ToString(hash).Replace("-", "").ToLower();
            
            Console.WriteLine($"計算HMAC: {computedHmac}");
            Console.WriteLine($"一致: {computedHmac == data.receivedHmac}");
            Console.WriteLine();
        }

        static void TestMethod4(dynamic data, string apiSecret)
        {
            Console.WriteLine("方法4: パラメータを個別に並べ替え");
            
            // timestampを最初に配置するパターン
            var queryString = $"timestamp={data.timestamp}&code={data.code}&shop={data.shop}&state={data.state}";
            Console.WriteLine($"クエリ文字列（timestamp最初）: {queryString}");

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryString));
            var computedHmac = BitConverter.ToString(hash).Replace("-", "").ToLower();
            
            Console.WriteLine($"計算HMAC: {computedHmac}");
            Console.WriteLine($"一致: {computedHmac == data.receivedHmac}");
            
            // shopを最初に配置するパターン
            queryString = $"shop={data.shop}&code={data.code}&state={data.state}&timestamp={data.timestamp}";
            Console.WriteLine($"\nクエリ文字列（shop最初）: {queryString}");
            
            hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryString));
            computedHmac = BitConverter.ToString(hash).Replace("-", "").ToLower();
            
            Console.WriteLine($"計算HMAC: {computedHmac}");
            Console.WriteLine($"一致: {computedHmac == data.receivedHmac}");
            Console.WriteLine();
        }
    }
}