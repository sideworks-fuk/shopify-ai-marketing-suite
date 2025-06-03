"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function FTierTrendPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 F階層傾向【購買】</h1>
        <p className="text-gray-600 mt-2">購入頻度による顧客階層の時系列変化を分析し、顧客ロイヤリティの推移把握とリテンション施策の効果測定ができます</p>
      </div>
      
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚧 F階層傾向分析
            <Badge variant="outline">CustomerDashboardから抽出予定</Badge>
          </CardTitle>
          <CardDescription>
            CustomerDashboard.tsxのF階層ヒートマップ機能を独立・拡張予定です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold">実装予定機能:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 月別F階層推移ヒートマップ（既存機能）</li>
              <li>• F階層推移をラインチャートで表示</li>
              <li>• F階層間の顧客移動分析（F1→F2等）</li>
              <li>• 階層別のサマリー統計（人数・金額）</li>
              <li>• 階層ダウングレード時のアラート表示</li>
              <li>• 期間選択（年度/四半期/カスタム）</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 