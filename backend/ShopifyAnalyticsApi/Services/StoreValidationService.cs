using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Data;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace ShopifyAnalyticsApi.Services
{
    public interface IStoreValidationService
    {
        Task<bool> ValidateStoreAccessAsync(string shopDomain, string accessToken);
        Task<bool> IsStoreRegisteredAsync(string shopDomain);
        Task<bool> ValidateApiKeyAsync(int storeId, string apiKey);
    }

    public class StoreValidationService : IStoreValidationService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<StoreValidationService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public StoreValidationService(
            ShopifyDbContext context,
            ILogger<StoreValidationService> logger,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        /// <summary>
        /// ストアのアクセス権限を検証
        /// </summary>
        public async Task<bool> ValidateStoreAccessAsync(string shopDomain, string accessToken)
        {
            try
            {
                // 1. データベースに登録されているか確認
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Domain == shopDomain && s.IsActive);

                if (store == null)
                {
                    _logger.LogWarning("Unregistered store attempted access: {ShopDomain}", shopDomain);
                    return false;
                }

                // 2. Shopify APIでトークンの有効性を確認
                var isValid = await ValidateAccessTokenWithShopifyAsync(shopDomain, accessToken);
                
                if (!isValid)
                {
                    _logger.LogWarning("Invalid access token for store: {ShopDomain}", shopDomain);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating store access for {ShopDomain}", shopDomain);
                return false;
            }
        }

        /// <summary>
        /// ストアが登録されているか確認
        /// </summary>
        public async Task<bool> IsStoreRegisteredAsync(string shopDomain)
        {
            var exists = await _context.Stores
                .AnyAsync(s => s.Domain == shopDomain && s.IsActive);

            if (!exists)
            {
                _logger.LogWarning("Access attempt from unregistered store: {ShopDomain}", shopDomain);
            }

            return exists;
        }

        /// <summary>
        /// API Keyの検証
        /// </summary>
        public async Task<bool> ValidateApiKeyAsync(int storeId, string apiKey)
        {
            if (string.IsNullOrEmpty(apiKey))
            {
                return false;
            }

            // ストア固有のAPIキーを検証
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null)
            {
                return false;
            }

            // TODO: 実際のAPIキー検証ロジックを実装
            // 現在は仮実装として、環境変数の共通キーと比較
            var validApiKey = Environment.GetEnvironmentVariable("SHOPIFY_API_KEY");
            return apiKey == validApiKey;
        }

        /// <summary>
        /// Shopify APIを使用してアクセストークンの有効性を検証
        /// </summary>
        private async Task<bool> ValidateAccessTokenWithShopifyAsync(string shopDomain, string accessToken)
        {
            try
            {
                // Shopify APIのショップ情報エンドポイントを使用してトークンを検証
                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Add("X-Shopify-Access-Token", accessToken);
                
                var shopUrl = $"https://{shopDomain}/admin/api/2024-01/shop.json";
                var response = await httpClient.GetAsync(shopUrl);
                
                // ステータスコード200の場合はトークンが有効
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogDebug("Access token validated successfully for store: {ShopDomain}", shopDomain);
                    return true;
                }
                
                _logger.LogWarning("Access token validation failed for store: {ShopDomain}, Status: {StatusCode}", 
                    shopDomain, response.StatusCode);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating access token with Shopify API for store: {ShopDomain}", shopDomain);
                return false;
            }
        }
    }
}