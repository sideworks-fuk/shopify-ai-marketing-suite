"use client"

import { useState } from "react"
import { useAppContext } from "../../contexts/AppContext"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import YearOverYearProductAnalysis from "./YearOverYearProductAnalysis"
import ProductPurchaseFrequencyAnalysis from "./ProductPurchaseFrequencyAnalysis"
import { Badge } from "@/components/ui/badge"
import PurchaseFrequencyDetailAnalysis from "./PurchaseFrequencyDetailAnalysis"

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

const monthlySalesTrendData = [
  { month: "1月", sales: 1250000, target: 1200000 },
  { month: "2月", sales: 1320000, target: 1250000 },
  { month: "3月", sales: 1450000, target: 1300000 },
  { month: "4月", sales: 1380000, target: 1350000 },
  { month: "5月", sales: 1520000, target: 1400000 },
  { month: "6月", sales: 1620000, target: 1450000 },
  { month: "7月", sales: 1750000, target: 1500000 },
  { month: "8月", sales: 1850000, target: 1550000 },
  { month: "9月", sales: 1950000, target: 1600000 },
  { month: "10月", sales: 2050000, target: 1650000 },
  { month: "11月", sales: 2150000, target: 1700000 },
  { month: "12月", sales: 2450000, target: 1750000 },
]

const combinationAnalysisData = [
  {
    combination: "商品A + 商品B",
    frequency: 89,
    revenue: 125000,
    conversionRate: 23.5,
    recommendation: "高",
  },
  {
    combination: "商品C + 商品D",
    frequency: 67,
    revenue: 98000,
    conversionRate: 18.7,
    recommendation: "中",
  },
  {
    combination: "商品A + 商品E",
    frequency: 54,
    revenue: 87000,
    conversionRate: 15.2,
    recommendation: "高",
  },
  {
    combination: "商品B + 商品F",
    frequency: 43,
    revenue: 65000,
    conversionRate: 12.8,
    recommendation: "中",
  },
  {
    combination: "商品D + 商品G",
    frequency: 32,
    revenue: 45000,
    conversionRate: 9.4,
    recommendation: "低",
  },
]

