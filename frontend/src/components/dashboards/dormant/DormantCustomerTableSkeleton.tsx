"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * 休眠顧客分析画面用スケルトンローダー
 * 作成者: TAKASHI (AI Assistant)
 * 作成日: 2025年7月27日
 * 
 * パフォーマンス改善のため、データ読み込み中の体感速度を向上
 */
export const DormantCustomerTableSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* KPI カードのスケルトン */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* セグメント分布チャートのスケルトン */}
      <Card className="animate-pulse mb-6">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded"></div>
        </CardContent>
      </Card>

      {/* テーブルのスケルトン */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </CardHeader>
        <CardContent>
          {/* フィルターエリアのスケルトン */}
          <div className="flex gap-4 mb-4">
            <div className="h-10 bg-gray-200 rounded flex-1 max-w-xs"></div>
            <div className="h-10 bg-gray-200 rounded w-40"></div>
            <div className="h-10 bg-gray-200 rounded w-40"></div>
          </div>

          {/* テーブルヘッダーのスケルトン */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b">
              <div className="flex p-4">
                <div className="h-5 bg-gray-200 rounded w-1/6 mr-4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/6 mr-4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/6 mr-4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/6 mr-4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/6 mr-4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/6"></div>
              </div>
            </div>

            {/* テーブル行のスケルトン */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="border-b last:border-b-0">
                <div className="flex p-4 items-center">
                  <div className="w-1/6 mr-4">
                    <div className="h-5 bg-gray-100 rounded mb-1"></div>
                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                  </div>
                  <div className="w-1/6 mr-4">
                    <div className="h-4 bg-gray-100 rounded"></div>
                  </div>
                  <div className="w-1/6 mr-4">
                    <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                  </div>
                  <div className="w-1/6 mr-4">
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  </div>
                  <div className="w-1/6 mr-4">
                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                  </div>
                  <div className="w-1/6">
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ページネーションのスケルトン */}
          <div className="flex justify-between items-center mt-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded w-10"></div>
              <div className="h-10 bg-gray-200 rounded w-10"></div>
              <div className="h-10 bg-gray-200 rounded w-10"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 統計情報のみのスケルトンローダー
 * データの段階的読み込み時に使用
 */
export const DormantKPISkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * テーブルのみのスケルトンローダー
 * リスト更新時に使用
 */
export const DormantTableSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg overflow-hidden animate-pulse">
      {/* ヘッダー */}
      <div className="bg-gray-50 border-b">
        <div className="flex p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-5 bg-gray-200 rounded w-1/6 mr-4 last:mr-0"></div>
          ))}
        </div>
      </div>

      {/* 行 */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className="border-b last:border-b-0">
          <div className="flex p-4 items-center">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="w-1/6 mr-4 last:mr-0">
                <div className="h-4 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}