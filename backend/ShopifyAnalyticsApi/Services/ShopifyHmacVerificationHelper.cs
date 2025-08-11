using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// Shopify HMAC検証ヘルパークラス（最新仕様対応版）
    /// </summary>
    public static class ShopifyHmacVerificationHelper
    {
        /// <summary>
        /// Shopify OAuth認証のHMAC検証を行う（最新仕様準拠）
        /// </summary>
        /// <param name="queryParameters">クエリパラメータの辞書</param>
        /// <param name="providedHmac">Shopifyから提供されたHMAC値</param>
        /// <param name="apiSecret">アプリケーションのAPIシークレット</param>
        /// <param name="logger">ロガー（オプション）</param>
        /// <returns>検証結果（true: 成功、false: 失敗）</returns>
        public static bool VerifyOAuthHmac(
            Dictionary<string, string> queryParameters,
            string providedHmac,
            string apiSecret,
            ILogger? logger = null)
        {
            if (string.IsNullOrWhiteSpace(providedHmac) || string.IsNullOrWhiteSpace(apiSecret))
            {
                logger?.LogError("HMAC検証エラー: 必須パラメータが不足しています");
                return false;
            }

            try
            {
                // 1. hmacとsignatureパラメータを除外してコピーを作成
                var filteredParams = queryParameters
                    .Where(p => !string.Equals(p.Key, "hmac", StringComparison.OrdinalIgnoreCase) &&
                               !string.Equals(p.Key, "signature", StringComparison.OrdinalIgnoreCase))
                    .OrderBy(p => p.Key, StringComparer.Ordinal) // アルファベット順（大文字小文字を区別）
                    .ToList();

                // 2. クエリ文字列を構築
                var queryString = string.Join("&", 
                    filteredParams.Select(p => $"{p.Key}={p.Value}"));

                logger?.LogDebug("HMAC検証 - 構築されたクエリ文字列: {QueryString}", queryString);
                logger?.LogDebug("HMAC検証 - パラメータ数: {Count}", filteredParams.Count);

                // 3. HMAC-SHA256を計算（ASCIIエンコーディングを使用）
                var encoding = new ASCIIEncoding();
                var keyBytes = encoding.GetBytes(apiSecret);
                var dataBytes = encoding.GetBytes(queryString);

                using var hmac = new HMACSHA256(keyBytes);
                var hashBytes = hmac.ComputeHash(dataBytes);

                // 4. 16進数文字列に変換
                var computedHmac = BitConverter.ToString(hashBytes)
                    .Replace("-", "")
                    .ToLower(); // Shopifyは小文字の16進数を使用

                logger?.LogDebug("HMAC検証詳細:");
                logger?.LogDebug("  受信HMAC: {Received}", providedHmac);
                logger?.LogDebug("  計算HMAC: {Computed}", computedHmac);
                logger?.LogDebug("  一致: {Match}", computedHmac == providedHmac.ToLower());

                // 5. 大文字小文字を無視して比較
                return string.Equals(computedHmac, providedHmac, StringComparison.OrdinalIgnoreCase);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "HMAC検証中にエラーが発生");
                return false;
            }
        }

        /// <summary>
        /// クエリ文字列からパラメータ辞書を作成する
        /// </summary>
        public static Dictionary<string, string> ParseQueryString(string queryString)
        {
            var parameters = new Dictionary<string, string>();
            
            if (string.IsNullOrWhiteSpace(queryString))
                return parameters;

            // ?を除去
            if (queryString.StartsWith("?"))
                queryString = queryString.Substring(1);

            var pairs = queryString.Split('&');
            foreach (var pair in pairs)
            {
                var keyValue = pair.Split('=');
                if (keyValue.Length == 2)
                {
                    var key = Uri.UnescapeDataString(keyValue[0]);
                    var value = Uri.UnescapeDataString(keyValue[1]);
                    parameters[key] = value;
                }
            }

            return parameters;
        }

        /// <summary>
        /// Webhook用のHMAC検証（Base64形式）
        /// </summary>
        public static bool VerifyWebhookHmac(
            string requestBody,
            string providedHmac,
            string apiSecret,
            ILogger? logger = null)
        {
            if (string.IsNullOrWhiteSpace(requestBody) || 
                string.IsNullOrWhiteSpace(providedHmac) || 
                string.IsNullOrWhiteSpace(apiSecret))
            {
                logger?.LogError("Webhook HMAC検証エラー: 必須パラメータが不足しています");
                return false;
            }

            try
            {
                // UTF-8エンコーディングを使用（Webhookの場合）
                var keyBytes = Encoding.UTF8.GetBytes(apiSecret);
                var dataBytes = Encoding.UTF8.GetBytes(requestBody);

                using var hmac = new HMACSHA256(keyBytes);
                var hashBytes = hmac.ComputeHash(dataBytes);

                // Base64形式に変換（Webhookの場合）
                var computedHmac = Convert.ToBase64String(hashBytes);

                logger?.LogDebug("Webhook HMAC検証:");
                logger?.LogDebug("  受信HMAC: {Received}", providedHmac);
                logger?.LogDebug("  計算HMAC: {Computed}", computedHmac);

                return computedHmac == providedHmac;
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "Webhook HMAC検証中にエラーが発生");
                return false;
            }
        }

        /// <summary>
        /// タイムスタンプの有効性を検証（24時間以内）
        /// </summary>
        public static bool ValidateTimestamp(string? timestamp, ILogger? logger = null)
        {
            if (string.IsNullOrEmpty(timestamp) || !long.TryParse(timestamp, out var ts))
            {
                logger?.LogWarning("タイムスタンプが無効または存在しません");
                return true; // タイムスタンプがない場合は検証をスキップ
            }

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var timeDiff = Math.Abs(now - ts);
            const int maxAge = 86400; // 24時間

            if (timeDiff > maxAge)
            {
                logger?.LogWarning("タイムスタンプが古すぎます。差: {Diff}秒（{Hours}時間）", 
                    timeDiff, timeDiff / 3600);
                return false;
            }

            return true;
        }
    }
}