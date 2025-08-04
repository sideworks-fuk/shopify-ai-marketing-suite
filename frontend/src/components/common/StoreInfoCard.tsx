"use client"

import { useStore } from '@/contexts/StoreContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store, Info, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * 現在のストア情報を表示するカードコンポーネント
 * @author YUKI
 * @date 2025-08-01
 */
export function StoreInfoCard() {
  const { currentStore, error } = useStore()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          現在のストア
        </CardTitle>
        <CardDescription>
          分析対象のストア情報
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ストア名</span>
            <span className="font-medium">{currentStore.name}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">データタイプ</span>
            <Badge 
              variant={currentStore.dataType === 'production' ? 'default' : 'secondary'}
            >
              {currentStore.dataType === 'production' ? '本番データ' : 'テストデータ'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">説明</span>
            <span className="text-sm text-right">{currentStore.description}</span>
          </div>
          
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              <span>ストアを切り替えるには、上部のストアセレクターを使用してください</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}