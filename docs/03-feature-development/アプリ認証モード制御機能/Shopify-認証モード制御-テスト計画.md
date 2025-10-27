# Shopify アプリ認証モード制御機能 テスト計画書

## 概要

Shopify アプリ認証モード制御機能の包括的なテスト計画書です。3段階認証レベル（OAuth/Demo/Developer）、環境別認証制御、セキュリティ、パフォーマンス、ユーザビリティの観点からテストを実施します。

**最終更新日**: 2025年10月27日  
**バージョン**: 2.0（3段階認証レベル統合版）

---

## 🎯 テスト目標

### 主要目標
- 3段階認証レベル（Level 3/2/1）の正確性確保
- read_onlyクレームベースのアクセス制限の検証
- 開発者モード（Level 1）の環境分離確認
- セキュリティ要件の完全な満足（NEXT_PUBLIC_DEV_PASSWORD削除確認）
- パフォーマンス要件の達成
- ユーザビリティの向上

### 成功基準
- 全テストケースの95%以上が成功
- 3段階認証レベルの動作が100%正確
- read_onlyクレームによる書き込み制限が100%機能
- 開発者モードが本番・ステージングで100%ブロック
- セキュリティテストで0件の脆弱性
- パフォーマンステストで全指標をクリア
- ユーザビリティテストで4.0/5.0以上の評価

---

## 📋 テスト戦略

### テストピラミッド

```
        E2E Tests (少数)
       /              \
   Integration Tests (中程度)
  /                        \
Unit Tests (多数)          Performance Tests
```

### テストの種類

#### 1. 単体テスト（Unit Tests）
- **目的**: 個別コンポーネントの動作確認
- **対象**: 関数、メソッド、コンポーネント
- **ツール**: Jest, xUnit, NUnit
- **目標**: コードカバレッジ80%以上

#### 2. 統合テスト（Integration Tests）
- **目的**: 複数コンポーネント間の連携確認
- **対象**: API連携、データベース接続、認証フロー
- **ツール**: Supertest, TestContainers
- **目標**: 主要な統合ポイントの100%テスト

#### 3. E2Eテスト（End-to-End Tests）
- **目的**: ユーザー視点での動作確認
- **対象**: 認証フロー、デモモード、環境別表示
- **ツール**: Playwright, Cypress
- **目標**: 主要なユーザーフローの100%テスト

#### 4. セキュリティテスト（Security Tests）
- **目的**: セキュリティ脆弱性の確認
- **対象**: 認証、認可、データ保護
- **ツール**: OWASP ZAP, Snyk
- **目標**: セキュリティ要件の100%満足

#### 5. パフォーマンステスト（Performance Tests）
- **目的**: システムの性能確認
- **対象**: 認証処理、API応答、セッション管理
- **ツール**: k6, Artillery
- **目標**: パフォーマンス要件の100%達成

---

## 🧪 テストケース詳細

### 1. 単体テスト

#### 1.1 フロントエンド単体テスト

##### AuthenticationRequiredコンポーネント

```typescript
// AuthenticationRequired.test.tsx
describe('AuthenticationRequired Component', () => {
  describe('環境別タイトル表示', () => {
    it('本番環境でShopify認証タイトルを表示する', () => {
      // Arrange
      mockEnvironmentConfig({
        environment: 'production',
        authMode: 'oauth_required'
      })
      
      // Act
      render(<AuthenticationRequired />)
      
      // Assert
      expect(screen.getByText('Shopify認証が必要です')).toBeInTheDocument()
    })
    
    it('ステージング環境で汎用認証タイトルを表示する', () => {
      // Arrange
      mockEnvironmentConfig({
        environment: 'staging',
        authMode: 'demo_allowed'
      })
      
      // Act
      render(<AuthenticationRequired />)
      
      // Assert
      expect(screen.getByText('認証が必要です')).toBeInTheDocument()
    })
  })
  
  describe('ボタン表示制御', () => {
    it('本番環境でOAuth認証ボタンのみ表示する', () => {
      // Arrange
      mockEnvironmentConfig({
        environment: 'production',
        authMode: 'oauth_required'
      })
      
      // Act
      render(<AuthenticationRequired />)
      
      // Assert
      expect(screen.getByText('Shopifyで認証する')).toBeInTheDocument()
      expect(screen.queryByText('デモサイトを開く')).not.toBeInTheDocument()
    })
    
    it('ステージング環境でOAuth認証ボタンとデモリンクを表示する', () => {
      // Arrange
      mockEnvironmentConfig({
        environment: 'staging',
        authMode: 'demo_allowed'
      })
      
      // Act
      render(<AuthenticationRequired />)
      
      // Assert
      expect(screen.getByText('Shopifyで認証する')).toBeInTheDocument()
      expect(screen.getByText('デモサイトを開く')).toBeInTheDocument()
    })
  })
  
  describe('イベントハンドリング', () => {
    it('OAuth認証ボタンクリック時にコールバックを呼び出す', () => {
      // Arrange
      const onShopifyAuth = jest.fn()
      mockEnvironmentConfig({
        environment: 'staging',
        authMode: 'demo_allowed'
      })
      
      // Act
      render(<AuthenticationRequired onShopifyAuth={onShopifyAuth} />)
      fireEvent.click(screen.getByText('Shopifyで認証する'))
      
      // Assert
      expect(onShopifyAuth).toHaveBeenCalledTimes(1)
    })
    
    it('デモリンククリック時にコールバックを呼び出す', () => {
      // Arrange
      const onDemoAuth = jest.fn()
      mockEnvironmentConfig({
        environment: 'staging',
        authMode: 'demo_allowed'
      })
      
      // Act
      render(<AuthenticationRequired onDemoAuth={onDemoAuth} />)
      fireEvent.click(screen.getByText('デモサイトを開く'))
      
      // Assert
      expect(onDemoAuth).toHaveBeenCalledTimes(1)
    })
  })
})
```

