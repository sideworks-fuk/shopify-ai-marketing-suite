"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Presentation, Code } from 'lucide-react'
import { getAuthModeConfig } from '@/lib/config/environments'

/**
 * 認証方法選択ページ
 * 開発環境で未認証の場合に表示される
 */
export default function AuthSelectPage() {
  const router = useRouter()
  
  // 認証モード設定を取得
  const authConfig = getAuthModeConfig()
  const allowsDemo = authConfig.authMode === 'all_allowed' || authConfig.authMode === 'demo_allowed'
  const isDevelopment = authConfig.environment === 'development' || 
                        process.env.NODE_ENV === 'development' || 
                        process.env.NEXT_PUBLIC_DEVELOPER_MODE === 'true'

  const handleOAuth = () => {
    console.log('🔵 [認証選択] OAuth認証ボタンがクリックされました')
    router.push('/install')
  }

  const handleDemo = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    console.log('🟢 [認証選択] デモモードボタンがクリックされました')
    console.log('🟢 [認証選択] /demo/loginへ遷移します')
    router.replace('/demo/login')
  }

  const handleDeveloper = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    console.log('🔧 [認証選択] 開発者モードボタンがクリックされました')
    console.log('🔧 [認証選択] /dev/loginへ遷移します')
    router.replace('/dev/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6" suppressHydrationWarning>
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl mb-2">EC Ranger</CardTitle>
          <CardDescription className="text-lg">
            Shopifyストアの売上を最大化する分析ツール
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-center text-gray-600 mb-6">
              認証方法を選択してください
            </p>

            <div className={`grid gap-4 ${isDevelopment ? 'md:grid-cols-3' : allowsDemo ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              {/* OAuth認証 */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleOAuth}>
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-blue-100 rounded-full">
                      <Shield className="h-12 w-12 text-blue-600" />
                    </div>
                  </div>
                  <CardTitle className="text-xl text-center">OAuth認証</CardTitle>
                  <CardDescription className="text-center">
                    Shopifyストアと接続
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• 実際のShopifyストアと接続</li>
                    <li>• リアルタイムデータの取得</li>
                    <li>• すべての機能を利用可能</li>
                    <li>• データの変更・削除が可能</li>
                  </ul>
                  <Button 
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                    onClick={handleOAuth}
                  >
                    OAuth認証で開始
                  </Button>
                </CardContent>
              </Card>

              {/* デモモード（許可されている場合のみ表示） */}
              {allowsDemo && (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleDemo}>
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-green-100 rounded-full">
                      <Presentation className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  <CardTitle className="text-xl text-center">デモモード</CardTitle>
                  <CardDescription className="text-center">
                    デモデータで試す
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Shopify認証なしで利用</li>
                    <li>• デモデータで機能確認</li>
                    <li>• すべての画面を閲覧可能</li>
                    <li>• 読み取り専用（変更不可）</li>
                  </ul>
                  <Button 
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white border-green-600" 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDemo(e)
                    }}
                    type="button"
                  >
                    デモモードで開始
                  </Button>
                </CardContent>
              </Card>
              )}

              {/* 開発者モード（開発環境のみ） */}
              {isDevelopment && (
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleDeveloper}>
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-purple-100 rounded-full">
                        <Code className="h-12 w-12 text-purple-600" />
                      </div>
                    </div>
                    <CardTitle className="text-xl text-center">開発者モード</CardTitle>
                    <CardDescription className="text-center">
                      ローカル開発用
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• ローカルバックエンド接続</li>
                      <li>• デバッグ・開発用</li>
                      <li>• データ同期が可能</li>
                      <li>• 開発環境専用</li>
                    </ul>
                    <Button 
                      className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white border-purple-600" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeveloper(e)
                      }}
                      type="button"
                    >
                      開発者モードで開始
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
