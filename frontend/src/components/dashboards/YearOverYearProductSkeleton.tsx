"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { TableSkeleton, CardSkeleton } from "../ui/PerformanceOptimized"
import { Skeleton } from "../ui/skeleton"

/**
 * 前年同月比【商品】画面専用のスケルトンローダー
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description データロード中の画面全体のスケルトン表示
 */

export const YearOverYearProductSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* サマリーカード（KPI）のスケルトン */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 商品成長ランキングのスケルトン */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* グラフのスケルトン */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-64" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
            <div className="text-gray-400">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 商品テーブル専用のスケルトン
 */
export const ProductTableSkeleton = () => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">
              <Skeleton className="h-4 w-20" />
            </th>
            {Array.from({ length: 12 }, (_, i) => (
              <th key={i} className="text-center p-2">
                <Skeleton className="h-4 w-12 mx-auto" />
              </th>
            ))}
            <th className="text-right p-4">
              <Skeleton className="h-4 w-16 ml-auto" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b">
              <td className="p-4">
                <Skeleton className="h-4 w-40" />
              </td>
              {Array.from({ length: 12 }, (_, colIndex) => (
                <td key={colIndex} className="text-center p-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16 mx-auto" />
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </div>
                </td>
              ))}
              <td className="text-right p-4">
                <Skeleton className="h-4 w-20 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * フィルターセクションのスケルトン
 */
export const FilterSectionSkeleton = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}