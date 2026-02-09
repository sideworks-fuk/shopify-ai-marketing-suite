"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PurchaseCountTableSkeleton } from "@/components/purchase/PurchaseCountTableSkeleton"
import { DownloadIcon, TrendingUpIcon, UsersIcon, ShoppingCartIcon, AlertCircleIcon } from "lucide-react"
import { formatCurrency, formatPercentage, formatCompositionPercentage, formatNumber } from "@/lib/format"
import { getApiUrl, addStoreIdToParams } from "@/lib/api-config"
import { handleError } from "@/lib/error-handler"
import { useAuth } from "@/components/providers/AuthProvider"

// 購入回数の階層定義（0回を含む）
const PURCHASE_TIERS = [
  { count: 0, label: "0回（購入なし）", color: "#f5f5f5" },  // 既存顧客の購入なし用
  { count: 1, label: "1回", color: "#e3f2fd" },
  { count: 2, label: "2回", color: "#bbdefb" },
  { count: "3-5", label: "3-5回", color: "#90caf9" },
  { count: "6-10", label: "6-10回", color: "#64b5f6" },
  { count: "11+", label: "11回以上", color: "#2196f3" }
]

// セグメントごとの0回購入の表示可否
const SHOW_ZERO_PURCHASES = {
  new: false,       // 新規顧客は0回は表示しない（定義上1回以上）
  existing: true,   // 既存顧客は0回も表示
  returning: false, // 復帰顧客は0回は表示しない（復帰=購入あり）
  all: true        // 全顧客は0回も表示可能
}

interface PurchaseCountAnalysisProps {
  conditions: {
    period: string
    segment: string
    compareWithPrevious: boolean
    timestamp: string
  }
  onAnalysisComplete?: () => void
}

