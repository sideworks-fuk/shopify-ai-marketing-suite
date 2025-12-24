"use client"

import React, { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Activity,
  Database,
  Settings
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isInitializing } = useAuth()

  // 認証状態に基づいてリダイレクト
  useEffect(() => {
    // 初期化中は何もしない（認証状態の判定を待つ）
    if (isInitializing) {
      console.log('⏳ 認証状態の初期化中...');
      return;
    }

    const shop = searchParams?.get('shop')
    const host = searchParams?.get('host')
    const embedded = searchParams?.get('embedded')

    console.log('🔍 認証状態をチェック:', { isAuthenticated, shop, host, embedded });

    if (isAuthenticated) {
      // 認証済みの場合、ダッシュボードにリダイレクト
      const params = new URLSearchParams()
      if (shop) params.set('shop', shop)
      if (host) params.set('host', host)
      if (embedded) params.set('embedded', embedded)
      
      const queryString = params.toString()
      const redirectUrl = `/customers/dormant${queryString ? `?${queryString}` : ''}`
      console.log('✅ 認証済み: ダッシュボードにリダイレクト:', redirectUrl)
      router.replace(redirectUrl)
    } else {
      // 未認証の場合、インストールページにリダイレクト
      const params = new URLSearchParams()
      if (shop) params.set('shop', shop)
      if (host) params.set('host', host)
      if (embedded) params.set('embedded', embedded)
      
      const queryString = params.toString()
      const redirectUrl = `/install${queryString ? `?${queryString}` : ''}`
      console.log('⚠️ 未認証: インストールページにリダイレクト:', redirectUrl)
      router.replace(redirectUrl)
    }
  }, [isAuthenticated, isInitializing, router, searchParams])

  // リダイレクト中はローディング表示
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-12">
        {/* ウェルカムメッセージ */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  ようこそ、EC Ranger へ
                </h2>
              </div>
              <Activity className="h-12 w-12 text-blue-600 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* メインアクセス */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* システム設定 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-gray-600" />
                <CardTitle>システム設定</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                アプリケーションの設定とカスタマイズ
              </p>
              <Link href="/settings">
                <Button variant="secondary" className="w-full">
                  設定を開く
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* データ同期 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-gray-600" />
                <CardTitle>データ同期</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Shopifyストアとのデータ同期を管理
              </p>
              <Link href="/sync/dashboard">
                <Button variant="secondary" className="w-full">
                  同期ダッシュボード
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* フッター */}
      <div className="mt-auto border-t bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>EC Ranger Analytics v1.0.0</p>
            <p className="mt-1">© 2025 All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}