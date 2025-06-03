"use client"

import { useState } from "react"
import { useAppContext } from "../../contexts/AppContext"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  Users,
  AlertTriangle,
  Diamond,
  Moon,
  Search,
  Download,
  Mail,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Eye,
  MoreHorizontal,
  Repeat,
  Crown,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Input } from "../ui/input"
import { StatusCard } from "../ui/status-card"
import { CustomerStatusBadge } from "../ui/customer-status-badge"
import { useCustomerTable } from "../../hooks/useCustomerTable"
import { customerDetailData as mockCustomerData } from "../../data/mock/customerData"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

// 顧客分析用のサンプルデータ
const customerSegmentData = [
  { name: "新規顧客", value: 35, color: "#3b82f6" },
  { name: "リピーター", value: 45, color: "#10b981" },
  { name: "VIP顧客", value: 15, color: "#f59e0b" },
  { name: "休眠顧客", value: 5, color: "#ef4444" },
]

const customerAcquisitionData = [
  { month: "1月", newCustomers: 120, cost: 45000 },
  { month: "2月", newCustomers: 135, cost: 52000 },
  { month: "3月", newCustomers: 158, cost: 48000 },
  { month: "4月", newCustomers: 142, cost: 51000 },
  { month: "5月", newCustomers: 167, cost: 49000 },
  { month: "6月", newCustomers: 189, cost: 53000 },
]

const customerLifetimeValueData = [
  { segment: "新規", ltv: 15000, orders: 1.2 },
  { segment: "リピーター", ltv: 45000, orders: 3.8 },
  { segment: "VIP", ltv: 120000, orders: 8.5 },
  { segment: "休眠", ltv: 8000, orders: 0.8 },
]

const topCustomers = [
  { id: "C001", name: "田中 太郎", totalSpent: 450000, orders: 12, lastOrder: "2024-03-15", segment: "VIP" },
  { id: "C002", name: "佐藤 花子", totalSpent: 380000, orders: 9, lastOrder: "2024-03-18", segment: "VIP" },
  { id: "C003", name: "鈴木 一郎", totalSpent: 320000, orders: 8, lastOrder: "2024-03-20", segment: "リピーター" },
  { id: "C004", name: "高橋 美咲", totalSpent: 280000, orders: 7, lastOrder: "2024-03-12", segment: "リピーター" },
  { id: "C005", name: "伊藤 健太", totalSpent: 250000, orders: 6, lastOrder: "2024-03-22", segment: "リピーター" },
]

const purchaseFrequencyData = [
  { frequency: "1回", current: 1500, previous: 1200 },
  { frequency: "2回", current: 800, previous: 750 },
  { frequency: "3回", current: 450, previous: 520 },
  { frequency: "4回", current: 280, previous: 290 },
  { frequency: "5回", current: 180, previous: 200 },
  { frequency: "6回", current: 120, previous: 130 },
  { frequency: "7回", current: 90, previous: 85 },
  { frequency: "8回", current: 70, previous: 65 },
  { frequency: "9回", current: 55, previous: 50 },
  { frequency: "10回", current: 45, previous: 40 },
]

const fLayerTrendData = [
  { month: "1月", F1: 120, F2: 80, F3: 45, F4: 28, F5: 15 },
  { month: "2月", F1: 135, F2: 85, F3: 50, F4: 30, F5: 18 },
  { month: "3月", F1: 150, F2: 90, F3: 55, F4: 32, F5: 20 },
  { month: "4月", F1: 140, F2: 88, F3: 52, F4: 31, F5: 19 },
  { month: "5月", F1: 160, F2: 95, F3: 58, F4: 35, F5: 22 },
  { month: "6月", F1: 170, F2: 100, F3: 60, F4: 38, F5: 24 },
  { month: "7月", F1: 180, F2: 105, F3: 65, F4: 40, F5: 26 },
  { month: "8月", F1: 190, F2: 110, F3: 68, F4: 42, F5: 28 },
  { month: "9月", F1: 175, F2: 102, F3: 62, F4: 39, F5: 25 },
  { month: "10月", F1: 165, F2: 98, F3: 59, F4: 36, F5: 23 },
  { month: "11月", F1: 155, F2: 92, F3: 56, F4: 34, F5: 21 },
  { month: "12月", F1: 145, F2: 87, F3: 53, F4: 33, F5: 20 },
]

