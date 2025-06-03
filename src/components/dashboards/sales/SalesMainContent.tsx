import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowUpRight } from "lucide-react";

interface SalesMainContentProps {
  selectedPeriod: string;
}

// サンプルデータ
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
];

const productRankingData = [
  { name: "商品A", sales: 450000, orders: 156, growth: 23.5 },
  { name: "商品B", sales: 380000, orders: 134, growth: 18.2 },
  { name: "商品C", sales: 320000, orders: 98, growth: 15.7 },
  { name: "商品D", sales: 280000, orders: 87, growth: 12.3 },
  { name: "商品E", sales: 250000, orders: 76, growth: 8.9 },
];

export const SalesMainContent: React.FC<SalesMainContentProps> = ({
  selectedPeriod,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">概要</TabsTrigger>
        <TabsTrigger value="trends">トレンド</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* 時系列グラフ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              月別売上推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
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
          </CardContent>
        </Card>

        {/* 商品ランキング（簡略版） */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>売上上位商品（TOP 5）</CardTitle>
              <Badge variant="outline">詳細は商品分析へ →</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productRankingData.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-slate-600">{product.orders}件の注文</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(product.sales)}</p>
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <ArrowUpRight className="w-3 h-3" />
                      +{product.growth}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trends" className="space-y-6">
        {/* 成長率分析 */}
        <Card>
          <CardHeader>
            <CardTitle>成長率分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-2xl font-bold text-green-600">+12.4%</h3>
                <p className="text-sm text-green-700">売上成長率</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-2xl font-bold text-blue-600">+6.7%</h3>
                <p className="text-sm text-blue-700">注文数増加率</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <h3 className="text-2xl font-bold text-amber-600">+5.3%</h3>
                <p className="text-sm text-amber-700">平均注文額増加</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 予測とインサイト */}
        <Card>
          <CardHeader>
            <CardTitle>今後の予測・インサイト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <h4 className="font-semibold text-blue-800">売上トレンド</h4>
                <p className="text-sm text-blue-700 mt-1">
                  現在の成長ペースを維持すれば、来月は前年同月比+15%の成長が見込まれます
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                <h4 className="font-semibold text-green-800">商品戦略</h4>
                <p className="text-sm text-green-700 mt-1">
                  上位3商品が全体売上の45%を占めており、これらの在庫確保が重要です
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}; 