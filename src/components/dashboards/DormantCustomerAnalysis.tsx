"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  FileSpreadsheet, 
  Download, 
  RefreshCw,
  MessageSquare,
  Users,
  Clock,
  TrendingDown,
  AlertTriangle
} from "lucide-react"

// 休眠顧客分析コンポーネントのインポート
import { DormantPeriodFilter } from "@/components/dashboards/dormant/DormantPeriodFilter"
import { DormantKPICards } from "@/components/dashboards/dormant/DormantKPICards"
import { DormantAnalysisChart } from "@/components/dashboards/dormant/DormantAnalysisChart"
import { DormantCustomerList } from "@/components/dashboards/dormant/DormantCustomerList"
import { ReactivationInsights } from "@/components/dashboards/dormant/ReactivationInsights"

import { dormantCustomerDetails } from "@/data/mock/customerData"
import { useDormantFilters } from "@/contexts/FilterContext"

export default function DormantCustomerAnalysis() {
  const [showConditions, setShowConditions] = useState(true)
  const { filters } = useDormantFilters()

  // フィルタリングされた顧客データ
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
      {/* 分析条件設定エリア */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6 py-3">
          <CardTitle className="text-lg font-semibold">分析条件設定</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConditions(!showConditions)}
            className="h-8 px-2"
          >
            <Settings className="h-4 w-4 mr-1" />
            分析条件
            {showConditions ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
        </CardHeader>
        
        {showConditions && (
          <CardContent className="px-6 pt-2 pb-4">
            {/* 3列グリッドレイアウト：分析期間(2fr) + 休眠セグメント(1fr) + 表示オプション(1fr) */}
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分析期間
                </label>
                <div className="text-sm text-gray-600">
                  過去24ヶ月の購買データを分析対象とします
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  休眠セグメント
                </label>
                <div className="text-sm text-gray-600">
                  {filters.selectedSegment ? filters.selectedSegment.label : "全セグメント"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象条件
                </label>
                <div className="text-sm text-gray-600">
                  90日以上購入なし
                </div>
              </div>
            </div>

            {/* アクションボタン - 非表示 */}
            {/* <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <Button variant="default" size="sm">
                <Play className="h-4 w-4 mr-2" />
                分析実行
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                CSV出力
              </Button>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel出力
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                復帰メール
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                データ更新
              </Button>
            </div> */}
          </CardContent>
        )}
      </Card>

      {/* KPI サマリーカード */}
      <DormantKPICards />

      {/* 期間別セグメントフィルター */}
      <div>
        <h2 className="text-xl font-semibold mb-4">期間別セグメント</h2>
        <DormantPeriodFilter />
      </div>

      {/* 分析チャート */}
      <DormantAnalysisChart />

      {/* 復帰インサイト */}
      <ReactivationInsights />

      {/* 休眠顧客一覧 */}
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