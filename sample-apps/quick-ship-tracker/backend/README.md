# Quick Ship Tracker - Backend

ASP.NET Core Web API backend for Quick Ship Tracker Shopify app.

## Tech Stack

- **Framework**: ASP.NET Core 8.0
- **Database**: SQLite (Entity Framework Core)
- **Authentication**: JWT Bearer Token
- **Shopify Integration**: ShopifySharp
- **API Documentation**: Swagger/OpenAPI

## Project Structure

```
backend/
├── QuickShipTracker.Api/       # Web API project
│   ├── Controllers/            # API controllers
│   ├── Services/               # Business logic services
│   └── Program.cs              # Application entry point
├── QuickShipTracker.Core/      # Core business logic
│   ├── Models/                 # Domain models
│   ├── DTOs/                   # Data transfer objects
│   ├── Services/               # Service interfaces
│   └── Configuration/          # Configuration models
├── QuickShipTracker.Data/      # Data access layer
│   └── AppDbContext.cs        # Entity Framework context
└── QuickShipTracker.sln        # Solution file
```

## Prerequisites

- .NET 8.0 SDK
- Visual Studio 2022 or VS Code
- Shopify Partner account
- Shopify development store

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
dotnet restore
```

### 2. Configure Settings

Update `QuickShipTracker.Api/appsettings.json`:

```json
{
  "Shopify": {
    "ApiKey": "YOUR_SHOPIFY_API_KEY",
    "ApiSecret": "YOUR_SHOPIFY_API_SECRET",
    "WebhookSecret": "YOUR_WEBHOOK_SECRET"
  },
  "Jwt": {
    "Secret": "your-256-bit-secret-key-for-jwt-token-generation"
  }
}
```

### 3. Create Database

The database will be automatically created on first run. To manually create:

```bash
cd QuickShipTracker.Api
dotnet ef database update
```

### 4. Run the Application

```bash
cd QuickShipTracker.Api
dotnet run
```

The API will be available at:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger UI: `https://localhost:5001/swagger`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Initiate OAuth flow
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify token

### Orders
- `GET /api/orders` - Get order list
- `GET /api/orders/{id}` - Get order details

### Tracking
- `POST /api/tracking` - Create tracking
- `PUT /api/tracking/{id}` - Update tracking
- `DELETE /api/tracking/{id}` - Delete tracking
- `POST /api/tracking/bulk` - Bulk create

### Billing
- `GET /api/billing/plans` - Get available plans
- `POST /api/billing/subscribe` - Subscribe to plan
- `POST /api/billing/cancel` - Cancel subscription
- `GET /api/billing/usage` - Get usage stats

### Webhooks
- `POST /api/webhooks/app/uninstalled` - App uninstalled
- `POST /api/webhooks/customers/data_request` - GDPR data request
- `POST /api/webhooks/customers/redact` - GDPR customer redact
- `POST /api/webhooks/shop/redact` - GDPR shop redact

## Development

### Add Migrations

```bash
cd QuickShipTracker.Api
dotnet ef migrations add MigrationName -p ../QuickShipTracker.Data
```

### Update Database

```bash
dotnet ef database update
```

### Run Tests

```bash
dotnet test
```

## Environment Variables

For production deployment, use environment variables:

- `SHOPIFY__APIKEY` - Shopify API key
- `SHOPIFY__APISECRET` - Shopify API secret
- `SHOPIFY__WEBHOOKSECRET` - Webhook verification secret
- `JWT__SECRET` - JWT signing key
- `CONNECTIONSTRINGS__DEFAULTCONNECTION` - Database connection

## Security Notes

1. **Never commit secrets** to version control
2. Use **HTTPS** in production
3. Implement **rate limiting** for API endpoints
4. Use **strong JWT secrets** (256-bit minimum)
5. Enable **CORS** only for trusted origins
6. Validate all **webhook signatures**
7. Use **parameterized queries** to prevent SQL injection

## Deployment

### Azure App Service

1. Create Azure App Service (Linux, .NET 8)
2. Configure application settings
3. Deploy using GitHub Actions or Azure DevOps
4. Enable HTTPS only
5. Configure custom domain

### Docker

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY . .
ENTRYPOINT ["dotnet", "QuickShipTracker.Api.dll"]
```

## Support

For issues or questions, contact the development team.

---
*Last updated: 2025-09-06*