// 月別売上詳細データ
const monthlyDetailedSalesData = [
  {
    month: "2024年1月",
    productA: { quantity: 100, amount: 50000 },
    productB: { quantity: 80, amount: 40000 },
    productC: { quantity: 65, amount: 32500 },
    productD: { quantity: 45, amount: 22500 },
    productE: { quantity: 35, amount: 17500 },
    productF: { quantity: 25, amount: 12500 },
    productG: { quantity: 20, amount: 10000 },
    productH: { quantity: 15, amount: 7500 },
    total: { quantity: 385, amount: 192500 },
  },
  {
    month: "2024年2月",
    productA: { quantity: 110, amount: 55000 },
    productB: { quantity: 85, amount: 42500 },
    productC: { quantity: 70, amount: 35000 },
    productD: { quantity: 50, amount: 25000 },
    productE: { quantity: 40, amount: 20000 },
    productF: { quantity: 30, amount: 15000 },
    productG: { quantity: 25, amount: 12500 },
    productH: { quantity: 20, amount: 10000 },
    total: { quantity: 430, amount: 215000 },
  },
  {
    month: "2024年3月",
    productA: { quantity: 125, amount: 62500 },
    productB: { quantity: 95, amount: 47500 },
    productC: { quantity: 80, amount: 40000 },
    productD: { quantity: 60, amount: 30000 },
    productE: { quantity: 45, amount: 22500 },
    productF: { quantity: 35, amount: 17500 },
    productG: { quantity: 30, amount: 15000 },
    productH: { quantity: 25, amount: 12500 },
    total: { quantity: 495, amount: 247500 },
  },
  {
    month: "2024年4月",
    productA: { quantity: 115, amount: 57500 },
    productB: { quantity: 90, amount: 45000 },
    productC: { quantity: 75, amount: 37500 },
    productD: { quantity: 55, amount: 27500 },
    productE: { quantity: 42, amount: 21000 },
    productF: { quantity: 32, amount: 16000 },
    productG: { quantity: 28, amount: 14000 },
    productH: { quantity: 23, amount: 11500 },
    total: { quantity: 460, amount: 230000 },
  },
  {
    month: "2024年5月",
    productA: { quantity: 135, amount: 67500 },
    productB: { quantity: 105, amount: 52500 },
    productC: { quantity: 85, amount: 42500 },
    productD: { quantity: 65, amount: 32500 },
    productE: { quantity: 50, amount: 25000 },
    productF: { quantity: 40, amount: 20000 },
    productG: { quantity: 35, amount: 17500 },
    productH: { quantity: 30, amount: 15000 },
    total: { quantity: 545, amount: 272500 },
  },
  {
    month: "2024年6月",
    productA: { quantity: 145, amount: 72500 },
    productB: { quantity: 115, amount: 57500 },
    productC: { quantity: 95, amount: 47500 },
    productD: { quantity: 75, amount: 37500 },
    productE: { quantity: 55, amount: 27500 },
    productF: { quantity: 45, amount: 22500 },
    productG: { quantity: 40, amount: 20000 },
    productH: { quantity: 35, amount: 17500 },
    total: { quantity: 605, amount: 302500 },
  },
  {
    month: "2024年7月",
    productA: { quantity: 160, amount: 80000 },
    productB: { quantity: 125, amount: 62500 },
    productC: { quantity: 105, amount: 52500 },
    productD: { quantity: 85, amount: 42500 },
    productE: { quantity: 65, amount: 32500 },
    productF: { quantity: 50, amount: 25000 },
    productG: { quantity: 45, amount: 22500 },
    productH: { quantity: 40, amount: 20000 },
    total: { quantity: 675, amount: 337500 },
  },
  {
    month: "2024年8月",
    productA: { quantity: 170, amount: 85000 },
    productB: { quantity: 135, amount: 67500 },
    productC: { quantity: 115, amount: 57500 },
    productD: { quantity: 95, amount: 47500 },
    productE: { quantity: 75, amount: 37500 },
    productF: { quantity: 55, amount: 27500 },
    productG: { quantity: 50, amount: 25000 },
    productH: { quantity: 45, amount: 22500 },
    total: { quantity: 740, amount: 370000 },
  },
  {
    month: "2024年9月",
    productA: { quantity: 180, amount: 90000 },
    productB: { quantity: 145, amount: 72500 },
    productC: { quantity: 125, amount: 62500 },
    productD: { quantity: 105, amount: 52500 },
    productE: { quantity: 85, amount: 42500 },
    productF: { quantity: 65, amount: 32500 },
    productG: { quantity: 55, amount: 27500 },
    productH: { quantity: 50, amount: 25000 },
    total: { quantity: 810, amount: 405000 },
  },
  {
    month: "2024年10月",
    productA: { quantity: 195, amount: 97500 },
    productB: { quantity: 155, amount: 77500 },
    productC: { quantity: 135, amount: 67500 },
    productD: { quantity: 115, amount: 57500 },
    productE: { quantity: 95, amount: 47500 },
    productF: { quantity: 75, amount: 37500 },
    productG: { quantity: 65, amount: 32500 },
    productH: { quantity: 55, amount: 27500 },
    total: { quantity: 890, amount: 445000 },
  },
  {
    month: "2024年11月",
    productA: { quantity: 210, amount: 105000 },
    productB: { quantity: 165, amount: 82500 },
    productC: { quantity: 145, amount: 72500 },
    productD: { quantity: 125, amount: 62500 },
    productE: { quantity: 105, amount: 52500 },
    productF: { quantity: 85, amount: 42500 },
    productG: { quantity: 75, amount: 37500 },
    productH: { quantity: 65, amount: 32500 },
    total: { quantity: 975, amount: 487500 },
  },
  {
    month: "2024年12月",
    productA: { quantity: 230, amount: 115000 },
    productB: { quantity: 180, amount: 90000 },
    productC: { quantity: 160, amount: 80000 },
    productD: { quantity: 140, amount: 70000 },
    productE: { quantity: 120, amount: 60000 },
    productF: { quantity: 100, amount: 50000 },
    productG: { quantity: 85, amount: 42500 },
    productH: { quantity: 75, amount: 37500 },
    total: { quantity: 1090, amount: 545000 },
  },
]

