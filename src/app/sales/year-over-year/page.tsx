"use client"

import React, { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ErrorBoundaryWrapper from "@/components/ErrorBoundary"

// 元の修正版前年同月比分析コンポーネント（月別詳細表示対応）
const YearOverYearProductAnalysisDetailedFixed = React.lazy(() => import("@/components/dashboards/YearOverYearProductAnalysisDetailedFixed"))

// ローディングコンポーネント
const LoadingComponent = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📈 前年同月比【商品】分析
          <div className="flex items-center gap-2 ml-4">
            <div className="animate-spin rounded-full h-4 w-4 border-blue-600"></div>
            <span className="text-sm text-gray-600">読み込み中...</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-blue-700">
            📊 前年同月比分析を準備中です...
          </p>
          <p className="text-sm text-blue-600 mt-2">
            2024年 vs 2023年の詳細比較分析をロードしています
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
)

export default function YearOverYearPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📈 前年同月比【商品】</h1>
        <p className="text-gray-600 mt-2">商品別の売上トレンドを前年と比較し、成長商品と要注意商品を特定できます。月別詳細表示とサマリー表示を切り替え可能です。</p>

      </div>
      
      {/* 元のコンポーネント（月別詳細表示対応）*/}
      <ErrorBoundaryWrapper
        fallbackTitle="前年同月比分析でエラーが発生しました"
        fallbackDescription="前年同月比分析の読み込み中にエラーが発生しました。ページを再読み込みしてください。"
      >
        <Suspense fallback={<LoadingComponent />}>
          <YearOverYearProductAnalysisDetailedFixed />
        </Suspense>
      </ErrorBoundaryWrapper>
    </div>
  )
} 