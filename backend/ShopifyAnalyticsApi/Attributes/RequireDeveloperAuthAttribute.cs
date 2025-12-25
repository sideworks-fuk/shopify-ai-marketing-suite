using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;

namespace ShopifyAnalyticsApi.Attributes
{
    /// <summary>
    /// 開発者認証を必須にする属性
    /// 開発環境では自動的に許可、本番環境では開発者認証（can_access_dev_tools クレーム）が必要
    /// </summary>
    public class RequireDeveloperAuthAttribute : Attribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var env = context.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
            
            // 開発環境では自動的に許可
            if (env.IsDevelopment())
            {
                return;
            }

            // 本番環境では開発者認証が必要
            var user = context.HttpContext.User;
            var hasDevToolsClaim = user.HasClaim("can_access_dev_tools", "true");
            
            if (!hasDevToolsClaim)
            {
                context.Result = new UnauthorizedObjectResult(new
                {
                    error = "Unauthorized",
                    message = "Developer authentication required for this endpoint. Please login via /api/developer/login"
                });
            }
        }
    }
}



