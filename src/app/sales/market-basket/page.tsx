"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, TrendingUp, Package, BarChart3 } from 'lucide-react'

// 顧客イメージに基づくサンプルデータの型定義
interface MarketBasketItem {
  productId: string
  productName: string
  soloCount: number        // 件数
  soloAmount: number       // 金額【単体】
  totalAmount: number      // 売上総金額【取引全体】
  salesRatio: number       // 売上構成（%）
  combinations: Array<{
    rank: number
    productName: string
    coOccurrenceCount: number
    confidence: number
    lift: number
  }>
}

// 顧客のExcelイメージを再現するサンプルデータ
const sampleMarketBasketData: MarketBasketItem[] = [
  {
    productId: 'A',
    productName: '商品A',
    soloCount: 3,
    soloAmount: 800,
    totalAmount: 8000,
    salesRatio: 10.0,
    combinations: [
      { rank: 1, productName: '商品B', coOccurrenceCount: 15, confidence: 0.75, lift: 2.5 },
      { rank: 2, productName: '商品C', coOccurrenceCount: 12, confidence: 0.60, lift: 2.1 },
      { rank: 3, productName: '商品D', coOccurrenceCount: 8, confidence: 0.40, lift: 1.8 },
      { rank: 4, productName: '商品E', coOccurrenceCount: 6, confidence: 0.30, lift: 1.5 },
      { rank: 5, productName: '商品F', coOccurrenceCount: 4, confidence: 0.20, lift: 1.2 },
    ]
  },
  {
    productId: 'B',
    productName: '商品B',
    soloCount: 5,
    soloAmount: 1200,
    totalAmount: 15000,
    salesRatio: 18.5,
    combinations: [
      { rank: 1, productName: '商品A', coOccurrenceCount: 15, confidence: 0.70, lift: 2.3 },
      { rank: 2, productName: '商品G', coOccurrenceCount: 10, confidence: 0.50, lift: 1.9 },
      { rank: 3, productName: '商品H', coOccurrenceCount: 7, confidence: 0.35, lift: 1.6 },
      { rank: 4, productName: '商品I', coOccurrenceCount: 5, confidence: 0.25, lift: 1.4 },
      { rank: 5, productName: '商品J', coOccurrenceCount: 3, confidence: 0.15, lift: 1.1 },
    ]
  },
  {
    productId: 'C',
    productName: '商品C（ギフト向け）',
    soloCount: 8,
    soloAmount: 2000,
    totalAmount: 25000,
    salesRatio: 31.2,
    combinations: [
      { rank: 1, productName: '商品K（ラッピング）', coOccurrenceCount: 20, confidence: 0.80, lift: 3.2 },
      { rank: 2, productName: '商品L（カード）', coOccurrenceCount: 18, confidence: 0.75, lift: 2.8 },
      { rank: 3, productName: '商品A', coOccurrenceCount: 12, confidence: 0.50, lift: 2.0 },
      { rank: 4, productName: '商品M（袋）', coOccurrenceCount: 8, confidence: 0.40, lift: 1.7 },
      { rank: 5, productName: '商品N（リボン）', coOccurrenceCount: 6, confidence: 0.30, lift: 1.3 },
    ]
  },
  {
    productId: 'D',
    productName: '商品D（食品容器）',
    soloCount: 12,
    soloAmount: 500,
    totalAmount: 18000,
    salesRatio: 22.5,
    combinations: [
      { rank: 1, productName: '商品O（蓋）', coOccurrenceCount: 25, confidence: 0.85, lift: 4.1 },
      { rank: 2, productName: '商品P（保冷剤）', coOccurrenceCount: 15, confidence: 0.65, lift: 2.7 },
      { rank: 3, productName: '商品Q（袋）', coOccurrenceCount: 10, confidence: 0.45, lift: 2.2 },
      { rank: 4, productName: '商品R（ラベル）', coOccurrenceCount: 8, confidence: 0.35, lift: 1.8 },
      { rank: 5, productName: '商品S（スプーン）', coOccurrenceCount: 5, confidence: 0.25, lift: 1.4 },
    ]
  },
  {
    productId: 'E',
    productName: '商品E（季節商品）',
    soloCount: 6,
    soloAmount: 1500,
    totalAmount: 12000,
    salesRatio: 15.0,
    combinations: [
      { rank: 1, productName: '商品T（関連小物）', coOccurrenceCount: 12, confidence: 0.70, lift: 2.8 },
      { rank: 2, productName: '商品U（セット品）', coOccurrenceCount: 8, confidence: 0.50, lift: 2.3 },
      { rank: 3, productName: '商品V（付属品）', coOccurrenceCount: 6, confidence: 0.40, lift: 1.9 },
      { rank: 4, productName: '商品W（メンテ用品）', coOccurrenceCount: 4, confidence: 0.30, lift: 1.5 },
      { rank: 5, productName: '商品X（保証書）', coOccurrenceCount: 2, confidence: 0.20, lift: 1.2 },
    ]
  }
]

