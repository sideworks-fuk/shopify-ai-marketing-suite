# Azure Functions プロジェクト作成手順書

## 1. 前提条件

### 1.1 必要なツール
- **.NET 8 SDK** - [ダウンロード](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Azure Functions Core Tools v4** - コマンドライン開発ツール
- **Visual Studio 2022** または **Visual Studio Code**
- **Azure CLI** - Azureリソース管理用
- **Git** - ソース管理用

### 1.2 Azure Functions Core Tools インストール
```bash
# Windows (管理者権限で実行)
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# macOS
brew tap azure/functions
brew install azure-functions-core-tools@4

# Ubuntu/Debian
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4
```

### 1.3 Azure CLI インストール
```bash
# Windows
winget install Microsoft.AzureCLI

# macOS
brew install azure-cli

# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

## 2. プロジェクト作成

### 2.1 作業ディレクトリの準備
```bash
# プロジェクトルートに移動
cd /path/to/shopify-ai-marketing-suite/backend

# Azure Functionsプロジェクト用ディレクトリ作成
mkdir ShopifyBatchProcessor
cd ShopifyBatchProcessor
```

### 2.2 Azure Functionsプロジェクトの初期化
```bash
# .NET 8 Isolated Process モデルでプロジェクト作成
func init . --dotnet-isolated --target-framework net8.0

# 初期のFunctionテンプレートは削除（カスタム実装するため）
rm Function1.cs
```

### 2.3 プロジェクトファイルの更新
```bash
# ShopifyBatchProcessor.csproj を以下の内容に置き換え
```

**ShopifyBatchProcessor.csproj**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
    <OutputType>Exe</OutputType>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.21.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.16.4" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Timer" Version="4.3.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.1.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.7" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="8.0.0" />
    <PackageReference Include="Microsoft.ApplicationInsights.WorkerService" Version="2.22.0" />
    <PackageReference Include="Azure.Security.KeyVault.Secrets" Version="4.5.0" />
    <PackageReference Include="Azure.Identity" Version="1.10.4" />
    <PackageReference Include="Serilog.Extensions.Hosting" Version="8.0.0" />
    <PackageReference Include="Serilog.Sinks.ApplicationInsights" Version="4.0.0" />
    <PackageReference Include="Serilog.Sinks.Console" Version="5.0.1" />
    <PackageReference Include="System.Text.Json" Version="8.0.0" />
    <PackageReference Include="Polly" Version="8.2.0" />
  </ItemGroup>
  
  <ItemGroup>
    <ProjectReference Include="../ShopifyTestApi/ShopifyTestApi.csproj" />
  </ItemGroup>
  
  <ItemGroup>
    <None Update="host.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="local.settings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>
</Project>
```

### 2.4 NuGet パッケージの復元
```bash
dotnet restore
```

## 3. プロジェクト構造の作成

### 3.1 フォルダ構造の作成
```bash
# フォルダ構造を作成
mkdir -p Functions
mkdir -p Services/Interfaces
mkdir -p Models/Shopify
mkdir -p Models/Api
mkdir -p Models/Configuration
mkdir -p Extensions
mkdir -p Utilities
mkdir -p Middleware
```

### 3.2 設定ファイルの作成

**host.json**
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    },
    "logLevel": {
      "default": "Information",
      "ShopifyBatchProcessor": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  },
  "functionTimeout": "00:10:00",
  "retry": {
    "strategy": "exponentialBackoff",
    "maxRetryCount": 3,
    "minimumInterval": "00:00:02",
    "maximumInterval": "00:00:30"
  },
  "healthMonitor": {
    "enabled": true,
    "healthCheckInterval": "00:00:30",
    "healthCheckWindow": "00:02:00",
    "healthCheckThreshold": 6,
    "counterThreshold": 0.80
  }
}
```

**local.settings.json**
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "ConnectionStrings:DefaultConnection": "Server=localhost;Database=ShopifyAI;Integrated Security=true;TrustServerCertificate=true;",
    "Shopify:ShopDomain": "your-shop-name.myshopify.com",
    "Shopify:AccessToken": "your-access-token-here",
    "Shopify:ApiVersion": "2023-10",
    "Shopify:RateLimit:RequestsPerSecond": "2",
    "Shopify:RateLimit:BurstSize": "10",
    "ApplicationInsights:ConnectionString": "your-app-insights-connection-string",
    "KeyVault:VaultUrl": "https://your-keyvault.vault.azure.net/",
    "Sync:BatchSize": "250",
    "Sync:MaxConcurrentBatches": "2",
    "Sync:EnableIncrementalSync": "true",
    "Sync:CustomerSyncSchedule": "0 0 */2 * * *",
    "Sync:ProductSyncSchedule": "0 30 */4 * * *",
    "Sync:OrderSyncSchedule": "0 15 */1 * * *"
  }
}
```

