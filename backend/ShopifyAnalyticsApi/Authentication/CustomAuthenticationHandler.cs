using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace ShopifyAnalyticsApi.Authentication
{
    /// <summary>
    /// カスタム認証ハンドラー
    /// AuthModeMiddlewareが認証を処理済みの場合、その結果を返す
    /// </summary>
    public class CustomAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public CustomAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock)
            : base(options, logger, encoder, clock)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // AuthModeMiddlewareが既に認証を処理済みかチェック
            if (Context.User?.Identity?.IsAuthenticated == true)
            {
                // 認証済みの場合は成功を返す
                var ticket = new AuthenticationTicket(Context.User, Scheme.Name);
                return Task.FromResult(AuthenticateResult.Success(ticket));
            }

            // 認証されていない場合はNoResultを返す
            // AuthModeMiddlewareが適切に処理する
            return Task.FromResult(AuthenticateResult.NoResult());
        }
    }
}