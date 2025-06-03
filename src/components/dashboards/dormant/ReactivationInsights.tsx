"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Lightbulb, 
  Target,
  Gift,
  Mail,
  TrendingUp,
  Clock,
  Users,
  MessageCircle,
  Star,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowUp
} from "lucide-react"
import { reactivationCampaigns, reactivationInsights, type DormantCustomer } from "@/data/mock/customerData"

interface ReactivationInsightsProps {
  selectedCustomers?: DormantCustomer[];
}

export function ReactivationInsights({ selectedCustomers = [] }: ReactivationInsightsProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  // 復帰可能性スコアに基づく推奨アクション
  const getRecommendedActions = (customers: DormantCustomer[]) => {
    if (customers.length === 0) return reactivationInsights.recommendations

    const highProbability = customers.filter(c => c.reactivationProbability >= 60)
    const mediumProbability = customers.filter(c => c.reactivationProbability >= 30 && c.reactivationProbability < 60)
    const lowProbability = customers.filter(c => c.reactivationProbability < 30)

    return [
      {
        priority: 'high' as const,
        action: 'パーソナライズドオファー',
        description: `高確率復帰見込み（${highProbability.length}名）に対する限定クーポン＋お気に入り商品レコメンド`,
        estimatedCost: 2500 * highProbability.length,
        estimatedRevenue: 8700 * highProbability.length,
        targetCount: highProbability.length,
        timeline: '即時実行'
      },
      {
        priority: 'medium' as const,
        action: '段階的リエンゲージメント',
        description: `中確率見込み（${mediumProbability.length}名）に対する3段階メールシーケンス`,
        estimatedCost: 800 * mediumProbability.length,
        estimatedRevenue: 4200 * mediumProbability.length,
        targetCount: mediumProbability.length,
        timeline: '2週間'
      },
      {
        priority: 'low' as const,
        action: 'ブランド再認知キャンペーン',
        description: `低確率見込み（${lowProbability.length}名）に対する価値提供コンテンツ配信`,
        estimatedCost: 300 * lowProbability.length,
        estimatedRevenue: 1800 * lowProbability.length,
        targetCount: lowProbability.length,
        timeline: '1ヶ月'
      }
    ]
  }

  const recommendedActions = getRecommendedActions(selectedCustomers)
  const totalEstimatedCost = recommendedActions.reduce((sum, action) => sum + action.estimatedCost, 0)
  const totalEstimatedRevenue = recommendedActions.reduce((sum, action) => sum + action.estimatedRevenue, 0)
  const estimatedROI = totalEstimatedCost > 0 ? ((totalEstimatedRevenue - totalEstimatedCost) / totalEstimatedCost * 100) : 0

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'low': return <Users className="h-4 w-4 text-blue-500" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge className="bg-red-100 text-red-800 border-red-200">最優先</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">中優先</Badge>
      case 'low': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">低優先</Badge>
      default: return <Badge variant="outline">通常</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* インサイトサマリー */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            復帰戦略インサイト
            {selectedCustomers.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {selectedCustomers.length}名選択中
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">¥{(totalEstimatedRevenue / 1000).toFixed(0)}K</div>
              <div className="text-sm text-slate-600">推定復帰売上</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{estimatedROI.toFixed(0)}%</div>
              <div className="text-sm text-slate-600">推定ROI</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{reactivationInsights.successRate}%</div>
              <div className="text-sm text-slate-600">平均復帰率</div>
            </div>
          </div>

          {/* 重要インサイト */}
          <div className="mt-6 space-y-3">
            {reactivationInsights.keyInsights.map((insight, index) => (
              <Alert key={index} className="border-blue-200 bg-blue-50">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {insight}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 推奨アクション */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-green-600" />
            推奨復帰アクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendedActions.map((action, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getPriorityIcon(action.priority)}
                    <div>
                      <h4 className="font-semibold text-lg">{action.action}</h4>
                      <p className="text-sm text-slate-600 mt-1">{action.description}</p>
                    </div>
                  </div>
                  {getPriorityBadge(action.priority)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-sm text-slate-600">対象</div>
                    <div className="font-bold text-slate-800">{action.targetCount}名</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-sm text-slate-600">推定コスト</div>
                    <div className="font-bold text-red-600">¥{(action.estimatedCost / 1000).toFixed(1)}K</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-sm text-slate-600">推定売上</div>
                    <div className="font-bold text-green-600">¥{(action.estimatedRevenue / 1000).toFixed(1)}K</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-sm text-slate-600">実行時期</div>
                    <div className="font-bold text-blue-600">{action.timeline}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    キャンペーン作成
                  </Button>
                  <Button size="sm" variant="outline">
                    詳細設定
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* キャンペーンテンプレート */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-purple-600" />
            キャンペーンテンプレート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">メール</TabsTrigger>
              <TabsTrigger value="coupon">クーポン</TabsTrigger>
              <TabsTrigger value="content">コンテンツ</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reactivationCampaigns.emailTemplates.map((template, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant="outline">{template.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>開封率:</span>
                        <span className="font-medium">{template.openRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>クリック率:</span>
                        <span className="font-medium">{template.clickRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>コンバージョン:</span>
                        <span className="font-medium">{template.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>復帰率:</span>
                        <span className="font-medium text-green-600">{template.reactivationRate}%</span>
                      </div>
                    </div>

                    <Button size="sm" className="w-full mt-3" variant="outline">
                      テンプレートを使用
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="coupon" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reactivationCampaigns.couponOffers.map((offer, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{offer.name}</h4>
                      <Badge className="bg-green-100 text-green-800">{offer.discount}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{offer.description}</p>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>利用期限:</span>
                        <span className="font-medium">{offer.validPeriod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>最低注文額:</span>
                        <span className="font-medium">¥{offer.minimumOrder.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>対象商品:</span>
                        <span className="font-medium">{offer.applicableProducts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>予想利用率:</span>
                        <span className="font-medium text-blue-600">{offer.expectedUsageRate}%</span>
                      </div>
                    </div>

                    <Button size="sm" className="w-full mt-3" variant="outline">
                      クーポン発行
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reactivationCampaigns.contentStrategies.map((strategy, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{strategy.name}</h4>
                      <Badge variant="outline">{strategy.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{strategy.description}</p>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>配信頻度:</span>
                        <span className="font-medium">{strategy.frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>配信期間:</span>
                        <span className="font-medium">{strategy.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>予想エンゲージメント:</span>
                        <span className="font-medium text-purple-600">{strategy.expectedEngagement}%</span>
                      </div>
                    </div>

                    <Button size="sm" className="w-full mt-3" variant="outline">
                      戦略を適用
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 成功事例 */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-yellow-500" />
            復帰成功事例
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reactivationInsights.successStories.map((story, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-800 mb-2">{story.campaign}</h4>
                    <p className="text-sm text-slate-700 mb-3">{story.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-lg font-bold text-green-600">
                          <ArrowUp className="h-4 w-4 inline mr-1" />
                          {story.results.reactivationRate}%
                        </div>
                        <div className="text-xs text-slate-600">復帰率</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-lg font-bold text-blue-600">¥{(story.results.revenue / 1000).toFixed(0)}K</div>
                        <div className="text-xs text-slate-600">復帰売上</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-lg font-bold text-purple-600">{story.results.roi}%</div>
                        <div className="text-xs text-slate-600">ROI</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 