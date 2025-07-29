/**
 * 通貨フォーマット
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * パーセンテージフォーマット
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

/**
 * 数値フォーマット（カンマ区切り）
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP').format(value)
}

/**
 * 日付フォーマット
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(d)
}

/**
 * 短い日付フォーマット
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric'
  }).format(d)
}