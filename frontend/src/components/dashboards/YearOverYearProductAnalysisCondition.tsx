"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import { BarChart3, Calendar, Filter, Play, Sparkles } from "lucide-react"
import { Checkbox } from "../ui/checkbox"

/**
 * 前年同月比【商品】分析 - 条件設定コンポーネント
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description パフォーマンス改善のため、条件設定→分析実行パターンを実装
 */

export interface AnalysisConditions {
  dateRange: string
  categories: string[]
  minSales: number
  comparisonType: 'yearOverYear' | 'monthOverMonth' | 'custom'
  viewMode: 'sales' | 'quantity' | 'orders'
  selectedYear?: number
  excludeKeywords?: string[]
  excludeServiceItems?: boolean
}

interface AnalysisConditionPanelProps {
  onExecute: (conditions: AnalysisConditions) => void
  isExecuting?: boolean
  availableCategories?: string[]
}

// プリセット定義
const ANALYSIS_PRESETS = [
  {
    id: 'top-sellers',
    name: '売れ筋商品',
    icon: '🔥',
    conditions: {
      dateRange: 'last12months',
      minSales: 100000,
      comparisonType: 'yearOverYear' as const,
      viewMode: 'sales' as const
    }
  },
  {
    id: 'seasonal',
    name: '季節商品',
    icon: '🌸',
    conditions: {
      dateRange: 'last3months',
      minSales: 0,
      comparisonType: 'yearOverYear' as const,
      viewMode: 'quantity' as const
    }
  },
  {
    id: 'new-products',
    name: '新商品',
    icon: '✨',
    conditions: {
      dateRange: 'last6months',
      minSales: 0,
      comparisonType: 'yearOverYear' as const,
      viewMode: 'sales' as const
    }
  }
]

