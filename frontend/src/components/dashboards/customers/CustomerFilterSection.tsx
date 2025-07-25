"use client"

import { Calendar, Users, UserPlus, Repeat, Crown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import PeriodSelector from "@/components/common/PeriodSelector"
import { useSalesAnalysisFilters, type DateRangePeriod } from "@/stores/analysisFiltersStore"

export function CustomerFilterSection() {
  const { filters, updateDateRange } = useSalesAnalysisFilters()
  
  // プリセット期間の設定
  const presetPeriods = [
    { 
      label: "直近12ヶ月", 
      icon: "📊",
      getValue: () => {
        const now = new Date()
        const endYear = now.getFullYear()
        const endMonth = now.getMonth() + 1
        const startDate = new Date(endYear, endMonth - 1 - 12, 1)
        return {
          startYear: startDate.getFullYear(),
          startMonth: startDate.getMonth() + 1,
          endYear,
          endMonth
        }
      }
    },
    { 
      label: "直近6ヶ月", 
      icon: "📈",
      getValue: () => {
        const now = new Date()
        const endYear = now.getFullYear()
        const endMonth = now.getMonth() + 1
        const startDate = new Date(endYear, endMonth - 1 - 6, 1)
        return {
          startYear: startDate.getFullYear(),
          startMonth: startDate.getMonth() + 1,
          endYear,
          endMonth
        }
      }
    },
    { 
      label: "直近3ヶ月", 
      icon: "📉",
      getValue: () => {
        const now = new Date()
        const endYear = now.getFullYear()
        const endMonth = now.getMonth() + 1
        const startDate = new Date(endYear, endMonth - 1 - 3, 1)
        return {
          startYear: startDate.getFullYear(),
          startMonth: startDate.getMonth() + 1,
          endYear,
          endMonth
        }
      }
    },
    { 
      label: "先月", 
      icon: "📅",
      getValue: () => {
        const now = new Date()
        const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
        return {
          startYear: lastMonthYear,
          startMonth: lastMonth,
          endYear: lastMonthYear,
          endMonth: lastMonth
        }
      }
    }
  ]

  const handlePeriodChange = (newDateRange: DateRangePeriod) => {
    updateDateRange(newDateRange)
  }

  return (
    <div className="space-y-4">
      {/* 分析条件設定カード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">分析条件設定</CardTitle>
          <p className="text-sm text-muted-foreground">
            期間と分析条件を設定してください
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>分析期間</Label>
            <PeriodSelector
              dateRange={filters.dateRange}
              onDateRangeChange={handlePeriodChange}
              presetPeriods={presetPeriods}
              maxMonths={12}
              minMonths={1}
              showPresets={true}
              showValidation={true}
              title="分析期間"
              description="期間を設定してください"
            />
          </div>

          <div className="space-y-2">
            <Label>顧客セグメント</Label>
            <Select defaultValue="全顧客">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全顧客">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    全顧客
                  </div>
                </SelectItem>
                <SelectItem value="新規">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    新規顧客
                  </div>
                </SelectItem>
                <SelectItem value="リピーター">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    リピーター
                  </div>
                </SelectItem>
                <SelectItem value="VIP">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    VIP顧客
                  </div>
                </SelectItem>
                <SelectItem value="休眠">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    休眠顧客
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 