## 4. 基本クラスの実装

### 4.1 設定クラスの作成

**Models/Configuration/ShopifySettings.cs**
```csharp
namespace ShopifyBatchProcessor.Models.Configuration;

public class ShopifySettings
{
    public string ShopDomain { get; set; } = "";
    public string AccessToken { get; set; } = "";
    public string ApiVersion { get; set; } = "2023-10";
    public RateLimitSettings RateLimit { get; set; } = new();
}

public class RateLimitSettings
{
    public int RequestsPerSecond { get; set; } = 2;
    public int BurstSize { get; set; } = 10;
    public int RetryMaxAttempts { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 2;
}
```

**Models/Configuration/SyncSettings.cs**
```csharp
namespace ShopifyBatchProcessor.Models.Configuration;

public class SyncSettings
{
    public int BatchSize { get; set; } = 250;
    public int MaxConcurrentBatches { get; set; } = 2;
    public bool EnableIncrementalSync { get; set; } = true;
    public string CustomerSyncSchedule { get; set; } = "0 0 */2 * * *";
    public string ProductSyncSchedule { get; set; } = "0 30 */4 * * *";
    public string OrderSyncSchedule { get; set; } = "0 15 */1 * * *";
}
```

### 4.2 APIレスポンスモデル

**Models/Api/ShopifyApiResponse.cs**
```csharp
namespace ShopifyBatchProcessor.Models.Api;

public class ShopifyApiResponse<T>
{
    public T Data { get; set; } = default!;
    public string? PageInfo { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public int? RateLimitRemaining { get; set; }
    public DateTime RequestTime { get; set; } = DateTime.UtcNow;
}

public class SyncResult
{
    public string EntityType { get; set; }
    public int StoreId { get; set; }
    public bool IsSuccess { get; set; }
    public int ProcessedCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public TimeSpan? Duration => EndTime?.Subtract(StartTime);
    
    public SyncResult(string entityType, int storeId = 0)
    {
        EntityType = entityType;
        StoreId = storeId;
        StartTime = DateTime.UtcNow;
    }
    
    public void AddProcessed(int count) => ProcessedCount += count;
    
    public void AddError(string error)
    {
        Errors.Add(error);
        ErrorCount++;
    }
    
    public void MarkAsCompleted()
    {
        EndTime = DateTime.UtcNow;
        IsSuccess = ErrorCount == 0;
    }
}
```

### 4.3 Shopify データモデル

**Models/Shopify/ShopifyCustomer.cs**
```csharp
using System.Text.Json.Serialization;

namespace ShopifyBatchProcessor.Models.Shopify;

public class ShopifyCustomer
{
    [JsonPropertyName("id")]
    public long Id { get; set; }
    
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
    
    [JsonPropertyName("accepts_marketing")]
    public bool AcceptsEmailMarketing { get; set; }
    
    [JsonPropertyName("accepts_marketing_sms")]
    public bool AcceptsSmsMarketing { get; set; }
    
    [JsonPropertyName("total_spent")]
    public decimal? TotalSpent { get; set; }
    
    [JsonPropertyName("orders_count")]
    public int? OrdersCount { get; set; }
    
    [JsonPropertyName("tags")]
    public string? Tags { get; set; }
    
    [JsonPropertyName("default_address")]
    public ShopifyAddress? DefaultAddress { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

public class ShopifyAddress
{
    [JsonPropertyName("company")]
    public string? Company { get; set; }
    
    [JsonPropertyName("city")]
    public string? City { get; set; }
    
    [JsonPropertyName("province_code")]
    public string? ProvinceCode { get; set; }
    
    [JsonPropertyName("country_code")]
    public string? CountryCode { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
}

public class ShopifyCustomersResponse
{
    [JsonPropertyName("customers")]
    public List<ShopifyCustomer> Customers { get; set; } = new();
}
```

