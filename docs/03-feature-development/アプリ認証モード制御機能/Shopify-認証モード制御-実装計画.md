# Shopify アプリ認証モード制御機能 実装計画書

## 概要

Shopify アプリ認証モード制御機能の実装計画書です。環境別に認証方式を安全に切り替える機能を段階的に実装します。

---

## 🎯 実装目標

### 主要目標
- 本番環境でのOAuth認証強制
- ステージング環境でのデモリンク表示問題解決
- デモモードでの適切なアクセス制限
- 認証フローの統一と運用性向上

### 成功基準
- ステージング環境でデモリンクが100%表示される
- デモモードでのデータ変更操作が完全にブロックされる
- 認証エラー率を10%以下に削減
- 認証処理時間を3秒以内に短縮

---

## 📅 実装スケジュール

### Phase 1: 基盤構築（1週間）
**期間**: 2025年10月28日 - 2025年11月1日

#### タスク1.1: 環境変数設計・実装（1日）
- [ ] フロントエンド環境変数の定義
- [ ] バックエンド環境変数の定義
- [ ] 環境別設定ファイルの作成
- [ ] 環境変数検証ロジックの実装

#### タスク1.2: データベース設計・実装（1日）
- [ ] セッション管理テーブルの作成
- [ ] 認証ログテーブルの作成
- [ ] 環境設定テーブルの作成
- [ ] EF Coreマイグレーションの作成

#### タスク1.3: 認証ミドルウェア実装（2日）
- [ ] AuthModeMiddlewareの実装
- [ ] 環境別認証制御ロジックの実装
- [ ] セッション管理機能の実装
- [ ] エラーハンドリングの実装

#### タスク1.4: 基本テスト実装（1日）
- [ ] 単体テストの作成
- [ ] 統合テストの作成
- [ ] テストデータの準備
- [ ] CI/CDパイプラインの更新

### Phase 2: フロントエンド実装（1週間）
**期間**: 2025年11月4日 - 2025年11月8日

#### タスク2.1: 認証画面コンポーネント実装（2日）
- [ ] AuthenticationRequiredコンポーネントの改修
- [ ] 環境別表示制御の実装
- [ ] 動的タイトル・ボタン表示の実装
- [ ] エラーハンドリングの実装

#### タスク2.2: デモモード機能実装（2日）
- [ ] DeveloperModeBannerコンポーネントの実装
- [ ] セッション管理機能の実装
- [ ] ログアウト機能の実装
- [ ] タイマー機能の実装

#### タスク2.3: 認証ガード実装（2日）
- [ ] AuthGuardコンポーネントの実装
- [ ] 認証状態管理の実装
- [ ] ルート保護機能の実装
- [ ] リダイレクト機能の実装

#### タスク2.4: 統合テスト（1日）
- [ ] フロントエンド統合テスト
- [ ] ブラウザテストの実装
- [ ] パフォーマンステスト
- [ ] アクセシビリティテスト

### Phase 3: バックエンド実装（1週間）
**期間**: 2025年11月11日 - 2025年11月15日

#### タスク3.1: デモ認証サービス実装（2日）
- [ ] DemoAuthServiceの実装
- [ ] パスワード検証機能の実装
- [ ] JWT生成機能の実装
- [ ] セッション管理機能の実装

#### タスク3.2: アクセス制御実装（2日）
- [ ] RequireOAuthAttributeの実装
- [ ] デモモード制限機能の実装
- [ ] APIエンドポイント保護の実装
- [ ] エラーレスポンスの実装

#### タスク3.3: セキュリティ機能実装（2日）
- [ ] パスワードハッシュ化の実装
- [ ] セッション検証機能の実装
- [ ] レート制限機能の実装
- [ ] セキュリティログの実装

#### タスク3.4: 統合テスト（1日）
- [ ] バックエンド統合テスト
- [ ] APIテストの実装
- [ ] セキュリティテスト
- [ ] パフォーマンステスト

### Phase 4: 統合・テスト（1週間）
**期間**: 2025年11月18日 - 2025年11月22日

