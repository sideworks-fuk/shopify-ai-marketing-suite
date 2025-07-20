"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"
import { 
  TrendingDown, 
  PieChart as PieChartIcon, 
  BarChart3,
  TrendingUp,
  Calendar
} from "lucide-react"
import { 
  dormantSegments, 
  dormantTrendData, 
  dormancyReasonData,
  type DormantSegment 
} from "@/data/mock/customerData"

interface DormantAnalysisChartProps {
  selectedSegment?: DormantSegment | null;
}

export function DormantAnalysisChart({ selectedSegment }: DormantAnalysisChartProps) {
  // 期間別分布データの準備
  const distributionData = dormantSegments.map(segment => ({
    period: segment.label,
    count: segment.count,
    urgency: segment.urgency,
    fill: segment.color,
    percentage: (segment.count / dormantSegments.reduce((sum, s) => sum + s.count, 0) * 100).toFixed(1)
  }))

  // トレンドデータの準備
  const trendData = dormantTrendData.map(item => ({
    ...item,
    netChangeColor: item.netChange >= 0 ? '#EF4444' : '#10B981'
  }))

  // カスタムトルーチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: pld.color }}
              />
              <span>{pld.dataKey}: {pld.value}</span>
              {pld.dataKey === 'count' && <span>名</span>}
              {pld.dataKey === 'percentage' && <span>%</span>}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const formatCurrency = (value: number) => `${value}名`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 期間別分布チャート */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-slate-600" />
            休眠期間別分布
            {selectedSegment && (
              <Badge variant="outline" className="ml-2">
                {selectedSegment.label}選択中
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* 分布サマリー */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600">早期対応</div>
              <div className="text-lg font-bold text-yellow-600">
                {dormantSegments.filter(s => s.urgency === 'medium').reduce((sum, s) => sum + s.count, 0)}名
              </div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600">緊急対応</div>
              <div className="text-lg font-bold text-red-600">
                {dormantSegments.filter(s => s.urgency === 'critical').reduce((sum, s) => sum + s.count, 0)}名
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 休眠化トレンド */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-slate-600" />
            休眠化トレンド
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trend">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trend">月次推移</TabsTrigger>
              <TabsTrigger value="net">純増減</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trend" className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="newDormant" 
                      stroke="#EF4444" 
                      name="新規休眠"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reactivated" 
                      stroke="#10B981" 
                      name="復帰"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalDormant" 
                      stroke="#6B7280" 
                      name="累計休眠"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="net" className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                                         <Bar 
                       dataKey="netChange" 
                       radius={[4, 4, 0, 0]}
                       fill="#6B7280"
                     />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* トレンドサマリー */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-sm text-red-600">平均新規休眠</div>
                  <div className="text-lg font-bold text-red-700">
                    {Math.round(trendData.reduce((sum, d) => sum + d.newDormant, 0) / trendData.length)}名/月
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600">平均復帰</div>
                  <div className="text-lg font-bold text-green-700">
                    {Math.round(trendData.reduce((sum, d) => sum + d.reactivated, 0) / trendData.length)}名/月
                  </div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-600">純増減</div>
                  <div className={`text-lg font-bold ${
                    trendData[trendData.length - 1].netChange >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {trendData[trendData.length - 1].netChange >= 0 ? '+' : ''}
                    {trendData[trendData.length - 1].netChange}名
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 休眠理由分析 */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChartIcon className="h-5 w-5 text-slate-600" />
            休眠理由分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={dormancyReasonData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {dormancyReasonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value}名 (${dormancyReasonData.find(d => d.count === value)?.percentage}%)`, '顧客数']}
                  labelFormatter={(label: string) => dormancyReasonData.find(d => d.count.toString() === label.toString())?.reason || label}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* 理由別リスト */}
          <div className="space-y-2">
            {dormancyReasonData.map((reason, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: reason.color }}
                  />
                  <span className="text-sm font-medium">{reason.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{reason.count}名</span>
                  <Badge variant="outline" className="text-xs">
                    {reason.percentage}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 復帰予測・効果分析 */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-green-600" />
            復帰予測・効果分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 復帰可能性スコア分布 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">復帰可能性分布</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm">高確率 (60%以上)</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">0名</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span className="text-sm">中確率 (30-60%)</span>
                  </div>
                  <div className="text-lg font-bold text-yellow-600">3名</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm">低確率 (30%未満)</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">1名</div>
                </div>
              </div>
            </div>

            {/* 推定効果 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">復帰施策の推定効果</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">¥143K</div>
                  <div className="text-sm text-slate-600">推定復帰売上</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">337%</div>
                  <div className="text-sm text-slate-600">平均ROI</div>
                </div>
              </div>
            </div>

            {/* 最適アクションタイミング */}
            <div>
              <h4 className="text-sm font-semibold mb-3">最適アクションタイミング</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>即時対応推奨:</span>
                  <span className="font-medium text-red-600">2名</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>1週間以内:</span>
                  <span className="font-medium text-yellow-600">1名</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>1ヶ月以内:</span>
                  <span className="font-medium text-green-600">1名</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 