"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Users,
  ShoppingBag,
  Calendar,
  ChevronRight,
  Info,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

// サンプルデータ
const salesPredictionData = [
  { month: "1月", actual: 1250000, predicted: 1250000 },
  { month: "2月", actual: 1320000, predicted: 1300000 },
  { month: "3月", actual: 1450000, predicted: 1400000 },
  { month: "4月", actual: 1380000, predicted: 1350000 },
  { month: "5月", actual: 1520000, predicted: 1500000 },
  { month: "6月", actual: 1620000, predicted: 1600000 },
  { month: "7月", actual: 1750000, predicted: 1700000 },
  { month: "8月", actual: 1850000, predicted: 1800000 },
  { month: "9月", actual: 1950000, predicted: 1900000 },
  { month: "10月", actual: 2050000, predicted: 2000000 },
  { month: "11月", actual: 2150000, predicted: 2100000 },
  { month: "12月", actual: 2300000, predicted: 2200000 },
  { month: "1月 (予測)", actual: null, predicted: 2350000 },
  { month: "2月 (予測)", actual: null, predicted: 2450000 },
  { month: "3月 (予測)", actual: null, predicted: 2550000 },
]

const performanceRadarData = [
  { subject: "売上達成率", A: 120, fullMark: 150 },
  { subject: "顧客増加率", A: 98, fullMark: 150 },
  { subject: "リピート率", A: 86, fullMark: 150 },
  { subject: "客単価", A: 99, fullMark: 150 },
  { subject: "在庫回転率", A: 85, fullMark: 150 },
  { subject: "広告効果", A: 65, fullMark: 150 },
]

const anomalyDetectionData = [
  {
    id: "1",
    title: "売上急増検知",
    description: "商品Dの売上が先週比で143%増加しています",
    severity: "positive",
    date: "2024-05-22",
    impact: "高",
  },
  {
    id: "2",
    title: "顧客離脱リスク",
    description: "VIP顧客セグメントで15%の購入頻度低下が見られます",
    severity: "warning",
    date: "2024-05-20",
    impact: "中",
  },
  {
    id: "3",
    title: "在庫切れリスク",
    description: "商品Aの在庫が現在の需要予測では2週間以内に枯渇します",
    severity: "negative",
    date: "2024-05-18",
    impact: "高",
  },
  {
    id: "4",
    title: "季節トレンド検知",
    description: "夏物商品カテゴリの検索数が前年同期比で35%増加しています",
    severity: "positive",
    date: "2024-05-15",
    impact: "中",
  },
]

const recommendationsData = [
  {
    id: "1",
    title: "商品バンドル提案",
    description: "商品AとCを組み合わせた特別セットの提供で売上増加が見込めます",
    category: "product",
    confidence: 92,
    potentialImpact: "¥450,000 / 月",
  },
  {
    id: "2",
    title: "休眠顧客キャンペーン",
    description: "3ヶ月以上購入のない顧客向けに15%オフクーポンの送付を推奨します",
    category: "customer",
    confidence: 87,
    potentialImpact: "顧客復帰率 23%増",
  },
  {
    id: "3",
    title: "価格最適化",
    description: "商品Bの価格を8%引き上げても需要への影響は最小限と予測されます",
    category: "pricing",
    confidence: 78,
    potentialImpact: "利益率 5%向上",
  },
  {
    id: "4",
    title: "在庫発注タイミング",
    description: "商品Dの発注サイクルを現在より5日早めることで欠品リスクを低減できます",
    category: "inventory",
    confidence: 85,
    potentialImpact: "機会損失 12%減",
  },
]

const productTrendData = [
  { month: "1月", trend: 45 },
  { month: "2月", trend: 52 },
  { month: "3月", trend: 49 },
  { month: "4月", trend: 62 },
  { month: "5月", trend: 78 },
  { month: "6月", trend: 85 },
  { month: "7月", trend: 82 },
  { month: "8月", trend: 91 },
  { month: "9月", trend: 87 },
  { month: "10月", trend: 93 },
  { month: "11月", trend: 98 },
  { month: "12月", trend: 120 },
]

// 色定義
const colors = {
  primary: "#8B5CF6", // プライマリカラー（紫系）
  secondary: "#3B82F6", // セカンダリカラー（青系）
  tertiary: "#10B981", // 第三カラー（緑系）
  positive: "#10B981", // 肯定的（緑系）
  warning: "#F59E0B", // 警告（オレンジ系）
  negative: "#EF4444", // 否定的（赤系）
  neutral: "#6B7280", // 中立（グレー系）
  gradient: ["#C084FC", "#8B5CF6", "#6D28D9"], // 紫系グラデーション
}

