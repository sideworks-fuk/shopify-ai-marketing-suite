"use client"
import { useAppContext } from "@/contexts/AppContext"
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
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, Filter, ShoppingCart, Package, DollarSign, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

// サンプルデータ
const kpiData = {
  monthlySales: { value: 2450000, change: 12.3 },
  orderCount: { value: 1234, change: 8.7 },
  avgOrderValue: { value: 1985, change: 3.2 },
  productCount: { value: 89, change: -2.1 },
}

const yearOverYearData = [
  { product: "商品A", thisYear: 45000, lastYear: 38000, change: 18.4 },
  { product: "商品B", thisYear: 67000, lastYear: 72000, change: -6.9 },
  { product: "商品C", thisYear: 34000, lastYear: 29000, change: 17.2 },
  { product: "商品D", thisYear: 89000, lastYear: 95000, change: -6.3 },
  { product: "商品E", thisYear: 23000, lastYear: 18000, change: 27.8 },
]

const monthlySalesData = [
  { month: "1月", 商品A: 45000, 商品B: 67000, 商品C: 34000, 商品D: 89000, 商品E: 23000 },
  { month: "2月", 商品A: 52000, 商品B: 71000, 商品C: 38000, 商品D: 85000, 商品E: 28000 },
  { month: "3月", 商品A: 48000, 商品B: 69000, 商品C: 42000, 商品D: 92000, 商品E: 31000 },
  { month: "4月", 商品A: 55000, 商品B: 74000, 商品C: 39000, 商品D: 88000, 商品E: 29000 },
  { month: "5月", 商品A: 61000, 商品B: 78000, 商品C: 45000, 商品D: 94000, 商品E: 33000 },
  { month: "6月", 商品A: 58000, 商品B: 76000, 商品C: 41000, 商品D: 91000, 商品E: 35000 },
  { month: "7月", 商品A: 63000, 商品B: 82000, 商品C: 47000, 商品D: 97000, 商品E: 37000 },
  { month: "8月", 商品A: 59000, 商品B: 79000, 商品C: 44000, 商品D: 93000, 商品E: 34000 },
  { month: "9月", 商品A: 65000, 商品B: 85000, 商品C: 49000, 商品D: 99000, 商品E: 39000 },
  { month: "10月", 商品A: 62000, 商品B: 83000, 商品C: 46000, 商品D: 96000, 商品E: 36000 },
  { month: "11月", 商品A: 68000, 商品B: 87000, 商品C: 51000, 商品D: 102000, 商品E: 41000 },
  { month: "12月", 商品A: 71000, 商品B: 91000, 商品C: 53000, 商品D: 105000, 商品E: 43000 },
]

const productRankingData = [
  { product: "商品D", sales: 1150000, ratio: 23.5 },
  { product: "商品B", sales: 950000, ratio: 19.4 },
  { product: "商品A", sales: 720000, ratio: 14.7 },
  { product: "商品E", sales: 420000, ratio: 8.6 },
  { product: "商品C", sales: 530000, ratio: 10.8 },
  { product: "商品F", sales: 380000, ratio: 7.8 },
  { product: "商品G", sales: 320000, ratio: 6.5 },
  { product: "商品H", sales: 280000, ratio: 5.7 },
  { product: "商品I", sales: 150000, ratio: 3.1 },
  { product: "商品J", sales: 95000, ratio: 1.9 },
]

const combinationData = [
  {
    product: "商品A",
    count: 15,
    unitPrice: 1200,
    totalSales: 18000,
    ratio: 12.5,
    combinations: ["商品B", "商品C", "商品D"],
  },
  {
    product: "商品B",
    count: 23,
    unitPrice: 2400,
    totalSales: 55200,
    ratio: 18.2,
    combinations: ["商品A", "商品E", "商品F"],
  },
  {
    product: "商品C",
    count: 18,
    unitPrice: 1800,
    totalSales: 32400,
    ratio: 15.3,
    combinations: ["商品A", "商品D", "商品G"],
  },
  {
    product: "商品D",
    count: 31,
    unitPrice: 3200,
    totalSales: 99200,
    ratio: 22.1,
    combinations: ["商品B", "商品C", "商品H"],
  },
  {
    product: "商品E",
    count: 12,
    unitPrice: 1500,
    totalSales: 18000,
    ratio: 8.9,
    combinations: ["商品B", "商品F", "商品I"],
  },
]

