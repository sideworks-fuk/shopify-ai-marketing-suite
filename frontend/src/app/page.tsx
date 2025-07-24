"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  // 静的エクスポートに対応するため、クライアントサイドリダイレクトを使用
  useEffect(() => {
    // 即座にリダイレクト
    window.location.href = "/dev-bookmarks/"
  }, [])

  // リダイレクト中の表示
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">リダイレクト中...</p>
        </div>
      </div>
    </div>
  )
}
