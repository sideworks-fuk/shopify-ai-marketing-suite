"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock, TrendingDown, AlertTriangle } from "lucide-react"

// 休眠顧客コンポーネントのインポート
import { DormantPeriodFilter } from "@/components/dashboards/dormant/DormantPeriodFilter"
import { DormantCustomerList } from "@/components/dashboards/dormant/DormantCustomerList"

import { dormantCustomerDetails, type DormantSegment } from "@/data/mock/customerData"
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
      {/* ページヘッダー */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">休眠顧客【顧客】</h1>
            <p className="text-gray-600 mt-2">
              最終購入からの経過期間別に顧客を分析し、復帰施策を検討します
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Users className="h-4 w-4 mr-1" />
              {filteredCustomers.length}名の休眠顧客
            </Badge>
          </div>
        </div>

        {/* 説明バナー */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">休眠顧客分析の目的</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  休眠顧客が何ヶ月も購入していないのか？その商品に満足していないのか？<br />
                  購買頻度が低いターゲットのペルソナ設定などを行い、再度購入してもらえるような
                  施策を検討するために、購入が途切れたケースなどを洗い出します。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 期間別フィルター */}
      <div>
        <h2 className="text-xl font-semibold mb-4">期間別セグメント</h2>
        <DormantPeriodFilter />
      </div>

      {/* 顧客リスト */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          休眠顧客一覧
          {filters.selectedSegment && (
            <Badge variant="outline" className="ml-2">
              {filters.selectedSegment.label}フィルター適用中
            </Badge>
          )}
        </h2>
        <DormantCustomerList selectedSegment={filters.selectedSegment} />
      </div>

      {/* フッター情報 */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800">データ更新</h4>
              <p className="text-sm text-slate-600">毎日午前2時に自動更新</p>
            </div>
            <div>
              <TrendingDown className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800">分析期間</h4>
              <p className="text-sm text-slate-600">過去24ヶ月の購買データ</p>
            </div>
            <div>
              <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800">対象顧客</h4>
              <p className="text-sm text-slate-600">90日以上購入のない顧客</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 