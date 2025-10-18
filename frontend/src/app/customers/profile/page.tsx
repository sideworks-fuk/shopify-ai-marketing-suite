"use client"

import CustomerPurchaseAnalysis from "@/components/dashboards/CustomerPurchaseAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard } from "@/components/common/AnalysisDescriptionCard"

export default function CustomerProfilePage() {
  // 統一ヘッダー設定
  const headerConfig = {
    mainTitle: "顧客購買分析【顧客】",
    description: "個別顧客の購買履歴と行動パターンを詳細分析し、パーソナライズド施策とLTV最大化の戦略立案に活用できます",
    currentAnalysis: {
      title: "顧客別購買行動プロファイル分析",
      description: "購買頻度・金額・商品傾向を顧客別に詳細分析し、セグメント特性を把握します",
      targetCount: 350
    },
    badges: [
      { label: "350顧客", variant: "outline" as const },
      { label: "購買プロファイル", variant: "secondary" as const },
      { label: "パーソナライズ", variant: "default" as const }
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
        title="顧客購買分析の活用法"
        description="個別顧客の購買パターンを把握することで、効果的なアプローチ方法と最適な商品提案が可能になります。顧客ランク別の戦略立案や、休眠防止・優良顧客育成施策の設計にご活用ください。"
        variant="purpose"
      />

      {/* 顧客購買分析コンポーネント */}
      <CustomerPurchaseAnalysis useSampleData={false} />
    </div>
  )
} 