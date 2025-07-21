using Microsoft.EntityFrameworkCore;
using ShopifyTestApi.Data;
using ShopifyTestApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Add Entity Framework
builder.Services.AddDbContext<ShopifyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Mock Data Service
builder.Services.AddScoped<IMockDataService, MockDataService>();

// Register Database Service
builder.Services.AddScoped<IDatabaseService, DatabaseService>();

// Add CORS - 本番環境でのCORS問題解決のため、すべてのオリジンを許可
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .SetIsOriginAllowed(origin => true); // 追加の安全性
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// Use CORS - すべてのオリジンを許可（本番環境でのCORS問題解決のため）
app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

app.Run();
