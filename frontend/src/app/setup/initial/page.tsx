'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Database, 
  RefreshCw,
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  Activity,
  PlayCircle,
  PauseCircle,
  Info,
  Settings,
  Building2,
  Zap,
  ArrowRight
} from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

type SyncPeriod = '3months' | '6months' | '1year' | 'all'

interface SyncHistory {
  id: string
  startTime: string
  endTime?: string
  status: 'running' | 'completed' | 'failed'
  recordsProcessed: number
  syncType: 'initial' | 'manual' | 'scheduled'
  duration?: number
}

interface SyncStats {
  totalCustomers: number
  totalOrders: number
  totalProducts: number
  lastSyncTime?: string
  nextScheduledSync?: string
}

export default function InitialSetupPage() {
  const router = useRouter()
  const [syncPeriod, setSyncPeriod] = useState<SyncPeriod>('3months')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([])
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [activeTab, setActiveTab] = useState('setup')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
  // デモモード判定
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const demoToken = localStorage.getItem('demoToken')
      setIsDemoMode(!!demoToken)
    }
  }, [])

  // ダミーデータで履歴を表示
  useEffect(() => {
    // ダミーの同期履歴
    setSyncHistory([
      {
        id: '1',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        recordsProcessed: 15234,
        syncType: 'scheduled',
        duration: 3600
      },
      {
        id: '2',
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        recordsProcessed: 14892,
        syncType: 'manual',
        duration: 3200
      },
      {
        id: '3',
        startTime: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 71 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        recordsProcessed: 14567,
        syncType: 'initial',
        duration: 4500
      }
    ])

    // ダミーの統計情報
    setSyncStats({
      totalCustomers: 5234,
      totalOrders: 15892,
      totalProducts: 342,
      lastSyncTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      nextScheduledSync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }, [])

  const handleStartSync = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/api/sync/initial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncPeriod }),
      })

      if (!response.ok) {
        throw new Error('同期の開始に失敗しました')
      }

      const data = await response.json()
      
      // 同期画面へ遷移（syncIdをクエリパラメータとして渡す）
      router.push(`/setup/syncing?syncId=${data.syncId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    setShowSkipWarning(true)
  }

  const confirmSkip = async () => {
    try {
      // 初期設定を完了としてマーク
      await fetch(`${getApiUrl()}/api/setup/complete`, {
        method: 'POST',
      })
      
      router.push('/dashboard')
    } catch (err) {
      setError('スキップ処理に失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Building2 className="h-10 w-10 text-blue-600" />
            <span>EC Ranger データ同期ダッシュボード</span>
          </h1>
          <p className="text-gray-600">
            Shopifyストアのデータを同期・管理し、AI分析を実行します
          </p>
        </div>

        {/* 統計カード */}
        {syncStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">顧客データ</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {syncStats.totalCustomers.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-green-600 font-medium">注文データ</p>
                    <p className="text-2xl font-bold text-green-900">
                      {syncStats.totalOrders.toLocaleString()}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">商品データ</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {syncStats.totalProducts.toLocaleString()}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">最終同期</p>
                    <p className="text-xl font-bold text-orange-900">
                      {syncStats.lastSyncTime ? new Date(syncStats.lastSyncTime).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(/\//g, '/') : '未同期'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* メインコンテンツ */}
        <Card className="shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="setup" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  初期設定
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  同期履歴
                </TabsTrigger>
                <TabsTrigger value="trigger" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  手動同期
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="setup" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  初期データ同期
                </h2>
                <p className="text-gray-600">
                  分析を開始するために、過去のデータを取得します。初回同期はデータ量に応じて時間がかかる場合があります。
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isDemoMode && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>デモモード</strong><br />
                    デモモードではデータ同期を実行できません。実際のデータ同期を行うには、Shopifyアプリとしてインストールしてください。
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <Label className="text-base">データ取得期間を選択してください：</Label>
                <RadioGroup value={syncPeriod} onValueChange={(value) => setSyncPeriod(value as SyncPeriod)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="3months" id="3months" />
                    <Label htmlFor="3months" className="cursor-pointer flex-1">
                      過去3ヶ月（推奨）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="6months" id="6months" />
                    <Label htmlFor="6months" className="cursor-pointer flex-1">
                      過去6ヶ月
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="1year" id="1year" />
                    <Label htmlFor="1year" className="cursor-pointer flex-1">
                      過去1年
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer flex-1">
                      全期間
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleStartSync} 
                  disabled={isLoading || isDemoMode}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      同期を開始中...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      同期を開始
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSkip}
                  disabled={isLoading}
                  size="lg"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  スキップ
                </Button>
              </div>

              {showSkipWarning && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="mb-3">
                      データ同期をスキップすると、分析機能が制限される可能性があります。
                      後から設定メニューで同期を実行できます。
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowSkipWarning(false)}>
                        キャンセル
                      </Button>
                      <Button size="sm" onClick={confirmSkip}>
                        スキップを確定
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* 同期履歴タブ */}
            <TabsContent value="history" className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  同期履歴
                </h2>
                <div className="space-y-3">
                  {syncHistory.map((history) => (
                    <Card key={history.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {history.status === 'completed' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : history.status === 'running' ? (
                              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {history.syncType === 'initial' ? '初期同期' :
                                   history.syncType === 'manual' ? '手動同期' : 'スケジュール同期'}
                                </span>
                                <Badge variant={history.status === 'completed' ? 'default' : 
                                              history.status === 'running' ? 'secondary' : 'destructive'}>
                                  {history.status === 'completed' ? '完了' :
                                   history.status === 'running' ? '実行中' : '失敗'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {new Date(history.startTime).toLocaleString('ja-JP')}
                                {history.duration && ` （所要時間: ${Math.floor(history.duration / 60)}分）`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{history.recordsProcessed.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">レコード</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 手動同期タブ */}
            <TabsContent value="trigger" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-green-600" />
                  手動データ同期
                </h2>
                <p className="text-gray-600 mb-4">
                  最新のデータを取得したい場合は、手動で同期を実行できます。
                </p>
              </div>

              {isDemoMode && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>デモモード</strong><br />
                    デモモードではデータ同期を実行できません。実際のデータ同期を行うには、Shopifyアプリとしてインストールしてください。
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>自動同期スケジュール</strong><br />
                  データは毎日午前2時に自動的に同期されます。
                  {syncStats?.nextScheduledSync && (
                    <span className="block mt-1">
                      次回スケジュール: {new Date(syncStats.nextScheduledSync).toLocaleString('ja-JP')}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Database className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">ワンクリック同期</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        ボタンをクリックするだけで最新データを取得
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      onClick={handleStartSync}
                      disabled={isLoading || isDemoMode}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          同期中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          今すぐ同期を実行
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-orange-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-orange-900">差分同期</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          前回同期以降の変更分のみを取得し、高速に同期
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-purple-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-purple-900">リアルタイム同期</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Webhookを使用してデータの変更を即座に反映
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}