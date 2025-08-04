# Azure Deployment JWT Authentication Configuration Guide

This guide provides comprehensive instructions for configuring JWT authentication in Azure deployments, troubleshooting common issues, and ensuring proper authentication between frontend and backend services.

## Table of Contents
1. [Overview](#overview)
2. [Required Environment Variables](#required-environment-variables)
3. [Azure Portal Configuration](#azure-portal-configuration)
4. [Common 401 Error Causes and Solutions](#common-401-error-causes-and-solutions)
5. [Step-by-Step Troubleshooting Guide](#step-by-step-troubleshooting-guide)
6. [Testing JWT Authentication in Production](#testing-jwt-authentication-in-production)

## Overview

JWT (JSON Web Token) authentication is crucial for securing API communications between your frontend and backend services in Azure. This guide covers the complete setup process and troubleshooting procedures.

## Required Environment Variables

### Backend Environment Variables (App Service)

```bash
# JWT Configuration
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters
JWT_ISSUER=your-app-name
JWT_AUDIENCE=your-app-name
JWT_EXPIRY_MINUTES=60

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.azurestaticapps.net

# Optional: Additional Security
ASPNETCORE_ENVIRONMENT=Production
```

### Frontend Environment Variables (Static Web Apps)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.azurewebsites.net/api
NEXT_PUBLIC_API_BASE_URL=https://your-backend.azurewebsites.net

# Optional: Environment Indicator
NEXT_PUBLIC_ENVIRONMENT=production
```

## Azure Portal Configuration

### Step 1: Configure Backend App Service

1. **Navigate to your App Service** in Azure Portal
2. Go to **Settings** → **Configuration**
3. Click on **Application settings** tab
4. Add the following environment variables:

```bash
JWT_SECRET=<generate-secure-random-string>
JWT_ISSUER=shopify-analytics-api
JWT_AUDIENCE=shopify-analytics-api
JWT_EXPIRY_MINUTES=60
CORS_ALLOWED_ORIGINS=https://your-frontend.azurestaticapps.net
```

**Important**: Generate JWT_SECRET using a secure method:
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

5. Click **Save** and restart the App Service

### Step 2: Configure Frontend Static Web App

1. **Navigate to your Static Web App** in Azure Portal
2. Go to **Settings** → **Configuration**
3. Add application settings:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.azurewebsites.net/api
NEXT_PUBLIC_API_BASE_URL=https://your-backend.azurewebsites.net
```

4. Click **Save**

### Step 3: Configure CORS in App Service

1. In your App Service, go to **API** → **CORS**
2. Add your frontend URL to allowed origins:
   - `https://your-frontend.azurestaticapps.net`
   - Remove any wildcard (*) entries
3. Enable **Access-Control-Allow-Credentials**
4. Click **Save**

### Step 4: Configure Authentication/Authorization (Optional)

If using Azure AD or other authentication providers:

1. Go to **Settings** → **Authentication**
2. Configure your identity provider
3. Ensure token validation is properly set up

## Common 401 Error Causes and Solutions

### 1. Missing or Invalid JWT Secret

**Symptom**: All API calls return 401 Unauthorized

**Solution**:
```bash
# Verify JWT_SECRET is set in App Service
az webapp config appsettings list --name your-app-service --resource-group your-rg

# Ensure the secret matches between environments
```

### 2. Token Expiration

**Symptom**: Authentication works initially but fails after some time

**Solution**:
- Increase `JWT_EXPIRY_MINUTES` value
- Implement token refresh mechanism in frontend

### 3. CORS Misconfiguration

**Symptom**: 401 errors with CORS preflight failures

**Solution**:
```csharp
// In Program.cs, ensure CORS is configured before authentication
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin",
        builder => builder
            .WithOrigins(Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS") ?? "")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// Use CORS before authentication
app.UseCors("AllowSpecificOrigin");
app.UseAuthentication();
app.UseAuthorization();
```

### 4. Incorrect Token Format

**Symptom**: Token validation fails with format errors

**Solution**:
```javascript
// Ensure proper token format in frontend
const response = await fetch(`${API_URL}/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`, // Note the space after "Bearer"
    'Content-Type': 'application/json'
  }
});
```

### 5. Environment Variable Not Loading

**Symptom**: Authentication works locally but not in Azure

**Solution**:
- Verify environment variables are set in Azure Portal
- Check application logs for configuration errors
- Ensure no hardcoded values override environment variables

## Step-by-Step Troubleshooting Guide

### Step 1: Verify Environment Variables

```bash
# Check backend configuration
az webapp config appsettings list --name your-backend-app --resource-group your-rg

# Check frontend configuration
az staticwebapp appsettings list --name your-frontend-app
```

### Step 2: Test JWT Generation

Create a test endpoint to verify JWT generation:

```csharp
[HttpGet("test-auth")]
public IActionResult TestAuth()
{
    var token = _tokenService.GenerateToken("test@example.com");
    return Ok(new { token, expiresIn = 3600 });
}
```

### Step 3: Validate Token Configuration

Use jwt.io to decode and verify your tokens:

1. Copy a generated token
2. Paste into jwt.io debugger
3. Verify:
   - Algorithm matches (e.g., HS256)
   - Issuer and Audience match configuration
   - Expiration time is correct

### Step 4: Check Application Logs

```bash
# View real-time logs
az webapp log tail --name your-backend-app --resource-group your-rg

# Check for authentication middleware errors
```

### Step 5: Test with Postman/cURL

```bash
# Get a token
curl -X POST https://your-backend.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Use the token
curl -X GET https://your-backend.azurewebsites.net/api/analytics/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Testing JWT Authentication in Production

### 1. Health Check Endpoint

Create a protected health check endpoint:

```csharp
[Authorize]
[HttpGet("auth-health")]
public IActionResult AuthHealth()
{
    return Ok(new { 
        authenticated = true, 
        user = User.Identity.Name,
        claims = User.Claims.Select(c => new { c.Type, c.Value })
    });
}
```

### 2. Frontend Integration Test

```typescript
// Test authentication flow
async function testAuth() {
  try {
    // 1. Login
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' })
    });
    
    const { token } = await loginResponse.json();
    console.log('Login successful, token received');
    
    // 2. Test authenticated endpoint
    const testResponse = await fetch(`${API_URL}/auth-health`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (testResponse.ok) {
      console.log('Authentication test passed');
    } else {
      console.error('Authentication test failed:', testResponse.status);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

### 3. Monitoring and Alerts

Set up Application Insights to monitor authentication failures:

```csharp
// In your authentication middleware or service
try 
{
    // Authentication logic
}
catch (SecurityTokenException ex)
{
    _telemetryClient.TrackException(ex, new Dictionary<string, string> {
        { "AuthenticationError", "TokenValidationFailed" },
        { "Endpoint", context.Request.Path }
    });
    throw;
}
```

### 4. Production Checklist

- [ ] JWT_SECRET is unique and secure (not the same as development)
- [ ] All environment variables are set correctly
- [ ] CORS is configured for production domains only
- [ ] Token expiration is appropriate for your use case
- [ ] Error logging is enabled for authentication failures
- [ ] SSL/TLS is enforced for all endpoints
- [ ] Rate limiting is configured for authentication endpoints
- [ ] Backup authentication method is available (if needed)

## Additional Security Recommendations

1. **Rotate JWT Secrets Regularly**
   - Plan for secret rotation without downtime
   - Use Azure Key Vault for secret management

2. **Implement Refresh Tokens**
   - Short-lived access tokens (15-30 minutes)
   - Longer-lived refresh tokens stored securely

3. **Monitor Failed Authentication Attempts**
   - Set up alerts for multiple failed attempts
   - Implement account lockout policies

4. **Use HTTPS Only**
   - Enforce HTTPS in Azure App Service
   - Set secure cookie flags

5. **Validate Token Claims**
   - Verify issuer and audience
   - Check token expiration
   - Validate custom claims

## Troubleshooting Resources

- [Azure App Service Diagnostics](https://portal.azure.com/#blade/Microsoft_Azure_Support/TroubleshootV3Blade)
- [Application Insights Logs](https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/microsoft.insights%2Fcomponents)
- [JWT Debugger](https://jwt.io/)
- [Azure Support](https://azure.microsoft.com/support/options/)

## Common Error Messages and Solutions

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "Bearer error=\"invalid_token\"" | Malformed token | Check token format and Bearer prefix |
| "401 Unauthorized - No SecurityTokenValidator" | Missing JWT configuration | Verify JWT middleware setup |
| "IDX10223: Lifetime validation failed" | Token expired | Check expiration time and clock skew |
| "IDX10214: Audience validation failed" | Audience mismatch | Ensure JWT_AUDIENCE matches token |
| "IDX10205: Issuer validation failed" | Issuer mismatch | Ensure JWT_ISSUER matches token |

Remember to always test authentication thoroughly in a staging environment before deploying to production.