const colors = {
  primary: "#3B82F6",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
}

const chartColors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"]

export default function SalesDashboard() {
  const { selectedPeriod, setSelectedPeriod, selectedProductFilter, setSelectedProductFilter } = useAppContext()

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
    value,
    change,
    icon: Icon,
    format = "number",
  }: {
    title: string
    value: number
    change: number
    icon: any
    format?: "number" | "currency"
  }) => (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {format === "currency" ? formatCurrency(value) : formatNumber(value)}
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          {change >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
          <span className="text-sm text-gray-500 ml-1">前月比</span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* ダッシュボードコントロール */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📊 売上分析ダッシュボード</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全商品">全商品</SelectItem>
                <SelectItem value="売上上位10">売上上位10</SelectItem>
                <SelectItem value="カテゴリ別">カテゴリ別</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              適用
            </Button>
          </div>
        </div>
      </div>

      {/* KPIサマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="今月売上"
          value={kpiData.monthlySales.value}
          change={kpiData.monthlySales.change}
          icon={DollarSign}
          format="currency"
        />
        <KPICard
          title="注文数"
          value={kpiData.orderCount.value}
          change={kpiData.orderCount.change}
          icon={ShoppingCart}
        />
        <KPICard
          title="平均注文額"
          value={kpiData.avgOrderValue.value}
          change={kpiData.avgOrderValue.change}
          icon={Users}
          format="currency"
        />
        <KPICard
          title="売上商品数"
          value={kpiData.productCount.value}
          change={kpiData.productCount.change}
          icon={Package}
        />
      </div>

      {/* メインチャートエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左カラム */}
        <div className="space-y-6">
          {/* 前年同月比チャート */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">前年同月比</CardTitle>
              <CardDescription>今年と前年の売上比較</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearOverYearData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="product" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name === "thisYear" ? "今年" : "前年"]}
                    labelFormatter={(label) => `商品: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="thisYear" fill={colors.primary} name="今年" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="lastYear" fill={colors.secondary} name="前年" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 月別売上推移 */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">月別売上推移</CardTitle>
              <CardDescription>過去12ヶ月の商品別売上推移</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  {Object.keys(monthlySalesData[0])
                    .filter((key) => key !== "month")
                    .map((key, index) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 右カラム */}
        <div>
          {/* 商品売上ランキング */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">商品売上ランキング</CardTitle>
              <CardDescription>売上金額TOP10と構成比</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={620}>
                <BarChart
                  data={productRankingData}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="product" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "売上金額"]}
                    labelFormatter={(label) => `商品: ${label}`}
                  />
                  <Bar dataKey="sales" radius={[0, 4, 4, 0]}>
                    {productRankingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 組み合わせ商品分析テーブル */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">組み合わせ商品分析</CardTitle>
          <CardDescription>商品の組み合わせ購入パターン分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">商品名</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">件数</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">単体金額</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">売上総額</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">構成比</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">組み合わせ商品1</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">組み合わせ商品2</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">組み合わせ商品3</th>
                </tr>
              </thead>
              <tbody>
                {combinationData.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">{item.product}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatNumber(item.count)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">{formatCurrency(item.totalSales)}</td>
                    <td className="py-3 px-4 text-right font-mono">{item.ratio}%</td>
                    <td className="py-3 px-4 text-blue-600">{item.combinations[0]}</td>
                    <td className="py-3 px-4 text-blue-600">{item.combinations[1]}</td>
                    <td className="py-3 px-4 text-blue-600">{item.combinations[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
