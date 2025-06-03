"use client"

import SalesDashboard from "@/components/dashboards/SalesDashboard"

export default function SalesDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 売上ダッシュボード</h1>
        <p className="text-gray-600 mt-2">売上の全体像と主要KPIを確認できます</p>
      </div>
      <SalesDashboard />
    </div>
  )
} 