##### DeveloperModeBannerコンポーネント

```typescript
// DeveloperModeBanner.test.tsx
describe('DeveloperModeBanner Component', () => {
  describe('セッション時間表示', () => {
    it('残り時間を正しく表示する', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30分後
      
      // Act
      render(<DeveloperModeBanner sessionExpiresAt={expiresAt} onLogout={jest.fn()} />)
      
      // Assert
      expect(screen.getByText(/セッション残り: \d+分/)).toBeInTheDocument()
    })
    
    it('期限切れ時に適切なメッセージを表示する', () => {
      // Arrange
      const expiresAt = new Date(Date.now() - 1000) // 1秒前
      
      // Act
      render(<DeveloperModeBanner sessionExpiresAt={expiresAt} onLogout={jest.fn()} />)
      
      // Assert
      expect(screen.getByText('セッション残り: 期限切れ')).toBeInTheDocument()
    })
  })
  
  describe('ログアウト機能', () => {
    it('ログアウトボタンクリック時にコールバックを呼び出す', () => {
      // Arrange
      const onLogout = jest.fn()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
      
      // Act
      render(<DeveloperModeBanner sessionExpiresAt={expiresAt} onLogout={onLogout} />)
      fireEvent.click(screen.getByText('ログアウト'))
      
      // Assert
      expect(onLogout).toHaveBeenCalledTimes(1)
    })
  })
})
```

#### 1.2 バックエンド単体テスト

##### AuthModeMiddleware

```csharp
// AuthModeMiddlewareTests.cs
[TestFixture]
public class AuthModeMiddlewareTests
{
    private Mock<RequestDelegate> _mockNext;
    private Mock<IConfiguration> _mockConfig;
    private Mock<ILogger<AuthModeMiddleware>> _mockLogger;
    private Mock<IMemoryCache> _mockCache;
    private AuthModeMiddleware _middleware;

    [SetUp]
    public void Setup()
    {
        _mockNext = new Mock<RequestDelegate>();
        _mockConfig = new Mock<IConfiguration>();
        _mockLogger = new Mock<ILogger<AuthModeMiddleware>>();
        _mockCache = new Mock<IMemoryCache>();
        
        _middleware = new AuthModeMiddleware(
            _mockNext.Object, 
            _mockConfig.Object, 
            _mockLogger.Object,
            _mockCache.Object
        );
    }

    [Test]
    public async Task InvokeAsync_ProductionWithDemoMode_ShouldReturn500()
    {
        // Arrange
        _mockConfig.Setup(c => c["Environment"]).Returns("Production");
        _mockConfig.Setup(c => c["Authentication:Mode"]).Returns("DemoAllowed");
        
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        // Act
        await _middleware.InvokeAsync(context);
        
        // Assert
        Assert.AreEqual(500, context.Response.StatusCode);
    }

    [Test]
    public async Task InvokeAsync_ValidOAuthToken_ShouldCallNext()
    {
        // Arrange
        _mockConfig.Setup(c => c["Environment"]).Returns("Development");
        _mockConfig.Setup(c => c["Authentication:Mode"]).Returns("AllAllowed");
        
        var context = new DefaultHttpContext();
        context.Request.Cookies = new RequestCookieCollection(new Dictionary<string, string>
        {
            ["shopify_oauth_token"] = "valid-token"
        });
        
        // Act
        await _middleware.InvokeAsync(context);
        
        // Assert
        _mockNext.Verify(n => n(context), Times.Once);
    }

    [Test]
    public async Task InvokeAsync_InvalidDemoToken_ShouldReturn401()
    {
        // Arrange
        _mockConfig.Setup(c => c["Environment"]).Returns("Staging");
        _mockConfig.Setup(c => c["Authentication:Mode"]).Returns("DemoAllowed");
        
        var context = new DefaultHttpContext();
        context.Request.Cookies = new RequestCookieCollection(new Dictionary<string, string>
        {
            ["demo_auth_token"] = "invalid-token"
        });
        
        // Act
        await _middleware.InvokeAsync(context);
        
        // Assert
        Assert.AreEqual(401, context.Response.StatusCode);
    }
}
```

