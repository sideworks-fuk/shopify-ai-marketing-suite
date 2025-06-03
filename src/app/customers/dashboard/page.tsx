"use client"

import CustomerDashboard from "@/components/dashboards/CustomerDashboard"

export default function CustomerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">👥 顧客ダッシュボード</h1>
        <p className="text-gray-600 mt-2">顧客の全体像と主要セグメントを確認できます（※今後簡素化予定）</p>
      </div>
      <CustomerDashboard />
    </div>
  )
} 