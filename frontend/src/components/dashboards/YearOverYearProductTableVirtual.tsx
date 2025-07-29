"use client"

import React, { useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { VirtualScroll, useVirtualScrollPerformance } from "../ui/VirtualScroll"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

/**
 * 前年同月比商品テーブル - 仮想スクロール対応版
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description 大量データ対応のため仮想スクロールを実装
 */

type ViewMode = 'sales' | 'quantity' | 'orders'

interface ProductYearData {
  productId: string
  productName: string
  category: string
  monthlyData: { [key: string]: MonthlyData }
  yearOverYearGrowth: { [month: string]: number }
  totalGrowth: number
  avgGrowth: number
}

interface MonthlyData {
  sales: number
  quantity: number
  orders: number
  [key: string]: number
}

interface YearOverYearProductTableVirtualProps {
  data: ProductYearData[]
  viewMode: ViewMode
  comparisonMode: "sideBySide" | "growth"
  selectedYear: number
  previousYear: number
  containerHeight?: number
}

// 値のフォーマット
const formatValue = (value: number, viewMode: ViewMode) => {
  switch (viewMode) {
    case "sales":
      return formatCurrency(value)
    case "quantity":
      return `${value.toLocaleString()}個`
    case "orders":
      return `${value.toLocaleString()}件`
    default:
      return value.toString()
  }
}

// 成長率のフォーマット
const formatGrowthRate = (rate: number) => {
  if (rate === 0) return "±0%"
  return `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`
}

// 成長率に基づく色の取得
const getGrowthColor = (growth: number) => {
  if (growth > 20) return "text-green-700 bg-green-100"
  if (growth > 10) return "text-green-600 bg-green-50"
  if (growth > 0) return "text-blue-600 bg-blue-50"
  if (growth > -10) return "text-yellow-600 bg-yellow-50"
  if (growth > -20) return "text-orange-600 bg-orange-50"
  return "text-red-600 bg-red-50"
}

// データセルコンポーネント（メモ化）
const EnhancedDataCell = React.memo(({
  currentValue,
  previousValue,
  viewMode,
  showGrowth = true,
}: {
  currentValue: number
  previousValue: number
  viewMode: ViewMode
  showGrowth?: boolean
}) => {
  const growthRate = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

  const getCellStyle = () => {
    if (!showGrowth) return "bg-white"
    if (growthRate > 20) return "bg-green-100 text-green-800 border-green-200"
    if (growthRate > 10) return "bg-green-50 text-green-700 border-green-100"
    if (growthRate > 0) return "bg-blue-50 text-blue-700 border-blue-100"
    if (growthRate > -10) return "bg-yellow-50 text-yellow-700 border-yellow-100"
    if (growthRate > -20) return "bg-orange-50 text-orange-700 border-orange-100"
    return "bg-red-50 text-red-700 border-red-100"
  }

  return (
    <div className={cn(
      "p-2 text-center relative border rounded-sm",
      getCellStyle()
    )}>
      <div className="font-bold text-sm">{formatValue(currentValue, viewMode)}</div>
      {showGrowth && (
        <div className="text-xs font-medium">
          {growthRate > 0 ? "+" : ""}
          {growthRate.toFixed(1)}%
        </div>
      )}
    </div>
  )
})

EnhancedDataCell.displayName = "EnhancedDataCell"

export const YearOverYearProductTableVirtual: React.FC<YearOverYearProductTableVirtualProps> = ({
  data,
  viewMode,
  comparisonMode,
  selectedYear,
  previousYear,
  containerHeight = 600,
}) => {
  const { measureScrollPerformance } = useVirtualScrollPerformance('YearOverYearProductTable')

  // テーブルヘッダーの高さ
  const headerHeight = comparisonMode === "sideBySide" ? 96 : 64
  const rowHeight = 80
  const scrollAreaHeight = containerHeight - headerHeight

  // ヘッダーのレンダリング（メモ化）
  const tableHeader = useMemo(() => (
    <div className="sticky top-0 z-20 bg-white border-b-2 border-gray-200">
      <div className="flex">
        <div className="sticky left-0 bg-white z-30 w-[200px] border-r border-gray-200">
          <div className="h-full flex items-center px-3 font-medium text-gray-900">
            商品名
          </div>
        </div>
        <div className="flex flex-1">
          {Array.from({ length: 12 }, (_, i) => {
            const month = (i + 1).toString().padStart(2, "0")
            return (
              <div
                key={month}
                className={cn(
                  "flex-1 text-center py-2 px-2 font-medium text-gray-900 border-r border-gray-200",
                  comparisonMode === "sideBySide" ? "bg-blue-50" : ""
                )}
              >
                {comparisonMode === "sideBySide" && (
                  <div className="mb-2">{month}月</div>
                )}
                {comparisonMode === "growth" && `${month}月`}
              </div>
            )
          })}
        </div>
      </div>
      {comparisonMode === "sideBySide" && (
        <div className="flex border-t border-gray-200">
          <div className="sticky left-0 bg-white z-30 w-[200px] border-r border-gray-200"></div>
          <div className="flex flex-1">
            {Array.from({ length: 12 }, (_, i) => (
              <React.Fragment key={i}>
                <div className="flex-1 text-center py-2 px-1 text-xs font-normal text-gray-600 bg-gray-50 border-r border-gray-100">
                  {previousYear}
                </div>
                <div className="flex-1 text-center py-2 px-1 text-xs font-normal text-gray-600 bg-blue-50 border-r border-gray-200">
                  {selectedYear}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  ), [comparisonMode, previousYear, selectedYear])

  // 行のレンダリング関数（メモ化）
  const renderRow = useCallback((product: ProductYearData, index: number) => (
    <div 
      className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors"
      style={{ height: rowHeight }}
    >
      {/* 商品名列（固定） */}
      <div className="sticky left-0 bg-white z-10 w-[200px] py-3 px-3 font-medium text-gray-900 border-r border-gray-200">
        <div className="font-medium truncate">{product.productName}</div>
        <div className="text-xs text-gray-500 truncate">{product.category}</div>
        <Badge variant="outline" className={`mt-1 ${getGrowthColor(product.avgGrowth)}`}>
          {formatGrowthRate(product.avgGrowth)}
        </Badge>
      </div>

      {/* データ列 */}
      <div className="flex flex-1">
        {comparisonMode === "sideBySide"
          ? Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, "0")
              const dataPrevious = product.monthlyData[`${previousYear}-${month}`]?.[viewMode] || 0
              const dataCurrent = product.monthlyData[`${selectedYear}-${month}`]?.[viewMode] || 0

              return (
                <React.Fragment key={month}>
                  <div className="flex-1 py-1 px-1 text-center border-r border-gray-100">
                    <EnhancedDataCell
                      currentValue={dataPrevious}
                      previousValue={dataPrevious}
                      viewMode={viewMode}
                      showGrowth={false}
                    />
                  </div>
                  <div className="flex-1 py-1 px-1 text-center border-r border-gray-200">
                    <EnhancedDataCell
                      currentValue={dataCurrent}
                      previousValue={dataPrevious}
                      viewMode={viewMode}
                    />
                  </div>
                </React.Fragment>
              )
            })
          : Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, "0")
              const growth = product.yearOverYearGrowth[month] || 0

              return (
                <div
                  key={month}
                  className="flex-1 py-3 px-1 text-center text-xs font-mono border-r border-gray-200"
                >
                  <span className={`px-2 py-1 rounded ${getGrowthColor(growth)}`}>
                    {formatGrowthRate(growth)}
                  </span>
                </div>
              )
            })}
      </div>
    </div>
  ), [comparisonMode, previousYear, selectedYear, viewMode])

  // スクロールハンドラー
  const handleScroll = useCallback((scrollTop: number) => {
    measureScrollPerformance(() => {
      // スクロール時の処理（必要に応じて）
    })
  }, [measureScrollPerformance])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>商品別月次データ（仮想スクロール対応）</CardTitle>
            <CardDescription>
              {comparisonMode === "sideBySide"
                ? `各月の${previousYear}年/${selectedYear}年データを並列表示`
                : "前年同月比成長率を表示（正値：成長、負値：減少）"}
            </CardDescription>
          </div>
          <div className="text-sm text-gray-500">
            {data.length}件の商品を高速表示
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative" style={{ height: containerHeight }}>
          {tableHeader}
          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              <VirtualScroll
                items={data}
                itemHeight={rowHeight}
                containerHeight={scrollAreaHeight}
                renderItem={renderRow}
                overscan={10}
                onScroll={handleScroll}
                className="bg-white"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}