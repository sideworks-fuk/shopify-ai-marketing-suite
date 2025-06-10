"use client"

import ProductPurchaseFrequencyAnalysis from "@/components/dashboards/ProductPurchaseFrequencyAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard, analysisDescriptions } from "@/components/common/AnalysisDescriptionCard"

export default function PurchaseFrequencyPage() {
  // 統一ヘッダー設定
  const headerConfig = {
    mainTitle: "購入頻度分析【商品】",
    description: "商品別のリピート購入パターンを分析し、定番商品化の判断やサンプル施策の対象選定に活用できます",
    currentAnalysis: {
      title: "商品別購入回数分布分析",
      description: "顧客の購入回数分布を商品別に詳細分析し、リピート購入パターンを把握します",
      targetCount: 150
    },
    badges: [
      { label: "150商品", variant: "outline" as const },
      { label: "リピート率分析", variant: "secondary" as const }
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
        {...analysisDescriptions.purchaseFrequency}
      />

      {/* 購入頻度分析コンポーネント（分析条件トグル実装済み） */}
      <ProductPurchaseFrequencyAnalysis />
    </div>
  )
} 