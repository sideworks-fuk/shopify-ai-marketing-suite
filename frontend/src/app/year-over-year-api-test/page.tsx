"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  TrendingUp, 
  BarChart3,
  Calendar,
  Package,
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Download,
  Search,
  Filter
} from "lucide-react"
import { yearOverYearApi, YearOverYearRequest, YearOverYearResponse } from "@/lib/api/year-over-year"

interface ApiTestResult {
  endpoint: string
  status: 'success' | 'error' | 'pending'
  responseTime: number
  data?: any
  error?: string
  timestamp: string
}

export default function YearOverYearApiTestPage() {
  const [testResults, setTestResults] = useState<ApiTestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [testParams, setTestParams] = useState<YearOverYearRequest>({
    storeId: 1,
    year: 2025,
    viewMode: 'sales',
    sortBy: 'growth_rate',
    sortDescending: true
  })

  // API接続テスト
  const testApiConnection = useCallback(async () => {
    const startTime = Date.now()
    
    try {
      const response = await yearOverYearApi.testConnection()
      const responseTime = Date.now() - startTime
      
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/test',
        status: response.success ? 'success' : 'error',
        responseTime,
        data: response.data,
        error: response.success ? undefined : response.message,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      const responseTime = Date.now() - startTime
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/test',
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : '不明なエラー',
        timestamp: new Date().toISOString()
      }])
    }
  }, [])

  // 前年同月比分析データ取得テスト
  const testYearOverYearAnalysis = useCallback(async () => {
    const startTime = Date.now()
    
    try {
      const response = await yearOverYearApi.getYearOverYearAnalysis(testParams)
      const responseTime = Date.now() - startTime
      
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/year-over-year',
        status: response.success ? 'success' : 'error',
        responseTime,
        data: response.data,
        error: response.success ? undefined : response.message,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      const responseTime = Date.now() - startTime
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/year-over-year',
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : '不明なエラー',
        timestamp: new Date().toISOString()
      }])
    }
  }, [testParams])

  // 商品タイプ一覧取得テスト
  const testProductTypes = useCallback(async () => {
    const startTime = Date.now()
    
    try {
      const response = await yearOverYearApi.getProductTypes(testParams.storeId)
      const responseTime = Date.now() - startTime
      
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/product-types',
        status: response.success ? 'success' : 'error',
        responseTime,
        data: response.data,
        error: response.success ? undefined : response.message,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      const responseTime = Date.now() - startTime
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/product-types',
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : '不明なエラー',
        timestamp: new Date().toISOString()
      }])
    }
  }, [testParams.storeId])

  // ベンダー一覧取得テスト
  const testVendors = useCallback(async () => {
    const startTime = Date.now()
    
    try {
      const response = await yearOverYearApi.getVendors(testParams.storeId)
      const responseTime = Date.now() - startTime
      
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/vendors',
        status: response.success ? 'success' : 'error',
        responseTime,
        data: response.data,
        error: response.success ? undefined : response.message,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      const responseTime = Date.now() - startTime
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/vendors',
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : '不明なエラー',
        timestamp: new Date().toISOString()
      }])
    }
  }, [testParams.storeId])

  // 分析期間取得テスト
  const testDateRange = useCallback(async () => {
    const startTime = Date.now()
    
    try {
      const response = await yearOverYearApi.getAnalysisDateRange(testParams.storeId)
      const responseTime = Date.now() - startTime
      
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/date-range',
        status: response.success ? 'success' : 'error',
        responseTime,
        data: response.data,
        error: response.success ? undefined : response.message,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      const responseTime = Date.now() - startTime
      setTestResults(prev => [...prev, {
        endpoint: '/api/analytics/date-range',
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : '不明なエラー',
        timestamp: new Date().toISOString()
      }])
    }
  }, [testParams.storeId])

  // 全テスト実行
  const runAllTests = useCallback(async () => {
    setLoading(true)
    setTestResults([])
    
    try {
      await testApiConnection()
      await testYearOverYearAnalysis()
      await testProductTypes()
      await testVendors()
      await testDateRange()
    } finally {
      setLoading(false)
    }
  }, [testApiConnection, testYearOverYearAnalysis, testProductTypes, testVendors, testDateRange])

  // 初期テスト実行
  useEffect(() => {
    runAllTests()
  }, []) // 初回のみ実行

  // ステータスアイコン
  const getStatusIcon = (status: ApiTestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    }
  }

  // ステータスバッジ
  const getStatusBadge = (status: ApiTestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-200">成功</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">エラー</Badge>
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">実行中</Badge>
    }
  }

  // JSON結果のダウンロード
  const downloadResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `year-over-year-api-test-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          前年同月比分析【商品】API テスト
        </h1>
        <p className="text-gray-600">
          前年同月比分析APIエンドポイントの動作確認とパフォーマンステスト
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Badge variant="outline">API接続テスト</Badge>
          <Badge variant="outline">データ取得確認</Badge>
          <Badge variant="outline">パフォーマンス測定</Badge>
        </div>
      </div>

      {/* テストパラメータ設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            テストパラメータ設定
          </CardTitle>
          <CardDescription>
            API呼び出し時のパラメータを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ストアID</label>
              <Input
                type="number"
                value={testParams.storeId}
                onChange={(e) => setTestParams(prev => ({ ...prev, storeId: parseInt(e.target.value) }))}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">対象年</label>
              <Select 
                value={testParams.year.toString()} 
                onValueChange={(value) => setTestParams(prev => ({ ...prev, year: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">表示モード</label>
              <Select 
                value={testParams.viewMode} 
                onValueChange={(value: any) => setTestParams(prev => ({ ...prev, viewMode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">売上金額</SelectItem>
                  <SelectItem value="quantity">販売数量</SelectItem>
                  <SelectItem value="orders">注文件数</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">ソート順</label>
              <Select 
                value={testParams.sortBy} 
                onValueChange={(value: any) => setTestParams(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth_rate">成長率順</SelectItem>
                  <SelectItem value="total_sales">売上順</SelectItem>
                  <SelectItem value="name">商品名順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">検索キーワード</label>
              <Input
                value={testParams.searchTerm || ''}
                onChange={(e) => setTestParams(prev => ({ ...prev, searchTerm: e.target.value || undefined }))}
                placeholder="商品名で検索..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">成長率フィルター</label>
              <Select 
                value={testParams.growthRateFilter || 'all'} 
                onValueChange={(value: any) => setTestParams(prev => ({ ...prev, growthRateFilter: value === 'all' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全商品</SelectItem>
                  <SelectItem value="positive">成長商品のみ</SelectItem>
                  <SelectItem value="negative">減少商品のみ</SelectItem>
                  <SelectItem value="high_growth">高成長商品</SelectItem>
                  <SelectItem value="high_decline">要注意商品</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">カテゴリ</label>
              <Input
                value={testParams.category || ''}
                onChange={(e) => setTestParams(prev => ({ ...prev, category: e.target.value || undefined }))}
                placeholder="商品カテゴリ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* コントロールパネル */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAllTests} disabled={loading} className="flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              全テスト実行
            </Button>
            <Button variant="outline" onClick={testApiConnection} disabled={loading}>
              接続テスト
            </Button>
            <Button variant="outline" onClick={testYearOverYearAnalysis} disabled={loading}>
              データ取得テスト
            </Button>
            <Button variant="outline" onClick={testProductTypes} disabled={loading}>
              商品タイプテスト
            </Button>
            <Button variant="outline" onClick={testVendors} disabled={loading}>
              ベンダーテスト
            </Button>
            <Button variant="outline" onClick={testDateRange} disabled={loading}>
              期間テスト
            </Button>
            {testResults.length > 0 && (
              <Button variant="outline" onClick={downloadResults} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                結果ダウンロード
              </Button>
            )}
            <Button variant="outline" onClick={() => setTestResults([])}>
              結果クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* テスト結果一覧 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          テスト結果 ({testResults.length}件)
        </h2>

        {testResults.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>テスト結果がありません。「全テスト実行」ボタンでテストを開始してください。</p>
            </CardContent>
          </Card>
        )}

        {testResults.map((result, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <CardTitle className="text-base">{result.endpoint}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(result.timestamp).toLocaleString('ja-JP')}
                      <span className="mx-2">•</span>
                      レスポンス時間: {result.responseTime}ms
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            </CardHeader>
            <CardContent>
              {result.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                    <XCircle className="h-4 w-4" />
                    エラー詳細
                  </div>
                  <p className="text-red-600 text-sm">{result.error}</p>
                </div>
              )}

              {result.data && (
                <div className="space-y-4">
                  {/* データサマリー */}
                  {result.endpoint === '/api/analytics/year-over-year' && result.data.products && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {result.data.products.length}
                        </div>
                        <div className="text-sm text-blue-700">商品数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {result.data.summary?.growingProducts || 0}
                        </div>
                        <div className="text-sm text-green-700">成長商品</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {result.data.summary?.decliningProducts || 0}
                        </div>
                        <div className="text-sm text-red-700">減少商品</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {result.data.summary?.overallGrowthRate?.toFixed(1) || '0'}%
                        </div>
                        <div className="text-sm text-purple-700">全体成長率</div>
                      </div>
                    </div>
                  )}

                  {/* 商品タイプ一覧 */}
                  {result.endpoint === '/api/analytics/product-types' && Array.isArray(result.data) && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-700 mb-2">
                        商品タイプ一覧 ({result.data.length}件)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.data.map((type: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ベンダー一覧 */}
                  {result.endpoint === '/api/analytics/vendors' && Array.isArray(result.data) && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium text-purple-700 mb-2">
                        ベンダー一覧 ({result.data.length}件)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.data.map((vendor: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {vendor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 期間情報 */}
                  {result.endpoint === '/api/analytics/date-range' && result.data && (
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <div className="text-sm font-medium text-amber-700 mb-2">分析可能期間</div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-amber-600">最初の年: </span>
                          <span className="font-medium">{result.data.earliestYear}年</span>
                        </div>
                        <div>
                          <span className="text-amber-600">最新の年: </span>
                          <span className="font-medium">{result.data.latestYear}年</span>
                        </div>
                        <div>
                          <span className="text-amber-600">利用可能年数: </span>
                          <span className="font-medium">{result.data.availableYears?.length || 0}年間</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* JSON詳細 */}
                  <details className="group">
                    <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                      <Package className="h-4 w-4" />
                      詳細なレスポンスデータを表示
                    </summary>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg overflow-auto">
                      <pre className="text-xs text-gray-600">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}