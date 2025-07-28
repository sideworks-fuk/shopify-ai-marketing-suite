"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Database, Users, Package, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react'
import { useStore } from '@/contexts/StoreContext'
import { getApiUrl, getCurrentStoreId } from '@/lib/api-config'
import { authClient } from '@/lib/auth-client'

export default function Store2DebugPage() {
  const { currentStore } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testStoreData = async (storeId: number) => {
    setIsLoading(true)
    setError(null)
    setDebugData(null)

    try {
      console.log(`🔍 Testing Store ${storeId} data...`)
      
      // 1. デバッグエンドポイントを呼び出し
      const debugUrl = `${getApiUrl()}/api/customer/debug/store-data?storeId=${storeId}`
      console.log('📡 Debug API URL:', debugUrl)
      
      const response = await authClient.request(debugUrl)
      const result = await response.json()
      
      console.log('📊 Debug API Response:', result)
      
      if (result.success) {
        setDebugData(result.data)
      } else {
        setError(result.message || 'デバッグデータの取得に失敗しました')
      }
      
      // 2. 休眠顧客APIも直接テスト
      const dormantUrl = `${getApiUrl()}/api/customer/dormant?storeId=${storeId}&pageSize=5`
      console.log('📡 Dormant API URL:', dormantUrl)
      
      const dormantResponse = await authClient.request(dormantUrl)
      const dormantResult = await dormantResponse.json()
      
      console.log('📊 Dormant API Response:', dormantResult)
      
      // 3. localStorage確認
      const savedStoreId = localStorage.getItem('selectedStoreId')
      console.log('💾 Saved Store ID in localStorage:', savedStoreId)
      console.log('🏪 Current Store ID from helper:', getCurrentStoreId())
      
    } catch (err) {
      console.error('❌ Error:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // ページロード時に現在のストアをテスト
    if (currentStore) {
      testStoreData(currentStore.id)
    }
  }, [currentStore])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Store 2 データデバッグ</h1>
      
      {/* 現在のストア情報 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            現在のストア情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">ストア名:</span>
              <span>{currentStore?.name || '未選択'}</span>
              <Badge variant={currentStore?.dataType === 'production' ? 'default' : 'secondary'}>
                {currentStore?.dataType || 'unknown'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">ストアID:</span>
              <Badge variant="outline">{currentStore?.id || '-'}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">localStorage:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {localStorage.getItem('selectedStoreId') || 'null'}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* テストボタン */}
      <div className="flex gap-4 mb-6">
        <Button
          onClick={() => testStoreData(1)}
          disabled={isLoading}
          variant="outline"
        >
          Store 1 をテスト
        </Button>
        <Button
          onClick={() => testStoreData(2)}
          disabled={isLoading}
          variant="default"
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Store 2 をテスト
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* デバッグデータ表示 */}
      {debugData && (
        <div className="space-y-6">
          {/* ストア情報 */}
          <Card>
            <CardHeader>
              <CardTitle>ストア情報</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.store ? (
                <div className="space-y-2">
                  <div>ID: {debugData.store.id}</div>
                  <div>名前: {debugData.store.name}</div>
                  <div>タイプ: {debugData.store.dataType}</div>
                  <div>アクティブ: {debugData.store.isActive ? '✓' : '✗'}</div>
                  <div>説明: {debugData.store.description}</div>
                </div>
              ) : (
                <div className="text-red-600">ストアが見つかりません</div>
              )}
            </CardContent>
          </Card>

          {/* データ件数 */}
          <Card>
            <CardHeader>
              <CardTitle>データ件数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{debugData.dataCounts.customers}</div>
                  <div className="text-sm text-gray-600">顧客</div>
                </div>
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{debugData.dataCounts.products}</div>
                  <div className="text-sm text-gray-600">商品</div>
                </div>
                <div className="text-center">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{debugData.dataCounts.orders}</div>
                  <div className="text-sm text-gray-600">注文</div>
                </div>
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <div className="text-2xl font-bold">{debugData.dataCounts.dormantCustomers}</div>
                  <div className="text-sm text-gray-600">休眠顧客</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 注文日分布 */}
          {debugData.sampleData.orderDateDistribution && (
            <Card>
              <CardHeader>
                <CardTitle>最新注文日の分布（休眠顧客判定デバッグ）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">顧客ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">顧客名</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">最終注文日</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">経過日数</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">休眠判定</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugData.sampleData.orderDateDistribution.map((item: any) => (
                        <tr key={item.customerId}>
                          <td className="px-4 py-2 text-sm">{item.customerId}</td>
                          <td className="px-4 py-2 text-sm">{item.customerName}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.lastOrderDate 
                              ? new Date(item.lastOrderDate).toLocaleDateString('ja-JP')
                              : 'なし'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.daysSinceLastOrder >= 0 ? `${item.daysSinceLastOrder}日` : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.isDormant ? (
                              <Badge variant="destructive">休眠</Badge>
                            ) : (
                              <Badge variant="secondary">アクティブ</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>注意:</strong> 90日以上注文がない顧客のみが休眠顧客として表示されます。
                    テストデータの注文日が新しい場合、休眠顧客は0件になります。
                  </p>
                  <p className="text-sm text-yellow-800 mt-2">
                    購入履歴のある顧客数: {debugData.dataCounts.customersWithOrders} / 
                    休眠顧客数: {debugData.dataCounts.dormantCustomers}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* サンプルデータ */}
          <Card>
            <CardHeader>
              <CardTitle>サンプル顧客データ（上位5件）</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.sampleData.customers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文数</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugData.sampleData.customers.map((customer: any) => (
                        <tr key={customer.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.totalOrders}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(customer.createdAt).toLocaleDateString('ja-JP')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500">顧客データがありません</div>
              )}
            </CardContent>
          </Card>

          {/* デバッグ情報 */}
          <Card>
            <CardHeader>
              <CardTitle>デバッグ情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div>現在時刻 (UTC): {debugData.debugInfo.currentUtcTime}</div>
                <div>90日前カットオフ: {debugData.debugInfo.cutoffDateFor90Days}</div>
                <div>リクエストID: {debugData.debugInfo.requestId}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}