#### タスク4.1: システム統合（2日）
- [ ] フロントエンド・バックエンド統合
- [ ] 環境別設定の適用
- [ ] デプロイメント設定の更新
- [ ] 設定確認・調整

#### タスク4.2: 総合テスト（2日）
- [ ] エンドツーエンドテスト
- [ ] 環境別動作確認
- [ ] セキュリティテスト
- [ ] パフォーマンステスト

#### タスク4.3: ドキュメント整備（1日）
- [ ] 実装ドキュメントの更新
- [ ] 運用マニュアルの作成
- [ ] トラブルシューティングガイドの作成
- [ ] コードレビューの実施

---

## 🛠️ 実装詳細

### 1. 環境変数実装

#### フロントエンド環境変数

```typescript
// environments.ts
export const getEnvironmentConfig = () => {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE || 'all_allowed'
  
  return {
    environment: environment as 'production' | 'staging' | 'development',
    authMode: authMode as 'oauth_required' | 'demo_allowed' | 'all_allowed',
    devPassword: process.env.NEXT_PUBLIC_DEV_PASSWORD || 'dev123',
    enableDevTools: process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true',
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    demoSessionTimeout: parseInt(process.env.NEXT_PUBLIC_DEMO_SESSION_TIMEOUT || '60')
  }
}

// 環境変数検証
export const validateEnvironmentConfig = () => {
  const config = getEnvironmentConfig()
  
  // 本番環境での安全弁
  if (config.environment === 'production' && config.authMode !== 'oauth_required') {
    throw new Error('Production environment must use oauth_required auth mode')
  }
  
  // 必須環境変数の確認
  if (!config.devPassword) {
    throw new Error('NEXT_PUBLIC_DEV_PASSWORD is required')
  }
  
  return config
}
```

#### バックエンド環境変数

```csharp
// appsettings.json
{
  "Authentication": {
    "Mode": "OAuthRequired", // OAuthRequired, DemoAllowed, AllAllowed
    "JwtSecret": "your-jwt-secret-key",
    "JwtExpiryHours": 24
  },
  "Demo": {
    "PasswordHash": "$2a$10$...", // bcrypt hash
    "SessionTimeoutHours": 1,
    "MaxSessionsPerUser": 5
  },
  "Security": {
    "RequireHttps": true,
    "EnableCors": false,
    "AllowedOrigins": []
  }
}

// ConfigurationExtensions.cs
public static class ConfigurationExtensions
{
    public static AuthConfig GetAuthConfig(this IConfiguration config)
    {
        return new AuthConfig
        {
            Mode = config["Authentication:Mode"] switch
            {
                "OAuthRequired" => AuthMode.OAuthRequired,
                "DemoAllowed" => AuthMode.DemoAllowed,
                "AllAllowed" => AuthMode.AllAllowed,
                _ => throw new InvalidOperationException("Invalid authentication mode")
            },
            JwtSecret = config["Authentication:JwtSecret"] 
                ?? throw new InvalidOperationException("JWT secret is required"),
            JwtExpiryHours = config.GetValue<int>("Authentication:JwtExpiryHours", 24)
        };
    }
}
```

### 2. データベース実装

#### EF Coreエンティティ

```csharp
// DemoSession.cs
public class DemoSession
{
    public Guid Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime LastAccessedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
}

// AuthenticationLog.cs
public class AuthenticationLog
{
    public Guid Id { get; set; }
    public string? UserId { get; set; }
    public string AuthMode { get; set; } = string.Empty; // oauth, demo, dev
    public bool Success { get; set; }
    public string? FailureReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
}

// DbContext
public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }
    
    public DbSet<DemoSession> DemoSessions { get; set; }
    public DbSet<AuthenticationLog> AuthenticationLogs { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DemoSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionId).IsUnique();
            entity.HasIndex(e => e.ExpiresAt);
        });
        
        modelBuilder.Entity<AuthenticationLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.AuthMode);
        });
    }
}
```

#### マイグレーション

