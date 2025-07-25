"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Brain,
  Settings,
  Database,
  TestTube,
  Activity,
  Target,
  Calendar,
  Package,
  ShoppingBag,
  UserCheck,
  UserX,
  Zap
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getEnvironmentInfo } from "@/lib/api-config"

interface BookmarkItem {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  status: 'implemented' | 'in-progress' | 'planned'
  category: 'sales' | 'purchase' | 'customer' | 'ai' | 'dev'
}

const bookmarkItems: BookmarkItem[] = [
  // 売上分析
  {
    title: "売上ダッシュボード",
    description: "売上・商品の統合分析ダッシュボード",
    href: "/sales/dashboard",
    icon: <BarChart3 className="h-5 w-5" />,
    status: 'implemented',
    category: 'sales'
  },
  {
    title: "前年同月比【商品】",
    description: "商品別の前年同月比較分析",
    href: "/sales/year-over-year",
    icon: <TrendingUp className="h-5 w-5" />,
    status: 'implemented',
    category: 'sales'
  },
  {
    title: "購入頻度【商品】",
    description: "商品の購入頻度分析",
    href: "/purchase/frequency-detail",
    icon: <ShoppingCart className="h-5 w-5" />,
    status: 'implemented',
    category: 'sales'
  },
  {
    title: "組み合わせ商品【商品】",
    description: "商品の組み合わせ分析",
    href: "/sales/market-basket",
    icon: <Package className="h-5 w-5" />,
    status: 'implemented',
    category: 'sales'
  },
  {
    title: "月別売上統計【購買】",
    description: "月別の売上統計分析",
    href: "/sales/monthly-stats",
    icon: <Calendar className="h-5 w-5" />,
    status: 'implemented',
    category: 'sales'
  },

  // 購買分析
  {
    title: "購入回数【購買】",
    description: "顧客の購入回数分析",
    href: "/purchase/purchase-frequency",
    icon: <ShoppingBag className="h-5 w-5" />,
    status: 'implemented',
    category: 'purchase'
  },
  {
    title: "F階層傾向【購買】",
    description: "購買頻度階層の傾向分析",
    href: "/purchase/f-tier-trend",
    icon: <Target className="h-5 w-5" />,
    status: 'implemented',
    category: 'purchase'
  },

  // 顧客分析
  {
    title: "顧客ダッシュボード",
    description: "顧客セグメント統合分析",
    href: "/customers/dashboard",
    icon: <Users className="h-5 w-5" />,
    status: 'implemented',
    category: 'customer'
  },
  {
    title: "顧客購買【顧客】",
    description: "顧客の購買行動分析",
    href: "/customers/profile",
    icon: <UserCheck className="h-5 w-5" />,
    status: 'implemented',
    category: 'customer'
  },
  {
    title: "休眠顧客【顧客】",
    description: "休眠顧客の分析と復帰施策（パフォーマンス改善済み）",
    href: "/customers/dormant",
    icon: <UserX className="h-5 w-5" />,
    status: 'implemented',
    category: 'customer'
  },

  // AI分析
  {
    title: "AIインサイト",
    description: "AI予測・提案システム",
    href: "/ai-insights",
    icon: <Brain className="h-5 w-5" />,
    status: 'planned',
    category: 'ai'
  },

  // 開発・テスト用
  {
    title: "API テスト",
    description: "API接続テスト画面",
    href: "/api-test",
    icon: <TestTube className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },
  {
    title: "休眠顧客API テスト",
    description: "休眠顧客APIの動作確認",
    href: "/dormant-api-test",
    icon: <Activity className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },
  {
    title: "データベース テスト",
    description: "データベース接続テスト",
    href: "/database-test",
    icon: <Database className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },
  {
    title: "環境情報確認",
    description: "API環境設定と接続状態の確認",
    href: "/dev-bookmarks",
    icon: <Settings className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  }
]

