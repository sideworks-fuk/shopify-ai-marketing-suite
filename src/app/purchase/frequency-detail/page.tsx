"use client"

import PurchaseFrequencyDetailAnalysis from "@/components/dashboards/PurchaseFrequencyDetailAnalysis"
import ErrorBoundaryWrapper from "@/components/ErrorBoundary"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard } from "@/components/common/AnalysisDescriptionCard"


export default function FrequencyDetailPage() {
  // 統一ヘッダー設定
  const headerConfig = {
    mainTitle: "購入回数分析【購買】",
    description: "顧客の購入回数別セグメント分析と前年比較により、初回→リピート転換率の把握とLTV向上施策の効果測定ができます",
    currentAnalysis: {
      title: "購入回数別顧客セグメント分析",
      description: "1回購入、2-3回、4-5回、6回以上の顧客層を分析し、リピート転換率を詳細把握します",
      targetCount: 1200
    },
    badges: [
      { label: "1,200顧客", variant: "outline" as const },
      { label: "回数別セグメント", variant: "secondary" as const },
      { label: "LTV分析", variant: "default" as const }
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
        title="購入回数分析の活用法"
        description="顧客を購入回数別にセグメント化することで、リピート率の改善ポイントと優良顧客の特徴が明確になります。1回購入顧客の引き上げ施策や、多頻度顧客の維持戦略の立案にご活用ください。"
        variant="usage"
      />

      {/* 購入回数分析コンポーネント */}
      <ErrorBoundaryWrapper
        fallbackTitle="購入回数分析でエラーが発生しました"
        fallbackDescription="購入回数分析の読み込み中にエラーが発生しました。サイドメニューは正常に動作しています。"
      >
        <PurchaseFrequencyDetailAnalysis />
      </ErrorBoundaryWrapper>
    </div>
  )
} 