export const YearOverYearProductAnalysisCondition: React.FC<AnalysisConditionPanelProps> = ({
  onExecute,
  isExecuting = false,
  availableCategories = []
}) => {
  const currentYear = new Date().getFullYear()
  const [conditions, setConditions] = useState<AnalysisConditions>({
    dateRange: 'last12months',
    categories: [],
    minSales: 0,
    comparisonType: 'yearOverYear',
    viewMode: 'sales',
    selectedYear: currentYear
  })

  const handlePresetSelect = (preset: typeof ANALYSIS_PRESETS[0]) => {
    setConditions(prev => ({
      ...prev,
      ...preset.conditions
    }))
  }

  const handleCategoryToggle = (category: string) => {
    setConditions(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  const handleExecute = () => {
    onExecute(conditions)
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            前年同月比【商品】分析 - 条件設定
          </CardTitle>
          <CardDescription>
            分析条件を設定して、必要なデータのみを効率的に取得します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* プリセット選択 */}
          <div className="space-y-3">
            <Label>クイック設定（プリセット）</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ANALYSIS_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handlePresetSelect(preset)}
                >
                  <span className="mr-2 text-lg">{preset.icon}</span>
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左カラム */}
            <div className="space-y-4">
              {/* 分析期間 */}
              <div className="space-y-2">
                <Label htmlFor="dateRange" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  分析期間
                </Label>
                <Select 
                  value={conditions.dateRange} 
                  onValueChange={(value) => setConditions(prev => ({ ...prev, dateRange: value }))}
                >
                  <SelectTrigger id="dateRange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last12months">過去12ヶ月</SelectItem>
                    <SelectItem value="last6months">過去6ヶ月</SelectItem>
                    <SelectItem value="last3months">過去3ヶ月</SelectItem>
                    <SelectItem value="currentYear">今年度</SelectItem>
                    <SelectItem value="lastYear">昨年度</SelectItem>
                    <SelectItem value="custom">カスタム期間</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 比較年度 */}
              <div className="space-y-2">
                <Label htmlFor="selectedYear">比較年度</Label>
                <Select 
                  value={conditions.selectedYear?.toString()} 
                  onValueChange={(value) => setConditions(prev => ({ ...prev, selectedYear: parseInt(value) }))}
                >
                  <SelectTrigger id="selectedYear">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}年 vs {year - 1}年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 表示データ */}
              <div className="space-y-2">
                <Label htmlFor="viewMode">表示データ</Label>
                <Select 
                  value={conditions.viewMode} 
                  onValueChange={(value: any) => setConditions(prev => ({ ...prev, viewMode: value }))}
                >
                  <SelectTrigger id="viewMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">売上金額</SelectItem>
                    <SelectItem value="quantity">販売数量</SelectItem>
                    <SelectItem value="orders">注文件数</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 右カラム */}
            <div className="space-y-4">
              {/* サービス項目除外 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  除外設定
                </Label>
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="excludeServiceItems"
                      checked={conditions.excludeServiceItems || false}
                      onCheckedChange={(checked) => setConditions(prev => ({ 
                        ...prev, 
                        excludeServiceItems: checked as boolean 
                      }))}
                    />
                    <Label
                      htmlFor="excludeServiceItems"
                      className="text-sm font-normal cursor-pointer"
                    >
                      サービス項目を除外（代引き手数料、送料等）
                    </Label>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">除外される項目:</p>
                    <p className="text-xs text-gray-400">• 代引き手数料 • 送料 • 手数料 • サービス料</p>
                  </div>
                </div>
              </div>

              {/* カテゴリフィルター */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  商品カテゴリ（複数選択可）
                </Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                  {availableCategories.length > 0 ? (
                    availableCategories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={conditions.categories.includes(category)}
                          onCheckedChange={() => handleCategoryToggle(category)}
                        />
                        <Label
                          htmlFor={`category-${category}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {category}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">全カテゴリを対象</p>
                  )}
                </div>
                {conditions.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conditions.categories.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 最小売上閾値 */}
              <div className="space-y-2">
                <Label htmlFor="minSales">最小売上閾値</Label>
                <Input
                  id="minSales"
                  type="number"
                  placeholder="例: 10000（円以上の商品のみ）"
                  value={conditions.minSales || ''}
                  onChange={(e) => setConditions(prev => ({ 
                    ...prev, 
                    minSales: parseInt(e.target.value) || 0 
                  }))}
                />
                <p className="text-xs text-gray-500">
                  0円の場合は全商品が対象
                </p>
              </div>
            </div>
          </div>

          {/* 分析条件サマリー */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">分析条件サマリー</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 期間: {conditions.dateRange === 'last12months' ? '過去12ヶ月' : 
                         conditions.dateRange === 'last6months' ? '過去6ヶ月' : 
                         conditions.dateRange === 'last3months' ? '過去3ヶ月' : conditions.dateRange}</p>
              <p>• 比較: {conditions.selectedYear}年 vs {(conditions.selectedYear || currentYear) - 1}年</p>
              <p>• 表示: {conditions.viewMode === 'sales' ? '売上金額' : 
                         conditions.viewMode === 'quantity' ? '販売数量' : '注文件数'}</p>
              {conditions.categories.length > 0 && (
                <p>• カテゴリ: {conditions.categories.join(', ')}</p>
              )}
              {conditions.minSales > 0 && (
                <p>• 最小売上: {conditions.minSales.toLocaleString()}円以上</p>
              )}
              {conditions.excludeServiceItems && (
                <p>• サービス項目を除外</p>
              )}
            </div>
          </div>

          {/* 実行ボタン */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleExecute}
              disabled={isExecuting}
              size="lg"
              className="min-w-[120px]"
            >
              {isExecuting ? (
                <>分析中...</>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  分析実行
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使い方のヒント */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            効率的な分析のヒント
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• プリセットを使用すると、よく使う分析条件を素早く設定できます</li>
            <li>• カテゴリを絞り込むことで、特定の商品群の傾向を詳しく分析できます</li>
            <li>• 最小売上閾値を設定すると、売上の少ない商品を除外して主力商品に集中できます</li>
            <li>• 分析期間を短くすると、最近のトレンドをより詳細に把握できます</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}