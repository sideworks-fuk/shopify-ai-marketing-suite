"use client"

import FTierTrendAnalysis from "@/components/dashboards/FTierTrendAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard } from "@/components/common/AnalysisDescriptionCard"

export default function FTierTrendPage() {
  // 統一ヘッダー設定
  const headerConfig = {
    mainTitle: "F階層傾向分析【購買】",
    description: "RFM分析のF（Frequency：購入頻度）に特化し、購入頻度による顧客階層の動向とトレンド変化を把握できます",
    currentAnalysis: {
      title: "F階層別顧客動向分析",
      description: "購入頻度を5階層に分類し、各階層の顧客数推移と売上寄与度の変化を詳細分析します",
      targetCount: 800
    },
    badges: [
      { label: "5階層分析", variant: "outline" as const },
      { label: "F値重点", variant: "secondary" as const },
      { label: "トレンド分析", variant: "default" as const }
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
        title="F階層傾向分析の活用法"
        description="購入頻度による顧客階層の推移を把握することで、リピート顧客の育成効果と各階層の動向が明確になります。階層別のマーケティング施策の効果測定と、顧客ランクアップ施策の立案にご活用ください。"
        variant="purpose"
      />

      {/* F階層傾向分析コンポーネント */}
      <FTierTrendAnalysis useSampleData={true} />
    </div>
  )
} 