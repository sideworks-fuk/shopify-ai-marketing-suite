// 認証モード制御の型定義
export type AuthMode = 'oauth_required' | 'demo_allowed' | 'all_allowed'
export type Environment = 'production' | 'staging' | 'development'

// 環境設定インターフェース（拡張版）
export interface EnvironmentAuthConfig {
  environment: Environment
  authMode: AuthMode
  enableDevTools: boolean
  debugMode: boolean
}

// 環境別API設定
export interface EnvironmentConfig {
  name: string;
  apiBaseUrl: string;
  description: string;
  isProduction: boolean;
}

// ビルド時とランタイムの処理を分離
const isBuildTime = typeof window === 'undefined';

// 環境変数から設定を取得する関数
const getApiBaseUrl = (): string => {
  // 環境変数の優先順位
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL; // legacy
  
  if (apiUrl) {
    if (!isBuildTime) console.log('🔍 Using NEXT_PUBLIC_API_URL:', apiUrl);
    return apiUrl;
  }
  
  if (backendUrl) {
    if (!isBuildTime) console.log('⚠️ Using legacy NEXT_PUBLIC_BACKEND_URL:', backendUrl);
    return backendUrl;
  }
  
  // デフォルト値
  if (process.env.NODE_ENV === 'development') {
    if (!isBuildTime) console.warn('⚠️ No backend URL environment variable found, using default for development');
    return 'https://localhost:7089';
  }
  
  // 本番環境では必須
  if (!isBuildTime) {
    console.error('🚨 CRITICAL: NEXT_PUBLIC_API_URL is not set in production environment');
  }
  throw new Error('NEXT_PUBLIC_API_URL must be set in production environment');
};

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    name: '開発環境',
    apiBaseUrl: getApiBaseUrl(),
    description: 'ローカル開発',
    isProduction: false,
  },
  staging: {
    name: 'ステージング環境',
    apiBaseUrl: getApiBaseUrl(),
    description: 'テスト・検証用',
    isProduction: false,
  },
  production: {
    name: '本番環境',
    apiBaseUrl: getApiBaseUrl(),
    description: '本番運用環境',
    isProduction: true,
  },
};

// ビルド時の環境変数から環境を取得（簡素化版）
const getBuildTimeEnvironment = (): string | null => {
  // 単一の環境変数のみを使用
  const nextPublicEnv = process.env.NEXT_PUBLIC_ENVIRONMENT;
  
  if (nextPublicEnv && ENVIRONMENTS[nextPublicEnv]) {
    console.log('🔍 Using NEXT_PUBLIC_ENVIRONMENT:', nextPublicEnv);
    return nextPublicEnv;
  }
  
  return null;
};

// 環境設定の検証機能（循環参照回避版）
export const validateEnvironmentConfig = (
  env: string,
  config: EnvironmentConfig
): void => {
  // API URLの存在チェック
  if (!config.apiBaseUrl) {
    console.error(`🚨 Missing API URL for environment: ${env}`);
    throw new Error(`Missing API URL for environment: ${env}`);
  }

  // 本番環境（production）として明示的に指定されている場合のみ厳格なチェックを行う
  if (env === 'production') {
    // 本番環境でのdevelopment API接続チェック
    if (config.apiBaseUrl.includes('develop')) {
      console.error(`🚨 Production environment cannot use development API: ${config.apiBaseUrl}`);
      throw new Error(`Production environment cannot use development API: ${config.apiBaseUrl}`);
    }
  }

  // NODE_ENVはNext.jsがビルド時に自動的にproductionに設定するため、
  // NEXT_PUBLIC_ENVIRONMENTを信頼できる環境設定として使用する
  console.log(`✅ Environment configuration validated: ${env} -> ${config.apiBaseUrl}`);
};

// 現在の環境を取得
export const getCurrentEnvironment = (): string => {
  // 1. NEXT_PUBLIC_ENVIRONMENT環境変数（最優先）
  // Azure Static Web Appsの環境変数設定を信頼する
  if (process.env.NEXT_PUBLIC_ENVIRONMENT) {
    const env = process.env.NEXT_PUBLIC_ENVIRONMENT;
    if (ENVIRONMENTS[env]) {
      console.log('🔍 Using NEXT_PUBLIC_ENVIRONMENT:', env);
      return env;
    }
    console.warn('⚠️ Invalid NEXT_PUBLIC_ENVIRONMENT value:', env);
  }
  
  // 2. NODE_ENVがproductionの場合の処理
  // Next.jsはビルド時に常にNODE_ENV=productionを設定するため、
  // NEXT_PUBLIC_ENVIRONMENTが未設定の場合のみproductionにフォールバック
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ NODE_ENV is production but no explicit NEXT_PUBLIC_ENVIRONMENT found');
    console.warn('⚠️ Falling back to production environment for security');
    return 'production';
  }
  
  // 3. 開発環境でのローカルストレージ（開発環境のみ）
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const storedEnvironment = localStorage.getItem('selectedEnvironment');
    if (storedEnvironment && ENVIRONMENTS[storedEnvironment]) {
      // 開発環境では本番環境への切り替えを制限
      if (storedEnvironment === 'production') {
        console.warn('⚠️ Development mode: Production environment selection is ignored');
        return 'development';
      }
      console.log('🔍 Using localStorage environment:', storedEnvironment);
      return storedEnvironment;
    }
  }
  
  // 4. デフォルトは開発環境（開発環境のみ）
  console.log('🔍 Using default development environment');
  return 'development';
};