const SalesDashboard = () => {
  const { selectedPeriod } = useAppContext()
  const [selectedTab, setSelectedTab] = useState<
    "sales-dashboard" | "product-frequency" | "year-over-year" | "purchase-detail"
  >("sales-dashboard")
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

  const getRecommendationBadge = (recommendation: string) => {
    const colors = {
      高: "bg-green-100 text-green-800",
      中: "bg-yellow-100 text-yellow-800",
      低: "bg-red-100 text-red-800",
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[recommendation as keyof typeof colors]}`}>
        {recommendation}
      </span>
    )
  }

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

        {/* 月別売上推移グラフ */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">月別売上推移</CardTitle>
            <CardDescription>売上実績と目標の比較</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlySalesTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), ""]}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="売上実績"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="売上目標"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1">目標達成率</h4>
                <p className="text-2xl font-bold text-blue-900">140%</p>
                <p className="text-sm text-blue-700">年間目標を大幅に上回っています</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-1">成長率</h4>
                <p className="text-2xl font-bold text-green-900">+96%</p>
                <p className="text-sm text-green-700">前年同期比で大幅な成長</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-1">予測売上</h4>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(2650000)}</p>
                <p className="text-sm text-purple-700">来月の予測売上</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 月別売上詳細テーブル */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">月別売上詳細</CardTitle>
            <CardDescription>商品別の月次売上数量・金額詳細</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th
                      rowSpan={2}
                      className="text-left py-4 px-3 font-medium text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[120px]"
                    >
                      月
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品A
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品B
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品C
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品D
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品E
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品F
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品G
                    </th>
                    <th
                      colSpan={2}
                      className="text-center py-2 px-3 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                    >
                      商品H
                    </th>
                    <th colSpan={2} className="text-center py-2 px-3 font-medium text-gray-900 bg-green-50">
                      合計
                    </th>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25">
                      数量
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-blue-25">
                      金額
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25">
                      数量
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-blue-25">
                      金額
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25">
                      数量
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-blue-25">
                      金額
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25">
                      数量
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-blue-25">
                      金額
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25">
                      数量
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-blue-25">
                      金額
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25">
                      数量
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-blue-25">
                      金額
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25">
                      数量
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 bg-green-25">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyDetailedSalesData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900 border-r border-gray-200 bg-gray-25">
                        {row.month}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productA.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productA.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productB.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productB.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productC.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productC.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productD.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productD.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productE.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productE.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productF.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productF.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productG.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productG.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-100">
                        {formatNumber(row.productH.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono border-r border-gray-200">
                        {formatCurrency(row.productH.amount)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono font-semibold border-r border-gray-100 bg-green-25">
                        {formatNumber(row.total.quantity)}
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-mono font-semibold bg-green-25">
                        {formatCurrency(row.total.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <Package className="h-4 w-4 inline-block mr-1" />
                <span className="font-semibold">年間合計: </span>
                数量 {formatNumber(monthlyDetailedSalesData.reduce((sum, row) => sum + row.total.quantity, 0))}個、 金額{" "}
                {formatCurrency(monthlyDetailedSalesData.reduce((sum, row) => sum + row.total.amount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 組み合わせ商品分析テーブル */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">組み合わせ商品分析</CardTitle>
            <CardDescription>よく一緒に購入される商品の組み合わせ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">商品組み合わせ</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">購入頻度</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">売上</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">コンバージョン率</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">推奨度</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {combinationAnalysisData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{item.combination}</td>
                      <td className="py-3 px-4 text-center font-mono">{item.frequency}回</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.revenue)}</td>
                      <td className="py-3 px-4 text-center font-mono">{item.conversionRate}%</td>
                      <td className="py-3 px-4 text-center">{getRecommendationBadge(item.recommendation)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="outline" size="sm">
                          詳細
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <Award className="h-4 w-4 inline-block mr-1" />
                <span className="font-semibold">推奨: </span>
                「商品A + 商品B」の組み合わせは高いコンバージョン率を示しています。
                バンドル商品として販売することを検討してください。
              </p>
            </div>
          </CardContent>
        </Card>
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
