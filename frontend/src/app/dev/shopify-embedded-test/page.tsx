'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useIsEmbedded } from '@/hooks/useIsEmbedded'
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'

export default function ShopifyEmbeddedTest() {
  const isEmbedded = useIsEmbedded()
  
  const testUrls = {
    embedded: '?embedded=1&host=fuk-dev1.myshopify.com',
    normal: '/',
    withHost: '?host=fuk-dev1.myshopify.com',
    withShop: '?shop=fuk-dev1.myshopify.com&embedded=1'
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🛍️ Shopify埋め込みモードテスト</span>
            {isEmbedded ? (
              <Badge variant="default" className="bg-green-600">埋め込みモード</Badge>
            ) : (
              <Badge variant="secondary">通常モード</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 現在のステータス */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">現在のステータス</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                {isEmbedded ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="font-medium">埋め込みモード</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <span className="font-medium">URL:</span>
                <code className="text-sm">{typeof window !== 'undefined' ? window.location.search : ''}</code>
              </div>
            </div>
          </div>

          {/* パラメータ情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">URLパラメータ</h3>
            <div className="space-y-2">
              {typeof window !== 'undefined' && (() => {
                const params = new URLSearchParams(window.location.search)
                const paramsList = Array.from(params.entries())
                
                if (paramsList.length === 0) {
                  return <p className="text-gray-500 text-sm">パラメータなし</p>
                }
                
                return paramsList.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <code className="text-sm font-medium">{key}</code>
                    <code className="text-sm text-gray-600">{value}</code>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* テストリンク */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">テストリンク</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href={testUrls.embedded}>
                <Button variant="outline" className="w-full justify-between">
                  <span>埋め込みモード</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              <a href={testUrls.normal}>
                <Button variant="outline" className="w-full justify-between">
                  <span>通常モード</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              <a href={testUrls.withHost}>
                <Button variant="outline" className="w-full justify-between">
                  <span>hostのみ</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              <a href={testUrls.withShop}>
                <Button variant="outline" className="w-full justify-between">
                  <span>shop + embedded</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* 動作説明 */}
          {isEmbedded ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>埋め込みモードで動作中</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Shopify App Bridgeが有効化されています</li>
                  <li>• ナビゲーションメニューがShopify管理画面に統合されます</li>
                  <li>• ヘッダーは非表示になります</li>
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>通常モードで動作中</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• スタンドアロンアプリとして動作します</li>
                  <li>• 通常のヘッダーとナビゲーションが表示されます</li>
                  <li>• App Bridgeは無効です</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 実装詳細 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">実装詳細</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm font-medium mb-2">埋め込み判定条件:</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• URLに <code>embedded</code> パラメータが含まれる</li>
                <li>• URLに <code>host</code> パラメータが含まれる</li>
                <li>• iframe内で実行されている</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}