const dormantCustomersData = [
  { period: "3ヶ月", count: 89, action: "早期リテンション" },
  { period: "6ヶ月", count: 156, action: "復帰キャンペーン" },
  { period: "12ヶ月", count: 67, action: "特別オファー" },
  { period: "24ヶ月+", count: 45, action: "最終アプローチ" },
]



// 色定義
const colors = {
  active: "#10B981", // 緑系
  atRisk: "#F59E0B", // オレンジ系
  vip: "#F59E0B", // ゴールド系
  dormant: "#6B7280", // グレー系
  primary: "#10B981", // プライマリカラー（緑系）
  secondary: "#3B82F6", // セカンダリカラー（青系）
  accent: "#8B5CF6", // アクセントカラー（紫系）
  danger: "#EF4444", // 危険色（赤系）
  heatmap: ["#DCFCE7", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A"], // 緑系グラデーション
}

export default function CustomerDashboard() {
  const { selectedPeriod, setSelectedPeriod, selectedCustomerSegment, setSelectedCustomerSegment } = useAppContext()
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // useCustomerTableフックで統一管理
  const {
    searchQuery,
    filteredCustomers,
    paginatedCustomers,
    totalPages,
    currentPage,
    sortColumn,
    sortDirection,
    setSearchQuery,
    handleSort,
    handlePageChange,
  } = useCustomerTable({
    data: mockCustomerData,
    itemsPerPage: 5,
    selectedSegment: selectedCustomerSegment,
    initialSortColumn: "purchaseCount",
    initialSortDirection: "desc"
  })

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



  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDetailModalOpen(true)
  }





  const totalCustomers = customerSegmentData.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <div className="space-y-6">
      {/* ヘッダーエリア */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">👥 顧客分析ダッシュボード</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="今月">今月</SelectItem>
                <SelectItem value="前月">前月</SelectItem>
                <SelectItem value="今四半期">今四半期</SelectItem>
                <SelectItem value="カスタム">カスタム</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCustomerSegment} onValueChange={setSelectedCustomerSegment}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全顧客">全顧客</SelectItem>
                <SelectItem value="新規">新規顧客</SelectItem>
                <SelectItem value="リピーター">リピーター</SelectItem>
                <SelectItem value="VIP">VIP顧客</SelectItem>
                <SelectItem value="休眠">休眠顧客</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  アクション
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  CSV出力
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  メール配信
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  セグメント作成
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総顧客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.5%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">新規顧客数</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">189</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.2%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">リピート率</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.5%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -2.1%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均LTV</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥42,500</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +5.8%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 顧客ステータス概要 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="アクティブ顧客" count={1200} change={5.2} icon={Users} color={colors.active} />
        <StatusCard title="休眠リスク" count={300} change={12.1} icon={AlertTriangle} color={colors.atRisk} />
        <StatusCard title="高価値顧客" count={200} change={8.9} icon={Diamond} color={colors.vip} />
        <StatusCard title="休眠顧客" count={100} change={-3.4} icon={Moon} color={colors.dormant} />
      </div>

      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 顧客セグメント分布 */}
        <Card>
          <CardHeader>
            <CardTitle>顧客セグメント分布</CardTitle>
            <CardDescription>顧客の分類別構成比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerSegmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {customerSegmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 新規顧客獲得推移 */}
        <Card>
          <CardHeader>
            <CardTitle>新規顧客獲得推移</CardTitle>
            <CardDescription>月別新規顧客数と獲得コスト</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={customerAcquisitionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="newCustomers" fill="#3b82f6" name="新規顧客数" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#ef4444" name="獲得コスト" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 購入パターン分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 購入回数分析 */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">購入回数分析</CardTitle>
            <CardDescription>購入回数別の顧客数分布</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={purchaseFrequencyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="frequency" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => [formatNumber(Number(value)), name === "current" ? "当期" : "前年同期"]}
                  labelFormatter={(label) => `購入回数: ${label}`}
                />
                <Legend />
                <Bar dataKey="current" fill={colors.primary} name="当期" radius={[2, 2, 0, 0]} />
                <Bar dataKey="previous" fill={colors.secondary} name="前年同期" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-semibold">リピート率: </span>
                <span className="font-mono">
                  {(
                    ((purchaseFrequencyData.reduce((sum, item) => sum + item.current, 0) -
                      purchaseFrequencyData[0].current) /
                      purchaseFrequencyData.reduce((sum, item) => sum + item.current, 0)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
                （前年同期比: +2.3%）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* F階層傾向 */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">F階層傾向</CardTitle>
            <CardDescription>月別 × 購入回数階層のマトリックス</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-900">月</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">F1 (1回)</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">F2 (2回)</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">F3 (3-5回)</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">F4 (6-10回)</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">F5 (11回+)</th>
                  </tr>
                </thead>
                <tbody>
                  {fLayerTrendData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-3">
                        <div
                          className="mx-auto rounded-md py-2 text-center text-xs font-medium"
                          style={{
                            backgroundColor: colors.heatmap[0],
                            opacity: item.F1 / 200,
                          }}
                        >
                          {item.F1}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div
                          className="mx-auto rounded-md py-2 text-center text-xs font-medium"
                          style={{
                            backgroundColor: colors.heatmap[1],
                            opacity: item.F2 / 120,
                          }}
                        >
                          {item.F2}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div
                          className="mx-auto rounded-md py-2 text-center text-xs font-medium"
                          style={{
                            backgroundColor: colors.heatmap[2],
                            opacity: item.F3 / 70,
                          }}
                        >
                          {item.F3}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div
                          className="mx-auto rounded-md py-2 text-center text-xs font-medium"
                          style={{
                            backgroundColor: colors.heatmap[3],
                            opacity: item.F4 / 45,
                          }}
                        >
                          {item.F4}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div
                          className="mx-auto rounded-md py-2 text-center text-xs font-medium"
                          style={{
                            backgroundColor: colors.heatmap[4],
                            opacity: item.F5 / 30,
                          }}
                        >
                          {item.F5}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LTV分析 */}
      <Card>
        <CardHeader>
          <CardTitle>顧客生涯価値（LTV）分析</CardTitle>
          <CardDescription>セグメント別の平均LTVと注文回数</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={customerLifetimeValueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="ltv" fill="#10b981" name="平均LTV (円)" />
              <Bar yAxisId="right" dataKey="orders" fill="#f59e0b" name="平均注文回数" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 休眠顧客管理 */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">休眠顧客管理</CardTitle>
          <CardDescription>休眠期間別の顧客数とアクション推奨</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">休眠期間</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">顧客数</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">推奨アクション</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">実行</th>
              </tr>
            </thead>
            <tbody>
              {dormantCustomersData.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{item.period}</td>
                  <td className="py-3 px-4 text-center font-mono">{formatNumber(item.count)}</td>
                  <td className="py-3 px-4 text-green-600">{item.action}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="outline" size="sm">
                      実行
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 inline-block mr-1" />
              <span className="font-semibold">注意: </span>
              休眠顧客は前月比で12.1%増加しています。早急なリテンション施策が推奨されます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 顧客詳細リスト */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">顧客詳細リスト</CardTitle>
              <CardDescription>顧客の詳細情報と購入履歴</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="顧客名で検索..."
                className="pl-10 w-full md:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                    顧客名
                    {sortColumn === "name" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("purchaseCount")}>
                    購入回数
                    {sortColumn === "purchaseCount" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("totalAmount")}>
                    購入金額
                    {sortColumn === "totalAmount" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="text-right">購入頻度</TableHead>
                  <TableHead className="text-right">平均期間</TableHead>
                  <TableHead>最頻購入商品</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleCustomerClick(customer)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-right font-mono">{customer.purchaseCount}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(customer.totalAmount)}</TableCell>
                    <TableCell className="text-right font-mono">月{customer.frequency.toFixed(1)}回</TableCell>
                    <TableCell className="text-right font-mono">{customer.avgInterval}日</TableCell>
                    <TableCell>{customer.topProduct}</TableCell>
                    <TableCell><CustomerStatusBadge status={customer.status as any} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">アクション</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            詳細を見る
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            メール送信
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            休眠リスク警告
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ページネーション */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              全{filteredCustomers.length}件中 {(currentPage - 1) * 5 + 1}-
              {Math.min(currentPage * 5, filteredCustomers.length)}件を表示
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                次へ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 上位顧客リスト */}
      <Card>
        <CardHeader>
          <CardTitle>上位顧客リスト</CardTitle>
          <CardDescription>購入金額上位の顧客一覧</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>顧客ID</TableHead>
                <TableHead>顧客名</TableHead>
                <TableHead>累計購入金額</TableHead>
                <TableHead>注文回数</TableHead>
                <TableHead>最終注文日</TableHead>
                <TableHead>セグメント</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.id}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>¥{customer.totalSpent.toLocaleString()}</TableCell>
                  <TableCell>{customer.orders}回</TableCell>
                  <TableCell>{customer.lastOrder}</TableCell>
                  <TableCell>
                    <Badge variant={customer.segment === "VIP" ? "default" : "secondary"}>{customer.segment}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 顧客詳細モーダル */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>顧客詳細情報</DialogTitle>
            <DialogDescription>顧客の詳細情報と購入履歴</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="mt-4">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <div className="bg-gray-100 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                      <CustomerStatusBadge status={selectedCustomer.status as any} />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">顧客ID</p>
                        <p className="font-mono">{selectedCustomer.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">最終購入日</p>
                        <p>{selectedCustomer.lastOrderDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">累計購入金額</p>
                        <p className="font-semibold">{formatCurrency(selectedCustomer.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:w-2/3">
                  <Tabs defaultValue="summary">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="summary">サマリー</TabsTrigger>
                      <TabsTrigger value="purchases">購入履歴</TabsTrigger>
                      <TabsTrigger value="actions">推奨アクション</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">購入回数</p>
                          <p className="text-2xl font-bold">{selectedCustomer.purchaseCount}回</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">購入頻度</p>
                          <p className="text-2xl font-bold">月{selectedCustomer.frequency.toFixed(1)}回</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">平均購入間隔</p>
                          <p className="text-2xl font-bold">{selectedCustomer.avgInterval}日</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">最頻購入商品</p>
                          <p className="text-xl font-bold">{selectedCustomer.topProduct}</p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="purchases" className="p-4">
                      <p className="text-gray-500 mb-4">最近の購入履歴</p>
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
                          <div>
                            <p className="font-medium">{selectedCustomer.topProduct}</p>
                            <p className="text-sm text-gray-500">{selectedCustomer.lastOrderDate}</p>
                          </div>
                          <p className="font-semibold">{formatCurrency(selectedCustomer.totalAmount / 3)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
                          <div>
                            <p className="font-medium">商品B</p>
                            <p className="text-sm text-gray-500">2024-04-10</p>
                          </div>
                          <p className="font-semibold">{formatCurrency(selectedCustomer.totalAmount / 5)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
                          <div>
                            <p className="font-medium">商品C</p>
                            <p className="text-sm text-gray-500">2024-03-25</p>
                          </div>
                          <p className="font-semibold">{formatCurrency(selectedCustomer.totalAmount / 4)}</p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="actions" className="p-4">
                      <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold flex items-center">
                            <Diamond className="h-4 w-4 mr-2" />
                            推奨アクション
                          </h4>
                          <p className="mt-2 text-sm">
                            {selectedCustomer.status === "VIP"
                              ? "VIP特典の案内と感謝メールの送信"
                              : selectedCustomer.status === "リピーター"
                                ? "関連商品のクロスセル提案"
                                : selectedCustomer.status === "新規"
                                  ? "初回購入後のフォローアップ"
                                  : "再購入促進キャンペーン"}
                          </p>
                          <Button className="mt-3 bg-green-600 hover:bg-green-700">アクション実行</Button>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold">購入予測</h4>
                          <p className="mt-2 text-sm">
                            次回購入予測日: {selectedCustomer.lastOrderDate.split("-")[0]}-
                            {selectedCustomer.lastOrderDate.split("-")[1]}-
                            {String(
                              Number(selectedCustomer.lastOrderDate.split("-")[2]) + selectedCustomer.avgInterval,
                            ).padStart(2, "0")}
                          </p>
                          <p className="mt-1 text-sm">予測購入商品: {selectedCustomer.topProduct}</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
