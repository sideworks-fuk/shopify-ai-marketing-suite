"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

export default function FrequencyDetailPage() {
  const router = useRouter()
  
  useEffect(() => {
    // 新UIへ自動リダイレクト
    router.replace('/purchase/count-analysis')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">新しい購入回数分析画面へ移動しています...</p>
      </div>
    </div>
  )
} 