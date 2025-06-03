"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { dormantSegments, type DormantSegment } from "@/data/mock/customerData"

interface DormantPeriodFilterProps {
  onSegmentSelect?: (segment: DormantSegment | null) => void;
  selectedSegment?: DormantSegment | null;
}

export function DormantPeriodFilter({ 
  onSegmentSelect, 
  selectedSegment 
}: DormantPeriodFilterProps) {
  const handleSegmentClick = (segment: DormantSegment) => {
    const newSelection = selectedSegment?.id === segment.id ? null : segment
    onSegmentSelect?.(newSelection)
  }

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
        <div className="space-y-4">
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
        </div>

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