using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using ShopifySharp.Utilities;
using Microsoft.Extensions.Primitives;
using System.Security.Cryptography;
using System.Text;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// Shopify OAuth認証サービス（ShopifySharpライブラリ使用）
    /// </summary>
    public class ShopifyOAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ShopifyOAuthService> _logger;
        private readonly IMemoryCache _cache;
        private readonly ShopifyRequestValidationUtility _validator;

        // State保存用のキャッシュキープレフィックス
        private const string StateCacheKeyPrefix = "shopify_oauth_state_";
        private const int StateExpirationMinutes = 10;

        public ShopifyOAuthService(
            IConfiguration configuration,
            ILogger<ShopifyOAuthService> logger,
            IMemoryCache cache)
        {
            _configuration = configuration;
            _logger = logger;
            _cache = cache;
            _validator = new ShopifyRequestValidationUtility();
        }

        /// <summary>
        /// HMACを検証する（ShopifySharpライブラリ使用）
        /// </summary>
        public bool VerifyHmac(IEnumerable<KeyValuePair<string, StringValues>> queryParams, string? expectedHmac = null, string? secretOverride = null)
        {
            // マルチアプリ対応:
            // OAuthコールバックでは state に紐づく ApiSecret（=ShopifyApps由来）を優先して使用できるようにする。
            // これにより Shopify:ApiSecret（単一アプリ固定）への依存を減らせる。
            var secret = !string.IsNullOrWhiteSpace(secretOverride)
                ? secretOverride
                : GetShopifySetting("ApiSecret");
            if (string.IsNullOrWhiteSpace(secret))
            {
                _logger.LogError("HMAC検証エラー: ApiSecretが設定されていません");
                return false;
            }

            try
            {
                var isDevelopment = _configuration["ASPNETCORE_ENVIRONMENT"] == "Development";
                
                if (isDevelopment)
                {
                    _logger.LogInformation("=== HMAC検証開始（ShopifySharp使用） ===");
                    _logger.LogInformation("受信したパラメータ:");
                    foreach (var p in queryParams.OrderBy(x => x.Key))
                    {
                        _logger.LogInformation("  {Key}: {Value}", p.Key, string.Join(",", p.Value));
                    }
                    
                    var hmacParam = queryParams.FirstOrDefault(x => x.Key == "hmac");
                    if (!string.IsNullOrEmpty(hmacParam.Value))
                    {
                        _logger.LogInformation("受信HMAC: {Hmac}", hmacParam.Value.FirstOrDefault());
                    }
                    
                    _logger.LogInformation("使用するAPIシークレット: {Secret}", 
                        secret.Substring(0, Math.Min(4, secret.Length)) + "..." + 
                        secret.Substring(Math.Max(0, secret.Length - 4)));
                }

                // ShopifySharpライブラリでHMAC検証
                var isValid = _validator.IsAuthenticRequest(queryParams, secret);

                if (isDevelopment)
                {
                    _logger.LogInformation("ShopifySharp検証結果: {IsValid}", isValid);
                }

                if (!isValid)
                {
                    // デバッグ用の追加情報を出力（本番環境でも出力）
                    _logger.LogWarning("HMAC検証失敗。詳細デバッグ情報:");
                    
                    // 受信したパラメータをログ出力
                    _logger.LogWarning("受信したクエリパラメータ:");
                    foreach (var param in queryParams.OrderBy(x => x.Key))
                    {
                        _logger.LogWarning("  {Key}: {Value}", param.Key, string.Join(",", param.Value));
                    }
                    
                    // 手動でパラメータを構築して比較
                    var manualParams = new Dictionary<string, string>();
                    foreach (var param in queryParams)
                    {
                        if (param.Key != "hmac" && param.Key != "signature")
                        {
                            manualParams[param.Key] = param.Value.FirstOrDefault() ?? "";
                        }
                    }
                    
                    var sortedParams = manualParams
                        .OrderBy(p => p.Key, StringComparer.Ordinal)
                        .ToList();
                    
                    var queryString = string.Join("&", 
                        sortedParams.Select(p => $"{p.Key}={p.Value}"));
                    
                    _logger.LogWarning("手動構築したクエリ文字列: {QueryString}", queryString);
                    
                    using (var hmacSha256 = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
                    {
                        var hashBytes = hmacSha256.ComputeHash(Encoding.UTF8.GetBytes(queryString));
                        var computedHmac = BitConverter.ToString(hashBytes)
                            .Replace("-", "")
                            .ToLower();
                        
                        var receivedHmac = queryParams.FirstOrDefault(x => x.Key == "hmac").Value.FirstOrDefault();
                        _logger.LogWarning("手動計算HMAC: {Computed}", computedHmac);
                        _logger.LogWarning("受信HMAC: {Received}", receivedHmac);
                        _logger.LogWarning("手動検証一致: {Match}", 
                            string.Equals(computedHmac, receivedHmac, StringComparison.OrdinalIgnoreCase));
                        
                        // API Secretのプレビュー（最初と最後の4文字のみ）
                        var secretPreview = secret.Length > 8 
                            ? $"{secret.Substring(0, 4)}...{secret.Substring(secret.Length - 4)}"
                            : "***";
                        _logger.LogWarning("使用したAPI Secretプレビュー: {SecretPreview}", secretPreview);
                    }
                }

                if (isValid)
                {
                    _logger.LogInformation("HMAC検証成功（ShopifySharpライブラリ）");
                }
                else
                {
                    _logger.LogError("HMAC検証失敗（ShopifySharpライブラリ）");
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HMAC検証中にエラーが発生");
                return false;
            }
        }

        /// <summary>
        /// State文字列を生成して保存
        /// </summary>
        public string GenerateAndSaveState(string shop)
        {
            var state = GenerateRandomString(32);
            var cacheKey = $"{StateCacheKeyPrefix}{shop}";
            
            _cache.Set(cacheKey, state, TimeSpan.FromMinutes(StateExpirationMinutes));
            _logger.LogInformation("State生成・保存完了. Shop: {Shop}", shop);
            
            return state;
        }

        /// <summary>
        /// Stateを検証
        /// </summary>
        public bool ValidateState(string shop, string state)
        {
            var cacheKey = $"{StateCacheKeyPrefix}{shop}";
            
            if (_cache.TryGetValue<string>(cacheKey, out var savedState))
            {
                // 使用済みのStateは削除
                _cache.Remove(cacheKey);
                
                var isValid = savedState == state;
                if (!isValid)
                {
                    _logger.LogWarning("State検証失敗. Shop: {Shop}, Expected: {Expected}, Received: {Received}",
                        shop, savedState, state);
                }
                return isValid;
            }
            
            _logger.LogWarning("Stateが見つかりません（タイムアウトの可能性）. Shop: {Shop}", shop);
            return false;
        }

        /// <summary>
        /// ショップドメインの形式を検証
        /// </summary>
        public bool IsValidShopDomain(string shop)
        {
            if (string.IsNullOrWhiteSpace(shop))
                return false;

            // 基本的な形式チェック（.myshopify.comで終わる）
            if (!shop.EndsWith(".myshopify.com"))
                return false;

            // 危険な文字が含まれていないかチェック
            var invalidChars = new[] { '<', '>', '"', '\'', '&', '\n', '\r' };
            if (shop.IndexOfAny(invalidChars) >= 0)
                return false;

            return true;
        }

        /// <summary>
        /// OAuth認証URLを生成
        /// </summary>
        public string GenerateAuthorizationUrl(string shop, string redirectUri, string state, string[]? scopes = null)
        {
            var apiKey = GetShopifySetting("ApiKey");
            var scopeList = scopes ?? new[] { "read_products", "read_customers", "read_orders" };
            
            var authUrl = $"https://{shop}/admin/oauth/authorize?" +
                         $"client_id={apiKey}" +
                         $"&scope={string.Join(",", scopeList)}" +
                         $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                         $"&state={state}";
            
            return authUrl;
        }

        private string GetShopifySetting(string key, string? defaultValue = null)
        {
            // 環境変数から取得を試みる
            var envKey = $"SHOPIFY_{key.ToUpper().Replace(":", "_")}";
            var envValue = Environment.GetEnvironmentVariable(envKey);
            if (!string.IsNullOrEmpty(envValue))
            {
                return envValue;
            }

            // 設定ファイルから取得
            var configValue = _configuration[$"Shopify:{key}"];
            return configValue ?? defaultValue ?? string.Empty;
        }

        private string GenerateRandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }
}