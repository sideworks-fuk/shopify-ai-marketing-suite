"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StoreSelector } from '@/components/common/StoreSelector'
import { useStore } from '@/contexts/StoreContext'
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
  Zap,
  GitBranch,
  CalendarDays,
  Clock,
  Hash,
  Store,
  Key,
  Info,
  Shield
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

// バージョン情報
const VERSION_INFO = {
  version: "1.0.0",
  buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString(),
  buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER || "dev",
  gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || "local",
  gitBranch: process.env.NEXT_PUBLIC_GIT_BRANCH || "develop"
}

const bookmarkItems: BookmarkItem[] = [
  // 売上分析
  {
    title: "売上ダッシュボード",
    description: "売上・商品の統合分析ダッシュボード",
    href: "/sales/dashboard",
    icon: <BarChart3 className="h-5 w-5" />,
    status: 'planned',
    category: 'sales'
  },
  {
    title: "前年同月比【商品】",
    description: "商品別の前年同月比較分析",
    href: "/sales/year-over-year",
    icon: <TrendingUp className="h-5 w-5" />,
    status: 'in-progress',
    category: 'sales'
  },
  {
    title: "購入頻度【商品】",
    description: "商品の購入頻度分析",
    href: "/sales/purchase-frequency",
    icon: <ShoppingCart className="h-5 w-5" />,
    status: 'planned',
    category: 'sales'
  },
  {
    title: "組み合わせ商品【商品】",
    description: "商品の組み合わせ分析",
    href: "/sales/market-basket",
    icon: <Package className="h-5 w-5" />,
    status: 'planned',
    category: 'sales'
  },
  {
    title: "月別売上統計【購買】",
    description: "月別の売上統計分析",
    href: "/sales/monthly-stats",
    icon: <Calendar className="h-5 w-5" />,
    status: 'planned',
    category: 'sales'
  },

  // 購買分析
  {
    title: "購入回数【購買】",
    description: "顧客の購入回数分析",
    href: "/purchase/frequency-detail",
    icon: <ShoppingBag className="h-5 w-5" />,
    status: 'in-progress',
    category: 'purchase'
  },
  {
    title: "F階層傾向【購買】",
    description: "購買頻度階層の傾向分析",
    href: "/purchase/f-tier-trend",
    icon: <Target className="h-5 w-5" />,
    status: 'planned',
    category: 'purchase'
  },

  // 顧客分析
  {
    title: "顧客ダッシュボード",
    description: "顧客セグメント統合分析",
    href: "/customers/dashboard",
    icon: <Users className="h-5 w-5" />,
    status: 'planned',
    category: 'customer'
  },
  {
    title: "顧客購買【顧客】",
    description: "顧客の購買行動分析",
    href: "/customers/profile",
    icon: <UserCheck className="h-5 w-5" />,
    status: 'planned',
    category: 'customer'
  },
  {
    title: "休眠顧客【顧客】",
    description: "休眠顧客の分析と復帰施策（パフォーマンス改善済み）",
    href: "/customers/dormant",
    icon: <UserX className="h-5 w-5" />,
    status: 'in-progress',
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
    title: "JWT リフレッシュ テスト",
    description: "JWT認証リフレッシュトークンの検証",
    href: "/dev/auth-refresh-test",
    icon: <Key className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },
  {
    title: "バックエンド ヘルスチェック",
    description: "バックエンドサーバーの接続状態確認",
    href: "/dev/backend-health-check",
    icon: <Activity className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },
  {
    title: "HTTPS設定テスト",
    description: "HTTP/HTTPS接続設定の確認",
    href: "/dev/https-config-test",
    icon: <Shield className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },
  {
    title: "前年同月比API テスト",
    description: "前年同月比分析【商品】APIの動作確認",
    href: "/year-over-year-api-test",
    icon: <TrendingUp className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },
  {
    title: "購入回数APIテスト",
    description: "購入回数分析【購買】のAPI接続テスト",
    href: "/dev/purchase-frequency-api-test",
    icon: <ShoppingBag className="h-5 w-5" />,
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
  },
  {
    title: "JWT デコードテスト",
    description: "JWTトークンのデコード機能テスト",
    href: "/dev/jwt-test",
    icon: <Key className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  },

  // Shopify OAuth認証テスト
  {
    title: "Shopify OAuth認証テスト",
    description: "ハイブリッド方式のOAuth認証フローテスト",
    href: "/install",
    icon: <Store className="h-5 w-5" />,
    status: 'in-progress',
    category: 'dev'
  },
  {
    title: "認証成功ページ",
    description: "OAuth認証成功時の表示",
    href: "/auth/success",
    icon: <UserCheck className="h-5 w-5" />,
    status: 'in-progress',
    category: 'dev'
  },
  {
    title: "認証エラーページ",
    description: "OAuth認証エラー時の表示",
    href: "/auth/error",
    icon: <UserX className="h-5 w-5" />,
    status: 'in-progress',
    category: 'dev'
  },
  {
    title: "コールバックAPI",
    description: "OAuthコールバック受信API",
    href: "/api/shopify/callback",
    icon: <Zap className="h-5 w-5" />,
    status: 'in-progress',
    category: 'dev'
  },
  {
    title: "バックエンドAPI テスト",
    description: "Shopify OAuthバックエンドAPIの動作確認",
    href: "/dev/shopify-backend-test",
    icon: <Database className="h-5 w-5" />,
    status: 'planned',
    category: 'dev'
  },
  {
    title: "OAuth設定確認",
    description: "Shopify OAuth設定と環境変数の確認",
    href: "/dev/oauth-config-test",
    icon: <Settings className="h-5 w-5" />,
    status: 'planned',
    category: 'dev'
  },
  {
    title: "Shopify埋め込みモードテスト",
    description: "App Bridgeと埋め込みモードの動作確認",
    href: "/dev/shopify-embedded-test",
    icon: <Store className="h-5 w-5" />,
    status: 'implemented',
    category: 'dev'
  }
]

