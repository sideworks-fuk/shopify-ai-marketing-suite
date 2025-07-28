"use client"

import PurchaseFrequencyDetailAnalysis from "@/components/dashboards/PurchaseFrequencyDetailAnalysis"
import ErrorBoundaryWrapper from "@/components/ErrorBoundary"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard } from "@/components/common/AnalysisDescriptionCard"
import { AlertCircle } from "lucide-react"


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

      {/* 新しい実装への案内 */}
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-full">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">新しい購入回数分析が利用可能です</h3>
            <p className="text-blue-700 text-sm">実データを使用したシンプル版実装が完成しました</p>
          </div>
        </div>
        <div className="flex gap-3">
          <a 
            href="/purchase/count-analysis" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            新しい購入回数分析を開く
          </a>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-flex items-center px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          >
            このページを続行（サンプルデータ）
          </button>
        </div>
      </div>

      {/* 既存の購入回数分析コンポーネント（サンプルデータ） */}
      <ErrorBoundaryWrapper
        fallbackTitle="購入回数分析でエラーが発生しました"
        fallbackDescription="購入回数分析の読み込み中にエラーが発生しました。サイドメニューは正常に動作しています。"
      >
        <PurchaseFrequencyDetailAnalysis useSampleData={true} />
      </ErrorBoundaryWrapper>
    </div>
  )
} 