// 現在の環境設定を取得
export const getCurrentEnvironmentConfig = (): EnvironmentConfig => {
  const env = getCurrentEnvironment();
  const config = ENVIRONMENTS[env] || ENVIRONMENTS.development;
  
  // 設定取得後に検証を実行（引数として渡して循環参照を回避）
  try {
    validateEnvironmentConfig(env, config);
  } catch (error) {
    console.error('🚨 Environment configuration validation failed:', error);
    // 本番環境での設定エラーは致命的エラーとして扱う
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    // 開発環境では警告として扱い、developmentにフォールバック
    console.warn('⚠️ Falling back to development environment due to configuration error');
    return ENVIRONMENTS.development;
  }
  
  return config;
};

// 利用可能な環境一覧を取得
export const getAvailableEnvironments = (): EnvironmentConfig[] => {
  return Object.values(ENVIRONMENTS);
};

// 環境を設定
export const setEnvironment = (environmentKey: string): void => {
  if (ENVIRONMENTS[environmentKey]) {
    if (typeof window !== 'undefined') {
      // 開発環境では本番環境への切り替えを制限
      if (process.env.NODE_ENV === 'development' && environmentKey === 'production') {
        console.warn('⚠️ Development mode: Cannot switch to production environment');
        return;
      }
      localStorage.setItem('selectedEnvironment', environmentKey);
    }
  }
};

// 環境設定をリセット
export const resetEnvironment = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('selectedEnvironment');
  }
};

// ビルド時の環境情報を取得（簡素化版）
export const getBuildTimeEnvironmentInfo = () => {
  return {
    nextPublicEnvironment: process.env.NEXT_PUBLIC_ENVIRONMENT,
    nodeEnv: process.env.NODE_ENV,
    isBuildTimeSet: !!getBuildTimeEnvironment(),
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  };
};

// デバッグ情報取得（循環参照なし）
export const getEnvironmentDebugInfo = () => {
  const env = getCurrentEnvironment();
  const config = ENVIRONMENTS[env] || ENVIRONMENTS.development;

  return {
    currentEnvironment: env,
    nodeEnv: process.env.NODE_ENV,
    apiBaseUrl: config.apiBaseUrl,
    isProduction: config.isProduction,
    buildTimeInfo: getBuildTimeEnvironmentInfo(),
    securityChecks: {
      isProductionSafe: env !== 'production' || !config.apiBaseUrl.includes('develop'),
      isDevelopmentApiBlocked: !config.apiBaseUrl.includes('develop') || !config.isProduction,
      configurationValid: (() => {
        try {
          validateEnvironmentConfig(env, config);
          return true;
        } catch {
          return false;
        }
      })()
    }
  };
};

// 認証モード制御設定を取得（UI表示用のみ）
// ⚠️ 重要: この設定はUI表示のヒントとしてのみ使用し、セキュリティ判定には使用しない
//           すべての認証・認可判定はサーバー側で実施する
export const getAuthModeConfig = (): EnvironmentAuthConfig => {
  const environment = (process.env.NEXT_PUBLIC_ENVIRONMENT || 'development') as Environment
  const authMode = (process.env.NEXT_PUBLIC_AUTH_MODE || 'all_allowed') as AuthMode
  const enableDevTools = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true'
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'

  // クライアント側では警告のみ（セキュリティ制御はサーバー側）
  if (!isBuildTime && environment === 'production' && authMode !== 'oauth_required') {
    console.warn('⚠️ Warning: Production environment should use oauth_required mode')
    console.warn('⚠️ This is a UI display hint only. Server-side authentication will enforce security.')
  }

  return {
    environment,
    authMode,
    enableDevTools,
    debugMode
  }
}

// 認証モード設定の検証（UI表示用）
export const validateAuthModeConfig = (config: EnvironmentAuthConfig): boolean => {
  // 環境と認証モードの整合性チェック（推奨設定）
  const recommendations: Record<Environment, AuthMode> = {
    production: 'oauth_required',
    staging: 'demo_allowed',
    development: 'all_allowed'
  }

  const recommended = recommendations[config.environment]
  if (config.authMode !== recommended) {
    console.warn(`⚠️ Recommended auth mode for ${config.environment} is "${recommended}", but "${config.authMode}" is configured`)
  }

  return true
} 