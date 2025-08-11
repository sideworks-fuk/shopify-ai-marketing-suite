using System.Collections.Specialized;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// Shopify OAuth HMAC検証ヘルパークラス（後方互換性のため保持）
    /// </summary>
    public static class ShopifyAuthVerificationHelper
    {
        /// <summary>
        /// ShopifyのOAuthコールバックURLのHMACを検証する
        /// </summary>
        /// <param name="queryString">完全なクエリ文字列（?を含まない）</param>
        /// <param name="apiSecret">Shopify API Secret</param>
        /// <param name="logger">ロガー（オプション）</param>
        /// <returns>検証結果</returns>
        public static bool VerifyShopifyHmac(string queryString, string apiSecret, ILogger? logger = null)
        {
            if (string.IsNullOrWhiteSpace(queryString) || string.IsNullOrWhiteSpace(apiSecret))
            {
                logger?.LogError("HMAC検証: クエリ文字列またはAPIシークレットが空です");
                return false;
            }

            try
            {
                // クエリ文字列をパース
                var queryParams = HttpUtility.ParseQueryString(queryString);
                
                // HMACとsignatureを取得して除外
                var receivedHmac = queryParams["hmac"];
                if (string.IsNullOrWhiteSpace(receivedHmac))
                {
                    logger?.LogError("HMAC検証: hmacパラメータが見つかりません");
                    return false;
                }

                // hmacとsignatureを除外（signatureは存在しない場合もある）
                queryParams.Remove("hmac");
                queryParams.Remove("signature");

                // パラメータを辞書順にソートして再構築
                var sortedParams = new SortedDictionary<string, string>();
                foreach (string key in queryParams.AllKeys)
                {
                    if (key != null)
                    {
                        var value = queryParams[key];
                        if (value != null)
                        {
                            sortedParams[key] = value;
                        }
                    }
                }

                // クエリ文字列を再構築（key=value&key=value形式）
                var messageBuilder = new StringBuilder();
                var first = true;
                foreach (var param in sortedParams)
                {
                    if (!first) messageBuilder.Append("&");
                    messageBuilder.Append($"{param.Key}={param.Value}");
                    first = false;
                }

                var message = messageBuilder.ToString();
                logger?.LogDebug("HMAC検証 - 再構築されたメッセージ: {Message}", message);

                // HMAC-SHA256を計算（ASCII エンコーディングを使用）
                var encoding = new ASCIIEncoding();
                var keyBytes = encoding.GetBytes(apiSecret);
                var messageBytes = encoding.GetBytes(message);

                using var cryptographer = new HMACSHA256(keyBytes);
                var hashBytes = cryptographer.ComputeHash(messageBytes);
                var computedHmac = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();

                logger?.LogDebug("HMAC検証 - 受信: {Received}, 計算: {Computed}", receivedHmac, computedHmac);

                // 比較（小文字で統一）
                return computedHmac == receivedHmac.ToLower();
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "HMAC検証中にエラーが発生");
                return false;
            }
        }

        /// <summary>
        /// URLから直接HMAC検証を行う
        /// </summary>
        public static bool VerifyShopifyHmacFromUrl(string fullUrl, string apiSecret, ILogger? logger = null)
        {
            try
            {
                var uri = new Uri(fullUrl);
                var queryString = uri.Query.TrimStart('?');
                return VerifyShopifyHmac(queryString, apiSecret, logger);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "URL解析中にエラーが発生");
                return false;
            }
        }

        /// <summary>
        /// 個別のパラメータからHMAC検証を行う（レガシー互換性用）
        /// </summary>
        public static bool VerifyShopifyHmacFromParams(
            Dictionary<string, string> parameters,
            string receivedHmac,
            string apiSecret,
            ILogger? logger = null)
        {
            // 新しいヘルパークラスに委譲
            return ShopifyHmacVerificationHelper.VerifyOAuthHmac(
                parameters, receivedHmac, apiSecret, logger);
        }
    }
}