##### DemoAuthService

```csharp
// DemoAuthServiceTests.cs
[TestFixture]
public class DemoAuthServiceTests
{
    private Mock<IConfiguration> _mockConfig;
    private Mock<IMemoryCache> _mockCache;
    private Mock<ILogger<DemoAuthService>> _mockLogger;
    private Mock<AuthDbContext> _mockContext;
    private DemoAuthService _service;

    [SetUp]
    public void Setup()
    {
        _mockConfig = new Mock<IConfiguration>();
        _mockCache = new Mock<IMemoryCache>();
        _mockLogger = new Mock<ILogger<DemoAuthService>>();
        _mockContext = new Mock<AuthDbContext>();
        
        _service = new DemoAuthService(
            _mockConfig.Object,
            _mockCache.Object,
            _mockLogger.Object,
            _mockContext.Object
        );
    }

    [Test]
    public async Task AuthenticateAsync_ValidPassword_ShouldReturnSuccess()
    {
        // Arrange
        var hashedPassword = BCrypt.HashPassword("test-password");
        _mockConfig.Setup(c => c["Demo:PasswordHash"]).Returns(hashedPassword);
        _mockConfig.Setup(c => c["Demo:SessionTimeoutHours"]).Returns("1");
        
        // Act
        var result = await _service.AuthenticateAsync("test-password");
        
        // Assert
        Assert.IsTrue(result.Success);
        Assert.IsNotNull(result.Token);
        Assert.IsNotNull(result.SessionId);
    }

    [Test]
    public async Task AuthenticateAsync_InvalidPassword_ShouldReturnFailure()
    {
        // Arrange
        var hashedPassword = BCrypt.HashPassword("correct-password");
        _mockConfig.Setup(c => c["Demo:PasswordHash"]).Returns(hashedPassword);
        
        // Act
        var result = await _service.AuthenticateAsync("wrong-password");
        
        // Assert
        Assert.IsFalse(result.Success);
        Assert.AreEqual("Invalid password", result.ErrorMessage);
    }

    [Test]
    public async Task ValidateTokenAsync_ValidToken_ShouldReturnTrue()
    {
        // Arrange
        var sessionId = Guid.NewGuid().ToString();
        var session = new DemoSession
        {
            SessionId = sessionId,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsActive = true
        };
        
        _mockCache.Setup(c => c.TryGetValue($"demo_session_{sessionId}", out session))
                  .Returns(true);
        
        // Act
        var result = await _service.ValidateTokenAsync("valid-token");
        
        // Assert
        Assert.IsTrue(result);
    }
}
```

### 2. 統合テスト

#### 2.1 認証フロー統合テスト

```csharp
// AuthenticationFlowIntegrationTests.cs
[TestFixture]
public class AuthenticationFlowIntegrationTests
{
    private WebApplicationFactory<Program> _factory;
    private HttpClient _client;

    [SetUp]
    public void Setup()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // テスト用の設定
                    services.Configure<AuthConfig>(config =>
                    {
                        config.Mode = AuthMode.DemoAllowed;
                        config.JwtSecret = "test-secret-key";
                    });
                });
            });
        
        _client = _factory.CreateClient();
    }

    [Test]
    public async Task DemoAuthentication_ShouldCreateValidSession()
    {
        // Arrange
        var request = new { password = "test-password" };
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/demo", request);
        
        // Assert
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        
        var result = await response.Content.ReadFromJsonAsync<DemoAuthResult>();
        Assert.IsTrue(result!.Success);
        Assert.IsNotNull(result.Token);
        Assert.IsNotNull(result.SessionId);
    }

    [Test]
    public async Task DemoMode_ShouldRestrictShopifyApiAccess()
    {
        // Arrange
        var demoToken = await GetDemoTokenAsync();
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", demoToken);
        
        // Act
        var response = await _client.GetAsync("/api/shopify/orders");
        
        // Assert
        Assert.AreEqual(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Forbidden in demo mode", content);
    }

    [Test]
    public async Task OAuthMode_ShouldAllowShopifyApiAccess()
    {
        // Arrange
        var oauthToken = await GetOAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", oauthToken);
        
        // Act
        var response = await _client.GetAsync("/api/shopify/orders");
        
        // Assert
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<string> GetDemoTokenAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/demo", new
        {
            password = "test-password"
        });
        
        var result = await response.Content.ReadFromJsonAsync<DemoAuthResult>();
        return result!.Token;
    }
}
```

