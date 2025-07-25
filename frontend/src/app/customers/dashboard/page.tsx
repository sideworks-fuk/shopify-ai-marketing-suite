"use client"

import { Users, UserPlus, Repeat, Crown, TrendingUp } from "lucide-react"
import { AnalyticsPageLayout } from "@/components/layout/AnalyticsPageLayout"
import { KPICard, type KPICardProps } from "@/components/common/KPICard"
import { CustomerFilterSection } from "@/components/dashboards/customers/CustomerFilterSection"
import CustomerMainContent from "@/components/dashboards/customers/CustomerMainContent"

export default function CustomerDashboardPage() {
  // 重要KPI（4つに統一）
  const kpiData: KPICardProps[] = [
    {
      title: "総顧客数",
      value: "2,847",
      change: { value: 12.5, type: "increase" as const },
      icon: Users,
      variant: "default"
    },
    {
      title: "新規顧客",
      value: "189",
      change: { value: 8.2, type: "increase" as const },
      icon: UserPlus,
      variant: "success"
    },
    {
      title: "リピート率",
      value: "68.5%",
      change: { value: 2.1, type: "decrease" as const },
      icon: Repeat,
      variant: "warning"
    },
    {
      title: "平均LTV",
      value: "¥42,500",
      change: { value: 5.8, type: "increase" as const },
      icon: Crown,
      variant: "default"
    }
  ]

  // クイックアクション
  const actionButtons = (
    <>
      <button
        onClick={() => window.location.href = "/customers/segments/new"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      >
        <UserPlus className="h-4 w-4" />
        新規セグメント作成
      </button>
      <button
        onClick={() => window.location.href = "/customers/dormant"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      >
        <TrendingUp className="h-4 w-4" />
        休眠顧客分析
      </button>
    </>
  )

  // サブコンテンツ（ナビゲーションカード）
  const subContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border border-slate-200 hover:border-slate-300 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">顧客プロファイル</h3>
            <p className="text-slate-600 text-sm">個別顧客の詳細分析</p>
          </div>
          <span className="text-slate-400 text-xl">→</span>
        </div>
      </div>
      <div className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border border-slate-200 hover:border-slate-300 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">休眠顧客分析</h3>
            <p className="text-slate-600 text-sm">休眠状態の顧客分析</p>
          </div>
          <span className="text-slate-400 text-xl">→</span>
        </div>
      </div>
      <div className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border border-slate-200 hover:border-slate-300 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">セグメント管理</h3>
            <p className="text-slate-600 text-sm">顧客セグメントの作成・管理</p>
          </div>
          <span className="text-slate-400 text-xl">→</span>
        </div>
      </div>
    </div>
  )

  return (
    <AnalyticsPageLayout
      title="👥 顧客ダッシュボード"
      description="顧客の全体像と主要セグメントを確認できます"
      kpiCards={kpiData}
      filterSection={<CustomerFilterSection />}
      mainContent={<CustomerMainContent />}
      subContent={subContent}
      actionButtons={actionButtons}
    />
  )
} 