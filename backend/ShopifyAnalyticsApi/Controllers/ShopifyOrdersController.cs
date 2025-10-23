using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Controllers
{
	[ApiController]
	[Route("api/shopify/orders")]
	public class ShopifyOrdersController : StoreAwareControllerBase
	{
		private readonly ShopifyDbContext _dbContext;
		private readonly ILogger<ShopifyOrdersController> _logger;

		public ShopifyOrdersController(ShopifyDbContext dbContext, ILogger<ShopifyOrdersController> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
		}

		/// <summary>
		/// ストア配下の注文一覧を取得します（ページング対応）
		/// GET: /api/shopify/orders
		/// </summary>
		[HttpGet]
		public async Task<ActionResult<ApiResponse<object>>> GetOrders(
			[FromQuery] int page = 1,
			[FromQuery] int pageSize = 50,
			[FromQuery] string? orderNumber = null)
		{
			if (page <= 0) page = 1;
			if (pageSize <= 0 || pageSize > 200) pageSize = 50;

			try
			{
				var q = _dbContext.Orders
					.Where(o => o.StoreId == StoreId);

				if (!string.IsNullOrWhiteSpace(orderNumber))
				{
					var like = $"%{orderNumber.Trim()}%";
					q = q.Where(o => EF.Functions.Like(o.OrderNumber, like));
				}

				var totalCount = await q.CountAsync();

				var items = await q
					.OrderByDescending(o => o.CreatedAt)
					.Skip((page - 1) * pageSize)
					.Take(pageSize)
					.Join(_dbContext.Customers,
						o => o.CustomerId,
						c => c.Id,
						(o, c) => new
						{
							o.Id,
							o.OrderNumber,
							CustomerName = c.DisplayName,
							o.TotalPrice,
							o.Status,
							o.CreatedAt
						})
					.ToListAsync();

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
					Message = "注文一覧を取得しました"
				});
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "GetOrders error. StoreId={StoreId}", StoreId);
				return StatusCode(500, new ApiResponse<object>
				{
					Success = false,
					Message = "注文一覧の取得中にエラーが発生しました"
				});
			}
		}
	}
}
