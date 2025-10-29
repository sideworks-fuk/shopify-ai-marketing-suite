"use client"

import React, { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// React.lazy を使用したコード分割
const AnalyticsHeaderUnified = React.lazy(() => import("@/components/layout/AnalyticsHeaderUnified").then(module => ({ default: module.AnalyticsHeaderUnified })))
const AnalysisDescriptionCard = React.lazy(() => import("@/components/common/AnalysisDescriptionCard").then(module => ({ default: module.AnalysisDescriptionCard })))
const YearOverYearProductAnalysis = React.lazy(() => import("@/components/dashboards/YearOverYearProductAnalysis"))
const FeatureLockedScreen = React.lazy(() => import("@/components/billing/FeatureLockedScreen"))

// ローディングコンポーネント
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { useFeatureAccess } from "@/hooks/useFeatureAccess"

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
            商品別の成長率分析をロードしています
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
)

export default function YearOverYearPage() {
  // 機能アクセス制御
  const { hasAccess, isLoading: isAccessLoading } = useFeatureAccess('year_over_year')
  
  // アクセス権限の確認中
  if (isAccessLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // アクセス権限がない場合
  if (!hasAccess) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <FeatureLockedScreen 
          featureName="前年同月比分析"
          featureType="year_over_year"
        />
      </Suspense>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden px-4 lg:px-6">
      {/* 統一ヘッダー */}
      <Suspense fallback={<LoadingSpinner />}>
        <AnalyticsHeaderUnified
          mainTitle="前年同月比分析【商品】"
          description="商品別の売上トレンドを前年と比較し、成長商品と要注意商品を特定できます"
          badges={[
            { label: "年選択機能", variant: "outline" },
            { label: "サマリー/月別表示", variant: "secondary" }
          ]}
        />
      </Suspense>

      {/* 説明カード */}
      <Suspense fallback={<div className="h-20 bg-gray-100 rounded animate-pulse" />}>
        <AnalysisDescriptionCard
          variant="purpose"
          title="前年同月比分析の活用法"
          description="商品の成長性を前年と比較することで、好調商品の特徴と要注意商品の早期発見ができます。季節性の高い商品トレンドを把握し、在庫戦略と営業戦略の最適化に活用してください。"
        />
      </Suspense>

      {/* メインコンテンツ - 年選択と表示モード切り替え機能付き */}
      <Suspense fallback={<LoadingSpinner />}>
        <YearOverYearProductAnalysis />
      </Suspense>
    </div>
  )
} 