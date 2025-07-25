/**
 * 数値フォーマット関連のユーティリティ関数
 */

/**
 * 数値を日本語ロケールでフォーマットする
 * @param value - フォーマットする数値
 * @returns フォーマットされた文字列
 */
export const formatNumber = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat("ja-JP").format(value);
};

/**
 * 金額を日本円でフォーマットする
 * @param value - フォーマットする金額
 * @param options - フォーマットオプション
 * @returns フォーマットされた金額文字列
 */
export const formatCurrency = (
  value: number, 
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '¥0';
  }

  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
  
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

/**
 * パーセンテージをフォーマットする
 * @param value - フォーマットするパーセンテージ値（0-100）
 * @param decimals - 小数点以下の桁数
 * @returns フォーマットされたパーセンテージ文字列
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.0%';
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * 大きな数値をK、M、B単位で短縮表示する
 * @param value - フォーマットする数値
 * @returns 短縮フォーマットされた文字列
 */
export const formatCompactNumber = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * 日付をロケール文字列にフォーマットする
 * @param date - フォーマットする日付
 * @param options - フォーマットオプション
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ja-JP', options).format(dateObj);
  } catch (error) {
    return '無効な日付';
  }
};

/**
 * 相対的な日付文字列を生成する（例：3日前）
 * @param date - 基準となる日付
 * @returns 相対的な日付文字列
 */
export const formatRelativeDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return '今日';
    if (diffInDays === 1) return '昨日';
    if (diffInDays < 7) return `${diffInDays}日前`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}週間前`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}ヶ月前`;
    return `${Math.floor(diffInDays / 365)}年前`;
  } catch (error) {
    return '不明';
  }
}; 