#### 2.2 環境別設定統合テスト

```typescript
// EnvironmentConfigIntegration.test.ts
describe('Environment Configuration Integration', () => {
  describe('本番環境設定', () => {
    it('本番環境でデモモードが無効化される', async () => {
      // Arrange
      process.env.NEXT_PUBLIC_ENVIRONMENT = 'production'
      process.env.NEXT_PUBLIC_AUTH_MODE = 'oauth_required'
      
      // Act
      const response = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test-password' })
      })
      
      // Assert
      expect(response.status).toBe(403)
    })
  })
  
  describe('ステージング環境設定', () => {
    it('ステージング環境でデモモードが有効化される', async () => {
      // Arrange
      process.env.NEXT_PUBLIC_ENVIRONMENT = 'staging'
      process.env.NEXT_PUBLIC_AUTH_MODE = 'demo_allowed'
      
      // Act
      const response = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test-password' })
      })
      
      // Assert
      expect(response.status).toBe(200)
    })
  })
})
```

### 3. E2Eテスト

#### 3.1 認証フローE2Eテスト

```typescript
// auth-flow.e2e.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow E2E', () => {
  test('本番環境でのOAuth認証フロー', async ({ page }) => {
    // Arrange
    await page.goto('/?shop=test-store.myshopify.com')
    
    // Act
    await page.click('text=Shopifyで認証する')
    
    // Assert
    await expect(page).toHaveURL(/shopify\.com/)
    await expect(page.locator('text=Shopify認証が必要です')).toBeVisible()
  })
  
  test('ステージング環境でのデモモード認証フロー', async ({ page }) => {
    // Arrange
    await page.goto('/dev-bookmarks')
    
    // Act
    await page.fill('input[type="password"]', 'test-password')
    await page.click('button[type="submit"]')
    
    // Assert
    await expect(page.locator('text=開発者ツール有効')).toBeVisible()
    await expect(page.locator('text=セッション残り')).toBeVisible()
  })
  
  test('デモモードでのデータ変更制限', async ({ page }) => {
    // Arrange
    await page.goto('/dev-bookmarks')
    await page.fill('input[type="password"]', 'test-password')
    await page.click('button[type="submit"]')
    
    // Act
    await page.click('button:has-text("データを変更")')
    
    // Assert
    await expect(page.locator('text=デモモードではデータの変更はできません')).toBeVisible()
  })
})
```

#### 3.2 環境別表示E2Eテスト

```typescript
// environment-display.e2e.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Environment Display E2E', () => {
  test('本番環境でデモリンクが表示されない', async ({ page }) => {
    // Arrange
    await page.goto('/')
    
    // Assert
    await expect(page.locator('text=デモサイトを開く')).not.toBeVisible()
    await expect(page.locator('text=Shopifyで認証する')).toBeVisible()
  })
  
  test('ステージング環境でデモリンクが表示される', async ({ page }) => {
    // Arrange
    await page.goto('/')
    
    // Assert
    await expect(page.locator('text=デモサイトを開く')).toBeVisible()
    await expect(page.locator('text=Shopifyで認証する')).toBeVisible()
  })
  
  test('開発環境で全ボタンが表示される', async ({ page }) => {
    // Arrange
    await page.goto('/')
    
    // Assert
    await expect(page.locator('text=デモサイトを開く')).toBeVisible()
    await expect(page.locator('text=Shopifyで認証する')).toBeVisible()
    await expect(page.locator('text=開発者ツール')).toBeVisible()
  })
})
```

### 4. セキュリティテスト

#### 4.1 認証セキュリティテスト

```csharp
// SecurityTests.cs
[TestFixture]
public class SecurityTests
{
    [Test]
    public void PasswordHash_ShouldUseBCrypt()
    {
        // Arrange
        var password = "test-password";
        
        // Act
        var hash = BCrypt.HashPassword(password);
        
        // Assert
        Assert.IsTrue(BCrypt.Verify(password, hash));
        Assert.IsTrue(hash.StartsWith("$2a$"));
    }
    
    [Test]
    public void JWTToken_ShouldBeSigned()
    {
        // Arrange
        var secret = "test-secret-key";
        var token = GenerateJWTToken(secret);
        
        // Act
        var isValid = ValidateJWTToken(token, secret);
        
        // Assert
        Assert.IsTrue(isValid);
    }
    
    [Test]
    public void SessionToken_ShouldExpire()
    {
        // Arrange
        var expiredToken = GenerateExpiredToken();
        
        // Act
        var isValid = ValidateToken(expiredToken);
        
        // Assert
        Assert.IsFalse(isValid);
    }
}
```

