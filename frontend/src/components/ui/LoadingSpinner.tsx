"use client"

import React from "react"
import { Loader2 } from "lucide-react"

export const LoadingSpinner = React.memo(function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  )
})

LoadingSpinner.displayName = "LoadingSpinner"