// React.memoでメモ化したコンポーネント
const PurchaseCountAnalysis = React.memo(function PurchaseCountAnalysis({ 
  conditions, 
  onAnalysisComplete 
}: PurchaseCountAnalysisProps) {
  const { getApiClient } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const isRequestingRef = useRef(false) // リクエスト中の重複を防ぐフラグ

  // fetchAnalysisDataをuseCallbackでメモ化（重複リクエストを防ぐ）
  const fetchAnalysisData = useCallback(async () => {
    // 既にリクエスト中の場合はスキップ
    if (isRequestingRef.current) {
      console.log('⚠️ 既にリクエスト中のため、重複リクエストをスキップします')
      return
    }

    try {
      isRequestingRef.current = true
      setIsLoading(true)
      setError(null)

      const params = addStoreIdToParams({
        period: conditions.period,
        segment: conditions.segment,
        includeComparison: conditions.compareWithPrevious.toString(),
        tierMode: "simplified" // 5階層モードを指定
      })

      console.log('🔄 購入回数分析データ取得開始:', { params, timestamp: conditions.timestamp })

      // ApiClientを使用してリクエスト（認証ヘッダーは自動設定）
      const apiClient = getApiClient()
      const result = await apiClient.get<any>(`/api/purchase/count-analysis?${params}`)
      if (result.success) {
        console.log('📊 購入回数分析データ取得:', {
          hasSummary: !!result.data?.summary,
          hasDetails: !!result.data?.details,
          hasTrends: !!result.data?.trends,
          trendsLength: result.data?.trends?.length || 0,
          hasInsights: !!result.data?.insights
        })
        setAnalysisData(result.data)
      } else {
        throw new Error(result.message || "データ取得に失敗しました")
      }
    } catch (error) {
      console.error("分析データ取得エラー:", error)
      handleError(error, { showToUser: true, notifyType: 'inline' })
      setError(error instanceof Error ? error.message : "データ取得に失敗しました")
    } finally {
      setIsLoading(false)
      isRequestingRef.current = false
      onAnalysisComplete?.()
    }
  }, [conditions.period, conditions.segment, conditions.compareWithPrevious, conditions.timestamp, getApiClient, onAnalysisComplete])

  // conditions.timestampが変更された時のみ実行（重複実行を防ぐ）
  useEffect(() => {
    fetchAnalysisData()
  }, [conditions.timestamp, fetchAnalysisData])

  const exportToCSV = () => {
    if (!analysisData) return

    const csvData = analysisData.details.map((detail: any) => ({
      購入回数: detail.purchaseCountLabel,
      顧客数: detail.current.customerCount,
      注文数: detail.current.orderCount,
      売上金額: detail.current.totalAmount,
      顧客構成比: `${detail.percentage.customerPercentage.toFixed(1)}%`,
      売上構成比: `${detail.percentage.amountPercentage.toFixed(1)}%`,
      平均顧客単価: detail.current.averageCustomerValue
    }))

    const headers = Object.keys(csvData[0]).join(',')
    const rows = csvData.map((row: any) => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `purchase_count_analysis_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (isLoading) {
    return <PurchaseCountTableSkeleton />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchAnalysisData} className="mt-4">
            再試行
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analysisData) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総顧客数</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(analysisData.summary.totalCustomers)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">リピート率</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(analysisData.summary.repeatCustomerRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              2回以上購入顧客
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均購入回数</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analysisData.summary.averagePurchaseCount.toFixed(1)}回
            </div>
            <p className="text-xs text-muted-foreground">
              顧客あたり
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <span className="text-sm text-muted-foreground">¥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analysisData.summary.totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分析結果タブ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>購入回数別分析結果</CardTitle>
          <Button onClick={exportToCSV} size="sm" variant="outline">
            <DownloadIcon className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="distribution" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="distribution">分布</TabsTrigger>
              <TabsTrigger value="insights">インサイト</TabsTrigger>
            </TabsList>

            <TabsContent value="distribution" className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">購入回数</th>
                      <th className="text-right p-2">顧客数</th>
                      <th className="text-right p-2">構成比</th>
                      <th className="text-right p-2">売上金額</th>
                      <th className="text-right p-2">売上構成比</th>
                      <th className="text-right p-2">平均顧客単価</th>
                      {conditions.compareWithPrevious && <th className="text-right p-2">前年比</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.details.map((detail: any, index: number) => {
                      // 0回購入の表示判定
                      const isZeroPurchases = detail.purchaseCountLabel === "0回" || 
                                             detail.purchaseCountLabel === "0回（購入なし）" ||
                                             detail.purchaseCount === 0;
                      const shouldShowZero = SHOW_ZERO_PURCHASES[conditions.segment as keyof typeof SHOW_ZERO_PURCHASES] ?? false;
                      
                      // 0回購入で表示すべきでない場合はスキップ
                      if (isZeroPurchases && !shouldShowZero) {
                        return null;
                      }
                      
                      // カラーインデックスの調整（0回がある場合）
                      const colorIndex = isZeroPurchases ? 0 : index;
                      
                      return (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: PURCHASE_TIERS[colorIndex]?.color || '#ccc' }}
                              />
                              {isZeroPurchases ? (
                                <span className="text-gray-500">購入なし</span>
                              ) : (
                                detail.purchaseCountLabel
                              )}
                            </div>
                          </td>
                          <td className="text-right p-2">
                            {formatNumber(detail.current.customerCount)}
                          </td>
                          <td className="text-right p-2">
                            {formatCompositionPercentage(detail.percentage.customerPercentage)}
                          </td>
                          <td className="text-right p-2">
                            {isZeroPurchases ? (
                              <span className="text-gray-400">¥0</span>
                            ) : (
                              formatCurrency(detail.current.totalAmount)
                            )}
                          </td>
                          <td className="text-right p-2">
                            {isZeroPurchases ? (
                              <span className="text-gray-400">0%</span>
                            ) : (
                              formatCompositionPercentage(detail.percentage.amountPercentage)
                            )}
                          </td>
                          <td className="text-right p-2">
                            {isZeroPurchases ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              formatCurrency(detail.current.averageCustomerValue)
                            )}
                          </td>
                          {conditions.compareWithPrevious && (
                            <td className="text-right p-2">
                              {isZeroPurchases ? (
                                <span className="text-gray-400">-</span>
                              ) : detail.growthRate ? (
                                // 999999は前年データなしで今年データありを示す
                                detail.growthRate.customerCountGrowth >= 999999 ? (
                                  <span className="text-blue-600 font-medium">新規</span>
                                ) : detail.growthRate.customerCountGrowth > 1000 ? (
                                  // 1000%以上の異常値も新規扱い（前年がほぼ0）
                                  <span className="text-blue-600 font-medium">新規</span>
                                ) : (
                                  <span className={detail.growthRate.customerCountGrowth > 0 ? "text-green-600" : "text-red-600"}>
                                    {formatPercentage(detail.growthRate.customerCountGrowth)}
                                  </span>
                                )
                              ) : (
                                // growthRateがnullの場合
                                detail.current?.customerCount > 0 ? (
                                  // 今年データがある場合は新規として扱う
                                  <span className="text-blue-600 font-medium">新規</span>
                                ) : (
                                  // 今年もデータがない場合は該当なし
                                  <span className="text-gray-400">該当なし</span>
                                )
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* トレンドタブは一時的に非表示 */}
            {/* {analysisData.trends && analysisData.trends.length > 0 && (
              <TabsContent value="trends" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisData.trends.slice(0, 6).map((trend: any, index: number) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">{trend.periodLabel}</CardTitle>
                          <Badge variant="outline">{formatNumber(trend.totalCustomers)}人</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>平均購入回数</span>
                            <span className="font-medium">{trend.averagePurchaseCount.toFixed(1)}回</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>リピート率</span>
                            <span className="font-medium">{formatPercentage(trend.repeatRate)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )} */}

            <TabsContent value="insights" className="space-y-4">
              {/* 主要発見事項 */}
              {analysisData.insights.keyFindings.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">主要発見事項</h4>
                  <ul className="space-y-2">
                    {analysisData.insights.keyFindings.map((finding: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-sm">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 推奨アクション */}
              {analysisData.insights.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">推奨アクション</h4>
                  <div className="space-y-3">
                    {analysisData.insights.recommendations.map((rec: any, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">{rec.title}</CardTitle>
                            <Badge variant={rec.priority === "高" ? "destructive" : "secondary"}>
                              {rec.priority}優先度
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                          <p className="text-sm font-medium">{rec.action}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* リスク評価 */}
              {analysisData.insights.risk && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">リスク評価</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">一回購入顧客率</span>
                        <span className="text-sm font-medium">
                          {formatPercentage(analysisData.insights.risk.oneTimeCustomerRate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">全体リスクレベル</span>
                        <Badge variant={
                          analysisData.insights.risk.overallRiskLevel === "高" ? "destructive" :
                          analysisData.insights.risk.overallRiskLevel === "中" ? "default" : "secondary"
                        }>
                          {analysisData.insights.risk.overallRiskLevel}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}, (prevProps, nextProps) => {
  // カスタム比較関数：conditionsが変わらなければ再レンダリングをスキップ
  return prevProps.conditions.timestamp === nextProps.conditions.timestamp
})

// 表示名を設定（デバッグ用）
PurchaseCountAnalysis.displayName = 'PurchaseCountAnalysis'

export default PurchaseCountAnalysis