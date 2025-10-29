"use client"

import { useState } from "react"
import PurchaseCountAnalysis from "@/components/dashboards/PurchaseCountAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { PurchaseCountConditionPanel } from "@/components/purchase/PurchaseCountConditionPanel"
import { useFeatureAccess } from "@/hooks/useFeatureAccess"
import FeatureLockedScreen from "@/components/billing/FeatureLockedScreen"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface AnalysisConditions {
  period: string
  segment: string
  compareWithPrevious: boolean
  timestamp: string
}

export default function PurchaseCountAnalysisPage() {
  const { hasAccess, isLoading: isAccessLoading } = useFeatureAccess('frequency_detail')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisConditions, setAnalysisConditions] = useState<AnalysisConditions | null>(null)

  // ローディング中
  if (isAccessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  // アクセス権限がない場合
  if (!hasAccess) {
    return (
      <FeatureLockedScreen
        featureName="購入回数分析【購買】"
        featureDescription="顧客の購入回数パターンを分析し、リピート率向上施策を立案できます。"
        featureType="frequency_detail"
      />
    )
  }

  const headerConfig = {
    mainTitle: "購入回数分析【購買】",
    description: "顧客の購入回数を5段階で分類し、各層に応じたリピート促進施策の立案と効果測定に活用します",
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