/**
 * API リトライユーティリティ
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description ネットワークエラー時の自動リトライ機能
 */

import { errorHandler } from './error-handler'

export interface RetryConfig {
  maxAttempts?: number
  delay?: number
  backoffMultiplier?: number
  maxDelay?: number
  retryCondition?: (error: any, attempt: number) => boolean
  onRetry?: (error: any, attempt: number) => void
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryCondition: (error) => {
    // ネットワークエラーまたは5xx系のエラーの場合はリトライ
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return true
    }
    if (error.statusCode && error.statusCode >= 500) {
      return true
    }
    // タイムアウトエラーもリトライ
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return true
    }
    return false
  },
  onRetry: (error, attempt) => {
    console.log(`🔄 Retry attempt ${attempt}:`, error.message)
  }
}

/**
 * 指数バックオフでリトライを実行
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: any

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 最後の試行または、リトライ条件を満たさない場合はエラーをスロー
      if (
        attempt === finalConfig.maxAttempts ||
        !finalConfig.retryCondition(error, attempt)
      ) {
        throw error
      }

      // リトライコールバック
      finalConfig.onRetry(error, attempt)

      // 遅延時間の計算（指数バックオフ）
      const delay = Math.min(
        finalConfig.delay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelay
      )

      // 遅延
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * API呼び出しをリトライ付きで実行
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<Response> {
  return retryWithExponentialBackoff(
    async () => {
      const response = await fetch(url, options)
      
      // 5xx系のエラーはエラーとして扱う
      if (response.status >= 500) {
        const error = new Error(`Server error: ${response.status}`)
        ;(error as any).statusCode = response.status
        ;(error as any).response = response
        throw error
      }
      
      return response
    },
    retryConfig
  )
}

/**
 * JSON APIを呼び出し（リトライ付き）
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    }
  }, retryConfig)

  if (!response.ok) {
    const error = new Error(`API error: ${response.status}`)
    ;(error as any).statusCode = response.status
    ;(error as any).response = response
    throw error
  }

  return response.json()
}

/**
 * タイムアウト付きfetch
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`)
      timeoutError.name = 'TimeoutError'
      throw timeoutError
    }
    throw error
  }
}

/**
 * タイムアウトとリトライを組み合わせたfetch
 */
export async function robustFetch(
  url: string,
  options: RequestInit = {},
  config: {
    timeout?: number
    retry?: RetryConfig
  } = {}
): Promise<Response> {
  const { timeout = 30000, retry = {} } = config

  return retryWithExponentialBackoff(
    () => fetchWithTimeout(url, options, timeout),
    retry
  )
}

/**
 * 堅牢なJSON API呼び出し
 */
export async function robustJsonFetch<T>(
  url: string,
  options: RequestInit = {},
  config: {
    timeout?: number
    retry?: RetryConfig
    fallbackData?: T
  } = {}
): Promise<T> {
  try {
    const response = await robustFetch(url, options, {
      timeout: config.timeout,
      retry: config.retry
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // フォールバックデータがある場合は使用
    if (config.fallbackData !== undefined) {
      await errorHandler.handle(error, {
        type: 'network',
        severity: 'warning',
        showToUser: true,
        userMessage: 'データの取得に失敗しました。キャッシュデータを表示しています。',
        fallback: {
          enabled: true,
          useMockData: true
        }
      })
      return config.fallbackData
    }
    throw error
  }
}

/**
 * ユーティリティ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * リトライ状態を管理するフック
 */
export function useRetryState() {
  const [retryCount, setRetryCount] = React.useState(0)
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [lastError, setLastError] = React.useState<Error | null>(null)

  const retry = React.useCallback(async (fn: () => Promise<void>) => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)
    
    try {
      await fn()
      setLastError(null)
    } catch (error) {
      setLastError(error as Error)
      throw error
    } finally {
      setIsRetrying(false)
    }
  }, [])

  const reset = React.useCallback(() => {
    setRetryCount(0)
    setIsRetrying(false)
    setLastError(null)
  }, [])

  return {
    retryCount,
    isRetrying,
    lastError,
    retry,
    reset
  }
}

// React import for hook
import React from 'react'