```csharp
// 20251025_AddAuthModeControl.cs
public partial class AddAuthModeControl : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "DemoSessions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                SessionId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                LastAccessedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false),
                CreatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DemoSessions", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_DemoSessions_SessionId",
            table: "DemoSessions",
            column: "SessionId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_DemoSessions_ExpiresAt",
            table: "DemoSessions",
            column: "ExpiresAt");

        migrationBuilder.CreateTable(
            name: "AuthenticationLogs",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                AuthMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                Success = table.Column<bool>(type: "bit", nullable: false),
                FailureReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AuthenticationLogs", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_AuthenticationLogs_CreatedAt",
            table: "AuthenticationLogs",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_AuthenticationLogs_AuthMode",
            table: "AuthenticationLogs",
            column: "AuthMode");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AuthenticationLogs");
        migrationBuilder.DropTable(name: "DemoSessions");
    }
}
```

### 3. フロントエンド実装

#### 認証画面コンポーネント

```typescript
// AuthenticationRequired.tsx
import { getEnvironmentConfig } from '@/lib/environments'

interface AuthenticationRequiredProps {
  hasShopParam?: boolean
  message?: string
  onShopifyAuth?: () => void
  onDemoAuth?: () => void
}

export const AuthenticationRequired: React.FC<AuthenticationRequiredProps> = ({
  hasShopParam = false,
  message,
  onShopifyAuth,
  onDemoAuth
}) => {
  const config = getEnvironmentConfig()
  
  // 環境に応じたタイトル
  const title = config.environment === 'production' 
    ? 'Shopify認証が必要です' 
    : '認証が必要です'
  
  // 環境に応じたメッセージ
  const defaultMessage = config.environment === 'production'
    ? 'セッションが無効または期限切れです。Shopify認証を実行してください。'
    : 'このアプリにアクセスするには認証が必要です。'
  
  // デモリンク表示判定
  const showDemoLink = config.authMode !== 'oauth_required'
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h1>
          <p className="text-gray-600 mb-6">
            {message ?? defaultMessage}
          </p>
        </div>
        
        {config.environment === 'production' && !hasShopParam ? (
          <ProductionGuidance />
        ) : (
          <AuthOptions 
            showOAuth={true}
            showDemo={showDemoLink}
            onShopifyAuth={onShopifyAuth}
            onDemoAuth={onDemoAuth}
            environment={config.environment}
          />
        )}
      </div>
    </div>
  )
}

// AuthOptions.tsx
interface AuthOptionsProps {
  showOAuth: boolean
  showDemo: boolean
  onShopifyAuth?: () => void
  onDemoAuth?: () => void
  environment: string
}

const AuthOptions: React.FC<AuthOptionsProps> = ({
  showOAuth,
  showDemo,
  onShopifyAuth,
  onDemoAuth,
  environment
}) => {
  return (
    <div className="space-y-4">
      {/* OAuth認証ボタン */}
      {showOAuth && (
        <div className="space-y-3">
          <Button 
            onClick={onShopifyAuth} 
            className="w-full"
            variant="default"
          >
            Shopifyで認証する
          </Button>
          {environment !== 'production' && (
            <p className="text-xs text-gray-500 text-center">
              💡 Shopify OAuth認証フローをテストできます。
            </p>
          )}
        </div>
      )}
      
      {/* デモリンク */}
      {showDemo && (
        <div className="border-t pt-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              🎯 デモ・プレゼンテーション用
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Shopify認証なしでデータを確認できます。
            </p>
          </div>
          <Button 
            onClick={onDemoAuth}
            className="w-full"
            variant="outline"
          >
            デモサイトを開く
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            ※ パスワード認証でアクセスできます
          </p>
        </div>
      )}
    </div>
  )
}
```

#### デモモードバナー

