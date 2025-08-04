using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using DatabaseFunction.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    // 🔧 ASP.NET Core Integrationに必要な追加設定
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        
        // Database service
        services.AddSingleton<IDatabaseService, DatabaseService>();
        
        // HttpClient for external APIs
        services.AddHttpClient();
    })
    .ConfigureLogging((context, logging) =>
    {
        // Configure Application Insights logging
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