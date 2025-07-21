using ShopifyTestApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Mock Data Service
builder.Services.AddScoped<IMockDataService, MockDataService>();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000",  // Next.js dev server
            "http://localhost:3001",  // Next.js dev server (alternative)
            "http://localhost:4200",  // Angular dev server
            "https://localhost:3000", // HTTPS localhost
            "https://brave-sea-038f17a01.azurestaticapps.net",  // Azure Static Web Apps
            "https://brave-sea-038f17a00.azurestaticapps.net",  // Azure Static Web Apps (alternative)
            "https://brave-sea-038f17a00.1.azurestaticapps.net",  // Azure Static Web Apps (実際のURL)
            "https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net",  // Backend API
            "https://localhost:7177",  // HTTPS dev
            "http://localhost:5177"   // HTTP dev
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
    
    // 開発環境用の許可度の高いポリシー
    options.AddPolicy("DevelopmentPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// Use CORS - 一時的に緩い設定を使用（デバッグ用）
app.UseCors("DevelopmentPolicy");

// TODO: 本番環境では厳密な設定に戻す
// if (app.Environment.IsDevelopment())
// {
//     app.UseCors("DevelopmentPolicy");
// }
// else
// {
//     app.UseCors("AllowFrontend");
// }

app.UseAuthorization();

app.MapControllers();

app.Run();
