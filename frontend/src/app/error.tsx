"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"

const isChunkLoadError = (error: Error): boolean =>
  error?.name === "ChunkLoadError" ||
  (typeof error?.message === "string" && error.message.includes("Loading chunk") && error.message.includes("failed"))

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App error boundary:", error)
  }, [error])

  const chunkError = isChunkLoadError(error)

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {chunkError ? "スクリプトの読み込みに失敗しました" : "エラーが発生しました"}
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            {chunkError
              ? "ページの一部が読み込めませんでした。ビルドの更新やネットワークの影響の可能性があります。再読み込みしてください。"
              : "予期しないエラーが発生しました。再試行するか、ページを再読み込みしてください。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!chunkError && (
            <div className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <strong>詳細:</strong> {error.message}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                if (chunkError) {
                  window.location.reload()
                } else {
                  reset()
                }
              }}
              className="flex items-center gap-2"
              variant={chunkError ? "default" : "outline"}
            >
              <RefreshCw className="h-4 w-4" />
              {chunkError ? "ページを再読み込み" : "再試行"}
            </Button>
            {!chunkError && (
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                ページを再読み込み
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
