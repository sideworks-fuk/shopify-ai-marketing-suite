using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    // 🔧 HTTP機能が不要なので ConfigureFunctionsWebApplication() は削除
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        
        // HttpClient for Shopify API calls
        services.AddHttpClient("ShopifyClient", client =>
        {
            client.DefaultRequestHeaders.Add("User-Agent", "ShopifyAzureFunctionsSample/1.0");
            client.Timeout = TimeSpan.FromSeconds(30);
        });
    })
    .ConfigureLogging((context, logging) =>
    {
        // The Application Insights SDK adds a default logging filter that instructs ILogger to capture only Warning and more severe logs.
        // The following configures LogLevel Information or above to be sent to Application Insights for all categories.
        logging.Services.Configure<LoggerFilterOptions>(options =>
        {
            LoggerFilterRule defaultRule = options.Rules.FirstOrDefault(rule => rule.ProviderName
                == "Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider");
            if (defaultRule is not null)
            {
                options.Rules.Remove(defaultRule);
            }
        });
    })
    .Build();

host.Run();