#### 4.2 アクセス制御セキュリティテスト

```typescript
// access-control.security.test.ts
describe('Access Control Security', () => {
  test('デモモードでShopify APIアクセスが制限される', async () => {
    // Arrange
    const demoToken = await getDemoToken()
    
    // Act
    const response = await fetch('/api/shopify/orders', {
      headers: {
        'Authorization': `Bearer ${demoToken}`
      }
    })
    
    // Assert
    expect(response.status).toBe(403)
    expect(await response.text()).toContain('Forbidden in demo mode')
  })
  
  test('無効なトークンでアクセスが拒否される', async () => {
    // Arrange
    const invalidToken = 'invalid-token'
    
    // Act
    const response = await fetch('/api/protected', {
      headers: {
        'Authorization': `Bearer ${invalidToken}`
      }
    })
    
    // Assert
    expect(response.status).toBe(401)
  })
  
  test('セッション期限切れでアクセスが拒否される', async () => {
    // Arrange
    const expiredToken = await getExpiredToken()
    
    // Act
    const response = await fetch('/api/protected', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    })
    
    // Assert
    expect(response.status).toBe(401)
  })
})
```

#### 4.3 レート制限・ブルートフォース対策テスト

```typescript
// rate-limit-security.test.ts
describe('Rate Limiting and Brute Force Protection Tests', () => {
  test('レート制限を超えた認証試行がブロックされる', async () => {
    // Arrange
    const ipAddress = '192.168.1.100'
    const maxAttempts = 5
    
    // Act: maxAttempts回失敗試行
    for (let i = 0; i < maxAttempts; i++) {
      await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': ipAddress
        },
        body: JSON.stringify({ password: 'wrong-password' })
      })
    }
    
    // Act: maxAttempts + 1回目の試行
    const response = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': ipAddress
      },
      body: JSON.stringify({ password: 'correct-password' })
    })
    
    // Assert
    expect(response.status).toBe(429) // Too Many Requests
    const result = await response.json()
    expect(result.error).toContain('Too many attempts')
  })
  
  test('ロックアウト閾値到達後にアカウントがロックされる', async () => {
    // Arrange
    const ipAddress = '192.168.1.101'
    const lockoutThreshold = 10
    
    // Act: lockoutThreshold回失敗試行
    for (let i = 0; i < lockoutThreshold; i++) {
      await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': ipAddress
        },
        body: JSON.stringify({ password: 'wrong-password' })
      })
    }
    
    // Act: ロックアウト後の試行
    const response = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': ipAddress
      },
      body: JSON.stringify({ password: 'correct-password' })
    })
    
    // Assert
    expect(response.status).toBe(403) // Forbidden
    const result = await response.json()
    expect(result.error).toContain('temporarily locked')
  })
  
  test('成功認証後にレート制限カウンターがリセットされる', async () => {
    // Arrange
    const ipAddress = '192.168.1.102'
    
    // Act: 数回失敗試行
    for (let i = 0; i < 3; i++) {
      await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': ipAddress
        },
        body: JSON.stringify({ password: 'wrong-password' })
      })
    }
    
    // Act: 成功認証
    await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': ipAddress
      },
      body: JSON.stringify({ password: 'correct-password' })
    })
    
    // Act: 再度認証試行（カウンターがリセットされているはず）
    const response = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': ipAddress
      },
      body: JSON.stringify({ password: 'correct-password' })
    })
    
    // Assert
    expect(response.status).toBe(200)
  })
  
  test('平文パスワードがログに記録されない', async () => {
    // Arrange
    const password = 'sensitive-password-123'
    
    // Act
    await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    
    // Assert: ログファイルを確認
    const logs = await readAuthenticationLogs()
    expect(logs).not.toContain(password)
  })
})
```

#### 4.4 環境設定検証テスト

```csharp
// EnvironmentConfigurationSecurityTests.cs
[TestFixture]
public class EnvironmentConfigurationSecurityTests
{
    [Test]
    public void Startup_ProductionWithDemoMode_ShouldThrowException()
    {
        // Arrange
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                ["ASPNETCORE_ENVIRONMENT"] = "Production",
                ["Authentication:Mode"] = "DemoAllowed"
            })
            .Build();
        
        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
        {
            var startup = new Startup(config);
            startup.ConfigureServices(new ServiceCollection());
        });
    }
    
    [Test]
    public void Startup_ProductionWithOAuthRequired_ShouldSucceed()
    {
        // Arrange
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                ["ASPNETCORE_ENVIRONMENT"] = "Production",
                ["Authentication:Mode"] = "OAuthRequired"
            })
            .Build();
        
        // Act & Assert
        Assert.DoesNotThrow(() =>
        {
            var startup = new Startup(config);
            startup.ConfigureServices(new ServiceCollection());
        });
    }
    
    [Test]
    public void Startup_MissingJwtSecret_ShouldThrowException()
    {
        // Arrange
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                ["ASPNETCORE_ENVIRONMENT"] = "Development",
                ["Authentication:Mode"] = "AllAllowed"
                // JwtSecretが欠落
            })
            .Build();
        
        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
        {
            var startup = new Startup(config);
            startup.ConfigureServices(new ServiceCollection());
        });
    }
}
```

