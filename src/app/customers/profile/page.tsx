"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function CustomerProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">👤 顧客購買【顧客】</h1>
        <p className="text-gray-600 mt-2">顧客別の詳細な購買プロファイルを分析し、VIP顧客の特定とパーソナライゼーション施策に活用できます</p>
      </div>
      
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚧 顧客購買プロファイル分析
            <Badge variant="outline">CustomerDashboardから拡充予定</Badge>
          </CardTitle>
          <CardDescription>
            CustomerDashboard.tsxの顧客リスト機能を独立・拡張予定です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold">実装予定機能:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 顧客一覧画面（既存のテーブルを流用）</li>
              <li>• 顧客詳細画面への遷移</li>
              <li>• 基本情報（名前、メール、登録日）</li>
              <li>• 購買サマリー（総額、回数、平均単価）</li>
              <li>• 最頻購入商品Top10</li>
              <li>• 購入履歴タイムライン</li>
              <li>• RFMスコア表示</li>
              <li>• ネクストベストアクション提案</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 