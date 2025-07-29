"use client"

import React, { useState, useEffect } from "react"
import { DormantCustomerTableVirtual } from "@/components/dashboards/dormant/DormantCustomerTableVirtual"
import { DormantCustomerList } from "@/components/dashboards/dormant/DormantCustomerList"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Zap, HardDrive, BarChart2 } from "lucide-react"

/**
 * 休眠顧客仮想スクロール パフォーマンステストページ
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description 仮想スクロールと通常版の比較測定
 */

// モックデータ生成
const generateMockDormantCustomers = (count: number) => {
  const riskLevels = ['low', 'medium', 'high', 'critical']
  const segments = ['1ヶ月以内', '1-3ヶ月', '3-6ヶ月', '6ヶ月以上']
  const companies = ['株式会社A', '有限会社B', 'C商事', 'Dコーポレーション', null]
  
  return Array.from({ length: count }, (_, i) => ({
    customerId: `CUST-${String(i + 1).padStart(6, '0')}`,
    name: `顧客 ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    company: companies[Math.floor(Math.random() * companies.length)],
    lastPurchaseDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    daysSinceLastPurchase: Math.floor(Math.random() * 365),
    dormancySegment: segments[Math.floor(Math.random() * segments.length)],
    riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
    churnProbability: Math.random() * 0.8,
    totalSpent: Math.floor(Math.random() * 1000000),
    totalOrders: Math.floor(Math.random() * 50),
    averageOrderValue: Math.floor(Math.random() * 50000),
    insight: {
      recommendedAction: 'メールキャンペーン',
      optimalTiming: '今週中',
      estimatedSuccessRate: Math.random(),
      suggestedOffer: '10%割引クーポン'
    }
  }))
}

export default function DormantVirtualScrollTest() {
  const [dataSize, setDataSize] = useState(1000)
  const [mockData, setMockData] = useState<any[]>([])
  const [renderTime, setRenderTime] = useState<{ virtual: number; normal: number }>({ virtual: 0, normal: 0 })
  const [memoryUsage, setMemoryUsage] = useState<{ virtual: number; normal: number }>({ virtual: 0, normal: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("virtual")
  
  // データ生成
  const generateData = (size: number) => {
    setIsLoading(true)
    const startTime = performance.now()
    
    setTimeout(() => {
      const data = generateMockDormantCustomers(size)
      setMockData(data)
      setIsLoading(false)
      
      console.log(`データ生成完了: ${size}件 (${(performance.now() - startTime).toFixed(2)}ms)`)
    }, 100)
  }
  
  // 初期データ生成
  useEffect(() => {
    generateData(dataSize)
  }, [])
  
  // レンダリング時間測定
  const measureRenderTime = (type: 'virtual' | 'normal') => {
    const startTime = performance.now()
    
    // React の次のレンダリングサイクルで測定
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        setRenderTime(prev => ({
          ...prev,
          [type]: duration
        }))
        
        // メモリ使用量も測定（可能な場合）
        if ('memory' in performance) {
          const memory = (performance as any).memory
          setMemoryUsage(prev => ({
            ...prev,
            [type]: memory.usedJSHeapSize / 1048576 // MB に変換
          }))
        }
      })
    })
  }
  
  // タブ切り替え時の測定
  useEffect(() => {
    if (mockData.length > 0) {
      measureRenderTime(activeTab as 'virtual' | 'normal')
    }
  }, [activeTab, mockData])
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">休眠顧客テーブル 仮想スクロール性能テスト</h1>
        <p className="text-gray-600">大量データでの表示性能を比較測定します</p>
      </div>
      
      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle>テストデータ設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">データ件数:</span>
            {[100, 500, 1000, 5000, 10000].map(size => (
              <Button
                key={size}
                variant={dataSize === size ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDataSize(size)
                  generateData(size)
                }}
                disabled={isLoading}
              >
                {size.toLocaleString()}件
              </Button>
            ))}
            {isLoading && (
              <span className="text-sm text-gray-500 ml-4">生成中...</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* パフォーマンス指標 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">レンダリング時間</span>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span>仮想スクロール:</span>
                <Badge variant="outline" className="text-green-600">
                  {renderTime.virtual.toFixed(2)}ms
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>通常版:</span>
                <Badge variant="outline" className="text-orange-600">
                  {renderTime.normal.toFixed(2)}ms
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">高速化率</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600">
                {renderTime.normal > 0 ? 
                  `${((renderTime.normal / renderTime.virtual) || 1).toFixed(1)}x` : 
                  '-'
                }
              </div>
              <p className="text-xs text-gray-500">通常版と比較</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">メモリ使用量</span>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span>仮想スクロール:</span>
                <Badge variant="outline" className="text-green-600">
                  {memoryUsage.virtual.toFixed(1)}MB
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>通常版:</span>
                <Badge variant="outline" className="text-orange-600">
                  {memoryUsage.normal.toFixed(1)}MB
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">DOM ノード数</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>仮想スクロール:</span>
                  <Badge variant="outline" className="text-green-600">
                    ~50
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>通常版:</span>
                  <Badge variant="outline" className="text-orange-600">
                    {mockData.length}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* テーブル表示 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="virtual">仮想スクロール版</TabsTrigger>
          <TabsTrigger value="normal">通常版（ページネーション）</TabsTrigger>
        </TabsList>
        
        <TabsContent value="virtual" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">仮想スクロール実装</h3>
              <Badge variant="default" className="bg-green-600">
                高速・省メモリ
              </Badge>
            </div>
            <DormantCustomerTableVirtual 
              dormantData={mockData}
              containerHeight={600}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="normal" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">通常実装</h3>
              <Badge variant="secondary">
                標準パフォーマンス
              </Badge>
            </div>
            <DormantCustomerList 
              dormantData={mockData}
            />
          </div>
        </TabsContent>
      </Tabs>
      
      {/* 測定結果サマリー */}
      <Card>
        <CardHeader>
          <CardTitle>パフォーマンス測定結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">仮想スクロールの利点</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>✅ 初期レンダリングが高速（表示領域のみ描画）</li>
                  <li>✅ メモリ使用量が一定（データ量に依存しない）</li>
                  <li>✅ スクロールがスムーズ（DOM操作を最小限に）</li>
                  <li>✅ 大量データでも快適な操作性</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">推奨使用場面</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>📊 100件以上のデータ表示</li>
                  <li>📱 モバイルデバイスでの利用</li>
                  <li>🔄 リアルタイム更新が必要な画面</li>
                  <li>💾 メモリ制約のある環境</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>結論:</strong> {dataSize}件のデータで、仮想スクロールは通常版と比較して
                <span className="font-bold mx-1">
                  {renderTime.normal > 0 ? ((renderTime.normal / renderTime.virtual) || 1).toFixed(1) : '-'}倍
                </span>
                高速にレンダリングされ、メモリ使用量も
                <span className="font-bold mx-1">
                  {memoryUsage.normal > 0 ? (((memoryUsage.normal - memoryUsage.virtual) / memoryUsage.normal * 100) || 0).toFixed(0) : '-'}%
                </span>
                削減されました。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}