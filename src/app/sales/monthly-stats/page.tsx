"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function MonthlyStatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📅 月別売上統計【購買】</h1>
        <p className="text-gray-600 mt-2">商品別×月別の売上推移を数量・金額で把握し、季節トレンドと在庫・仕入計画の最適化に活用できます</p>
      </div>
      
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚧 月別売上統計分析
            <Badge variant="outline">実装予定</Badge>
          </CardTitle>
          <CardDescription>
            商品別の月次売上推移と季節性分析機能を実装予定です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold">実装予定機能:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 商品別×月別売上マトリックス表示</li>
              <li>• 数量・金額・件数の切り替え表示</li>
              <li>• 季節性トレンド分析</li>
              <li>• 前年同月比較機能</li>
              <li>• 在庫回転率と発注推奨アラート</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 