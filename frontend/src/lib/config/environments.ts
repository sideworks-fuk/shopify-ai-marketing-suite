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
    description: 'ローカル開発用',
    isProduction: false,
  },
  staging: {
    name: 'ステージング環境',
    apiBaseUrl: 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net',
    description: 'テスト・検証用',
    isProduction: false,
  },
  production: {
    name: '本番環境',
    apiBaseUrl: 'https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net',
    description: '本番運用環境',
    isProduction: true,
  },
};

// ビルド時の環境変数から環境を取得
const getBuildTimeEnvironment = (): string | null => {
  // ビルド時に設定される環境変数
  const buildEnv = process.env.NEXT_PUBLIC_BUILD_ENVIRONMENT;
  const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENVIRONMENT;
  const appEnv = process.env.NEXT_PUBLIC_APP_ENVIRONMENT;
  
  // 優先順位: BUILD_ENVIRONMENT > DEPLOY_ENVIRONMENT > APP_ENVIRONMENT
  if (buildEnv && ENVIRONMENTS[buildEnv]) {
    return buildEnv;
  }
  
  if (deployEnv && ENVIRONMENTS[deployEnv]) {
    return deployEnv;
  }
  
  if (appEnv && ENVIRONMENTS[appEnv]) {
    return appEnv;
  }
  
  return null;
};

// 現在の環境を取得
export const getCurrentEnvironment = (): string => {
  // 1. ビルド時の環境変数（最優先）
  const buildTimeEnv = getBuildTimeEnvironment();
  if (buildTimeEnv) {
    return buildTimeEnv;
  }
  
  // 2. 実行時の環境変数
  if (process.env.NEXT_PUBLIC_ENVIRONMENT) {
    return process.env.NEXT_PUBLIC_ENVIRONMENT;
  }
  
  // 3. NODE_ENVに基づく自動判定
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // 4. 開発環境でのローカルストレージ（本番環境の場合は無視）
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const storedEnvironment = localStorage.getItem('selectedEnvironment');
    if (storedEnvironment && ENVIRONMENTS[storedEnvironment]) {
      // 開発環境では本番環境への切り替えを制限
      if (storedEnvironment === 'production') {
        console.warn('⚠️ Development mode: Production environment selection is ignored');
        return 'development';
      }
      return storedEnvironment;
    }
  }
  
  // 5. デフォルトは開発環境
  return 'development';
};

// 現在の環境設定を取得
export const getCurrentEnvironmentConfig = (): EnvironmentConfig => {
  const env = getCurrentEnvironment();
  return ENVIRONMENTS[env] || ENVIRONMENTS.development;
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

// ビルド時の環境情報を取得
export const getBuildTimeEnvironmentInfo = () => {
  return {
    buildEnvironment: process.env.NEXT_PUBLIC_BUILD_ENVIRONMENT,
    deployEnvironment: process.env.NEXT_PUBLIC_DEPLOY_ENVIRONMENT,
    appEnvironment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT,
    nodeEnv: process.env.NODE_ENV,
    isBuildTimeSet: !!getBuildTimeEnvironment(),
  };
}; 