```typescript
// DeveloperModeBanner.tsx
interface DeveloperModeBannerProps {
  sessionExpiresAt: Date
  onLogout: () => void
}

export const DeveloperModeBanner: React.FC<DeveloperModeBannerProps> = ({
  sessionExpiresAt,
  onLogout
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, sessionExpiresAt.getTime() - Date.now())
      setTimeRemaining(Math.floor(remaining / 60000)) // 分単位
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [sessionExpiresAt])
  
  const formatTime = (minutes: number) => {
    if (minutes <= 0) return '期限切れ'
    if (minutes < 60) return `${minutes}分`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}時間${mins}分`
  }
  
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">開発者ツール有効</span>
              <span className="ml-2">（データ閲覧専用モード）</span>
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              セッション残り: {formatTime(timeRemaining)}
            </p>
          </div>
        </div>
        <Button
          onClick={onLogout}
          size="sm"
          variant="outline"
          className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
        >
          ログアウト
        </Button>
      </div>
    </div>
  )
}
```

### 4. バックエンド実装

#### 認証ミドルウェア

```csharp
// AuthModeMiddleware.cs
public class AuthModeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthModeMiddleware> _logger;
    private readonly IMemoryCache _cache;

    public AuthModeMiddleware(
        RequestDelegate next, 
        IConfiguration config, 
        ILogger<AuthModeMiddleware> logger,
        IMemoryCache cache)
    {
        _next = next;
        _config = config;
        _logger = logger;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var authConfig = _config.GetAuthConfig();
        var environment = _config["Environment"];
        
        // 本番環境安全弁
        if (environment == "Production" && authConfig.Mode != AuthMode.OAuthRequired)
        {
            _logger.LogError("Invalid authentication mode for production environment: {Mode}", authConfig.Mode);
            context.Response.StatusCode = 500;
            await context.Response.WriteAsync("Invalid authentication configuration");
            return;
        }
        
        // 認証チェック
        var authResult = await CheckAuthenticationAsync(context, authConfig);
        
        if (!authResult.IsAuthenticated)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Authentication required");
            return;
        }
        
        // 認証モード情報をコンテキストに設定
        context.Items["AuthMode"] = authResult.AuthMode;
        context.Items["IsDemoMode"] = authResult.IsDemoMode;
        context.Items["ShopifyApiRestricted"] = authResult.IsDemoMode;
        
        await _next(context);
    }
    
    private async Task<AuthResult> CheckAuthenticationAsync(HttpContext context, AuthConfig config)
    {
        var oauthToken = context.Request.Cookies["shopify_oauth_token"];
        var demoToken = context.Request.Cookies["demo_auth_token"];
        
        // OAuth認証チェック
        if (!string.IsNullOrEmpty(oauthToken))
        {
            var isValidOAuth = await ValidateOAuthTokenAsync(oauthToken);
            if (isValidOAuth)
            {
                return new AuthResult 
                { 
                    IsAuthenticated = true, 
                    AuthMode = "oauth",
                    IsDemoMode = false 
                };
            }
        }
        
        // デモ認証チェック
        if (!string.IsNullOrEmpty(demoToken) && config.Mode != AuthMode.OAuthRequired)
        {
            var isValidDemo = await ValidateDemoTokenAsync(demoToken);
            if (isValidDemo)
            {
                return new AuthResult 
                { 
                    IsAuthenticated = true, 
                    AuthMode = "demo",
                    IsDemoMode = true 
                };
            }
        }
        
        return new AuthResult { IsAuthenticated = false };
    }
}

// AuthResult.cs
public class AuthResult
{
    public bool IsAuthenticated { get; set; }
    public string AuthMode { get; set; } = string.Empty;
    public bool IsDemoMode { get; set; }
}
```

#### デモ認証サービス

```csharp
// DemoAuthService.cs
public class DemoAuthService
{
    private readonly IConfiguration _config;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DemoAuthService> _logger;
    private readonly AuthDbContext _context;

    public DemoAuthService(
        IConfiguration config,
        IMemoryCache cache,
        ILogger<DemoAuthService> logger,
        AuthDbContext context)
    {
        _config = config;
        _cache = cache;
        _logger = logger;
        _context = context;
    }

