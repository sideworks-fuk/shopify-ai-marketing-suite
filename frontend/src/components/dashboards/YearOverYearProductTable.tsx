"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

/**
 * 前年同月比商品テーブル - 段階的表示対応版
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description パフォーマンス最適化のため段階的表示を実装
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

interface YearOverYearProductTableProps {
  data: ProductYearData[]
  viewMode: ViewMode
  comparisonMode: "sideBySide" | "growth"
  selectedYear: number
  previousYear: number
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

// データセルコンポーネント
const EnhancedDataCell = ({
  currentValue,
  previousValue,
  viewMode,
}: {
  currentValue: number
  previousValue: number
  viewMode: ViewMode
}) => {
  const growthRate = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

  const getCellStyle = () => {
    if (growthRate > 20) return "bg-green-100 text-green-800 border-green-200"
    if (growthRate > 10) return "bg-green-50 text-green-700 border-green-100"
    if (growthRate > 0) return "bg-blue-50 text-blue-700 border-blue-100"
    if (growthRate > -10) return "bg-yellow-50 text-yellow-700 border-yellow-100"
    if (growthRate > -20) return "bg-orange-50 text-orange-700 border-orange-100"
    return "bg-red-50 text-red-700 border-red-100"
  }

  return (
    <div className={`p-2 text-center relative border ${getCellStyle()} rounded-sm`}>
      <div className="font-bold text-sm">{formatValue(currentValue, viewMode)}</div>
      <div className="text-xs font-medium">
        {growthRate > 0 ? "+" : ""}
        {growthRate.toFixed(1)}%
      </div>
    </div>
  )
}

export const YearOverYearProductTable: React.FC<YearOverYearProductTableProps> = ({
  data,
  viewMode,
  comparisonMode,
  selectedYear,
  previousYear
}) => {
  // テーブルヘッダーのレンダリング
  const renderTableHeader = () => (
    <thead>
      <tr className="border-b-2 border-gray-200">
        <th className="sticky left-0 bg-white z-10 text-left py-4 px-3 font-medium text-gray-900 border-r border-gray-200 min-w-[200px]">
          商品名
        </th>
        {comparisonMode === "sideBySide"
          ? Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, "0")
              return (
                <th
                  key={month}
                  colSpan={2}
                  className="text-center py-2 px-2 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                >
                  {month}月
                </th>
              )
            })
          : Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, "0")
              return (
                <th
                  key={month}
                  className="text-center py-4 px-2 font-medium text-gray-900 border-r border-gray-200"
                >
                  {month}月
                </th>
              )
            })}
      </tr>
      {comparisonMode === "sideBySide" && (
        <tr className="border-b border-gray-200">
          <th className="sticky left-0 bg-white z-10"></th>
          {Array.from({ length: 12 }, (_, i) => (
            <React.Fragment key={i}>
              <th className="text-center py-2 px-1 text-xs font-normal text-gray-600 bg-gray-50 border-r border-gray-100">
                {previousYear}
              </th>
              <th className="text-center py-2 px-1 text-xs font-normal text-gray-600 bg-blue-50 border-r border-gray-200">
                {selectedYear}
              </th>
            </React.Fragment>
          ))}
        </tr>
      )}
    </thead>
  )

  // 商品行のレンダリング
  const renderProductRow = (product: ProductYearData) => (
    <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="sticky left-0 bg-white z-10 py-3 px-3 font-medium text-gray-900 border-r border-gray-200">
        <div>
          <div className="font-medium">{product.productName}</div>
          <div className="text-xs text-gray-500">{product.category}</div>
          <Badge variant="outline" className={`mt-1 ${getGrowthColor(product.avgGrowth)}`}>
            {formatGrowthRate(product.avgGrowth)}
          </Badge>
        </div>
      </td>
      {comparisonMode === "sideBySide"
        ? Array.from({ length: 12 }, (_, i) => {
            const month = (i + 1).toString().padStart(2, "0")
            const dataPrevious = product.monthlyData[`${previousYear}-${month}`]?.[viewMode] || 0
            const dataCurrent = product.monthlyData[`${selectedYear}-${month}`]?.[viewMode] || 0

            return (
              <React.Fragment key={month}>
                <td className="py-1 px-1 text-center border-r border-gray-100">
                  <div className="p-2 text-center">
                    <div className="font-bold text-sm">{formatValue(dataPrevious, viewMode)}</div>
                  </div>
                </td>
                <td className="py-1 px-1 text-center border-r border-gray-200">
                  <EnhancedDataCell
                    currentValue={dataCurrent}
                    previousValue={dataPrevious}
                    viewMode={viewMode}
                  />
                </td>
              </React.Fragment>
            )
          })
        : Array.from({ length: 12 }, (_, i) => {
            const month = (i + 1).toString().padStart(2, "0")
            const growth = product.yearOverYearGrowth[month] || 0

            return (
              <td
                key={month}
                className="py-3 px-1 text-center text-xs font-mono border-r border-gray-200"
              >
                <span className={`px-2 py-1 rounded ${getGrowthColor(growth)}`}>
                  {formatGrowthRate(growth)}
                </span>
              </td>
            )
          })}
    </tr>
  )

  // 段階的表示の状態管理
  const [displayCount, setDisplayCount] = useState(50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const displayedData = data.slice(0, displayCount)
  const hasMore = displayCount < data.length
  
  const loadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + 50, data.length))
      setIsLoadingMore(false)
    }, 100)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>商品別月次データ</CardTitle>
            <CardDescription>
              {comparisonMode === "sideBySide"
                ? `各月の${previousYear}年/${selectedYear}年データを並列表示`
                : "前年同月比成長率を表示（正値：成長、負値：減少）"}
            </CardDescription>
          </div>
          <div className="text-sm text-gray-500">{data.length}件の商品を表示中</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[2000px]">
            <table className="w-full text-sm border-collapse">
              {renderTableHeader()}
              <tbody>
                {displayedData.map((product) => renderProductRow(product))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* もっと見るボタン */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button
              onClick={loadMore}
              disabled={isLoadingMore}
              variant="outline"
            >
              {isLoadingMore ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>読み込み中...</span>
                </span>
              ) : (
                <span>
                  さらに表示（残り {data.length - displayCount} 件）
                </span>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}