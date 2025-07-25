"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import { BarChart3, Download } from "lucide-react"

// 最小限のサンプルデータ（3商品のみ）
const minimalSampleData = [
  {
    productId: "1",
    productName: "【サンプル】カラートレースリム 150 ホワイト",
    category: "食品包装容器",
    sales2024: 450000,
    sales2025: 523000,
    growth: 16.2
  },
  {
    productId: "2", 
    productName: "【サンプル】クリスマスデコ箱4号H130",
    category: "ギフトボックス",
    sales2024: 280000,
    sales2025: 350000,
    growth: 25.0
  },
  {
    productId: "3",
    productName: "【サンプル】エコクラフトロールケーキ箱",
    category: "エコ包装材", 
    sales2024: 180000,
    sales2025: 162000,
    growth: -10.0
  }
]

const YearOverYearProductAnalysisMinimal = () => {
  const [viewMode, setViewMode] = useState("sales")
  const [testLevel, setTestLevel] = useState<"basic" | "withTable" | "withChart">("basic")

  return (
    <div className="space-y-6">
      {/* テストレベル選択 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">🧪 段階的テスト</CardTitle>
          <CardDescription className="text-blue-700">
            どの段階でサイドメニューが消えるかを特定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant={testLevel === "basic" ? "default" : "outline"}
              onClick={() => setTestLevel("basic")}
            >
              基本表示のみ
            </Button>
            <Button 
              variant={testLevel === "withTable" ? "default" : "outline"}
              onClick={() => setTestLevel("withTable")}
            >
              + テーブル表示
            </Button>
            <Button 
              variant={testLevel === "withChart" ? "default" : "outline"}
              onClick={() => setTestLevel("withChart")}
              disabled
            >
              + チャート表示（無効）
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            前年同月比【商品】分析（最小版）
          </CardTitle>
          <CardDescription>最小限のデータと機能でテスト</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">売上金額</SelectItem>
                <SelectItem value="quantity">販売数量</SelectItem>
                <SelectItem value="orders">注文件数</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              エクスポート
            </Button>

            <div className="text-sm text-gray-600 flex items-center">
              現在のテストレベル: <strong className="ml-1">{testLevel}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">¥910,000</div>
            <div className="text-sm text-gray-600 mt-1">2024年合計</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">¥1,035,000</div>
            <div className="text-sm text-gray-600 mt-1">2025年合計</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">+13.7%</div>
            <div className="text-sm text-gray-600 mt-1">全体成長率</div>
          </CardContent>
        </Card>
      </div>

      {/* 基本表示 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">📈 成長商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {minimalSampleData
                .filter(p => p.growth > 0)
                .map((product, index) => (
                  <div key={product.productId} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{product.productName}</div>
                      <div className="text-xs text-gray-500">{product.category}</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      +{product.growth}%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">📉 要注意商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {minimalSampleData
                .filter(p => p.growth < 0)
                .map((product, index) => (
                  <div key={product.productId} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{product.productName}</div>
                      <div className="text-xs text-gray-500">{product.category}</div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {product.growth}%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* テーブル表示（レベル2） */}
      {testLevel === "withTable" && (
        <Card>
          <CardHeader>
            <CardTitle>🗂️ 商品別データテーブル</CardTitle>
            <CardDescription>シンプルなテーブル表示テスト</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">商品名</th>
                    <th className="text-center py-3 px-4">カテゴリ</th>
                    <th className="text-center py-3 px-4">2024年売上</th>
                    <th className="text-center py-3 px-4">2025年売上</th>
                    <th className="text-center py-3 px-4">成長率</th>
                  </tr>
                </thead>
                <tbody>
                  {minimalSampleData.map((product) => (
                    <tr key={product.productId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {product.productName}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {product.category}
                      </td>
                      <td className="py-3 px-4 text-center">
                        ¥{product.sales2024.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        ¥{product.sales2025.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          className={product.growth >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {product.growth >= 0 ? "+" : ""}{product.growth}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ステータス表示 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">
              サイドメニューが表示されている場合、このレベルは問題ありません。
            </span>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">テスト手順：</h4>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. 「基本表示のみ」でサイドメニューが表示されるかチェック</li>
              <li>2. 「+ テーブル表示」でサイドメニューが消えないかチェック</li>
              <li>3. 問題がない場合、元のコンポーネントの特定部分が原因</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisMinimal 