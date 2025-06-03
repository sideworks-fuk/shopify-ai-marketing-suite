"use client"

import MonthlyStatsAnalysis from "@/components/dashboards/MonthlyStatsAnalysis"

export default function MonthlyStatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📅 月別売上統計【購買】</h1>
        <p className="text-gray-600 mt-2">商品別×月別の売上推移を数量・金額で把握し、季節トレンドと在庫・仕入計画の最適化に活用できます</p>
      </div>
      <MonthlyStatsAnalysis />
    </div>
  )
} 