/**
 * 環境設定のバリデーション
 * アプリケーション起動時に実行して、設定の問題を早期に発見
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    frontendUrl?: string;
    backendUrl?: string;
    environment?: string;
  };
}

/**
 * 必須の環境設定を検証
 */
export function validateEnvironmentConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: ConfigValidationResult['config'] = {};

  // フロントエンドURL
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 
                      process.env.FRONTEND_URL;
  
  if (!frontendUrl) {
    errors.push('FRONTEND_URL is not configured. This is required for OAuth callbacks.');
  } else {
    // URL形式の検証
    try {
      new URL(frontendUrl);
      config.frontendUrl = frontendUrl;
    } catch {
      errors.push(`FRONTEND_URL is not a valid URL: ${frontendUrl}`);
    }
  }

  // バックエンドURL
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_URL ||
                     process.env.API_URL;
  
  if (!backendUrl) {
    errors.push('Backend API URL is not configured.');
  } else {
    try {
      new URL(backendUrl);
      config.backendUrl = backendUrl;
    } catch {
      errors.push(`Backend URL is not a valid URL: ${backendUrl}`);
    }
  }

  // Shopify設定
  const shopifyApiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  if (!shopifyApiKey) {
    warnings.push('SHOPIFY_API_KEY is not configured. This may be required for Shopify App Bridge.');
  }

  // 環境名
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 
                      process.env.NODE_ENV || 
                      'development';
  config.environment = environment;

  // 開発環境特有のチェック
  if (environment === 'development') {
    if (backendUrl?.includes('https://localhost')) {
      warnings.push('Using HTTPS with localhost. SSL certificate errors may occur.');
    }
  }

  // 本番環境特有のチェック
  if (environment === 'production') {
    if (!frontendUrl?.startsWith('https://')) {
      errors.push('Production FRONTEND_URL must use HTTPS.');
    }
    if (!backendUrl?.startsWith('https://')) {
      errors.push('Production Backend URL must use HTTPS.');
    }
    if (frontendUrl?.includes('localhost') || backendUrl?.includes('localhost')) {
      errors.push('Production environment cannot use localhost URLs.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * 設定検証結果をログ出力
 */
export function logConfigValidation(result: ConfigValidationResult): void {
  console.group('🔧 Environment Configuration Validation');
  
  if (result.isValid) {
    console.log('✅ Configuration is valid');
  } else {
    console.error('❌ Configuration has errors');
  }

  if (result.errors.length > 0) {
    console.group('❌ Errors:');
    result.errors.forEach(error => console.error(`  • ${error}`));
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group('⚠️ Warnings:');
    result.warnings.forEach(warning => console.warn(`  • ${warning}`));
    console.groupEnd();
  }

  console.group('📋 Current Configuration:');
  console.table(result.config);
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * 起動時の設定チェック（app/layout.tsx などで使用）
 */
export function checkConfigurationOnStartup(): void {
  if (typeof window === 'undefined') {
    // サーバーサイドでのみ実行
    const validation = validateEnvironmentConfig();
    logConfigValidation(validation);

    if (!validation.isValid && process.env.NODE_ENV === 'production') {
      // 本番環境で設定エラーがある場合は警告を強調
      console.error('');
      console.error('🚨🚨🚨 CRITICAL CONFIGURATION ERROR 🚨🚨🚨');
      console.error('The application is not properly configured for production.');
      console.error('Please fix the following errors before deploying:');
      validation.errors.forEach(error => console.error(`  ❌ ${error}`));
      console.error('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
      console.error('');
      
      // 本番環境では、設定エラーがある場合にプロセスを終了することも検討
      if (process.env.EXIT_ON_CONFIG_ERROR === 'true') {
        process.exit(1);
      }
    }
  }
}

/**
 * ランタイムでの設定取得（エラー時は例外をスロー）
 */
export function getRequiredConfig(key: string): string {
  const value = process.env[key];
  
  if (!value) {
    const error = new Error(
      `Required configuration "${key}" is not set. ` +
      `Please check your environment variables.`
    );
    error.name = 'ConfigurationError';
    throw error;
  }
  
  return value;
}

/**
 * フロントエンドURLを取得（エラー時は例外をスロー）
 */
export function getFrontendUrl(): string {
  const url = process.env.NEXT_PUBLIC_FRONTEND_URL || 
              process.env.FRONTEND_URL;
  
  if (!url) {
    throw new Error(
      'Frontend URL is not configured. ' +
      'Please set NEXT_PUBLIC_FRONTEND_URL or FRONTEND_URL environment variable.'
    );
  }
  
  // URL形式の検証
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid frontend URL format: ${url}`);
  }
  
  return url;
}

/**
 * バックエンドAPIのURLを取得（エラー時は例外をスロー）
 * 
 * 優先順位:
 * 1. NEXT_PUBLIC_BACKEND_URL (ngrok URLを含む、統一された環境変数)
 * 2. NEXT_PUBLIC_API_URL (フォールバック)
 * 3. API_URL (レガシー)
 */
export function getBackendApiUrl(): string {
  // 優先順位: NEXT_PUBLIC_BACKEND_URL（ngrok URLを含む、統一された環境変数）
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    try {
      new URL(backendUrl);
      return backendUrl;
    } catch {
      console.warn('⚠️ NEXT_PUBLIC_BACKEND_URL is invalid, falling back to NEXT_PUBLIC_API_URL');
    }
  }
  
  // フォールバック: NEXT_PUBLIC_API_URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      new URL(apiUrl);
      return apiUrl;
    } catch {
      console.warn('⚠️ NEXT_PUBLIC_API_URL is invalid, falling back to API_URL');
    }
  }
  
  // レガシー: API_URL
  const legacyUrl = process.env.API_URL;
  if (legacyUrl) {
    try {
      new URL(legacyUrl);
      return legacyUrl;
    } catch {
      throw new Error(`Invalid API_URL format: ${legacyUrl}`);
    }
  }
  
  // 環境変数が設定されていない場合はエラー
  throw new Error(
    'Backend API URL is not configured. ' +
    'Please set NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_API_URL, or API_URL environment variable.'
  );
}

/**
 * URLをパースしてホストとプロトコルを取得
 */
export function parseUrl(url: string): { host: string; protocol: string } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host,
      protocol: parsed.protocol.replace(':', '')
    };
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }
}