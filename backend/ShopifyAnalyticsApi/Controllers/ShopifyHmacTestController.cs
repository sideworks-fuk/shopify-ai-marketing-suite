using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// HMAC検証のテスト用コントローラー
    /// </summary>
    [ApiController]
    [Route("api/shopify/hmac-test")]
    public class ShopifyHmacTestController : ControllerBase
    {
        private readonly ILogger<ShopifyHmacTestController> _logger;
        private readonly IConfiguration _configuration;

        public ShopifyHmacTestController(
            ILogger<ShopifyHmacTestController> logger,
            IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// HMAC検証のテスト - 様々な方法を試す
        /// </summary>
        [HttpPost("verify-all-methods")]
        public IActionResult VerifyAllMethods([FromBody] HmacTestRequest request)
        {
            var apiSecret = _configuration["Shopify:ApiSecret"] ?? "";
            var results = new Dictionary<string, HmacTestResult>();

            // 方法1: UTF-8エンコーディング + 辞書順
            results["utf8_sorted"] = TestMethod(
                request,
                apiSecret,
                Encoding.UTF8,
                true,
                false
            );

            // 方法2: ASCIIエンコーディング + 辞書順
            results["ascii_sorted"] = TestMethod(
                request,
                apiSecret,
                Encoding.ASCII,
                true,
                false
            );

            // 方法3: UTF-8エンコーディング + 元の順序
            results["utf8_original"] = TestMethod(
                request,
                apiSecret,
                Encoding.UTF8,
                false,
                false
            );

            // 方法4: ASCIIエンコーディング + 元の順序
            results["ascii_original"] = TestMethod(
                request,
                apiSecret,
                Encoding.ASCII,
                false,
                false
            );

            // 方法5: URLエンコード版
            results["utf8_sorted_encoded"] = TestMethod(
                request,
                apiSecret,
                Encoding.UTF8,
                true,
                true
            );

            // 方法6: ASCIIエンコーディング + URLエンコード
            results["ascii_sorted_encoded"] = TestMethod(
                request,
                apiSecret,
                Encoding.ASCII,
                true,
                true
            );

            return Ok(new
            {
                receivedHmac = request.Hmac,
                apiSecretLength = apiSecret.Length,
                results = results,
                recommendation = GetRecommendation(results, request.Hmac)
            });
        }

        private HmacTestResult TestMethod(
            HmacTestRequest request,
            string apiSecret,
            Encoding encoding,
            bool sortParams,
            bool urlEncode)
        {
            try
            {
                // パラメータの準備
                var parameters = new Dictionary<string, string>();
                
                if (!string.IsNullOrEmpty(request.Code))
                    parameters["code"] = request.Code;
                if (!string.IsNullOrEmpty(request.Shop))
                    parameters["shop"] = request.Shop;
                if (!string.IsNullOrEmpty(request.State))
                    parameters["state"] = request.State;
                if (!string.IsNullOrEmpty(request.Timestamp))
                    parameters["timestamp"] = request.Timestamp;
                
                // 追加パラメータがある場合
                if (request.AdditionalParams != null)
                {
                    foreach (var param in request.AdditionalParams)
                    {
                        if (!string.IsNullOrEmpty(param.Key) && param.Key != "hmac" && param.Key != "signature")
                        {
                            parameters[param.Key] = param.Value ?? "";
                        }
                    }
                }

                // ソート処理
                IEnumerable<KeyValuePair<string, string>> orderedParams;
                if (sortParams)
                {
                    orderedParams = parameters.OrderBy(p => p.Key);
                }
                else
                {
                    orderedParams = parameters;
                }

                // クエリ文字列の構築
                var queryParts = new List<string>();
                foreach (var param in orderedParams)
                {
                    var value = urlEncode ? Uri.EscapeDataString(param.Value) : param.Value;
                    queryParts.Add($"{param.Key}={value}");
                }
                var queryString = string.Join("&", queryParts);

                // HMAC計算
                var keyBytes = encoding.GetBytes(apiSecret);
                var messageBytes = encoding.GetBytes(queryString);

                using var hmac = new HMACSHA256(keyBytes);
                var hashBytes = hmac.ComputeHash(messageBytes);
                
                var computedHmacUpper = BitConverter.ToString(hashBytes).Replace("-", "");
                var computedHmacLower = computedHmacUpper.ToLower();

                var matchesUpper = computedHmacUpper == request.Hmac?.ToUpper();
                var matchesLower = computedHmacLower == request.Hmac?.ToLower();

                return new HmacTestResult
                {
                    QueryString = queryString,
                    ComputedHmacUpper = computedHmacUpper,
                    ComputedHmacLower = computedHmacLower,
                    Matches = matchesUpper || matchesLower,
                    MatchType = matchesUpper ? "uppercase" : (matchesLower ? "lowercase" : "none"),
                    EncodingUsed = encoding.WebName,
                    Sorted = sortParams,
                    UrlEncoded = urlEncode
                };
            }
            catch (Exception ex)
            {
                return new HmacTestResult
                {
                    Error = ex.Message,
                    Matches = false
                };
            }
        }

        private string GetRecommendation(Dictionary<string, HmacTestResult> results, string? receivedHmac)
        {
            var matchingMethod = results.FirstOrDefault(r => r.Value.Matches);
            if (matchingMethod.Key != null)
            {
                return $"使用すべき方法: {matchingMethod.Key} - " +
                       $"エンコーディング: {matchingMethod.Value.EncodingUsed}, " +
                       $"ソート: {matchingMethod.Value.Sorted}, " +
                       $"URLエンコード: {matchingMethod.Value.UrlEncoded}";
            }

            return "一致する方法が見つかりませんでした。Shopifyのドキュメントを確認してください。";
        }

        /// <summary>
        /// 実際のShopifyコールバックをシミュレート
        /// </summary>
        [HttpGet("simulate-callback")]
        public IActionResult SimulateCallback(
            [FromQuery] string code,
            [FromQuery] string shop,
            [FromQuery] string state,
            [FromQuery] string timestamp,
            [FromQuery] string hmac)
        {
            var apiSecret = _configuration["Shopify:ApiSecret"] ?? "";
            
            // 完全なクエリ文字列を取得
            var fullQueryString = HttpContext.Request.QueryString.Value?.TrimStart('?') ?? "";
            
            _logger.LogInformation("シミュレートコールバック:");
            _logger.LogInformation("  完全なクエリ文字列: {Query}", fullQueryString);
            _logger.LogInformation("  受信HMAC: {Hmac}", hmac);

            // ヘルパークラスを使用して検証
            var isValid = ShopifyAuthVerificationHelper.VerifyShopifyHmac(
                fullQueryString,
                apiSecret,
                _logger);

            return Ok(new
            {
                valid = isValid,
                queryString = fullQueryString,
                receivedHmac = hmac,
                parameters = new
                {
                    code,
                    shop,
                    state,
                    timestamp
                }
            });
        }
    }

    public class HmacTestRequest
    {
        public string? Code { get; set; }
        public string? Shop { get; set; }
        public string? State { get; set; }
        public string? Timestamp { get; set; }
        public string? Hmac { get; set; }
        public Dictionary<string, string>? AdditionalParams { get; set; }
    }

    public class HmacTestResult
    {
        public string? QueryString { get; set; }
        public string? ComputedHmacUpper { get; set; }
        public string? ComputedHmacLower { get; set; }
        public bool Matches { get; set; }
        public string? MatchType { get; set; }
        public string? EncodingUsed { get; set; }
        public bool Sorted { get; set; }
        public bool UrlEncoded { get; set; }
        public string? Error { get; set; }
    }
}