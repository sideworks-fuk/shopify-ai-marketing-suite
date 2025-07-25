"use client"

import MonthlyStatsAnalysis from "@/components/dashboards/MonthlyStatsAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard, analysisDescriptions } from "@/components/common/AnalysisDescriptionCard"


export default function MonthlyStatsPage() {
  // 統一ヘッダー設定
  const headerConfig = {
    mainTitle: "月別売上統計【購買】",
    description: "商品別×月別の売上推移を数量・金額で把握し、季節トレンドと在庫・仕入計画の最適化に活用できます",
    currentAnalysis: {
      title: "月別商品売上推移分析",
      description: "商品カテゴリ別の月次パフォーマンスと季節性パターンを詳細分析します",
      targetCount: 200
    },
    badges: [
      { label: "12ヶ月分析", variant: "outline" as const },
      { label: "季節性検出", variant: "secondary" as const },
      { label: "在庫最適化", variant: "default" as const }
    ]
  }



  return (
    <div className="space-y-6">
      {/* 統一ヘッダー */}
      <AnalyticsHeaderUnified 
        {...headerConfig}
      />

      {/* 分析の目的・活用法説明 */}
      <AnalysisDescriptionCard 
        title="月別売上統計分析の活用法"
        description="商品別の月次売上推移を把握することで、季節性の発見や在庫計画の最適化が可能です。売上のピーク月を把握し、適切な仕入れタイミングと販売戦略の立案にご活用ください。"
        variant="usage"
      />

      {/* 月別売上統計分析コンポーネント */}
      <MonthlyStatsAnalysis />
    </div>
  )
} 