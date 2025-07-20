/**
 * 環境設定とデータアクセス設定管理
 * API/モックデータの自動切替を制御
 */

import type { 
  DataAccessConfig, 
  CacheConfig, 
  LoggingConfig,
  EnvironmentConfig 
} from '../types/api';

// 環境変数の型安全な取得
const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvString = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

// 環境設定の構築
export const environmentConfig: EnvironmentConfig = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  NEXT_PUBLIC_USE_API: getEnvBoolean('NEXT_PUBLIC_USE_API', false),
  NEXT_PUBLIC_API_BASE_URL: getEnvString('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3000/api'),
  NEXT_PUBLIC_ENABLE_CACHE: getEnvBoolean('NEXT_PUBLIC_ENABLE_CACHE', true),
  NEXT_PUBLIC_CACHE_TTL: getEnvNumber('NEXT_PUBLIC_CACHE_TTL', 300), // 5分
};

// データアクセス設定
export const dataAccessConfig: DataAccessConfig = {
  // 本番環境または明示的にAPIを使用する場合はAPI、それ以外はモック
  useApi: environmentConfig.NODE_ENV === 'production' || environmentConfig.NEXT_PUBLIC_USE_API,
  apiBaseUrl: environmentConfig.NEXT_PUBLIC_API_BASE_URL,
  timeout: getEnvNumber('API_TIMEOUT', 10000), // 10秒
  retryAttempts: getEnvNumber('API_RETRY_ATTEMPTS', 3),
  enableFallback: getEnvBoolean('ENABLE_API_FALLBACK', true),
};

// キャッシュ設定
export const cacheConfig: CacheConfig = {
  enabled: environmentConfig.NEXT_PUBLIC_ENABLE_CACHE,
  ttl: environmentConfig.NEXT_PUBLIC_CACHE_TTL,
  maxSize: getEnvNumber('CACHE_MAX_SIZE', 100), // 最大100アイテム
};

// ログ設定
export const loggingConfig: LoggingConfig = {
  level: (getEnvString('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error'),
  enableConsole: getEnvBoolean('LOG_ENABLE_CONSOLE', true),
  enableRemote: getEnvBoolean('LOG_ENABLE_REMOTE', false),
  remoteEndpoint: getEnvString('LOG_REMOTE_ENDPOINT', ''),
};

// 開発環境での設定表示（デバッグ用）
if (environmentConfig.NODE_ENV === 'development') {
  console.group('🔧 データアクセス設定');
  console.log('📊 データソース:', dataAccessConfig.useApi ? 'API' : 'モック');
  console.log('🌐 API URL:', dataAccessConfig.apiBaseUrl);
  console.log('💾 キャッシュ:', cacheConfig.enabled ? 'ON' : 'OFF');
  console.log('📝 ログレベル:', loggingConfig.level);
  console.groupEnd();
}

// 設定検証関数
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // API使用時のURL検証
  if (dataAccessConfig.useApi) {
    if (!dataAccessConfig.apiBaseUrl) {
      errors.push('API使用時にはAPI_BASE_URLが必要です');
    }
    
    try {
      new URL(dataAccessConfig.apiBaseUrl);
    } catch {
      errors.push('API_BASE_URLが有効なURLではありません');
    }
  }

  // タイムアウト値検証
  if (dataAccessConfig.timeout <= 0) {
    errors.push('タイムアウト値は正の数である必要があります');
  }

  // リトライ回数検証
  if (dataAccessConfig.retryAttempts < 0) {
    errors.push('リトライ回数は0以上である必要があります');
  }

  // キャッシュTTL検証
  if (cacheConfig.enabled && cacheConfig.ttl <= 0) {
    errors.push('キャッシュTTLは正の数である必要があります');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// 実行時設定検証
const configValidation = validateConfig();
if (!configValidation.valid) {
  console.error('❌ 設定エラー:', configValidation.errors);
  if (environmentConfig.NODE_ENV === 'production') {
    throw new Error(`設定エラー: ${configValidation.errors.join(', ')}`);
  }
}

// 設定変更通知（開発環境用）
export const notifyConfigChange = (newConfig: Partial<DataAccessConfig>): void => {
  if (environmentConfig.NODE_ENV === 'development') {
    console.log('🔄 設定変更:', newConfig);
  }
};

// ランタイム設定切替（開発・テスト用）
export const switchToMockData = (): void => {
  if (environmentConfig.NODE_ENV !== 'production') {
    (dataAccessConfig as any).useApi = false;
    notifyConfigChange({ useApi: false });
  }
};

export const switchToApiData = (): void => {
  if (environmentConfig.NODE_ENV !== 'production') {
    (dataAccessConfig as any).useApi = true;
    notifyConfigChange({ useApi: true });
  }
};

// 現在の設定状態を取得
export const getCurrentDataSource = (): 'api' | 'mock' => {
  return dataAccessConfig.useApi ? 'api' : 'mock';
};

// 設定のディープコピーを取得（変更不可）
export const getDataAccessConfig = (): Readonly<DataAccessConfig> => {
  return Object.freeze({ ...dataAccessConfig });
};

export const getCacheConfig = (): Readonly<CacheConfig> => {
  return Object.freeze({ ...cacheConfig });
};

export const getLoggingConfig = (): Readonly<LoggingConfig> => {
  return Object.freeze({ ...loggingConfig });
};

// 設定の要約情報
export const getConfigSummary = () => {
  return {
    environment: environmentConfig.NODE_ENV,
    dataSource: getCurrentDataSource(),
    apiUrl: dataAccessConfig.apiBaseUrl,
    cacheEnabled: cacheConfig.enabled,
    logLevel: loggingConfig.level,
    fallbackEnabled: dataAccessConfig.enableFallback,
  };
};

export default {
  environment: environmentConfig,
  dataAccess: dataAccessConfig,
  cache: cacheConfig,
  logging: loggingConfig,
  validate: validateConfig,
  summary: getConfigSummary,
}; 