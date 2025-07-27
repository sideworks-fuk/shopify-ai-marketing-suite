"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Filter, Loader2 } from "lucide-react"
import { type DormantSegment } from "@/types/models/customer"
import { useDormantFilters } from "@/contexts/FilterContext"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface ApiSegmentDistribution {
  segment: string;
  count: number;
  percentage: number;
  revenue: number;
}

interface DormantPeriodFilterProps {
  segmentDistributions?: ApiSegmentDistribution[];
  onSegmentSelect?: (segment: DormantSegment | null) => Promise<void>;
  isDataLoading?: boolean;
}

export function DormantPeriodFilter({ 
  segmentDistributions = [], 
  onSegmentSelect,
  isDataLoading = false 
}: DormantPeriodFilterProps) {
  const { filters, setSelectedSegment } = useDormantFilters()
  
  // ローディング状態の管理
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSegment, setLoadingSegment] = useState<string | null>(null)
  
  // APIデータからセグメント情報を生成
  const periodSegments = useMemo(() => {
    console.log('🔍 PeriodFilter - segmentDistributions:', segmentDistributions)
    
    if (segmentDistributions.length === 0) {
      // APIデータがない場合のフォールバック（読み込み中）
      console.log('⚠️ PeriodFilter - フォールバックデータを使用')
      return [
        { id: '90-180', label: '90-180日', range: [90, 180], count: 0, color: '#FEF3C7', urgency: 'medium' },
        { id: '180-365', label: '180-365日', range: [180, 365], count: 0, color: '#FECACA', urgency: 'high' },
        { id: '365+', label: '365日以上', range: [365, 9999], count: 0, color: '#EF4444', urgency: 'critical' },
      ] as DormantSegment[]
    }

    // APIデータから DormantSegment 形式に変換
    const segments = segmentDistributions.map((dist) => {
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

      console.log('🔍 PeriodFilter - セグメント変換:', {
        original: segment,
        count: dist.count,
        range,
        urgency
      })

      return {
        id: segment.replace(/[日以上\-]/g, ''),
        label: segment,
        range,
        count: dist.count,
        color,
        urgency
      } as DormantSegment
    }).sort((a, b) => a.range[0] - b.range[0])
    
    console.log('✅ PeriodFilter - 最終セグメント:', segments)
    
    // デバッグ情報: 各セグメントの詳細を出力
    segments.forEach(segment => {
      console.log(`📊 セグメント詳細: ${segment.label} = ${segment.count}名 (範囲: ${segment.range[0]}-${segment.range[1]}日)`)
    })
    
    return segments
  }, [segmentDistributions])

  const handleSegmentClick = async (segment: DormantSegment) => {
    // 既にローディング中の場合は何もしない
    if (isLoading) return
    
    const newSelection = filters.selectedSegment?.id === segment.id ? null : segment
    
    // 即座にローディング状態を表示
    setIsLoading(true)
    setLoadingSegment(segment.id)
    
    try {
      // フィルター状態を即座に更新（UI反応の向上）
      setSelectedSegment(newSelection)
      
      // 365日以上の場合は特別なメッセージ
      if (segment.label === "365日以上") {
        console.log('🔄 365日以上データの処理を開始...')
      }
      
      // 親コンポーネントのコールバックがある場合は実行
      if (onSegmentSelect) {
        await onSegmentSelect(newSelection)
      }
      
      console.log('✅ セグメント選択完了:', newSelection?.label || 'クリア')
      
    } catch (error) {
      console.error('❌ セグメント選択エラー:', error)
      // エラー時は元の状態に戻す
      setSelectedSegment(filters.selectedSegment)
    } finally {
      setIsLoading(false)
      setLoadingSegment(null)
    }
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
            {periodSegments.map((segment) => {
              const isSegmentLoading = loadingSegment === segment.id
              const isSelected = filters.selectedSegment?.id === segment.id
              
              return (
                <Button
                  key={segment.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleSegmentClick(segment)}
                  disabled={isLoading || isDataLoading}
                  className={cn(
                    "h-auto flex-col p-4 relative transition-all",
                    isSelected && "ring-2 ring-blue-500",
                    isSegmentLoading && "opacity-60",
                    (isLoading || isDataLoading) && "cursor-not-allowed"
                  )}
                >
                  {/* ローディングオーバーレイ */}
                  {isSegmentLoading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-md">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                  
                  {/* セグメント情報 */}
                  <div className="text-sm font-semibold mb-1">
                    {segment.label}
                    {segment.label === "365日以上" && isSegmentLoading && (
                      <div className="text-xs text-muted-foreground mt-1">
                        大量データ処理中...
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {segment.range[0]}-{segment.range[1] === 9999 ? '∞' : segment.range[1]}日
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "mt-2 text-xs",
                      isSegmentLoading && "opacity-50"
                    )}
                  >
                    {segment.count.toLocaleString()}名
                  </Badge>
                </Button>
              )
            })}
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
                {isLoading && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    処理中...
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSegment(null)}
                disabled={isLoading || isDataLoading}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                クリア
              </Button>
            </div>
          </div>
        )}
        
        {/* 全体のローディング状態表示 */}
        {(isDataLoading && !isLoading) && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>データを読み込んでいます...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 