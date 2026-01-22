using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Filters;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 管理者向け管理サイトコントローラー
    /// バージョン情報、デプロイ状況、システム情報を提供
    /// </summary>
    [ApiController]
    [Route("admin")]
    public class AdminController : ControllerBase
    {
        private readonly VersionInfoService _versionInfoService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminController> _logger;
        private readonly ShopifyDbContext _context;

        public AdminController(
            VersionInfoService versionInfoService,
            IConfiguration configuration,
            ILogger<AdminController> logger,
            ShopifyDbContext context)
        {
            _versionInfoService = versionInfoService;
            _configuration = configuration;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// 管理者向けホームページ（HTML）
        /// GET: /admin
        /// </summary>
        [HttpGet]
        public IActionResult Index()
        {
            // Basic認証はAdminBasicAuthMiddlewareで処理される
            // セッションCookieが設定されていれば、ここに到達できる
            var versionInfo = _versionInfoService.GetVersionInfo();
            var html = GenerateAdminHtml(versionInfo);
            return Content(html, "text/html; charset=utf-8");
        }

        /// <summary>
        /// バージョン情報をJSON形式で取得
        /// GET: /admin/info
        /// </summary>
        [HttpGet("info")]
        public IActionResult GetInfo()
        {
            // Basic認証はAdminBasicAuthMiddlewareで処理される
            // セッションCookieが設定されていれば、ここに到達できる
            var versionInfo = _versionInfoService.GetVersionInfo();
            
            // 追加情報
            var additionalInfo = new
            {
                versionInfo,
                database = new
                {
                    canConnect = _context.Database.CanConnect(),
                    connectionString = MaskConnectionString(_configuration.GetConnectionString("DefaultConnection"))
                },
                hangfireUrl = "/hangfire",
                healthCheckUrl = "/health"
            };

            return Ok(additionalInfo);
        }

        /// <summary>
        /// 接続文字列をマスク（セキュリティ対策）
        /// </summary>
        private string? MaskConnectionString(string? connectionString)
        {
            if (string.IsNullOrEmpty(connectionString))
                return null;

            try
            {
                // Password= や Pwd= の値をマスク
                var masked = System.Text.RegularExpressions.Regex.Replace(
                    connectionString,
                    @"(Password|Pwd)=[^;]+",
                    "$1=***",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                return masked;
            }
            catch
            {
                return "***";
            }
        }

        /// <summary>
        /// 管理者向けHTMLページを生成
        /// </summary>
        private string GenerateAdminHtml(VersionInfo versionInfo)
        {
            // JSTタイムゾーンを取得（Windows/Linux対応）
            TimeZoneInfo? jstTimeZone = null;
            try
            {
                // Windows環境
                jstTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Tokyo Standard Time");
            }
            catch
            {
                try
                {
                    // Linux環境
                    jstTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Tokyo");
                }
                catch
                {
                    // フォールバック: UTC+9時間を手動で計算
                    jstTimeZone = TimeZoneInfo.CreateCustomTimeZone("JST", TimeSpan.FromHours(9), "Japan Standard Time", "Japan Standard Time");
                }
            }
            
            // UTC時刻をJSTに変換
            var buildDateJst = versionInfo.BuildDate.HasValue
                ? TimeZoneInfo.ConvertTimeFromUtc(versionInfo.BuildDate.Value, jstTimeZone)
                : (DateTime?)null;
            var deployDateJst = versionInfo.DeployDate.HasValue
                ? TimeZoneInfo.ConvertTimeFromUtc(versionInfo.DeployDate.Value, jstTimeZone)
                : (DateTime?)null;
            var serverTimeJst = TimeZoneInfo.ConvertTimeFromUtc(versionInfo.ServerTime, jstTimeZone);
            
            var buildDateStr = buildDateJst?.ToString("yyyy-MM-dd HH:mm:ss (JST)") ?? "不明";
            var deployDateStr = deployDateJst?.ToString("yyyy-MM-dd HH:mm:ss (JST)") ?? "不明";
            var serverTimeStr = serverTimeJst.ToString("yyyy-MM-dd HH:mm:ss (JST)");

            var workingSetMB = versionInfo.WorkingSet / 1024.0 / 1024.0;

            return $@"<!DOCTYPE html>
<html lang=""ja"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>EC Ranger - 管理者ダッシュボード</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header h1 {{
            color: #333;
            margin-bottom: 10px;
        }}
        .header p {{
            color: #666;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        .card {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .card h2 {{
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.2em;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }}
        .info-row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }}
        .info-row:last-child {{
            border-bottom: none;
        }}
        .info-label {{
            font-weight: 600;
            color: #555;
        }}
        .info-value {{
            color: #333;
            text-align: right;
        }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }}
        .status-production {{
            background: #10b981;
            color: white;
        }}
        .status-development {{
            background: #f59e0b;
            color: white;
        }}
        .links {{
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 20px;
        }}
        .btn {{
            display: inline-block;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
        }}
        .btn:hover {{
            background: #5568d3;
        }}
        .btn-secondary {{
            background: #6b7280;
        }}
        .btn-secondary:hover {{
            background: #4b5563;
        }}
        .footer {{
            text-align: center;
            color: white;
            margin-top: 20px;
            opacity: 0.8;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🚀 EC Ranger - 管理者ダッシュボード</h1>
            <p>バックエンドAPIのバージョン情報とシステム状態を確認できます</p>
        </div>

        <div class=""grid"">
            <div class=""card"">
                <h2>📦 アプリケーション情報</h2>
                <div class=""info-row"">
                    <span class=""info-label"">アプリケーション名</span>
                    <span class=""info-value"">{versionInfo.ApplicationName}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">バージョン</span>
                    <span class=""info-value"">{versionInfo.Version}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">詳細バージョン</span>
                    <span class=""info-value"">{versionInfo.InformationalVersion}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">環境</span>
                    <span class=""info-value"">
                        <span class=""status-badge {(versionInfo.IsProduction ? "status-production" : "status-development")}"">
                            {versionInfo.Environment}
                        </span>
                    </span>
                </div>
            </div>

            <div class=""card"">
                <h2>📅 デプロイ情報</h2>
                <div class=""info-row"">
                    <span class=""info-label"">ビルド日時</span>
                    <span class=""info-value"">{buildDateStr}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">デプロイ日時</span>
                    <span class=""info-value"">{deployDateStr}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">サーバー時刻</span>
                    <span class=""info-value"">{serverTimeStr}</span>
                </div>
            </div>

            <div class=""card"">
                <h2>💻 システム情報</h2>
                <div class=""info-row"">
                    <span class=""info-label"">マシン名</span>
                    <span class=""info-value"">{versionInfo.MachineName}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">OS</span>
                    <span class=""info-value"">{versionInfo.OSVersion}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">.NET フレームワーク</span>
                    <span class=""info-value"">{versionInfo.FrameworkVersion}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">プロセスID</span>
                    <span class=""info-value"">{versionInfo.ProcessId}</span>
                </div>
                <div class=""info-row"">
                    <span class=""info-label"">メモリ使用量</span>
                    <span class=""info-value"">{workingSetMB:F2} MB</span>
                </div>
            </div>
        </div>

        <div class=""card"">
            <h2>🔗 管理リンク</h2>
            <div class=""links"">
                <a href=""/hangfire"" target=""_blank"" rel=""noopener noreferrer"" class=""btn"">HangFire ダッシュボード</a>
                <a href=""/health"" target=""_blank"" rel=""noopener noreferrer"" class=""btn btn-secondary"">ヘルスチェック</a>
                <a href=""/admin/info"" target=""_blank"" rel=""noopener noreferrer"" class=""btn btn-secondary"">JSON形式で取得</a>
                <a href=""/swagger"" target=""_blank"" rel=""noopener noreferrer"" class=""btn btn-secondary"">Swagger UI</a>
            </div>
        </div>

        <div class=""footer"">
            <p>EC Ranger Backend API - {DateTime.Now.Year}</p>
        </div>
    </div>
</body>
</html>";
        }
    }
}
