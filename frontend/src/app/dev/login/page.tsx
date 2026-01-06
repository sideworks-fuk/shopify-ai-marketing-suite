'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { getCurrentEnvironmentConfig } from '@/lib/config/environments'

interface Store {
  id: number
  name: string
  domain: string
  shopifyShopId?: string
  isActive: boolean
}

interface StoreListResponse {
  success: boolean
  data: {
    stores: Store[]
    totalCount: number
  }
  message: string
}

export default function DevLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('dev2026')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [developerToken, setDeveloperToken] = useState<string | null>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || getCurrentEnvironmentConfig().apiBaseUrl

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)
    setLoginSuccess(false)

    try {
      console.log('🔐 [DevLogin] 開発者認証開始', {
        backendUrl,
        timestamp: new Date().toISOString()
      })

      // 開発者認証APIは password のみでログイン（username は不要）
      const response = await fetch(`${backendUrl}/api/developer/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }), // username は不要
      })

      console.log('📥 [DevLogin] レスポンス受信', {
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString()
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      console.log('✅ [DevLogin] 認証成功', {
        hasToken: !!data.token,
        authMode: data.authMode,
        timestamp: new Date().toISOString()
      })
      
      if (data.token) {
        setDeveloperToken(data.token)
        localStorage.setItem('developerToken', data.token)
        localStorage.setItem('authMode', 'developer') // 開発者モードを設定
        localStorage.setItem('oauth_authenticated', 'true')
        setLoginSuccess(true)
        
        // ストア一覧を取得
        await fetchStores(data.token)
      } else {
        throw new Error('トークンの取得に失敗しました')
      }
    } catch (err) {
      console.error('❌ [DevLogin] 認証エラー', err)
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStores = async (token: string) => {
    setIsLoadingStores(true)
    setError(null)

    try {
      console.log('📋 [DevLogin] ストア一覧取得開始', {
        backendUrl,
        timestamp: new Date().toISOString()
      })

      const response = await fetch(`${backendUrl}/api/store`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📥 [DevLogin] ストア一覧レスポンス受信', {
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString()
      })

      if (!response.ok) {
        // 401エラーの場合、認証なしで試行（AllowAnonymousエンドポイントのため）
        if (response.status === 401) {
          console.warn('⚠️ [DevLogin] 認証エラー、認証なしで再試行')
          const retryResponse = await fetch(`${backendUrl}/api/store`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          if (retryResponse.ok) {
            const retryData: StoreListResponse = await retryResponse.json()
            if (retryData.success && retryData.data?.stores) {
              setStores(retryData.data.stores)
              if (retryData.data.stores.length > 0) {
                setSelectedStoreId(String(retryData.data.stores[0].id))
              }
              return
            }
          }
        }
        
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const data: StoreListResponse = await response.json()
      
      console.log('✅ [DevLogin] ストア一覧取得成功', {
        count: data.data?.stores?.length || 0,
        timestamp: new Date().toISOString()
      })
      
      if (data.success && data.data?.stores) {
        setStores(data.data.stores)
        if (data.data.stores.length > 0) {
          // デフォルトで最初のストアを選択
          setSelectedStoreId(String(data.data.stores[0].id))
        } else {
          setError('ストアが見つかりません。データベースにストアが登録されているか確認してください。')
        }
      } else {
        throw new Error('ストア一覧の取得に失敗しました')
      }
    } catch (err) {
      console.error('❌ [DevLogin] ストア一覧取得エラー', err)
      setError(err instanceof Error ? err.message : 'ストア一覧の取得に失敗しました')
    } finally {
      setIsLoadingStores(false)
    }
  }

  const handleStoreSelect = () => {
    console.log('🔧 [DevLogin] handleStoreSelect 呼び出し', {
      selectedStoreId,
      hasDeveloperToken: !!developerToken,
      timestamp: new Date().toISOString()
    })
    
    if (!selectedStoreId) {
      console.error('❌ [DevLogin] selectedStoreId が空です')
      setError('ストアを選択してください')
      return
    }

    if (!developerToken) {
      console.error('❌ [DevLogin] developerToken が見つかりません')
      setError('認証トークンが見つかりません。再度ログインしてください。')
      return
    }

    // 選択したストアIDを保存
    try {
      localStorage.setItem('currentStoreId', selectedStoreId)
      
      // 保存されたか確認
      const savedStoreId = localStorage.getItem('currentStoreId')
      console.log('✅ [DevLogin] ストア選択完了', {
        selectedStoreId,
        savedStoreId,
        saved: savedStoreId === selectedStoreId,
        timestamp: new Date().toISOString()
      })
      
      if (savedStoreId !== selectedStoreId) {
        console.error('❌ [DevLogin] localStorageへの保存に失敗しました', {
          expected: selectedStoreId,
          actual: savedStoreId
        })
        setError('ストアIDの保存に失敗しました。再度お試しください。')
        return
      }
    } catch (error) {
      console.error('❌ [DevLogin] localStorageへの保存でエラーが発生しました', error)
      setError('ストアIDの保存に失敗しました。ブラウザの設定を確認してください。')
      return
    }

    // リダイレクト
    console.log('🔄 [DevLogin] /setup/initial へリダイレクトします')
    router.push('/setup/initial')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>開発者ログイン</CardTitle>
          <CardDescription>
            ローカルバックエンドに直接接続して動作確認を行います
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginSuccess && stores.length > 0 && (
            <>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ログインに成功しました。ストアを選択してください。
                </AlertDescription>
              </Alert>

              <div>
                <label className="block text-sm font-medium mb-1">ストアを選択</label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="ストアを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name} ({store.domain})
                        {!store.isActive && ' [非アクティブ]'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {stores.length}件のストアが見つかりました
                </p>
              </div>

              <Button
                onClick={handleStoreSelect}
                disabled={!selectedStoreId || isLoadingStores}
                className="w-full"
              >
                ストアを選択して続行
              </Button>
            </>
          )}

          {loginSuccess && stores.length === 0 && !isLoadingStores && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ストアが見つかりませんでした。データベースにストアが登録されているか確認してください。
              </AlertDescription>
            </Alert>
          )}

          {!loginSuccess && (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">パスワード</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="dev2026"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleLogin()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  デフォルト: dev2026（開発環境のみ）
                </p>
              </div>

              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </Button>
            </>
          )}

          {isLoadingStores && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-600">ストア一覧を取得中...</span>
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2 pt-4 border-t">
            <div>
              <span className="font-medium">バックエンドURL:</span>
              <div className="text-xs text-gray-500 mt-1 break-all">{backendUrl}</div>
            </div>
            <div>
              <span className="font-medium">環境変数:</span>
              <div className="text-xs text-gray-500 mt-1">
                NEXT_PUBLIC_DEVELOPER_MODE: {process.env.NEXT_PUBLIC_DEVELOPER_MODE || '未設定'}
              </div>
              <div className="text-xs text-gray-500">
                NEXT_PUBLIC_BACKEND_URL: {process.env.NEXT_PUBLIC_BACKEND_URL || '未設定'}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 pt-4 border-t">
            <p className="font-medium mb-1">使用方法:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>バックエンドを起動（<code>dotnet run</code>）</li>
              <li><code>frontend/.env.local</code> に <code>NEXT_PUBLIC_BACKEND_URL=http://localhost:5168</code> を設定</li>
              <li>このページでログイン</li>
              <li>データ同期画面で動作確認</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