### 4.4 Program.cs の実装
```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using ShopifyBatchProcessor.Models.Configuration;
using ShopifyTestApi.Data;
using Serilog;
using Azure.Identity;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration((context, config) =>
    {
        // Key Vault設定（本番環境）
        if (!context.HostingEnvironment.IsDevelopment())
        {
            var keyVaultUrl = Environment.GetEnvironmentVariable("KeyVault:VaultUrl");
            if (!string.IsNullOrEmpty(keyVaultUrl))
            {
                config.AddAzureKeyVault(
                    new Uri(keyVaultUrl),
                    new DefaultAzureCredential());
            }
        }
    })
    .ConfigureServices((context, services) =>
    {
        var configuration = context.Configuration;
        
        // 設定の登録
        services.Configure<ShopifySettings>(
            configuration.GetSection("Shopify"));
        services.Configure<SyncSettings>(
            configuration.GetSection("Sync"));
        
        // データベース設定
        services.AddDbContext<ShopifyDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.CommandTimeout(300);
                sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorNumbersToAdd: null);
            });
        });
        
        // Application Insights
        services.AddApplicationInsightsTelemetryWorkerService(options =>
        {
            options.ConnectionString = configuration["ApplicationInsights:ConnectionString"];
        });
        
        // Serilog設定
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .Enrich.WithProperty("Service", "ShopifyBatchProcessor")
            .CreateLogger();
        
        services.AddLogging(loggingBuilder =>
            loggingBuilder.AddSerilog(dispose: true));
    })
    .UseSerilog()
    .Build();

await host.RunAsync();
```

## 5. ローカル開発環境のセットアップ

### 5.1 Azure Storage Emulator の起動
```bash
# Windows - Azure Storage Emulator
"C:\Program Files (x86)\Microsoft SDKs\Azure\Storage Emulator\AzureStorageEmulator.exe" start

# または Azurite (クロスプラットフォーム)
npm install -g azurite
azurite --silent --location c:\azurite --debug c:\azurite\debug.log
```

### 5.2 データベース接続の確認
```bash
# 既存のShopifyTestApiプロジェクトでデータベースが正常に動作することを確認
cd ../ShopifyTestApi
dotnet ef database update
```

### 5.3 Shopify APIキーの設定
1. **Shopify パートナーアカウント**で開発ストアを作成
2. **プライベートアプリ**を作成してAPIキーを取得
3. **local.settings.json**に以下の権限で設定:
   - `read_customers`
   - `read_products`
   - `read_orders`

### 5.4 プロジェクトのビルドと実行
```bash
# プロジェクトのビルド
dotnet build

# ローカル実行
func start --dotnet-isolated-debug
```

## 6. 最初のFunctionの作成

### 6.1 テスト用のHTTP Function作成
**Functions/HealthCheckFunction.cs**
```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ShopifyBatchProcessor.Functions;

public class HealthCheckFunction
{
    private readonly ILogger<HealthCheckFunction> _logger;

    public HealthCheckFunction(ILogger<HealthCheckFunction> logger)
    {
        _logger = logger;
    }

    [Function("HealthCheck")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        _logger.LogInformation("ヘルスチェック要求を受信しました");

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new
        {
            Status = "Healthy",
            Timestamp = DateTime.UtcNow,
            Service = "ShopifyBatchProcessor"
        });

        return response;
    }
}
```

### 6.2 テスト実行
```bash
# Functions実行
func start

# 別ターミナルでテスト
curl http://localhost:7071/api/HealthCheck
```

## 7. 開発環境の確認

### 7.1 チェックリスト
- [ ] .NET 8 SDK がインストールされている
- [ ] Azure Functions Core Tools v4 がインストールされている
- [ ] プロジェクトが正常にビルドできる
- [ ] ローカルでFunctionsが起動する
- [ ] ヘルスチェックエンドポイントが応答する
- [ ] データベース接続が正常に動作する
- [ ] Application Insights の設定が完了している

### 7.2 トラブルシューティング

**一般的な問題と解決方法:**

1. **ビルドエラー**
   ```bash
   # NuGetパッケージのクリアと復元
   dotnet clean
   dotnet restore
   dotnet build
   ```

2. **Functions起動エラー**
   ```bash
   # Core Toolsのバージョン確認
   func --version
   
   # 最新版への更新
   npm update -g azure-functions-core-tools@4
   ```

3. **データベース接続エラー**
   ```bash
   # 接続文字列の確認
   # local.settings.json の ConnectionStrings:DefaultConnection を確認
   ```

4. **Storage Emulator エラー**
   ```bash
   # Azuriteの使用を推奨
   npx azurite-blob --location c:\azurite\blob
   ```

## 8. 次のステップ

プロジェクトが正常にセットアップできたら、次の手順に進みます：

1. **Shopify APIクライアントの実装**
2. **データ同期サービスの実装** 
3. **Timer Trigger Functionsの実装**
4. **エラーハンドリングとログの実装**
5. **単体テストの作成**
6. **Azureへのデプロイ準備**

これで基本的な Azure Functions プロジェクトの作成が完了しました。次にデプロイ手順書を作成します。