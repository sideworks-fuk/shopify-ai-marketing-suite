"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Eye, EyeOff, Presentation } from 'lucide-react'
import { getApiBaseUrl } from '@/lib/config/environments'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'

export default function DemoLoginPage() {
  const [password, setPassword] = useState('')
  const [shopDomain, setShopDomain] = useState('') // 🔒 ストアドメイン入力（必須）
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // サーバー側で認証（bcrypt検証）
      const apiBaseUrl = getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/api/demo/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password,
          shopDomain: shopDomain.trim() // 🔒 ストアドメインは必須
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // JWTトークンからstore_idを取得
        let storeId: number | null = null
        try {
          const decoded = jwtDecode<{ store_id?: string }>(data.token)
          if (decoded.store_id) {
            storeId = parseInt(decoded.store_id, 10)
          }
        } catch (err) {
          console.error('Failed to decode JWT token:', err)
        }
        
        if (!storeId) {
          setError('ストアIDの取得に失敗しました')
          return
        }
        
        // デモトークンを保存
        if (typeof window !== 'undefined') {
          localStorage.setItem('demoToken', data.token)
          localStorage.setItem('authMode', 'demo')
          localStorage.setItem('readOnly', 'true')
          localStorage.setItem('currentStoreId', storeId.toString())
          // 🔧 oauth_authenticatedフラグをクリア（デモモードとOAuthモードの競合を防ぐ）
          localStorage.removeItem('oauth_authenticated')
        }
        
        console.log('✅ デモモード: ログイン成功', {
          authMode: data.authMode,
          readOnly: data.readOnly,
          expiresAt: data.expiresAt,
          storeId
        })
        
        // データ同期画面へ直接リダイレクト（/を経由しない）
        // これにより、AuthProviderの再初期化タイミングの問題を回避
        router.push('/setup/initial')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'パスワードが正しくありません')
        
        console.error('❌ デモモード: ログイン失敗', errorData)
      }
    } catch (err) {
      console.error('デモモードログインエラー:', err)
      setError('ログインに失敗しました。サーバーに接続できません。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Presentation className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">デモサイト</CardTitle>
          <CardDescription>
            ストアドメインとパスワードを入力してアクセスしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 🔒 ストアドメイン入力フィールド（必須） */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                ストアドメイン <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="例: example.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                disabled={isLoading}
                className="w-full"
                required // 🔒 必須入力
                autoFocus
                autoComplete="off" // 🔧 ブラウザの自動入力を無効化
              />
              <p className="text-xs text-gray-500 mt-1">
                デモモードでアクセスするストアのドメインを入力してください
              </p>
            </div>

            {/* パスワード入力フィールド */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pr-10"
                required // 🔒 必須入力
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading || !password || !shopDomain.trim()}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          {/* デモモード説明 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4 text-left border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-2">
                📊 デモモードについて
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Shopify認証なしでアプリの機能を確認できます</li>
                <li>• すべての画面を閲覧可能です</li>
                <li>• データの変更・削除はできません（読み取り専用）</li>
                <li>• セッションは8時間で自動ログアウトされます</li>
              </ul>
            </div>
          </div>

          {/* 戻るリンク */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              ← 認証画面に戻る
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




