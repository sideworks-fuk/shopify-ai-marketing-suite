using System.Reflection;
using System.Runtime.InteropServices;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// アプリケーションのバージョン情報を提供するサービス
    /// </summary>
    public class VersionInfoService
    {
        private readonly ILogger<VersionInfoService> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public VersionInfoService(
            ILogger<VersionInfoService> logger,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _logger = logger;
            _environment = environment;
            _configuration = configuration;
        }

        /// <summary>
        /// アプリケーションのバージョン情報を取得
        /// </summary>
        public VersionInfo GetVersionInfo()
        {
            var assembly = Assembly.GetExecutingAssembly();
            var assemblyName = assembly.GetName();
            
            // アセンブリバージョン
            var version = assemblyName.Version ?? new Version(1, 0, 0, 0);
            
            // ファイルバージョン（AssemblyInformationalVersion属性から取得）
            var informationalVersion = assembly
                .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
                ?? version.ToString();

            // ビルド日時（アセンブリの最終更新日時から推定）
            var buildDate = GetBuildDate(assembly);
            
            // デプロイ日時（実行ファイルの更新日時）
            var deployDate = GetDeployDate();

            return new VersionInfo
            {
                ApplicationName = assemblyName.Name ?? "ShopifyAnalyticsApi",
                Version = version.ToString(),
                InformationalVersion = informationalVersion,
                BuildDate = buildDate,
                DeployDate = deployDate,
                Environment = _environment.EnvironmentName,
                IsDevelopment = _environment.IsDevelopment(),
                IsProduction = _environment.IsProduction(),
                MachineName = Environment.MachineName,
                OSVersion = RuntimeInformation.OSDescription,
                FrameworkVersion = RuntimeInformation.FrameworkDescription,
                ProcessId = Environment.ProcessId,
                WorkingSet = Environment.WorkingSet,
                ServerTime = DateTime.UtcNow,
                ServerTimeLocal = DateTime.Now
            };
        }

        /// <summary>
        /// ビルド日時を取得（アセンブリのタイムスタンプから推定）
        /// </summary>
        private DateTime? GetBuildDate(Assembly assembly)
        {
            try
            {
                var location = assembly.Location;
                if (string.IsNullOrEmpty(location))
                    return null;

                var fileInfo = new FileInfo(location);
                return fileInfo.LastWriteTimeUtc;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get build date");
                return null;
            }
        }

        /// <summary>
        /// デプロイ日時を取得（実行ファイルの更新日時）
        /// </summary>
        private DateTime? GetDeployDate()
        {
            try
            {
                var entryAssembly = Assembly.GetEntryAssembly();
                if (entryAssembly == null)
                    return null;

                var location = entryAssembly.Location;
                if (string.IsNullOrEmpty(location))
                    return null;

                var fileInfo = new FileInfo(location);
                return fileInfo.LastWriteTimeUtc;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get deploy date");
                return null;
            }
        }
    }

    /// <summary>
    /// バージョン情報モデル
    /// </summary>
    public class VersionInfo
    {
        public string ApplicationName { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string InformationalVersion { get; set; } = string.Empty;
        public DateTime? BuildDate { get; set; }
        public DateTime? DeployDate { get; set; }
        public string Environment { get; set; } = string.Empty;
        public bool IsDevelopment { get; set; }
        public bool IsProduction { get; set; }
        public string MachineName { get; set; } = string.Empty;
        public string OSVersion { get; set; } = string.Empty;
        public string FrameworkVersion { get; set; } = string.Empty;
        public int ProcessId { get; set; }
        public long WorkingSet { get; set; }
        public DateTime ServerTime { get; set; }
        public DateTime ServerTimeLocal { get; set; }
    }
}
