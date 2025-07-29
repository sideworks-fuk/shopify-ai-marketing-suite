"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getApiUrl } from "@/lib/api-config"
import { authClient } from "@/lib/auth-client"
import { CheckCircleIcon, XCircleIcon, LoaderIcon } from "lucide-react"

export default function PurchaseCountApiTestPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("12months")
  const [selectedSegment, setSelectedSegment] = useState("all")
  const [tierMode, setTierMode] = useState("simplified")

  const runTest = async (testName: string, endpoint: string) => {
    try {
      const response = await authClient.request(`${getApiUrl()}${endpoint}`)
      const data = await response.json()
      
      return {
        testName,
        success: response.ok && data.success,
        status: response.status,
        message: data.message || "",
        dataCount: data.data?.details?.length || 0,
        error: data.error || null
      }
    } catch (error) {
      return {
        testName,
        success: false,
        status: 0,
        message: "ネットワークエラー",
        error: error instanceof Error ? error.message : "不明なエラー"
      }
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    
    const tests = [
      {
        name: "簡易版購入回数分析（5階層）",
        endpoint: `/api/purchase/count-analysis?storeId=1&period=${selectedPeriod}&segment=${selectedSegment}&includeComparison=true&tierMode=simplified`
      },
      {
        name: "通常版購入回数分析（20階層）", 
        endpoint: `/api/purchase/count-analysis?storeId=1&period=${selectedPeriod}&segment=${selectedSegment}&includeComparison=true`
      },
      {
        name: "購入回数サマリー",
        endpoint: "/api/purchase/count-summary?storeId=1&days=365"
      },
      {
        name: "購入回数トレンド",
        endpoint: "/api/purchase/count-trends?storeId=1&months=6"
      },
      {
        name: "セグメント分析",
        endpoint: `/api/purchase/segment-analysis?storeId=1&segment=${selectedSegment}`
      }
    ]
    
    const results = []
    for (const test of tests) {
      const result = await runTest(test.name, test.endpoint)
      results.push(result)
      setTestResults([...results])
      await new Promise(resolve => setTimeout(resolve, 500)) // 遅延
    }
    
    setIsRunning(false)
  }

  const runSingleTest = async () => {
    setIsRunning(true)
    setTestResults([])
    
    const endpoint = `/api/purchase/count-analysis?storeId=1&period=${selectedPeriod}&segment=${selectedSegment}&includeComparison=true&tierMode=${tierMode}`
    const result = await runTest(`購入回数分析（${tierMode === 'simplified' ? '5階層' : '20階層'}）`, endpoint)
    
    setTestResults([result])
    setIsRunning(false)
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">購入回数分析API テスト</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>テスト設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>分析期間</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
            
            <div className="space-y-2">
              <Label>顧客セグメント</Label>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
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
            
            <div className="space-y-2">
              <Label>階層モード</Label>
              <Select value={tierMode} onValueChange={setTierMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplified">簡易版（5階層）</SelectItem>
                  <SelectItem value="detailed">詳細版（20階層）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button onClick={runSingleTest} disabled={isRunning}>
              {isRunning ? (
                <>
                  <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                  テスト実行中...
                </>
              ) : (
                "単体テスト実行"
              )}
            </Button>
            
            <Button onClick={runAllTests} disabled={isRunning} variant="outline">
              {isRunning ? (
                <>
                  <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                  テスト実行中...
                </>
              ) : (
                "全テスト実行"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>テスト結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <Alert key={index} variant={result.success ? "default" : "destructive"}>
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 mr-2 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{result.testName}</p>
                      <p className="text-sm text-muted-foreground">
                        ステータス: {result.status} | 
                        {result.dataCount > 0 && ` データ件数: ${result.dataCount} | `}
                        {result.message}
                      </p>
                      {result.error && (
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Alert>
        <AlertDescription>
          <p className="font-semibold mb-2">テスト内容：</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>簡易版（5階層）と詳細版（20階層）の切り替えテスト</li>
            <li>期間パラメータ（3ヶ月、6ヶ月、12ヶ月、24ヶ月）の動作確認</li>
            <li>セグメント別分析（全顧客、新規、既存、復帰）の動作確認</li>
            <li>エラーハンドリングの確認</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}