#### 4.5 グローバル読み取り専用ポリシーテスト

```csharp
// DemoReadOnlyFilterTests.cs
[TestFixture]
public class DemoReadOnlyFilterTests
{
    [Test]
    public void DemoMode_PostRequest_ShouldBeBlocked()
    {
        // Arrange
        var filter = new DemoReadOnlyFilter(Mock.Of<ILogger<DemoReadOnlyFilter>>());
        var context = CreateActionExecutingContext("POST");
        context.HttpContext.Items["IsReadOnly"] = true;
        
        // Act
        filter.OnActionExecuting(context);
        
        // Assert
        Assert.IsInstanceOf<JsonResult>(context.Result);
        var jsonResult = (JsonResult)context.Result;
        Assert.AreEqual(403, jsonResult.StatusCode);
    }
    
    [Test]
    public void DemoMode_GetRequest_ShouldBeAllowed()
    {
        // Arrange
        var filter = new DemoReadOnlyFilter(Mock.Of<ILogger<DemoReadOnlyFilter>>());
        var context = CreateActionExecutingContext("GET");
        context.HttpContext.Items["IsReadOnly"] = true;
        
        // Act
        filter.OnActionExecuting(context);
        
        // Assert
        Assert.IsNull(context.Result);
    }
    
    [Test]
    public void DemoMode_PostRequestWithAllowDemoWrite_ShouldBeAllowed()
    {
        // Arrange
        var filter = new DemoReadOnlyFilter(Mock.Of<ILogger<DemoReadOnlyFilter>>());
        var context = CreateActionExecutingContext("POST");
        context.HttpContext.Items["IsReadOnly"] = true;
        context.ActionDescriptor.EndpointMetadata.Add(new AllowDemoWriteAttribute());
        
        // Act
        filter.OnActionExecuting(context);
        
        // Assert
        Assert.IsNull(context.Result);
    }
    
    [Test]
    public void OAuthMode_PostRequest_ShouldBeAllowed()
    {
        // Arrange
        var filter = new DemoReadOnlyFilter(Mock.Of<ILogger<DemoReadOnlyFilter>>());
        var context = CreateActionExecutingContext("POST");
        context.HttpContext.Items["IsReadOnly"] = false;
        
        // Act
        filter.OnActionExecuting(context);
        
        // Assert
        Assert.IsNull(context.Result);
    }
}
```

#### 4.6 Shopify App Bridge認証テスト

```typescript
// shopify-app-bridge-auth.test.ts
describe('Shopify App Bridge Authentication Tests', () => {
  test('セッショントークンがAuthorizationヘッダー経由で送信される', async () => {
    // Arrange
    const sessionToken = await getShopifySessionToken()
    
    // Act
    const response = await fetch('/api/protected', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })
    
    // Assert
    expect(response.status).toBe(200)
  })
  
  test('Cookieベースの認証が使用されない', async () => {
    // Arrange
    const sessionToken = await getShopifySessionToken()
    
    // Act: Cookieにトークンを設定してリクエスト
    const response = await fetch('/api/protected', {
      headers: {
        'Cookie': `shopify_session=${sessionToken}`
      }
    })
    
    // Assert: Cookieのみでは認証されない
    expect(response.status).toBe(401)
  })
  
  test('無効なセッショントークンが拒否される', async () => {
    // Arrange
    const invalidToken = 'invalid-session-token'
    
    // Act
    const response = await fetch('/api/protected', {
      headers: {
        'Authorization': `Bearer ${invalidToken}`
      }
    })
    
    // Assert
    expect(response.status).toBe(401)
  })
  
  test('期限切れセッショントークンが拒否される', async () => {
    // Arrange
    const expiredToken = await getExpiredShopifySessionToken()
    
    // Act
    const response = await fetch('/api/protected', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    })
    
    // Assert
    expect(response.status).toBe(401)
  })
})
```

#### 4.7 分散セッションストレージテスト

