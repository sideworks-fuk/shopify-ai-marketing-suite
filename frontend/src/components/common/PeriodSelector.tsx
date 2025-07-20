import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, AlertTriangle } from "lucide-react"
import { DateRangePeriod } from "@/stores/analysisFiltersStore"

export type { DateRangePeriod } from "@/stores/analysisFiltersStore"

export interface PeriodSelectorProps {
  dateRange: DateRangePeriod
  onDateRangeChange: (dateRange: DateRangePeriod) => void
  title?: string
  description?: string
  maxMonths?: number
  minMonths?: number
  presetPeriods?: Array<{
    label: string
    icon: string
    getValue: () => DateRangePeriod
  }>
  showPresets?: boolean
  showValidation?: boolean
  className?: string
}

export default function PeriodSelector({
  dateRange,
  onDateRangeChange,
  title = "期間選択",
  description = "分析対象期間を設定してください",
  maxMonths = 12,
  minMonths = 1,
  presetPeriods,
  showPresets = true,
  showValidation = true,
  className = ""
}: PeriodSelectorProps) {
  const [validationError, setValidationError] = useState("")
  
  // ✅ セーフなデフォルト値を確保
  const getDefaultDateRange = (): DateRangePeriod => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    
    let startYear = currentYear - 1
    let startMonth = currentMonth + 1
    
    if (startMonth > 12) {
      startYear = currentYear
      startMonth = startMonth - 12
    }
    
    return {
      startYear,
      startMonth,
      endYear: currentYear,
      endMonth: currentMonth
    }
  }

  // ✅ dateRangeの安全性チェック
  const safeDateRange = useMemo(() => {
    if (!dateRange || 
        typeof dateRange.startYear !== 'number' ||
        typeof dateRange.startMonth !== 'number' ||
        typeof dateRange.endYear !== 'number' ||
        typeof dateRange.endMonth !== 'number') {
      console.warn('PeriodSelector: Invalid dateRange provided, using default')
      return getDefaultDateRange()
    }
    return dateRange
  }, [dateRange])

  // 利用可能な年・月の配列
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const availableMonths = Array.from({ length: 12 }, (_, i) => i + 1)
  
  // デフォルトプリセット期間
  const defaultPresetPeriods = [
    {
      label: "直近12ヶ月",
      icon: "📈",
      getValue: () => getDefaultDateRange()
    },
    {
      label: "今年度",
      icon: "📅", 
      getValue: () => ({
        startYear: currentYear,
        startMonth: 1,
        endYear: currentYear,
        endMonth: 12
      })
    },
    {
      label: "直近6ヶ月",
      icon: "⏰",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear
        let startMonth = currentMonth - 5
        
        if (startMonth <= 0) {
          startYear = currentYear - 1
          startMonth = 12 + startMonth
        }
        
        return {
          startYear,
          startMonth,
          endYear: currentYear,
          endMonth: currentMonth
        }
      }
    }
  ]

  const finalPresetPeriods = presetPeriods || defaultPresetPeriods

  // 期間バリデーション関数
  const validateDateRange = (newRange: DateRangePeriod): { isValid: boolean; message: string; monthCount: number } => {
    const monthDiff = (newRange.endYear - newRange.startYear) * 12 + (newRange.endMonth - newRange.startMonth) + 1
    
    if (monthDiff <= 0) {
      return { isValid: false, message: "開始年月は終了年月より前を指定してください", monthCount: 0 }
    }
    
    if (monthDiff > maxMonths) {
      return { isValid: false, message: `期間は${maxMonths}ヶ月以内で指定してください`, monthCount: monthDiff }
    }

    if (monthDiff < minMonths) {
      return { isValid: false, message: `期間は${minMonths}ヶ月以上で指定してください`, monthCount: monthDiff }
    }
    
    return { isValid: true, message: "", monthCount: monthDiff }
  }

  // 期間変更ハンドラー
  const handleDateRangeChange = (field: keyof DateRangePeriod, value: number) => {
    const newRange = { ...safeDateRange, [field]: value }
    const validation = validateDateRange(newRange)
    
    if (validation.isValid) {
      setValidationError("")
      onDateRangeChange(newRange)
    } else {
      setValidationError(validation.message)
      // エラーがある場合でも一時的に状態を更新（ユーザーの入力を妨げないため）
      onDateRangeChange(newRange)
    }
  }

  // プリセット期間適用ハンドラー
  const handlePresetPeriod = (preset: typeof finalPresetPeriods[0]) => {
    const newRange = preset.getValue()
    onDateRangeChange(newRange)
    setValidationError("")
  }

  // 選択期間の月数計算
  const selectedMonthsCount = useMemo(() => {
    return validateDateRange(safeDateRange).monthCount
  }, [safeDateRange, maxMonths, minMonths])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}（最大{maxMonths}ヶ月、最小{minMonths}ヶ月指定可能）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* プリセット期間ボタン */}
          {showPresets && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 flex items-center mr-2">
                クイック選択:
              </span>
              {finalPresetPeriods.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetPeriod(preset)}
                  className="h-8 text-xs"
                >
                  {preset.icon} {preset.label}
                </Button>
              ))}
            </div>
          )}

          {/* 期間選択UI */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">期間:</span>
            
            {/* 開始年月 */}
            <Select value={safeDateRange.startYear.toString()} onValueChange={(value) => handleDateRangeChange('startYear', parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={safeDateRange.startMonth.toString()} onValueChange={(value) => handleDateRangeChange('startMonth', parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month.toString()}>{month}月</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-muted-foreground">〜</span>
            
            {/* 終了年月 */}
            <Select value={safeDateRange.endYear.toString()} onValueChange={(value) => handleDateRangeChange('endYear', parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={safeDateRange.endMonth.toString()} onValueChange={(value) => handleDateRangeChange('endMonth', parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month.toString()}>{month}月</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-sm text-green-600 font-medium">
              📈 {selectedMonthsCount}ヶ月間のトレンド
            </span>
          </div>

          {/* バリデーションエラー表示 */}
          {showValidation && validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 