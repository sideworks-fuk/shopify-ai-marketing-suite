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
    return 'https://localhost:7088';
  }
  
  // 本番環境のデフォルト（Azure Static Web Appsでのビルド時も含む）
  if (!isBuildTime) console.warn('⚠️ No backend URL environment variable found, using production default');
  return 'ki';
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