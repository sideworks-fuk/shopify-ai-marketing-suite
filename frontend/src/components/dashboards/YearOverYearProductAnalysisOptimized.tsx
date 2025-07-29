"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { YearOverYearProductAnalysisCondition, AnalysisConditions } from "./YearOverYearProductAnalysisCondition"
import { TableSkeleton, CardSkeleton, ProgressiveLoader } from "../ui/PerformanceOptimized"
import { YearOverYearProductTable } from "./YearOverYearProductTable"
import { YearOverYearProductErrorHandling, classifyError, AnalysisError } from "./YearOverYearProductErrorHandling"
import { useProductAnalysisFilters } from "../../stores/analysisFiltersStore"
import { useAppStore } from "../../stores/appStore"
import { yearOverYearOptimizedApi, yearOverYearHelpers } from "../../lib/api/year-over-year-optimized"
import { YearOverYearProductData, YearOverYearSummary } from "../../lib/api/year-over-year"
import { handleApiError, handleError } from "../../lib/error-handler"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Calendar,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

/**
 * 前年同月比【商品】画面 - API分離版
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description サマリーと詳細データを分離してパフォーマンスを改善
 */

type ViewMode = 'sales' | 'quantity' | 'orders'

interface MonthlyData {
  sales: number
  quantity: number
  orders: number
  [key: string]: number
}

interface ProductYearData {
  productId: string
  productName: string
  category: string
  monthlyData: {
    [key: string]: MonthlyData
  }
  yearOverYearGrowth: {
    [month: string]: number
  }
  totalGrowth: number
  avgGrowth: number
}

// APIデータ変換関数
const convertApiDataToProductYearData = (apiData: YearOverYearProductData[], currentYear: number): ProductYearData[] => {
  const previousYear = currentYear - 1
  
  return apiData.map((product, index) => {
    const monthlyData: { [key: string]: MonthlyData } = {}
    const yearOverYearGrowth: { [month: string]: number } = {}

    product.monthlyData.forEach((monthData) => {
      const monthStr = monthData.month.toString().padStart(2, "0")
      
      monthlyData[`${currentYear}-${monthStr}`] = {
        sales: monthData.currentValue,
        quantity: monthData.currentValue,
        orders: monthData.currentValue,
      }
      
      monthlyData[`${previousYear}-${monthStr}`] = {
        sales: monthData.previousValue,
        quantity: monthData.previousValue,
        orders: monthData.previousValue,
      }

      yearOverYearGrowth[monthStr] = monthData.growthRate
    })

    const growthValues = Object.values(yearOverYearGrowth)
    const avgGrowth = growthValues.length > 0 ? growthValues.reduce((sum, val) => sum + val, 0) / growthValues.length : 0

    return {
      productId: `api_${index}`,
      productName: product.productTitle,
      category: product.productType,
      monthlyData,
      yearOverYearGrowth,
      totalGrowth: product.overallGrowthRate,
      avgGrowth,
    }
  })
}

