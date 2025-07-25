"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { type DormantSegment } from "@/types/models/customer"
import { useDormantFilters } from "@/contexts/FilterContext"
import { useMemo } from "react"

interface ApiSegmentDistribution {
  segment: string;
  count: number;
  percentage: number;
  revenue: number;
}

interface DormantPeriodFilterProps {
  segmentDistributions?: ApiSegmentDistribution[];
}

export function DormantPeriodFilter({ segmentDistributions = [] }: DormantPeriodFilterProps) {
  const { filters, setSelectedSegment } = useDormantFilters()
  
  // APIデータからセグメント情報を生成
  const periodSegments = useMemo(() => {
    if (segmentDistributions.length === 0) {
      // APIデータがない場合のフォールバック
      return [
        { id: '90-180', label: '90-180日', range: [90, 180], count: 0, color: '#FEF3C7', urgency: 'medium' },
        { id: '180-365', label: '180-365日', range: [180, 365], count: 0, color: '#FECACA', urgency: 'high' },
        { id: '365+', label: '365日以上', range: [365, 9999], count: 0, color: '#EF4444', urgency: 'critical' },
      ] as DormantSegment[]
    }

    // APIデータから DormantSegment 形式に変換
    return segmentDistributions.map((dist) => {
      const segment = dist.segment
      let range: [number, number] = [0, 999]
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'
      let color = '#FEF3C7'

      // セグメント名から範囲を推定
      if (segment === '90-180日') {
        range = [90, 180]
        urgency = 'medium'
        color = '#FEF3C7'
      } else if (segment === '180-365日') {
        range = [180, 365]
        urgency = 'high'
        color = '#FECACA'
      } else if (segment === '365日以上') {
        range = [365, 9999]
        urgency = 'critical'
        color = '#EF4444'
      }

      return {
        id: segment.replace(/[日以上\-]/g, ''),
        label: segment,
        range,
        count: dist.count,
        color,
        urgency
      } as DormantSegment
    }).sort((a, b) => a.range[0] - b.range[0])
  }, [segmentDistributions])

  const handleSegmentClick = (segment: DormantSegment) => {
    const newSelection = filters.selectedSegment?.id === segment.id ? null : segment
    setSelectedSegment(newSelection)
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5 text-slate-600" />
          休眠期間別フィルター
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {periodSegments.map((segment) => (
              <Button
                key={segment.id}
                variant={filters.selectedSegment?.id === segment.id ? "default" : "outline"}
                onClick={() => handleSegmentClick(segment)}
                className={`h-auto flex-col p-4 ${
                  filters.selectedSegment?.id === segment.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="text-sm font-semibold mb-1">
                  {segment.label}
                </div>
                <div className="text-xs text-slate-500">
                  {segment.range[0]}-{segment.range[1] === 9999 ? '∞' : segment.range[1]}日
                </div>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {segment.count}名
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* 選択状態の表示 */}
        {filters.selectedSegment && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white">
                  選択中
                </Badge>
                <span className="text-sm font-medium">
                  {filters.selectedSegment.label}（{filters.selectedSegment.count}名）
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSegment(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                クリア
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 