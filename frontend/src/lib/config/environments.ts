// 環境別API設定
export interface EnvironmentConfig {
  name: string;
  apiBaseUrl: string;
  description: string;
  isProduction: boolean;
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    name: '開発環境',
    apiBaseUrl: 'https://localhost:7088',
    // http://localhost:5000
    // https://43931bf0c41f.ngrok-free.app
    // https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
    // https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
    description: 'ローカル開発',
    isProduction: false,
  },
  staging: {
    name: 'ステージング環境',
    apiBaseUrl: 'https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net',
    description: 'テスト・検証用',
    isProduction: false,
  },
  production: {
    name: '本番環境',
    apiBaseUrl: 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net',
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
  // Azure Static Web Appsの検出（最優先）
  if (typeof window !== 'undefined' && window.location.hostname.includes('azurestaticapps.net')) {
    console.log('✅ Detected Azure Static Web Apps - using production environment');
    return 'production';
  }

  // 1. ビルド時の環境変数（最優先）
  const buildTimeEnv = getBuildTimeEnvironment();
  if (buildTimeEnv) {
    console.log('🔍 Using build time environment:', buildTimeEnv);
    return buildTimeEnv;
  }
  
  // 2. 実行時の環境変数
  if (process.env.NEXT_PUBLIC_ENVIRONMENT) {
    console.log('🔍 Using NEXT_PUBLIC_ENVIRONMENT:', process.env.NEXT_PUBLIC_ENVIRONMENT);
    return process.env.NEXT_PUBLIC_ENVIRONMENT;
  }
  
  // 3. NODE_ENVがproductionの場合の処理
  // Next.jsはビルド時に常にNODE_ENV=productionを設定するため、
  // NEXT_PUBLIC_ENVIRONMENTが未設定の場合のみproductionにフォールバック
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_ENVIRONMENT) {
    console.warn('⚠️ NODE_ENV is production but no explicit NEXT_PUBLIC_ENVIRONMENT found');
    console.warn('⚠️ Falling back to production environment for security');
    return 'production';
  }
  
  // 4. 開発環境でのローカルストレージ（開発環境のみ）
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
  
  // 5. デフォルトは開発環境（開発環境のみ）
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