```csharp
// DistributedSessionStorageTests.cs
[TestFixture]
public class DistributedSessionStorageTests
{
    [Test]
    public async Task DemoSession_ShouldPersistInDatabase()
    {
        // Arrange
        var session = new DemoSession
        {
            Id = Guid.NewGuid(),
            SessionId = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        
        // Act
        await _dbContext.DemoSessions.AddAsync(session);
        await _dbContext.SaveChangesAsync();
        
        // Assert
        var retrieved = await _dbContext.DemoSessions
            .FirstOrDefaultAsync(s => s.SessionId == session.SessionId);
        Assert.IsNotNull(retrieved);
        Assert.AreEqual(session.SessionId, retrieved.SessionId);
    }
    
    [Test]
    public async Task DemoSession_ShouldBeCachedInRedis()
    {
        // Arrange
        var session = new DemoSession
        {
            SessionId = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };
        
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpiration = session.ExpiresAt
        };
        
        // Act
        await _distributedCache.SetStringAsync(
            $"demo_session_{session.SessionId}",
            JsonSerializer.Serialize(session),
            cacheOptions
        );
        
        // Assert
        var cached = await _distributedCache.GetStringAsync($"demo_session_{session.SessionId}");
        Assert.IsNotNull(cached);
        var deserializedSession = JsonSerializer.Deserialize<DemoSession>(cached);
        Assert.AreEqual(session.SessionId, deserializedSession.SessionId);
    }
    
    [Test]
    public async Task ExpiredSessions_ShouldBeCleanedUp()
    {
        // Arrange
        var expiredSession = new DemoSession
        {
            Id = Guid.NewGuid(),
            SessionId = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddHours(-1), // 1時間前に期限切れ
            CreatedAt = DateTime.UtcNow.AddHours(-2),
            IsActive = true
        };
        
        await _dbContext.DemoSessions.AddAsync(expiredSession);
        await _dbContext.SaveChangesAsync();
        
        // Act
        var cleanupService = new SessionCleanupService(_dbContext, _logger);
        await cleanupService.CleanupExpiredSessionsAsync();
        
        // Assert
        var retrieved = await _dbContext.DemoSessions
            .FirstOrDefaultAsync(s => s.SessionId == expiredSession.SessionId);
        Assert.IsNull(retrieved);
    }
}
```

### 5. パフォーマンステスト

#### 5.1 認証処理パフォーマンステスト

```javascript
// auth-performance.test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // 2分間で10ユーザーまで増加
    { duration: '5m', target: 10 }, // 5分間10ユーザーを維持
    { duration: '2m', target: 0 },  // 2分間で0ユーザーまで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95%のリクエストが3秒以内
    http_req_failed: ['rate<0.1'],     // エラー率10%未満
  },
}

export default function () {
  // OAuth認証テスト
  let oauthResponse = http.post('http://localhost:5000/api/auth/oauth', {
    shop: 'test-store.myshopify.com',
  })
  
  check(oauthResponse, {
    'OAuth認証が成功する': (r) => r.status === 200,
    'OAuth認証が3秒以内': (r) => r.timings.duration < 3000,
  })
  
  // デモ認証テスト
  let demoResponse = http.post('http://localhost:5000/api/auth/demo', {
    password: 'test-password',
  })
  
  check(demoResponse, {
    'デモ認証が成功する': (r) => r.status === 200,
    'デモ認証が2秒以内': (r) => r.timings.duration < 2000,
  })
  
  sleep(1)
}
```

#### 5.2 セッション管理パフォーマンステスト

```javascript
// session-performance.test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '1m', target: 50 },  // 1分間で50ユーザーまで増加
    { duration: '3m', target: 50 },  // 3分間50ユーザーを維持
    { duration: '1m', target: 0 },   // 1分間で0ユーザーまで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95%のリクエストが1秒以内
    http_req_failed: ['rate<0.05'],    // エラー率5%未満
  },
}

export default function () {
  // セッション作成
  let createResponse = http.post('http://localhost:5000/api/auth/demo', {
    password: 'test-password',
  })
  
  check(createResponse, {
    'セッション作成が成功する': (r) => r.status === 200,
    'セッション作成が1秒以内': (r) => r.timings.duration < 1000,
  })
  
  if (createResponse.status === 200) {
    let token = JSON.parse(createResponse.body).token
    
    // セッション検証
    let validateResponse = http.get('http://localhost:5000/api/auth/validate', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    check(validateResponse, {
      'セッション検証が成功する': (r) => r.status === 200,
      'セッション検証が500ms以内': (r) => r.timings.duration < 500,
    })
  }
  
  sleep(1)
}
```

---

## 📊 テスト実行計画

### テスト実行スケジュール

#### Phase 1: 単体テスト（1日）
- **期間**: 実装完了後
- **対象**: 全コンポーネント
- **実行者**: 開発者
- **目標**: コードカバレッジ80%以上

