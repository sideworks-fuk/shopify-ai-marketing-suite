"use client"

import { useState } from "react"
import PurchaseCountAnalysis from "@/components/dashboards/PurchaseCountAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard } from "@/components/common/AnalysisDescriptionCard"
import { PurchaseCountConditionPanel } from "@/components/purchase/PurchaseCountConditionPanel"
import { Button } from "@/components/ui/button"

interface AnalysisConditions {
  period: string
  segment: string
  compareWithPrevious: boolean
  timestamp: string
}

export default function PurchaseCountAnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisConditions, setAnalysisConditions] = useState<AnalysisConditions | null>(null)

  const headerConfig = {
    mainTitle: "購入回数分析【購買】",
    description: "顧客の購入回数パターンを5段階で分析し、リピート促進施策の立案を支援します",
    currentAnalysis: {
      title: "購入回数別顧客分析",
      description: "購入回数を5段階に分類し、各層の顧客動向と売上貢献を可視化します",
      targetCount: 0 // 条件設定後に更新
    },
    badges: [
      { label: "5階層分析", variant: "outline" as const }
    ]
  }

  const handleAnalysisExecute = (conditions: AnalysisConditions) => {
    setAnalysisConditions(conditions)
    setIsAnalyzing(true)
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeaderUnified {...headerConfig} />
      
      <AnalysisDescriptionCard 
        title="購入回数分析の活用法"
        description="購入回数による顧客分類を把握し、リピート購入促進施策の効果測定にご活用ください。"
        variant="purpose"
      />

      {/* 条件設定パネル */}
      <PurchaseCountConditionPanel 
        onExecute={handleAnalysisExecute}
        isAnalyzing={isAnalyzing}
      />

      {/* 分析結果表示 */}
      {analysisConditions && (
        <PurchaseCountAnalysis 
          conditions={analysisConditions}
          onAnalysisComplete={() => setIsAnalyzing(false)}
        />
      )}
    </div>
  )
}