    public async Task<DemoAuthResult> AuthenticateAsync(string password, string? ipAddress = null)
    {
        var hashedPassword = _config["Demo:PasswordHash"];
        var isValid = BCrypt.Verify(password, hashedPassword);
        
        if (!isValid)
        {
            _logger.LogWarning("Invalid demo password attempt from IP: {IpAddress}", ipAddress);
            await LogAuthenticationAttemptAsync("demo", false, "Invalid password", ipAddress);
            return new DemoAuthResult { Success = false, ErrorMessage = "Invalid password" };
        }
        
        var sessionId = Guid.NewGuid().ToString();
        var expiresAt = DateTime.UtcNow.AddHours(
            _config.GetValue<int>("Demo:SessionTimeoutHours", 1)
        );
        
        var session = new DemoSession
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            LastAccessedAt = DateTime.UtcNow,
            IsActive = true
        };
        
        // データベースに保存
        _context.DemoSessions.Add(session);
        await _context.SaveChangesAsync();
        
        // メモリキャッシュに保存
        _cache.Set($"demo_session_{sessionId}", session, expiresAt);
        
        var token = GenerateDemoToken(session);
        
        await LogAuthenticationAttemptAsync("demo", true, null, ipAddress);
        
        return new DemoAuthResult
        {
            Success = true,
            Token = token,
            ExpiresAt = expiresAt,
            SessionId = sessionId
        };
    }
    
    public async Task<bool> ValidateTokenAsync(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_config["Authentication:JwtSecret"]);
            
            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);
            
            var jwtToken = (JwtSecurityToken)validatedToken;
            var sessionId = jwtToken.Claims.First(x => x.Type == "session_id").Value;
            
            // メモリキャッシュから確認
            if (_cache.TryGetValue($"demo_session_{sessionId}", out DemoSession? cachedSession))
            {
                if (cachedSession!.IsActive && cachedSession.ExpiresAt > DateTime.UtcNow)
                {
                    // 最終アクセス時間を更新
                    cachedSession.LastAccessedAt = DateTime.UtcNow;
                    _cache.Set($"demo_session_{sessionId}", cachedSession, cachedSession.ExpiresAt);
                    return true;
                }
            }
            
            // データベースから確認
            var dbSession = await _context.DemoSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive);
            
            if (dbSession != null && dbSession.ExpiresAt > DateTime.UtcNow)
            {
                dbSession.LastAccessedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return true;
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating demo token");
            return false;
        }
    }
    
    private string GenerateDemoToken(DemoSession session)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_config["Authentication:JwtSecret"]);
        
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("session_id", session.SessionId),
                new Claim("auth_mode", "demo"),
                new Claim("expires_at", session.ExpiresAt.ToString("O"))
            }),
            Expires = session.ExpiresAt,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key), 
                SecurityAlgorithms.HmacSha256Signature
            )
        };
        
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
    
    private async Task LogAuthenticationAttemptAsync(
        string authMode, 
        bool success, 
        string? failureReason, 
        string? ipAddress)
    {
        var log = new AuthenticationLog
        {
            Id = Guid.NewGuid(),
            AuthMode = authMode,
            Success = success,
            FailureReason = failureReason,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.AuthenticationLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}
```

---

## 🧪 テスト実装

### 単体テスト

#### フロントエンドテスト

```typescript
// AuthenticationRequired.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthenticationRequired } from './AuthenticationRequired'

// モック設定
jest.mock('@/lib/environments', () => ({
  getEnvironmentConfig: jest.fn()
}))

describe('AuthenticationRequired', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('should show Shopify title in production', () => {
    const { getEnvironmentConfig } = require('@/lib/environments')
    getEnvironmentConfig.mockReturnValue({
      environment: 'production',
      authMode: 'oauth_required'
    })
    
    render(<AuthenticationRequired />)
    
    expect(screen.getByText('Shopify認証が必要です')).toBeInTheDocument()
  })
  
  it('should show demo link in staging', () => {
    const { getEnvironmentConfig } = require('@/lib/environments')
    getEnvironmentConfig.mockReturnValue({
      environment: 'staging',
      authMode: 'demo_allowed'
    })
    
    render(<AuthenticationRequired />)
    
    expect(screen.getByText('デモサイトを開く')).toBeInTheDocument()
  })
  
  it('should not show demo link in production', () => {
    const { getEnvironmentConfig } = require('@/lib/environments')
    getEnvironmentConfig.mockReturnValue({
      environment: 'production',
      authMode: 'oauth_required'
    })
    
    render(<AuthenticationRequired />)
    
    expect(screen.queryByText('デモサイトを開く')).not.toBeInTheDocument()
  })
})
```

#### バックエンドテスト

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
}
```