export default function MarketBasketAnalysisPage() {
  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')
  const [sortBy, setSortBy] = useState('totalAmount')
  const [minSupport, setMinSupport] = useState('0.01')

  // サマリー統計の計算
  const summary = useMemo(() => {
    const totalProducts = sampleMarketBasketData.length
    const totalRevenue = sampleMarketBasketData.reduce((sum, item) => sum + item.totalAmount, 0)
    const avgBasketSize = sampleMarketBasketData.reduce((sum, item) => sum + item.soloCount, 0) / totalProducts
    const strongCombinations = sampleMarketBasketData.reduce((count, item) => 
      count + item.combinations.filter(combo => combo.lift >= 2.0).length, 0
    )

    return {
      totalProducts,
      totalRevenue,
      avgBasketSize,
      strongCombinations
    }
  }, [])

  const handleExport = () => {
    // エクスポート機能
    alert('組み合わせ商品分析データをエクスポートします')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🛒 組み合わせ商品【商品】</h1>
        <p className="text-gray-600 mt-2">一緒に購入される商品の組み合わせを分析し、クロスセル機会の発見とセット販売企画に活用できます</p>
      </div>
      


      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">マーケットバスケット分析機能</h2>
          <p className="text-gray-600 mt-1">
            商品毎に組み合わせて購入される商品を分析することによってセット販売や、
            その後の顧客提案商品の商材を分析する。
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Excel出力
        </Button>
      </div>

      {/* 概要説明 */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <p><strong>【概要説明】</strong> 商品毎に組み合わせて購入される商品を分析することによってセット販売や、その後の顧客提案商品の商材を分析する。</p>
            <p><strong>【期間指定】</strong> 期間ごとに季節要因なども検討できるようにする。</p>
          </div>
        </CardContent>
      </Card>

      {/* フィルター・設定エリア */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">期間開始</label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">期間終了</label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">並び順</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="並び順を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalAmount">売上総金額順</SelectItem>
                  <SelectItem value="salesRatio">売上構成順</SelectItem>
                  <SelectItem value="soloCount">件数順</SelectItem>
                  <SelectItem value="combinations">組み合わせ数順</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">最小支持度</label>
              <Select value={minSupport} onValueChange={setMinSupport}>
                <SelectTrigger>
                  <SelectValue placeholder="閾値を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01">1%以上</SelectItem>
                  <SelectItem value="0.05">5%以上</SelectItem>
                  <SelectItem value="0.10">10%以上</SelectItem>
                  <SelectItem value="0.20">20%以上</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サマリー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.totalProducts}
                </div>
                <div className="text-sm text-gray-600">
                  分析対象商品数
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  ¥{summary.totalRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  総売上金額
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {summary.avgBasketSize.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  平均購入点数
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {summary.strongCombinations}
                </div>
                <div className="text-sm text-gray-600">
                  強い組み合わせ数
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メインテーブル（顧客のExcelイメージを忠実に再現） */}
      <Card>
        <CardHeader>
          <CardTitle>一緒に購入される商品の組み合わせ分析（マーケットバスケット分析）</CardTitle>
          <CardDescription>
            クロスセル（顧客が購入しようとしている商品に関連する別の商品を追加で購入してもらう販売手法）機会の発見、
            セット販売企画、レコメンデーション精度向上
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold text-center border">商品名</TableHead>
                  <TableHead className="font-bold text-center border">件数</TableHead>
                  <TableHead className="font-bold text-center border">金額【単体】</TableHead>
                  <TableHead className="font-bold text-center border">売上総金額【取引全体】</TableHead>
                  <TableHead className="font-bold text-center border">売上構成</TableHead>
                  <TableHead className="font-bold text-center border">組み合わせ商品1</TableHead>
                  <TableHead className="font-bold text-center border">組み合わせ商品2</TableHead>
                  <TableHead className="font-bold text-center border">組み合わせ商品3</TableHead>
                  <TableHead className="font-bold text-center border">組み合わせ商品4</TableHead>
                  <TableHead className="font-bold text-center border">組み合わせ商品5</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleMarketBasketData.map((item) => (
                  <TableRow key={item.productId} className="hover:bg-gray-50">
                    <TableCell className="font-medium border">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-right border">
                      {item.soloCount}
                    </TableCell>
                    <TableCell className="text-right border">
                      ¥{item.soloAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right border">
                      ¥{item.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right border">
                      {item.salesRatio}%
                    </TableCell>
                    {/* 組み合わせ商品1-5 */}
                    {[0, 1, 2, 3, 4].map((index) => (
                      <TableCell key={index} className="border">
                        {item.combinations[index] ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {item.combinations[index].productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              確信度: {(item.combinations[index].confidence * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              リフト値: {item.combinations[index].lift.toFixed(1)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 分析指標の説明 */}
      <Card>
        <CardHeader>
          <CardTitle>分析指標の説明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">確信度 (Confidence)</h4>
              <p className="text-sm text-gray-600">
                商品Aを購入した人が商品Bも購入する確率。高いほど強い関連性を示す。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">リフト値 (Lift)</h4>
              <p className="text-sm text-gray-600">
                商品Aの購入が商品Bの購入にどれだけ影響するか。1.0以上で正の相関。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">活用方法</h4>
              <p className="text-sm text-gray-600">
                リフト値2.0以上：セット販売推奨<br/>
                リフト値1.5以上：レコメンド対象<br/>
                リフト値1.0未満：関連性なし
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 