// サマリーカードコンポーネント
const SummaryCards = ({ summary, isLoading }: { summary: YearOverYearSummary | null; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">総商品数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{summary.totalProducts.toLocaleString()}</span>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mt-1">分析対象商品</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">全体成長率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold ${summary.overallGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.overallGrowthRate > 0 ? '+' : ''}{summary.overallGrowthRate.toFixed(1)}%
            </span>
            {summary.overallGrowthRate >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">前年同期比</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">成長商品</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-green-600">{summary.growingProducts}</span>
            <ArrowUpRight className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">{((summary.growingProducts / summary.totalProducts) * 100).toFixed(0)}% が成長中</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">要注意商品</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-orange-600">{summary.decliningProducts}</span>
            <ArrowDownRight className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">{((summary.decliningProducts / summary.totalProducts) * 100).toFixed(0)}% が減少中</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function YearOverYearProductAnalysisOptimized() {
  const { filters, setViewMode } = useProductAnalysisFilters()
  const showToast = useAppStore((state) => state.showToast)
  
  // 条件設定→分析実行パターンの状態管理
  const [analysisExecuted, setAnalysisExecuted] = useState(false)
  const [analysisConditions, setAnalysisConditions] = useState<AnalysisConditions | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [analysisError, setAnalysisError] = useState<AnalysisError | null>(null)
  
  // データ状態管理
  const [summary, setSummary] = useState<YearOverYearSummary | null>(null)
  const [productData, setProductData] = useState<ProductYearData[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreData, setHasMoreData] = useState(false)
  
  const viewMode = filters.viewMode as ViewMode

  // エラーハンドラーの初期化
  useEffect(() => {
    const { errorHandler } = require('../../lib/error-handler')
    errorHandler.setToastHandler(showToast)
  }, [showToast])

  // 分析実行ハンドラー
  const handleExecuteAnalysis = useCallback(async (conditions: AnalysisConditions) => {
    console.log('🚀 分析実行開始:', conditions)
    setAnalysisConditions(conditions)
    setIsExecuting(true)
    setAnalysisError(null)
    setLoadProgress(0)

    try {
      // Step 1: サマリーデータの取得（高速）
      setIsLoadingSummary(true)
      setLoadProgress(10)
      
      const summaryResponse = await yearOverYearOptimizedApi.getYearOverYearSummary({
        storeId: 1,
        year: conditions.selectedYear || new Date().getFullYear(),
        category: conditions.categories.length > 0 ? conditions.categories[0] : undefined,
        viewMode: conditions.viewMode,
      })

      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data.summary)
        setLoadProgress(30)
        console.log('✅ サマリー取得完了:', summaryResponse.data.summary)
      }

      setIsLoadingSummary(false)

      // Step 2: 商品データの段階的取得
      setIsLoadingProducts(true)
      const allProducts: YearOverYearProductData[] = []
      let page = 1
      const pageSize = 100

      // 最初のページを取得
      const firstPageResponse = await yearOverYearOptimizedApi.getYearOverYearDetail({
        storeId: 1,
        year: conditions.selectedYear || new Date().getFullYear(),
        page: 1,
        pageSize,
        category: conditions.categories.length > 0 ? conditions.categories[0] : undefined,
        viewMode: conditions.viewMode,
        sortBy: 'growth_rate',
        sortDescending: true,
      })

      if (firstPageResponse.success && firstPageResponse.data) {
        allProducts.push(...firstPageResponse.data.products)
        setHasMoreData(firstPageResponse.data.pagination.hasNextPage)
        
        const convertedData = convertApiDataToProductYearData(
          allProducts,
          conditions.selectedYear || new Date().getFullYear()
        )
        setProductData(convertedData)
        setLoadProgress(50)
        
        // 残りのページをバックグラウンドで取得
        if (firstPageResponse.data.pagination.totalPages > 1) {
          const totalPages = Math.min(firstPageResponse.data.pagination.totalPages, 5) // 最大5ページまで
          
          for (let p = 2; p <= totalPages; p++) {
            const pageResponse = await yearOverYearOptimizedApi.getYearOverYearDetail({
              storeId: 1,
              year: conditions.selectedYear || new Date().getFullYear(),
              page: p,
              pageSize,
              category: conditions.categories.length > 0 ? conditions.categories[0] : undefined,
              viewMode: conditions.viewMode,
              sortBy: 'growth_rate',
              sortDescending: true,
            })

            if (pageResponse.success && pageResponse.data) {
              allProducts.push(...pageResponse.data.products)
              const progress = 50 + ((p - 1) / (totalPages - 1)) * 40
              setLoadProgress(progress)
              
              // 段階的に表示を更新
              const updatedData = convertApiDataToProductYearData(
                allProducts,
                conditions.selectedYear || new Date().getFullYear()
              )
              setProductData(updatedData)
            }
          }
        }
      }

      setLoadProgress(100)
      setIsLoadingProducts(false)
      setIsExecuting(false)
      setAnalysisExecuted(true)
      
      showToast('分析が完了しました', 'success')
      
    } catch (error) {
      console.error('分析実行エラー:', error)
      const classifiedError = classifyError(error)
      setAnalysisError(classifiedError)
      setIsExecuting(false)
      setIsLoadingSummary(false)
      setIsLoadingProducts(false)
      
      await handleApiError(error, '/api/year-over-year', 'GET', {
        context: 'YearOverYearProductAnalysisOptimized',
        severity: 'error',
        showToUser: true,
      })
    }
  }, [showToast])

  // 条件リセットハンドラー
  const handleResetConditions = useCallback(() => {
    setAnalysisExecuted(false)
    setAnalysisConditions(null)
    setSummary(null)
    setProductData([])
    setAnalysisError(null)
    setLoadProgress(0)
  }, [])

  // エラー時の再試行
  const handleRetry = useCallback(() => {
    if (analysisConditions) {
      handleExecuteAnalysis(analysisConditions)
    }
  }, [analysisConditions, handleExecuteAnalysis])

  // 分析実行前の条件設定画面
  if (!analysisExecuted && !analysisError) {
    return (
      <div className="space-y-6">
        <YearOverYearProductAnalysisCondition onExecute={handleExecuteAnalysis} />
      </div>
    )
  }

  // エラー画面
  if (analysisError) {
    return (
      <YearOverYearProductErrorHandling
        error={analysisError}
        onRetry={handleRetry}
        onGoBack={handleResetConditions}
      />
    )
  }

  // 分析結果画面
  return (
    <div className="space-y-6">
      {/* 進捗バー */}
      {isExecuting && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  {isLoadingSummary ? 'サマリーデータを取得中...' : '商品データを取得中...'}
                </span>
              </div>
              <span className="text-sm text-gray-500">{loadProgress}%</span>
            </div>
            <Progress value={loadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* サマリーカード */}
      <SummaryCards summary={summary} isLoading={isLoadingSummary} />

      {/* 商品テーブル */}
      {isLoadingProducts ? (
        <TableSkeleton />
      ) : productData.length > 0 ? (
        <YearOverYearProductTable
          data={productData}
          viewMode={viewMode}
          comparisonMode="growth"
          selectedYear={analysisConditions?.selectedYear || new Date().getFullYear()}
          previousYear={(analysisConditions?.selectedYear || new Date().getFullYear()) - 1}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">データが見つかりませんでした</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}