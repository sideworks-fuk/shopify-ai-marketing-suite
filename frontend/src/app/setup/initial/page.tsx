'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

type SyncPeriod = '3months' | '6months' | '1year' | 'all'

export default function InitialSetupPage() {
  const router = useRouter()
  const [syncPeriod, setSyncPeriod] = useState<SyncPeriod>('3months')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSkipWarning, setShowSkipWarning] = useState(false)

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            🏪 EC Ranger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">初期設定 - データ同期</h2>
            <p className="text-gray-600">
              分析を開始するために、過去のデータを取得する必要があります。
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? '同期を開始中...' : '同期を開始'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSkip}
              disabled={isLoading}
            >
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
        </CardContent>
      </Card>
    </div>
  )
}