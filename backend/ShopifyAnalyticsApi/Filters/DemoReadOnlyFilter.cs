using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Attributes;
using System.Linq;

namespace ShopifyAnalyticsApi.Filters
{
    /// <summary>
    /// 読み取り専用ポリシーを強制するグローバルフィルター
    /// 
    /// 機能:
    /// - read_only: true の場合、すべての変更操作（POST/PUT/PATCH/DELETE）をデフォルトでブロック
    /// - [AllowDemoWrite]属性が付与されたエンドポイントのみ例外的に許可
    /// - すべてのブロック試行をログに記録
    /// 
    /// 設計原則:
    /// - auth_mode ではなく read_only クレームで判定（Level 2: Demo / Level 1: Developer の区別）
    /// - Level 3 (OAuth): read_only: false → 全機能
    /// - Level 2 (Demo): read_only: true → 読み取り専用
    /// - Level 1 (Developer): read_only: false → 全機能+開発ツール
    /// 
    /// セキュリティ設計:
    /// - ホワイトリスト方式: デフォルトでブロック、明示的に許可する
    /// - 付け忘れのリスクを排除: グローバル適用により全エンドポイントをカバー
    /// </summary>
    public class DemoReadOnlyFilter : IActionFilter
    {
        private readonly ILogger<DemoReadOnlyFilter> _logger;

        public DemoReadOnlyFilter(ILogger<DemoReadOnlyFilter> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// アクション実行前に読み取り専用モードの書き込み制限をチェック
        /// </summary>
        public void OnActionExecuting(ActionExecutingContext context)
        {
            // read_onlyクレームを取得して判定（auth_modeではなく）
            var readOnlyClaim = context.HttpContext.User.FindFirst("read_only");
            var isReadOnly = readOnlyClaim?.Value == "true";

            // 読み取り専用モードの場合のみチェック
            if (isReadOnly)
            {
                var httpMethod = context.HttpContext.Request.Method;

                // 変更操作（POST/PUT/PATCH/DELETE）をチェック
                if (IsWriteOperation(httpMethod))
                {
                    // [AllowDemoWrite]属性の有無を確認
                    var allowDemoWrite = context.ActionDescriptor.EndpointMetadata
                        .OfType<AllowDemoWriteAttribute>()
                        .FirstOrDefault();

                    if (allowDemoWrite == null)
                    {
                        // 読み取り専用モードでの書き込み試行をブロック
                        var authMode = context.HttpContext.User.FindFirst("auth_mode")?.Value ?? "unknown";
                        
                        _logger.LogWarning(
                            "Read-only mode write operation blocked. " +
                            "Method: {Method}, Path: {Path}, AuthMode: {AuthMode}, ReadOnly: true",
                            httpMethod,
                            context.HttpContext.Request.Path,
                            authMode);

                        // 403 Forbiddenレスポンスを返す
                        context.Result = new JsonResult(new
                        {
                            error = "Forbidden",
                            message = "Write operations are not allowed in read-only mode. This is a demonstration environment.",
                            suggestion = "Please sign up for a full account to enable write operations."
                        })
                        {
                            StatusCode = 403
                        };

                        return;
                    }
                    else
                    {
                        // [AllowDemoWrite]属性が付与されている場合は警告ログのみ
                        _logger.LogInformation(
                            "Read-only mode write operation explicitly allowed. " +
                            "Method: {Method}, Path: {Path}, Reason: {Reason}",
                            httpMethod,
                            context.HttpContext.Request.Path,
                            allowDemoWrite.Reason ?? "Not specified");
                    }
                }
            }
        }

        /// <summary>
        /// アクション実行後の処理（現在は何もしない）
        /// </summary>
        public void OnActionExecuted(ActionExecutedContext context)
        {
            // 必要に応じて実装
        }

        /// <summary>
        /// HTTPメソッドが書き込み操作かどうかを判定
        /// </summary>
        /// <param name="httpMethod">HTTPメソッド（GET, POST, PUT, PATCH, DELETEなど）</param>
        /// <returns>書き込み操作の場合true</returns>
        private static bool IsWriteOperation(string httpMethod)
        {
            return httpMethod == "POST" ||
                   httpMethod == "PUT" ||
                   httpMethod == "PATCH" ||
                   httpMethod == "DELETE";
        }
    }
}