const getStatusBadge = (status: BookmarkItem['status']) => {
  switch (status) {
    case 'implemented':
      return <Badge variant="default" className="bg-green-100 text-green-800">実装済み</Badge>
    case 'in-progress':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">開発中</Badge>
    case 'planned':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">実装予定</Badge>
  }
}

const getCategoryColor = (category: BookmarkItem['category']) => {
  switch (category) {
    case 'sales':
      return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
    case 'purchase':
      return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
    case 'customer':
      return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
    case 'ai':
      return 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200'
    case 'dev':
      return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
  }
}

export default function DevBookmarksPage() {
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null)
  
  useEffect(() => {
    // 環境情報を取得
    try {
      const envInfo = getEnvironmentInfo()
      setEnvironmentInfo(envInfo)
    } catch (error) {
      console.error('環境情報の取得に失敗:', error)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔖 開発用ブックマーク
        </h1>
        <p className="text-gray-600">
          各機能への直接アクセス用ページ
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Badge variant="outline">開発効率向上</Badge>
          <Badge variant="outline">クイックアクセス</Badge>
          <Badge variant="outline">機能確認</Badge>
        </div>
      </div>

      {/* カテゴリ別ブックマーク */}
      <div className="space-y-8">
        {/* 売上分析 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            売上分析
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkItems
              .filter(item => item.category === 'sales')
              .map((item, index) => (
                <Card key={index} className={getCategoryColor(item.category)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={item.href}>
                      <Button variant="outline" size="sm" className="w-full">
                        アクセス
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* 購買分析 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            購買分析
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkItems
              .filter(item => item.category === 'purchase')
              .map((item, index) => (
                <Card key={index} className={getCategoryColor(item.category)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={item.href}>
                      <Button variant="outline" size="sm" className="w-full">
                        アクセス
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* 顧客分析 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            顧客分析
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkItems
              .filter(item => item.category === 'customer')
              .map((item, index) => (
                <Card key={index} className={getCategoryColor(item.category)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={item.href}>
                      <Button variant="outline" size="sm" className="w-full">
                        アクセス
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* AI分析 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-600" />
            AI分析
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkItems
              .filter(item => item.category === 'ai')
              .map((item, index) => (
                <Card key={index} className={getCategoryColor(item.category)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={item.href}>
                      <Button variant="outline" size="sm" className="w-full">
                        アクセス
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* 開発・テスト用 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            開発・テスト用
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkItems
              .filter(item => item.category === 'dev')
              .map((item, index) => (
                <Card key={index} className={getCategoryColor(item.category)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={item.href}>
                      <Button variant="outline" size="sm" className="w-full">
                        アクセス
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>

      {/* 環境情報 */}
      {environmentInfo && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              環境情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">現在の環境:</span>
                  <Badge variant={environmentInfo.isProduction ? "destructive" : "secondary"}>
                    {environmentInfo.environmentName}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">API ベースURL:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {environmentInfo.apiBaseUrl}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">ビルド環境:</span>
                  <span className="text-sm">{environmentInfo.buildTimeInfo?.buildEnvironment || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">本番環境:</span>
                  <Badge variant={environmentInfo.isProduction ? "destructive" : "default"}>
                    {environmentInfo.isProduction ? 'はい' : 'いいえ'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">デプロイ環境:</span>
                  <span className="text-sm">{environmentInfo.buildTimeInfo?.deployEnvironment || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">説明:</span>
                  <span className="text-sm">{environmentInfo.description}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計情報 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            機能統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {bookmarkItems.filter(item => item.status === 'implemented').length}
              </div>
              <div className="text-sm text-gray-600">実装済み</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {bookmarkItems.filter(item => item.status === 'in-progress').length}
              </div>
              <div className="text-sm text-gray-600">開発中</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {bookmarkItems.filter(item => item.status === 'planned').length}
              </div>
              <div className="text-sm text-gray-600">実装予定</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {bookmarkItems.length}
              </div>
              <div className="text-sm text-gray-600">総機能数</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 