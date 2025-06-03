"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DormantCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">😴 休眠顧客【顧客】</h1>
        <p className="text-gray-600 mt-2">最終購入からの経過期間別に顧客を分類・管理し、解約リスクの早期発見と復帰施策の最適タイミング把握ができます</p>
      </div>
      
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚧 休眠顧客管理
            <Badge variant="outline">CustomerDashboardから拡充予定</Badge>
          </CardTitle>
          <CardDescription>
            CustomerDashboard.tsxのステータス表示機能を独立・拡張予定です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold">実装予定機能:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 休眠期間別の顧客分類（3ヶ月、6ヶ月、12ヶ月、24ヶ月）</li>
              <li>• 各期間の顧客数・リスト表示</li>
              <li>• 最終購買商品Top10の表示</li>
              <li>• 休眠前の購買頻度による優先度判定</li>
              <li>• 復帰施策の提案（期間別）</li>
              <li>• 休眠リスクスコアの算出</li>
              <li>• CSVエクスポート機能</li>
              <li>• 復帰メール配信機能</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 