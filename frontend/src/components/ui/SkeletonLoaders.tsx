/**
 * スケルトンローダーコンポーネント集
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description 各画面用の専用スケルトンローダー
 */

import React from 'react'
import { Skeleton } from './skeleton'
import { Card, CardContent, CardHeader } from './card'
import { cn } from '@/lib/utils'

// 共通のアニメーションクラス
const shimmer = "animate-pulse"

/**
 * 汎用テーブルスケルトン
 */
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}> = ({ rows = 10, columns = 5, showHeader = true, className }) => {
  return (
    <div className={cn("w-full", className)}>
      {showHeader && (
        <div className="flex space-x-4 p-4 border-b-2 border-gray-200">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      )}
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 p-4 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                "h-4 flex-1",
                colIndex === 0 && "w-1/3"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * カードスケルトン
 */
export const CardSkeleton: React.FC<{
  showHeader?: boolean
  lines?: number
  className?: string
}> = ({ showHeader = true, lines = 3, className }) => {
  return (
    <Card className={cn(shimmer, className)}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton 
              key={i} 
              className={cn(
                "h-4",
                i === lines - 1 && "w-5/6"
              )} 
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 前年同月比分析画面用スケルトン
 */
export const YearOverYearSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className={shimmer}>
            <CardContent className="p-6 text-center">
              <Skeleton className="h-8 w-24 mx-auto mb-2" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* テーブル */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="p-0">
          <TableSkeleton rows={10} columns={13} />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 休眠顧客分析画面用スケルトン
 */
export const DormantCustomerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className={shimmer}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* テーブル */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={10} columns={6} />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 購入回数分析画面用スケルトン
 */
export const PurchaseCountSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* タイトル */}
      <div className="text-center">
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className={shimmer}>
            <CardContent className="p-6 text-center">
              <Skeleton className="h-12 w-12 mx-auto mb-3 rounded-full" />
              <Skeleton className="h-6 w-20 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* チャート */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* テーブル */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={8} columns={5} />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * チャートスケルトン
 */
export const ChartSkeleton: React.FC<{
  height?: number
  className?: string
}> = ({ height = 256, className }) => {
  return (
    <div className={cn("relative", className)}>
      <Skeleton 
        className="w-full" 
        style={{ height: `${height}px` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

/**
 * リストアイテムスケルトン
 */
export const ListItemSkeleton: React.FC<{
  count?: number
  showAvatar?: boolean
  className?: string
}> = ({ count = 5, showAvatar = false, className }) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
          {showAvatar && (
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * フォームスケルトン
 */
export const FormSkeleton: React.FC<{
  fields?: number
  className?: string
}> = ({ fields = 4, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 mt-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

/**
 * 統計グリッドスケルトン
 */
export const StatsGridSkeleton: React.FC<{
  count?: number
  columns?: number
  className?: string
}> = ({ count = 4, columns = 4, className }) => {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 2 && "grid-cols-1 md:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={shimmer}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-10 w-10 rounded" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}