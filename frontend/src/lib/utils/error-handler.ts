import { AppError, ErrorType, AuthenticationError } from '@/lib/types/errors'

export function handleApiError(error: unknown): AppError {
  if (error instanceof AuthenticationError) {
    return error
  }

  if (error instanceof Error) {
    // 401がメッセージや付帯情報に含まれる場合の簡易判定
    const msg = error.message || ''
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      return new AuthenticationError('Shopify認証が必要です')
    }

    if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')) {
      return {
        type: ErrorType.TIMEOUT,
        message: 'リクエストがタイムアウトしました',
        statusCode: 408,
        retryable: true,
        details: error
      }
    }

    if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
      return {
        type: ErrorType.NETWORK,
        message: 'ネットワークエラーが発生しました',
        retryable: true,
        details: error
      }
    }

    return {
      type: ErrorType.UNKNOWN,
      message: msg || '不明なエラーが発生しました',
      retryable: false,
      details: error
    }
  }

  return {
    type: ErrorType.UNKNOWN,
    message: '不明なエラーが発生しました',
    retryable: false,
    details: error
  }
}
