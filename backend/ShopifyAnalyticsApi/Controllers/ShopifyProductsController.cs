using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Controllers
{
	[ApiController]
	[Route("api/shopify/products")]
	public class ShopifyProductsController : StoreAwareControllerBase
	{
		private readonly ShopifyDbContext _dbContext;
		private readonly ILogger<ShopifyProductsController> _logger;

		public ShopifyProductsController(ShopifyDbContext dbContext, ILogger<ShopifyProductsController> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
		}

		/// <summary>
		/// ストア配下の商品一覧を取得します（ページング対応）
		/// GET: /api/shopify/products
		/// </summary>
		[HttpGet]
		public async Task<ActionResult<ApiResponse<object>>> GetProducts(
			[FromQuery] int page = 1,
			[FromQuery] int pageSize = 50,
			[FromQuery] string? query = null)
		{
			if (page <= 0) page = 1;
			if (pageSize <= 0 || pageSize > 200) pageSize = 50;

			var log = GetStoreContextForLogging();
			log["Action"] = nameof(GetProducts);

			try
			{
				var q = _dbContext.Products
					.Where(p => p.StoreId == StoreId);

				if (!string.IsNullOrWhiteSpace(query))
				{
					var like = $"%{query.Trim()}%";
					q = q.Where(p => EF.Functions.Like(p.Title, like) || EF.Functions.Like(p.ProductType!, like) || EF.Functions.Like(p.Vendor!, like));
				}

				var totalCount = await q.CountAsync();
				var items = await q
					.OrderBy(p => p.Id)
					.Skip((page - 1) * pageSize)
					.Take(pageSize)
					.Select(p => new
					{
						p.Id,
						p.Title,
						p.ProductType,
						p.Vendor,
						p.InventoryQuantity,
						p.CreatedAt,
						p.UpdatedAt
					})
					.ToListAsync();

				_logger.LogInformation("GetProducts success. StoreId={StoreId}, Page={Page}, PageSize={PageSize}, Count={Count}", StoreId, page, pageSize, items.Count);

				return Ok(new ApiResponse<object>
				{
					Success = true,
					Data = new
					{
						Items = items,
						Pagination = new PaginationInfo
						{
							CurrentPage = page,
							PageSize = pageSize,
							TotalCount = totalCount
						}
					},
					Message = "商品一覧を取得しました"
				});
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "GetProducts error. StoreId={StoreId}", StoreId);
				return StatusCode(500, new ApiResponse<object>
				{
					Success = false,
					Message = "商品一覧の取得中にエラーが発生しました"
				});
			}
		}
	}
}
