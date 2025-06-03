"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function MarketBasketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🛒 組み合わせ商品【商品】</h1>
        <p className="text-gray-600 mt-2">一緒に購入される商品の組み合わせを分析し、クロスセル機会の発見とセット販売企画に活用できます</p>
      </div>
      
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚧 マーケットバスケット分析
            <Badge variant="outline">実装予定</Badge>
          </CardTitle>
          <CardDescription>
            商品の組み合わせ購入パターンを分析する機能を実装予定です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold">実装予定機能:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Support（支持度）: 組み合わせの出現頻度</li>
              <li>• Confidence（確信度）: A購入時にBも購入する確率</li>
              <li>• Lift（リフト値）: 相関の強さ</li>
              <li>• 商品別組み合わせランキングTop5</li>
              <li>• 売上構成比と貢献度分析</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 