"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"

// 統一された休眠顧客分析コンポーネント
import DormantCustomerAnalysis from "@/components/dashboards/DormantCustomerAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"

import { dormantCustomerDetails } from "@/data/mock/customerData"
import { useDormantFilters } from "@/contexts/FilterContext"

export default function DormantCustomersPage() {
  // ✅ Props Drilling解消: フィルター状態は FilterContext で管理
  const { filters } = useDormantFilters()

  // フィルタリングされた顧客データ（表示用）- useMemoで最適化
  const filteredCustomers = useMemo(() => {
    const selectedSegment = filters.selectedSegment
    return selectedSegment 
      ? dormantCustomerDetails.filter(customer => {
          const daysSince = customer.dormancy.daysSincePurchase
          return daysSince >= selectedSegment.range[0] && daysSince < selectedSegment.range[1]
        })
      : dormantCustomerDetails
  }, [filters.selectedSegment])

  return (
    <div className="space-y-6">
      {/* 統一ヘッダー */}
      <AnalyticsHeaderUnified 
        mainTitle="休眠顧客分析【顧客】"
        description="最終購入からの経過期間別に顧客を分析し、復帰施策の効果的な立案と実行に活用できます"
        currentAnalysis={{
          title: "期間別休眠顧客セグメント分析",
          description: "90日以上購入のない顧客を期間別に分析し、復帰可能性を評価します",
          targetCount: filteredCustomers.length
        }}
        badges={[
          { label: `${filteredCustomers.length}名`, variant: "outline" as const },
          { label: "復帰施策", variant: "secondary" as const },
          { label: "期間セグメント", variant: "default" as const }
        ]}
      />

      {/* 統一された休眠顧客分析コンポーネント */}
      <DormantCustomerAnalysis />
    </div>
  )
} 