"use client"

import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard } from "@/components/common/AnalysisDescriptionCard"
import YearOverYearProductAnalysisImproved from "@/components/dashboards/YearOverYearProductAnalysisImproved"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  return (
    <div className="space-y-6">
      {/* 統一ヘッダー */}
      <AnalyticsHeaderUnified
        mainTitle="前年同月比分析【商品】"
        description="商品別の売上トレンドを前年と比較し、成長商品と要注意商品を特定できます"
        badges={[
          { label: "年選択機能", variant: "outline" },
          { label: "サマリー/月別表示", variant: "secondary" }
        ]}
      />

      {/* 説明カード */}
      <AnalysisDescriptionCard
        variant="purpose"
        title="前年同月比分析の活用法"
        description="商品の成長性を前年と比較することで、好調商品の特徴と要注意商品の早期発見ができます。季節性の高い商品トレンドを把握し、在庫戦略と営業戦略の最適化に活用してください。"
      />

      {/* メインコンテンツ - 年選択と表示モード切り替え機能付き */}
      <YearOverYearProductAnalysisImproved />
    </div>
  )
} 