const getStatusBadge = (status: BookmarkItem['status']) => {
  switch (status) {
    case 'implemented':
      return <Badge variant="default" className="bg-green-100 text-green-800">✅ 実装済み</Badge>
    case 'in-progress':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">🟡 実装中</Badge>
    case 'planned':
      return <Badge variant="outline" className="bg-gray-100 text-gray-600">⚪ 実装予定</Badge>
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
  const { currentStore, availableStores } = useStore()
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    console.log('🔍 [DEBUG] DevBookmarksPage: Component mounted')
    console.log('🔍 [DEBUG] DevBookmarksPage: Current pathname:', window.location.pathname)
    
    // 環境情報を取得
    try {
      const envInfo = getEnvironmentInfo()
      console.log('🔍 [DEBUG] DevBookmarksPage: Environment info:', envInfo)
      setEnvironmentInfo(envInfo)
      
      // デバッグ情報を出力
      console.log('🔍 DevBookmarks Debug Info:')
      console.log('  - VERSION_INFO:', VERSION_INFO)
      console.log('  - environmentInfo:', envInfo)
      console.log('  - NODE_ENV:', process.env.NODE_ENV)
      console.log('  - NEXT_PUBLIC_BUILD_ENVIRONMENT:', process.env.NEXT_PUBLIC_BUILD_ENVIRONMENT)
      console.log('  - NEXT_PUBLIC_DEPLOY_ENVIRONMENT:', process.env.NEXT_PUBLIC_DEPLOY_ENVIRONMENT)
      console.log('  - NEXT_PUBLIC_APP_ENVIRONMENT:', process.env.NEXT_PUBLIC_APP_ENVIRONMENT)
      console.log('  - NEXT_PUBLIC_BUILD_NUMBER:', process.env.NEXT_PUBLIC_BUILD_NUMBER)
      console.log('  - NEXT_PUBLIC_GIT_COMMIT:', process.env.NEXT_PUBLIC_GIT_COMMIT)
      console.log('  - NEXT_PUBLIC_GIT_BRANCH:', process.env.NEXT_PUBLIC_GIT_BRANCH)
      console.log('  - NEXT_PUBLIC_BUILD_DATE:', process.env.NEXT_PUBLIC_BUILD_DATE)
    } catch (error) {
      console.error('環境情報の取得に失敗:', error)
    }

    // 現在時刻を1秒ごとに更新
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
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

      {/* ストア切り替えセクション */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Store className="h-5 w-5" />
            ストア切り替え
          </CardTitle>
          <CardDescription>
            開発・テスト用のストアを切り替えます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <StoreSelector />
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">現在のストア:</span> {currentStore?.name || '未選択'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">ストアID:</span> {currentStore?.id || '-'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">データタイプ:</span> {currentStore?.dataType || '-'}
              </p>
              {currentStore?.description && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">説明:</span> {currentStore.description}
                </p>
              )}
            </div>
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-800">
                ストアを切り替えると、ページがリロードされます。
                変更は全ての分析画面に反映されます。
              </AlertDescription>
            </Alert>
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <h4 className="text-sm font-medium mb-2">利用可能なストア</h4>
              <div className="space-y-1">
                {availableStores.map(store => (
                  <div key={store.id} className="text-sm text-gray-600">
                    • {store.name} (ID: {store.id}, {store.dataType})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* バージョン情報 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Hash className="h-5 w-5" />
            バージョン情報
          </CardTitle>
          <CardDescription>
            デプロイテスト用 - この情報でデプロイの成功を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                v{VERSION_INFO.version}
              </Badge>
              <span className="text-sm font-medium">バージョン</span>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{VERSION_INFO.gitBranch}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-500" />
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {VERSION_INFO.gitCommit.substring(0, 8)}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {new Date(VERSION_INFO.buildDate).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">現在時刻:</span>
                <span className="text-sm font-mono">
                  {currentTime.toLocaleString('ja-JP')}
                </span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ビルド #{VERSION_INFO.buildNumber}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

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

        {/* Shopify OAuth認証テスト */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Store className="h-5 w-5 text-orange-600" />
            Shopify OAuth認証テスト
          </h2>
          
          {/* テスト情報カード */}
          <Card className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Info className="h-5 w-5" />
                テスト情報
              </CardTitle>
              <CardDescription>
                ハイブリッド方式のOAuth認証フローテスト用情報
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-900">テスト用データ</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">テストストア:</span> fuk-dev1.myshopify.com</div>
                    <div><span className="font-medium">開発環境:</span> http://localhost:3000</div>
                    <div><span className="font-medium">バックエンド:</span> http://localhost:5000</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-900">テストフロー</h4>
                  <div className="text-sm space-y-1">
                    <div>1. インストールページでOAuth開始</div>
                    <div>2. Shopify認証ページで認証</div>
                    <div>3. フロントエンドコールバック受信</div>
                    <div>4. バックエンド処理委譲</div>
                    <div>5. 成功/エラーページ表示</div>
                  </div>
                </div>
              </div>
              <Alert className="mt-4 border-orange-200 bg-orange-50">
                <Info className="h-4 w-4 text-orange-700" />
                <AlertDescription className="text-orange-800">
                  <strong>注意:</strong> テスト時はngrokを使用してHTTPS環境を構築してください。
                  本番環境ではAzure Static Web AppsのHTTPSを使用します。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkItems
              .filter(item => item.category === 'dev' && 
                !item.title.includes('OAuth') && 
                !item.title.includes('認証') && 
                !item.title.includes('コールバック') &&
                !item.title.includes('バックエンドAPI'))
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
              環境情報 ver{VERSION_INFO.version}.{VERSION_INFO.buildNumber}　※2507262037
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
              <div className="text-sm text-gray-600">実装中</div>
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