### 統合テスト

```csharp
// AuthenticationIntegrationTests.cs
[TestFixture]
public class AuthenticationIntegrationTests
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

---

## 🚀 デプロイメント計画

### 環境別デプロイメント

#### 1. 開発環境デプロイ
```bash
# 環境変数設定
export NEXT_PUBLIC_ENVIRONMENT=development
export NEXT_PUBLIC_AUTH_MODE=all_allowed
export NEXT_PUBLIC_DEV_PASSWORD=dev123

# データベースマイグレーション
dotnet ef database update

# アプリケーション起動
npm run dev
dotnet run
```

#### 2. ステージング環境デプロイ
```bash
# 環境変数設定
export NEXT_PUBLIC_ENVIRONMENT=staging
export NEXT_PUBLIC_AUTH_MODE=demo_allowed
export NEXT_PUBLIC_DEV_PASSWORD=staging-demo-password

# データベースマイグレーション
dotnet ef database update --environment Staging

# アプリケーションデプロイ
npm run build
dotnet publish -c Release
```

#### 3. 本番環境デプロイ
```bash
# 環境変数設定
export NEXT_PUBLIC_ENVIRONMENT=production
export NEXT_PUBLIC_AUTH_MODE=oauth_required
export NEXT_PUBLIC_ENABLE_DEV_TOOLS=false

# データベースマイグレーション
dotnet ef database update --environment Production

# アプリケーションデプロイ
npm run build
dotnet publish -c Release
```

### ロールバック計画

#### 緊急時ロールバック
1. **設定変更**: 環境変数を前のバージョンに戻す
2. **アプリケーション再起動**: 設定変更を反映
3. **動作確認**: 基本機能の動作確認
4. **データベースロールバック**: 必要に応じてマイグレーションのロールバック

#### 段階的ロールバック
1. **機能無効化**: 問題のある機能を無効化
2. **部分修正**: 問題箇所のみを修正
3. **段階的復旧**: 機能を段階的に復旧
4. **完全復旧**: 全機能の復旧確認

---

## 📊 成功指標・KPI

### 定量的指標

| 指標 | 現在値 | 目標値 | 測定方法 |
|------|--------|--------|----------|
| ステージング環境デモリンク表示率 | 0% | 100% | 手動確認 |
| 認証エラー率 | 100% | 10%以下 | エラーログ分析 |
| デモモードセキュリティ違反 | 未測定 | 0件 | セキュリティ監査 |
| 認証処理時間 | 未測定 | 3秒以内 | パフォーマンス測定 |
| セッション管理精度 | 未測定 | 99%以上 | セッション追跡 |

### 定性的指標

| 指標 | 評価方法 | 目標 |
|------|----------|------|
| ユーザー満足度 | アンケート調査 | 4.0/5.0以上 |
| セキュリティレベル | セキュリティ監査 | 向上 |
| 運用効率 | 観察・記録 | 向上 |
| 開発効率 | 開発者インタビュー | 向上 |

---

## 📚 関連ドキュメント

### 技術ドキュメント
- [要件定義書](../01-requirements/Shopify-認証モード制御-要件定義.md)
- [設計書](../02-design/Shopify-認証モード制御-設計書.md)
- [テスト計画書](../04-review/Shopify-認証モード制御-テスト計画.md)

### 既存ドキュメント
- [認証モード一覧](../../05-development/09-認証・セキュリティ/認証モード一覧.md)
- [認証画面表示仕様](../../05-development/09-認証・セキュリティ/認証画面表示仕様.md)
- [環境変数チェックリスト](../../05-development/09-認証・セキュリティ/環境変数チェックリスト.md)

---

## 📝 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2025-10-25 | 初版作成 | Kenji |

---

**最終更新**: 2025年10月25日  
**次回レビュー**: 2025年11月1日（週次）
