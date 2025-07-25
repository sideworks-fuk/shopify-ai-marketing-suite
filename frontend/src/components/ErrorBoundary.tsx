"use client"

import type React from "react"
import { Component, ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackDescription?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {this.props.fallbackTitle || "エラーが発生しました"}
            </CardTitle>
            <CardDescription className="text-red-600">
              {this.props.fallbackDescription || "このコンポーネントの読み込み中にエラーが発生しました。ページを再読み込みしてください。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-red-600 bg-red-100 p-3 rounded-md">
                <strong>エラー詳細:</strong>
                <br />
                {this.state.error?.message || "不明なエラー"}
              </div>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  window.location.reload()
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                ページを再読み込み
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// 関数コンポーネント版のラッパー
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallbackTitle?: string
  fallbackDescription?: string
}

export default function ErrorBoundaryWrapper({
  children,
  fallbackTitle,
  fallbackDescription,
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      fallbackTitle={fallbackTitle}
      fallbackDescription={fallbackDescription}
    >
      {children}
    </ErrorBoundary>
  )
} 