"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Filter,
  AlertTriangle,
  Clock,
  Users
} from "lucide-react"
import { dormantSegments, type DormantSegment } from "@/data/mock/customerData"

interface DormantPeriodFilterProps {
  onSegmentSelect?: (segment: DormantSegment | null) => void;
  selectedSegment?: DormantSegment | null;
}

export function DormantPeriodFilter({ 
  onSegmentSelect, 
  selectedSegment 
}: DormantPeriodFilterProps) {
  const [filterType, setFilterType] = useState<'period' | 'risk' | 'segment'>('period')

  const handleSegmentClick = (segment: DormantSegment) => {
    const newSelection = selectedSegment?.id === segment.id ? null : segment
    onSegmentSelect?.(newSelection)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-green-50 text-green-700 border-green-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'critical': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <Clock className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const riskSegments = dormantSegments.reduce((acc, segment) => {
    const key = segment.urgency
    if (!acc[key]) acc[key] = []
    acc[key].push(segment)
    return acc
  }, {} as Record<string, DormantSegment[]>)

  const periodSegments = dormantSegments.slice().sort((a, b) => a.range[0] - b.range[0])

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5 text-slate-600" />
          休眠期間別フィルター
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="period">期間別表示</TabsTrigger>
            <TabsTrigger value="risk">リスク別表示</TabsTrigger>
            <TabsTrigger value="segment">セグメント別表示</TabsTrigger>
          </TabsList>

          {/* 期間別表示 */}
          <TabsContent value="period" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {periodSegments.map((segment) => (
                <Button
                  key={segment.id}
                  variant={selectedSegment?.id === segment.id ? "default" : "outline"}
                  onClick={() => handleSegmentClick(segment)}
                  className={`h-auto flex-col p-4 ${
                    selectedSegment?.id === segment.id ? 'ring-2 ring-blue-500' : ''
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
          </TabsContent>

          {/* リスク別表示 */}
          <TabsContent value="risk" className="space-y-4">
            {Object.entries(riskSegments).map(([urgency, segments]) => (
              <div key={urgency} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {getUrgencyIcon(urgency)}
                  <span className="capitalize">
                    {urgency === 'low' && '低リスク'}
                    {urgency === 'medium' && '中リスク'}
                    {urgency === 'high' && '高リスク'}
                    {urgency === 'critical' && '緊急'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {segments.reduce((sum, s) => sum + s.count, 0)}名
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {segments.map((segment) => (
                    <Button
                      key={segment.id}
                      variant={selectedSegment?.id === segment.id ? "default" : "outline"}
                      onClick={() => handleSegmentClick(segment)}
                      className={`h-auto flex-col p-3 ${getUrgencyColor(urgency)} ${
                        selectedSegment?.id === segment.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {segment.label}
                      </div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {segment.count}名
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* セグメント別表示 */}
          <TabsContent value="segment" className="space-y-4">
            <div className="space-y-6">
              {/* 早期対応セグメント */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  早期対応セグメント（復帰可能性高）
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dormantSegments.filter(s => s.urgency === 'medium').map((segment) => (
                    <Button
                      key={segment.id}
                      variant={selectedSegment?.id === segment.id ? "default" : "outline"}
                      onClick={() => handleSegmentClick(segment)}
                      className={`h-auto flex-col p-3 bg-green-50 hover:bg-green-100 ${
                        selectedSegment?.id === segment.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-green-800">
                        {segment.label}
                      </div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {segment.count}名
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 重点アプローチセグメント */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  重点アプローチセグメント（要注意）
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dormantSegments.filter(s => s.urgency === 'high').map((segment) => (
                    <Button
                      key={segment.id}
                      variant={selectedSegment?.id === segment.id ? "default" : "outline"}
                      onClick={() => handleSegmentClick(segment)}
                      className={`h-auto flex-col p-3 bg-orange-50 hover:bg-orange-100 ${
                        selectedSegment?.id === segment.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-orange-800">
                        {segment.label}
                      </div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {segment.count}名
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 最終アプローチセグメント */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  最終アプローチセグメント（緊急対応）
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {dormantSegments.filter(s => s.urgency === 'critical').map((segment) => (
                    <Button
                      key={segment.id}
                      variant={selectedSegment?.id === segment.id ? "default" : "outline"}
                      onClick={() => handleSegmentClick(segment)}
                      className={`h-auto flex-col p-3 bg-red-50 hover:bg-red-100 ${
                        selectedSegment?.id === segment.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-red-800">
                        {segment.label}
                      </div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {segment.count}名
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 選択状態の表示 */}
        {selectedSegment && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white">
                  選択中
                </Badge>
                <span className="text-sm font-medium">
                  {selectedSegment.label}（{selectedSegment.count}名）
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSegmentSelect?.(null)}
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