export default function AIInsightsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("今月")
  const [selectedInsightTab, setSelectedInsightTab] = useState("trends")

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-"
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ja-JP").format(value)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "positive":
        return colors.positive
      case "warning":
        return colors.warning
      case "negative":
        return colors.negative
      default:
        return colors.neutral
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "positive":
        return <ArrowUpRight className="h-4 w-4" style={{ color: colors.positive }} />
      case "warning":
        return <AlertTriangle className="h-4 w-4" style={{ color: colors.warning }} />
      case "negative":
        return <ArrowDownRight className="h-4 w-4" style={{ color: colors.negative }} />
      default:
        return <Info className="h-4 w-4" style={{ color: colors.neutral }} />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "product":
        return <ShoppingBag className="h-4 w-4" />
      case "customer":
        return <Users className="h-4 w-4" />
      case "pricing":
        return <BarChart3 className="h-4 w-4" />
      case "inventory":
        return <Calendar className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダーエリア */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">✨ AI分析インサイト</h1>
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

            <Button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-4 w-4" />
              新規分析実行
            </Button>
          </div>
        </div>
      </div>

      {/* AIインサイトタブ */}
      <Tabs value={selectedInsightTab} onValueChange={setSelectedInsightTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="trends" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            トレンド分析
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            異常検知
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center">
            <Lightbulb className="h-4 w-4 mr-2" />
            推奨施策
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            パフォーマンス
          </TabsTrigger>
        </TabsList>

        {/* トレンド分析タブ */}
        <TabsContent value="trends" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 売上予測チャート */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">売上予測</CardTitle>
                <CardDescription>AIによる3ヶ月先までの売上予測</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesPredictionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), "売上"]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke={colors.tertiary}
                      fill="url(#colorPredicted)"
                      name="実績"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      stroke={colors.primary}
                      fillOpacity={0}
                      name="予測"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <Sparkles className="h-4 w-4 inline-block mr-1" />
                    <span className="font-semibold">AI予測: </span>
                    今後3ヶ月で売上は約11%増加する見込みです。特に商品Dの需要増加が主な要因と分析されます。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 商品トレンド分析 */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">商品トレンド分析</CardTitle>
                <CardDescription>注目商品カテゴリの需要予測</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${value}%`, "トレンド指数"]} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="trend"
                      stroke={colors.primary}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-1">上昇トレンド商品</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li className="flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-1 text-green-600" />
                        商品D: 前月比 +23%
                      </li>
                      <li className="flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-1 text-green-600" />
                        商品G: 前月比 +18%
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-1">下降トレンド商品</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li className="flex items-center">
                        <ArrowDownRight className="h-3 w-3 mr-1 text-red-600" />
                        商品B: 前月比 -12%
                      </li>
                      <li className="flex items-center">
                        <ArrowDownRight className="h-3 w-3 mr-1 text-red-600" />
                        商品F: 前月比 -8%
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 異常検知タブ */}
        <TabsContent value="anomalies" className="space-y-6 mt-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">異常検知アラート</CardTitle>
              <CardDescription>AIが検出した通常パターンからの逸脱</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anomalyDetectionData.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="p-4 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors"
                    style={{ borderLeftWidth: "4px", borderLeftColor: getSeverityColor(anomaly.severity) }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
                          style={{ backgroundColor: `${getSeverityColor(anomaly.severity)}15` }}
                        >
                          {getSeverityIcon(anomaly.severity)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 flex items-center">
                            {anomaly.title}
                            <Badge
                              className="ml-2"
                              style={{
                                backgroundColor: getSeverityColor(anomaly.severity),
                              }}
                            >
                              {anomaly.impact}
                            </Badge>
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{anomaly.date}</span>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" className="mr-2">
                        詳細
                      </Button>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        対応する
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t border-gray-100 px-6 py-4">
              <Button variant="outline" className="w-full">
                すべての異常検知を表示
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 推奨施策タブ */}
        <TabsContent value="recommendations" className="space-y-6 mt-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">AIによる推奨施策</CardTitle>
              <CardDescription>データに基づく最適な施策提案</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendationsData.map((recommendation) => (
                  <div
                    key={recommendation.id}
                    className="p-4 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center mr-3 bg-purple-100">
                          {getCategoryIcon(recommendation.category)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                          <div className="flex items-center mt-2">
                            <Badge variant="outline" className="mr-2 border-purple-200 text-purple-800">
                              信頼度: {recommendation.confidence}%
                            </Badge>
                            <Badge variant="outline" className="border-green-200 text-green-800">
                              予想効果: {recommendation.potentialImpact}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" className="mr-2">
                        詳細分析
                      </Button>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        実施する
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t border-gray-100 px-6 py-4">
              <Button variant="outline" className="w-full">
                すべての推奨施策を表示
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* パフォーマンスタブ */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* パフォーマンスレーダーチャート */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">パフォーマンスレーダー</CardTitle>
                <CardDescription>主要KPIの目標達成状況</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#6B7280", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} />
                      <Radar name="実績" dataKey="A" stroke={colors.primary} fill={colors.primary} fillOpacity={0.6} />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <Sparkles className="h-4 w-4 inline-block mr-1" />
                    <span className="font-semibold">AI分析: </span>
                    売上達成率が目標を20%上回っていますが、広告効果が目標を下回っています。広告戦略の見直しを検討してください。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* KPI達成状況 */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">KPI達成状況</CardTitle>
                <CardDescription>主要指標の目標と実績</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                        <span className="text-sm font-medium">売上達成率</span>
                      </div>
                      <span className="text-sm font-semibold">120%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: "120%" }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm font-medium">顧客増加率</span>
                      </div>
                      <span className="text-sm font-semibold">98%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: "98%" }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ShoppingBag className="h-4 w-4 mr-2 text-green-600" />
                        <span className="text-sm font-medium">リピート率</span>
                      </div>
                      <span className="text-sm font-semibold">86%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "86%" }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                        <span className="text-sm font-medium">広告効果</span>
                      </div>
                      <span className="text-sm font-semibold">65%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-amber-600 h-2.5 rounded-full" style={{ width: "65%" }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold text-gray-900">AI改善提案</h4>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-start">
                      <Lightbulb className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-purple-800 font-medium">広告効果の改善</p>
                        <p className="text-sm text-purple-800 mt-1">
                          現在のSNS広告の効果が低下しています。顧客セグメントに合わせたターゲティング広告への切り替えを検討してください。
                        </p>
                        <Button size="sm" className="mt-2 bg-purple-600 hover:bg-purple-700">
                          詳細を見る
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
