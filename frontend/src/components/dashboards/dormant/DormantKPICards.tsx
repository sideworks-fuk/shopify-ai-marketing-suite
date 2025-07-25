"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  TrendingDown, 
  Clock, 
  RotateCcw, 
  DollarSign,
  TrendingUp
} from "lucide-react"
import { dataService } from "@/services/dataService"
import { useState, useEffect } from "react"
import type { DormantKPI } from "@/data/mock/customerData"

interface DormantKPICardsProps {
  kpiData?: DormantKPI;
}

export function DormantKPICards({ kpiData }: DormantKPICardsProps) {
  const [internalKpiData, setInternalKpiData] = useState<DormantKPI | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // kpiDataが渡されていない場合はDataServiceから取得
  useEffect(() => {
    if (!kpiData) {
      const fetchKpiData = async () => {
        try {
          setIsLoading(true)
          setError(null)
          const response = await dataService.getDormantKPIs()
          setInternalKpiData(response.data)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'KPIデータの取得に失敗しました')
        } finally {
          setIsLoading(false)
        }
      }

      fetchKpiData()
    }
  }, [kpiData])

  // 使用するデータを決定
  const activeKpiData = kpiData || internalKpiData

  // ローディング状態
  if (!kpiData && isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border-slate-200">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-100 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // エラー状態
  if (!kpiData && error) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="font-medium">KPIデータの読み込みに失敗しました</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // データが存在しない場合
  if (!activeKpiData) {
    return null
  }
  const formatCurrency = (amount: number) => {
    return `¥${(amount / 1000).toFixed(0)}K`
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP')
  }

  const getRiskBadge = (rate: number) => {
    if (rate < 10) return { variant: "default" as const, label: "低リスク", color: "text-green-600" }
    if (rate < 15) return { variant: "secondary" as const, label: "注意", color: "text-yellow-600" }
    return { variant: "destructive" as const, label: "高リスク", color: "text-red-600" }
  }

  const riskInfo = getRiskBadge(activeKpiData.dormancyRate)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 休眠顧客総数 */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            休眠顧客総数
          </CardTitle>
          <Users className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {formatNumber(activeKpiData.totalDormantCustomers)}名
          </div>
          <p className="text-xs text-slate-500 mt-1">
            アクティブ顧客の対象外
          </p>
        </CardContent>
      </Card>

      {/* 休眠率 */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            休眠率
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-slate-900">
              {activeKpiData.dormancyRate.toFixed(1)}%
            </div>
            <Badge variant={riskInfo.variant} className="text-xs">
              {riskInfo.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            全顧客に対する比率
          </p>
        </CardContent>
      </Card>

      {/* 平均休眠期間 */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            平均休眠期間
          </CardTitle>
          <Clock className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {Math.floor(activeKpiData.averageDormancyPeriod / 30)}ヶ月
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeKpiData.averageDormancyPeriod}日 / 最終購入から
          </p>
        </CardContent>
      </Card>

      {/* 復帰成功率 */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            復帰成功率
          </CardTitle>
          <RotateCcw className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">
              {activeKpiData.reactivationRate.toFixed(1)}%
            </div>
            <TrendingUp className="h-3 w-3 text-green-500" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            過去6ヶ月の実績
          </p>
        </CardContent>
      </Card>

      {/* 推定損失額 */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            推定損失額
          </CardTitle>
          <DollarSign className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(activeKpiData.estimatedLoss)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            月間機会損失
          </p>
        </CardContent>
      </Card>

      {/* 回復売上 */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            回復売上
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(activeKpiData.recoveredRevenue)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            復帰施策による回復
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 