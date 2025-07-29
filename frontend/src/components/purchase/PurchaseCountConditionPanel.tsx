import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CalendarIcon, PlayIcon } from "lucide-react"

interface AnalysisConditions {
  period: string
  segment: string
  compareWithPrevious: boolean
  timestamp: string
}

interface PurchaseCountConditionPanelProps {
  onExecute: (conditions: AnalysisConditions) => void
  isAnalyzing: boolean
}

export function PurchaseCountConditionPanel({ 
  onExecute, 
  isAnalyzing 
}: PurchaseCountConditionPanelProps) {
  const [period, setPeriod] = useState("12months")
  const [segment, setSegment] = useState("all")
  const [compareWithPrevious, setCompareWithPrevious] = useState(true)

  const handleExecute = () => {
    onExecute({
      period,
      segment,
      compareWithPrevious,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>分析条件設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 分析期間 */}
          <div className="space-y-2">
            <Label>分析期間</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">過去3ヶ月</SelectItem>
                <SelectItem value="6months">過去6ヶ月</SelectItem>
                <SelectItem value="12months">過去12ヶ月</SelectItem>
                <SelectItem value="24months">過去24ヶ月</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 顧客セグメント */}
          <div className="space-y-2">
            <Label>顧客セグメント</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全顧客</SelectItem>
                <SelectItem value="new">新規顧客</SelectItem>
                <SelectItem value="existing">既存顧客</SelectItem>
                <SelectItem value="returning">復帰顧客</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 前年比較 */}
          <div className="space-y-2">
            <Label>前年同期比較</Label>
            <Select 
              value={compareWithPrevious ? "yes" : "no"} 
              onValueChange={(v) => setCompareWithPrevious(v === "yes")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">比較する</SelectItem>
                <SelectItem value="no">比較しない</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleExecute}
            disabled={isAnalyzing}
            size="lg"
            className="min-w-[120px]"
          >
            {isAnalyzing ? (
              <>分析中...</>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                分析実行
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}