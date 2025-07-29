/**
 * ローディング状態コンポーネント集
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description 統一されたローディング体験を提供
 */

import React from 'react'
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Progress } from './progress'

/**
 * スピナーローダー
 */
export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}> = ({ size = 'md', className, label }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2", className)}>
      <Loader2 className={cn("animate-spin text-blue-500", sizeClasses[size])} />
      {label && (
        <p className="text-sm text-gray-600">{label}</p>
      )}
    </div>
  )
}

/**
 * フルスクリーンローダー
 */
export const FullScreenLoader: React.FC<{
  message?: string
  submessage?: string
  progress?: number
}> = ({ message = "読み込み中...", submessage, progress }) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">{message}</p>
            {submessage && (
              <p className="text-sm text-gray-500 mt-1">{submessage}</p>
            )}
          </div>

          {progress !== undefined && (
            <div className="w-full">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500 text-center mt-1">
                {progress}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * インラインローダー
 */
export const InlineLoader: React.FC<{
  loading: boolean
  children: React.ReactNode
  className?: string
  spinnerSize?: 'sm' | 'md' | 'lg'
}> = ({ loading, children, className, spinnerSize = 'sm' }) => {
  if (loading) {
    return <Spinner size={spinnerSize} className={className} />
  }
  return <>{children}</>
}

/**
 * ボタンローダー
 */
export const LoadingButton: React.FC<
  React.ComponentProps<typeof Button> & {
    loading?: boolean
    loadingText?: string
  }
> = ({ loading, loadingText, children, disabled, ...props }) => {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

/**
 * データローディング状態
 */
export const DataLoadingState: React.FC<{
  loading: boolean
  error?: Error | null
  empty?: boolean
  onRetry?: () => void
  skeleton?: React.ReactNode
  emptyState?: React.ReactNode
  errorState?: React.ReactNode
  children: React.ReactNode
}> = ({ 
  loading, 
  error, 
  empty, 
  onRetry, 
  skeleton, 
  emptyState, 
  errorState,
  children 
}) => {
  // ローディング中
  if (loading) {
    return <>{skeleton || <Spinner size="lg" label="データを読み込んでいます..." />}</>
  }

  // エラー
  if (error) {
    return (
      <>
        {errorState || (
          <ErrorState
            title="エラーが発生しました"
            message={error.message}
            onRetry={onRetry}
          />
        )}
      </>
    )
  }

  // 空データ
  if (empty) {
    return (
      <>
        {emptyState || (
          <EmptyState
            title="データがありません"
            message="条件を変更して再度お試しください"
          />
        )}
      </>
    )
  }

  // 正常データ
  return <>{children}</>
}

/**
 * エラー状態
 */
export const ErrorState: React.FC<{
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}> = ({ 
  title = "エラーが発生しました", 
  message = "しばらく時間をおいて再度お試しください", 
  onRetry,
  className 
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      )}
    </div>
  )
}

/**
 * 空データ状態
 */
export const EmptyState: React.FC<{
  title?: string
  message?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}> = ({ 
  title = "データがありません", 
  message, 
  action,
  icon,
  className 
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      {icon || (
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
        </div>
      )}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {message && (
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        )}
      </div>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * 成功状態
 */
export const SuccessState: React.FC<{
  title?: string
  message?: string
  action?: React.ReactNode
  className?: string
}> = ({ 
  title = "完了しました", 
  message, 
  action,
  className 
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {message && (
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        )}
      </div>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * プログレスローダー
 */
export const ProgressLoader: React.FC<{
  steps: {
    id: string
    label: string
    status: 'pending' | 'loading' | 'completed' | 'error'
  }[]
  currentStep?: string
  className?: string
}> = ({ steps, currentStep, className }) => {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep || step.status === 'loading'
        const isCompleted = step.status === 'completed'
        const isError = step.status === 'error'

        return (
          <div key={step.id} className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : isError ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : isActive ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                "text-sm",
                isActive && "font-medium text-gray-900",
                isCompleted && "text-gray-600",
                isError && "text-red-600",
                !isActive && !isCompleted && !isError && "text-gray-400"
              )}>
                {step.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * リトライ付きローディング
 */
export const RetryableLoader: React.FC<{
  loading: boolean
  error?: Error | null
  retryCount: number
  maxRetries: number
  onRetry: () => void
  children: React.ReactNode
}> = ({ loading, error, retryCount, maxRetries, onRetry, children }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <Spinner size="lg" label={retryCount > 0 ? `再試行中... (${retryCount}/${maxRetries})` : "読み込み中..."} />
        {retryCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              接続に問題があるため、再試行しています...
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="接続エラー"
        message={`${error.message}${retryCount >= maxRetries ? ' (最大試行回数に達しました)' : ''}`}
        onRetry={retryCount < maxRetries ? onRetry : undefined}
      />
    )
  }

  return <>{children}</>
}