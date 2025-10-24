export enum ErrorType {
  AUTH = 'auth',
  FORBIDDEN = 'forbidden',
  SERVER = 'server',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  details?: unknown;
  retryable: boolean;
  actionRequired?: 'auth' | 'retry' | 'contact_support';
}

export class AuthenticationError extends Error implements AppError {
  type = ErrorType.AUTH;
  statusCode = 401;
  retryable = false;
  actionRequired = 'auth' as const;

  constructor(message: string = 'Shopify認証が必要です') {
    super(message);
    this.name = 'AuthenticationError';
  }
}


