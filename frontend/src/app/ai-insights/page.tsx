"use client"

import AIInsightsDashboard from "@/components/dashboards/AIInsightsDashboard"

export default function AIInsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🤖 AIインサイト</h1>
        <p className="text-gray-600 mt-2">AIによる予測分析と自動インサイト生成で、ビジネス改善の提案を確認できます</p>
      </div>
      <AIInsightsDashboard />
    </div>
  )
} 