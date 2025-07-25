"use client"

import { useState } from "react"
import { useAppStore } from "../../stores/appStore"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, ShoppingCart, Package, DollarSign, ArrowUpRight, ArrowDownRight, BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Badge } from "@/components/ui/badge"

// 他のコンポーネントを動的インポートに変更
import dynamic from "next/dynamic"

const YearOverYearProductAnalysis = dynamic(() => import("./YearOverYearProductAnalysis"), {
  ssr: false,
  loading: () => <div className="p-4">読み込み中...</div>,
})

const ProductPurchaseFrequencyAnalysis = dynamic(() => import("./ProductPurchaseFrequencyAnalysis"), {
  ssr: false,
  loading: () => <div className="p-4">読み込み中...</div>,
})

const PurchaseFrequencyDetailAnalysis = dynamic(() => import("./PurchaseFrequencyDetailAnalysis"), {
  ssr: false,
  loading: () => <div className="p-4">読み込み中...</div>,
})

// サンプルデータ
const kpiData = {
  totalSales: { current: 2450000, previous: 2180000, change: 12.4 },
  totalOrders: { current: 1234, previous: 1156, change: 6.7 },
  averageOrderValue: { current: 1986, previous: 1886, change: 5.3 },
  totalProducts: { current: 89, previous: 85, change: 4.7 },
}

const monthlyComparisonData = [
  { month: "1月", current: 1250000, previous: 1100000 },
  { month: "2月", current: 1320000, previous: 1180000 },
  { month: "3月", current: 1450000, previous: 1250000 },
  { month: "4月", current: 1380000, previous: 1220000 },
  { month: "5月", current: 1520000, previous: 1350000 },
  { month: "6月", current: 1620000, previous: 1420000 },
  { month: "7月", current: 1750000, previous: 1580000 },
  { month: "8月", current: 1850000, previous: 1650000 },
  { month: "9月", current: 1950000, previous: 1720000 },
  { month: "10月", current: 2050000, previous: 1850000 },
  { month: "11月", current: 2150000, previous: 1920000 },
  { month: "12月", current: 2450000, previous: 2180000 },
]

const productRankingData = [
  { name: "商品A", sales: 450000, orders: 156, growth: 23.5 },
  { name: "商品B", sales: 380000, orders: 134, growth: 18.2 },
  { name: "商品C", sales: 320000, orders: 98, growth: 15.7 },
  { name: "商品D", sales: 280000, orders: 87, growth: 12.3 },
  { name: "商品E", sales: 250000, orders: 76, growth: 8.9 },
  { name: "商品F", sales: 220000, orders: 65, growth: 6.4 },
  { name: "商品G", sales: 180000, orders: 54, growth: 4.2 },
  { name: "商品H", sales: 150000, orders: 43, growth: 2.1 },
]

const SalesDashboard = () => {
  const selectedPeriod = useAppStore((state) => state.globalFilters.selectedPeriod)
  const [selectedTab, setSelectedTab] = useState("sales-dashboard")
  const [selectedPeriodState, setSelectedPeriodState] = useState("thisMonth")

  const periodOptions = [
    { value: "thisMonth", label: "今月" },
    { value: "lastMonth", label: "先月" },
    { value: "last3Months", label: "過去3ヶ月" },
    { value: "thisQuarter", label: "今四半期" },
    { value: "lastQuarter", label: "前四半期" },
    { value: "thisYear", label: "今年" },
    { value: "lastYear", label: "昨年" },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ja-JP").format(value)
  }

  const KPICard = ({
    title,
    current,
    previous,
    change,
    icon: Icon,
    color,
  }: {
    title: string
    current: number
    previous: number
    change: number
    icon: any
    color: string
  }) => (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {title.includes("売上") || title.includes("注文額") ? formatCurrency(current) : formatNumber(current)}
            </p>
          </div>
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          {change >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span className="text-sm text-gray-500 ml-1">前年同月比</span>
        </div>
      </CardContent>
    </Card>
  )

  const SalesDashboardContent = () => {
    return (
      <div className="space-y-6">
        {/* KPI カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            title="今月売上"
            current={kpiData.totalSales.current}
            previous={kpiData.totalSales.previous}
            change={kpiData.totalSales.change}
            icon={DollarSign}
            color="#3B82F6"
          />
          <KPICard
            title="注文数"
            current={kpiData.totalOrders.current}
            previous={kpiData.totalOrders.previous}
            change={kpiData.totalOrders.change}
            icon={ShoppingCart}
            color="#10B981"
          />
          <KPICard
            title="平均注文額"
            current={kpiData.averageOrderValue.current}
            previous={kpiData.averageOrderValue.previous}
            change={kpiData.averageOrderValue.change}
            icon={TrendingUp}
            color="#F59E0B"
          />
          <KPICard
            title="売上商品数"
            current={kpiData.totalProducts.current}
            previous={kpiData.totalProducts.previous}
            change={kpiData.totalProducts.change}
            icon={Package}
            color="#8B5CF6"
          />
        </div>

        {/* 前年同月比グラフと商品売上ランキング */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 前年同月比グラフ */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">前年同月比</CardTitle>
              <CardDescription>月別売上の前年比較</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), ""]}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <Bar dataKey="current" fill="#3B82F6" name="今年" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="previous" fill="#93C5FD" name="前年" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <TrendingUp className="h-4 w-4 inline-block mr-1" />
                  <span className="font-semibold">前年同月比: +12.4%</span> - 特に第4四半期の成長が顕著です。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 商品売上ランキング */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">商品売上ランキング</CardTitle>
              <CardDescription>売上上位8商品</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productRankingData.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-400"
                              : index === 2
                                ? "bg-amber-600"
                                : "bg-blue-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.orders}件の注文</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(product.sales)}</p>
                      <p className="text-sm text-green-600 flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-1" />+{product.growth}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 売上分析ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">📊 売上分析</CardTitle>
              <CardDescription>商品戦略と顧客戦略の統合分析プラットフォーム</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                期間: {periodOptions.find((p) => p.value === selectedPeriodState)?.label || "今月"}
              </Badge>
              <Select value={selectedPeriodState} onValueChange={setSelectedPeriodState}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* サブタブ分割コンテンツ */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full max-w-4xl grid-cols-4">
          <TabsTrigger value="sales-dashboard" className="flex items-center text-sm">
            <BarChart3 className="h-4 w-4 mr-2" />📊 売上ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="product-frequency" className="flex items-center text-sm">
            <ShoppingCart className="h-4 w-4 mr-2" />
            🛍️ 商品別購入頻度分析
          </TabsTrigger>
          <TabsTrigger value="year-over-year" className="flex items-center text-sm">
            <TrendingUp className="h-4 w-4 mr-2" />📈 前年同月比【商品】
          </TabsTrigger>
          <TabsTrigger value="purchase-detail" className="flex items-center text-sm">
            <Package className="h-4 w-4 mr-2" />📋 購入回数詳細分析
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="sales-dashboard" className="space-y-6">
            <SalesDashboardContent />
          </TabsContent>
          <TabsContent value="product-frequency" className="space-y-6">
            <ProductPurchaseFrequencyAnalysis />
          </TabsContent>
          <TabsContent value="year-over-year" className="space-y-6">
            <YearOverYearProductAnalysis />
          </TabsContent>
          <TabsContent value="purchase-detail" className="space-y-6">
            <PurchaseFrequencyDetailAnalysis />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default SalesDashboard
