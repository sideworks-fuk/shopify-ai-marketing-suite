"use client"

import PurchaseFrequencyDetailAnalysis from "@/components/dashboards/PurchaseFrequencyDetailAnalysis"
import ErrorBoundaryWrapper from "@/components/ErrorBoundary"

export default function FrequencyDetailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔢 購入回数【購買】</h1>
        <p className="text-gray-600 mt-2">顧客の購入回数別セグメント分析と前年比較により、初回→リピート転換率の把握とLTV向上施策の効果測定ができます</p>
      </div>
      <ErrorBoundaryWrapper
        fallbackTitle="購入回数分析でエラーが発生しました"
        fallbackDescription="購入回数分析の読み込み中にエラーが発生しました。サイドメニューは正常に動作しています。"
      >
        <PurchaseFrequencyDetailAnalysis />
      </ErrorBoundaryWrapper>
    </div>
  )
} 