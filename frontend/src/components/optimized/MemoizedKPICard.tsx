import React, { memo } from 'react'
import { KPICard, type KPICardProps } from '../common/KPICard'

// =============================================================================
// メモ化されたKPICard - パフォーマンス最適化
// =============================================================================

/**
 * メモ化されたKPICardコンポーネント
 *
 * React.memoによってpropsが変更されない限り再レンダリングを防ぐ
 * 大量のKPIカードが表示される画面でのパフォーマンス向上に寄与
 *
 * @example
 * ```tsx
 * <MemoizedKPICard
 *   title="売上"
 *   value="¥1,234,567"
 *   change="+12.3%"
 *   variant="success"
 * />
 * ```
 */
export const MemoizedKPICard = memo<KPICardProps>((props) => {
  return <KPICard {...props} />
}, (prevProps, nextProps) => {
  // カスタム比較関数：重要なpropsのみ比較
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.variant === nextProps.variant &&
    prevProps.loadingState === nextProps.loadingState &&
    prevProps.error === nextProps.error &&
    // アクション系は毎回新しい関数なので深い比較
    JSON.stringify(prevProps.actions) === JSON.stringify(nextProps.actions)
  )
})

MemoizedKPICard.displayName = 'MemoizedKPICard'

// =============================================================================
// エクスポート
// =============================================================================

export type { KPICardProps } from '../common/KPICard'
export { KPICard } from '../common/KPICard'