#### Phase 2: 統合テスト（1日）
- **期間**: 単体テスト完了後
- **対象**: 主要な統合ポイント
- **実行者**: 開発者
- **目標**: 全統合ポイントの100%テスト

#### Phase 3: E2Eテスト（1日）
- **期間**: 統合テスト完了後
- **対象**: 主要なユーザーフロー
- **実行者**: テストエンジニア
- **目標**: 全ユーザーフローの100%テスト

#### Phase 4: セキュリティテスト（1日）
- **期間**: E2Eテスト完了後
- **対象**: 認証・認可・データ保護
- **実行者**: セキュリティエンジニア
- **目標**: セキュリティ要件の100%満足

#### Phase 5: パフォーマンステスト（1日）
- **期間**: セキュリティテスト完了後
- **対象**: 認証処理・セッション管理
- **実行者**: パフォーマンスエンジニア
- **目標**: パフォーマンス要件の100%達成

### テスト環境

#### 開発環境
- **用途**: 単体テスト・統合テスト
- **設定**: 全認証モード有効
- **データ**: テストデータセット

#### ステージング環境
- **用途**: E2Eテスト・セキュリティテスト
- **設定**: 本番環境と同等
- **データ**: 匿名化データ

#### 本番環境
- **用途**: パフォーマンステスト（限定的）
- **設定**: 本番設定
- **データ**: 本番データ（読み取り専用）

---

## 📈 テスト結果評価

### 成功基準

#### 単体テスト
- **コードカバレッジ**: 80%以上
- **テスト成功率**: 95%以上
- **実行時間**: 5分以内

#### 統合テスト
- **テスト成功率**: 100%
- **実行時間**: 10分以内
- **エラー率**: 0%

#### E2Eテスト
- **テスト成功率**: 95%以上
- **実行時間**: 30分以内
- **ユーザビリティスコア**: 4.0/5.0以上

#### セキュリティテスト
- **脆弱性**: 0件
- **セキュリティ要件**: 100%満足
- **認証強度**: 高

#### パフォーマンステスト
- **認証処理時間**: 3秒以内
- **セッション管理時間**: 1秒以内
- **同時接続数**: 100ユーザー以上

### 失敗時の対応

#### 単体テスト失敗
1. **原因分析**: コードレビュー・ログ分析
2. **修正実装**: 問題箇所の修正
3. **再テスト**: 修正後のテスト実行
4. **回帰テスト**: 関連機能のテスト

#### 統合テスト失敗
1. **環境確認**: テスト環境の設定確認
2. **依存関係確認**: 外部サービス連携確認
3. **修正実装**: 統合部分の修正
4. **再テスト**: 修正後のテスト実行

#### E2Eテスト失敗
1. **ユーザーフロー分析**: 失敗したフローの分析
2. **UI/UX確認**: 画面表示・操作の確認
3. **修正実装**: UI/UXの修正
4. **再テスト**: 修正後のテスト実行

#### セキュリティテスト失敗
1. **脆弱性分析**: セキュリティホールの分析
2. **緊急対応**: セキュリティパッチの適用
3. **修正実装**: セキュリティ強化
4. **再テスト**: セキュリティテストの再実行

#### パフォーマンステスト失敗
1. **ボトルネック分析**: 性能問題の特定
2. **最適化実装**: パフォーマンス改善
3. **再テスト**: パフォーマンステストの再実行
4. **監視設定**: 本番環境での監視設定

---

## 📚 テストドキュメント

### テストケース管理

#### テストケースID体系
```
UT-{機能}-{番号}    # 単体テスト
IT-{機能}-{番号}    # 統合テスト
E2E-{機能}-{番号}   # E2Eテスト
SEC-{機能}-{番号}   # セキュリティテスト
PERF-{機能}-{番号}  # パフォーマンステスト
```

#### テストケース例
- `UT-AUTH-001`: 本番環境でShopify認証タイトルを表示する
- `IT-AUTH-001`: デモ認証でセッションが作成される
- `E2E-AUTH-001`: 本番環境でのOAuth認証フロー
- `SEC-AUTH-001`: パスワードハッシュがBCryptで暗号化される
- `PERF-AUTH-001`: 認証処理が3秒以内で完了する

### テスト結果レポート

#### 日次レポート
- テスト実行状況
- 成功率・失敗率
- 実行時間
- エラー詳細

#### 週次レポート
- テストトレンド分析
- 品質指標
- 改善提案
- 次週計画

#### リリース前レポート
- 全テスト結果サマリー
- 品質評価
- リリース可否判定
- リスク評価

---

## 📝 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2025-10-25 | 初版作成 | Kenji |

---

**最終更新**: 2025年10月25日  
**次回レビュー**: 2025年11月1日（週次）
