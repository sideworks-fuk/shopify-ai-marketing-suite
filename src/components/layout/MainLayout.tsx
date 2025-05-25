"use client"

import type React from "react"

import { useState } from "react"
import { useAppContext } from "@/contexts/AppContext"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { RefreshCw, Download, Bell, Settings, HelpCircle } from "lucide-react"

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { activeTab, setActiveTab, selectedPeriod, setSelectedPeriod } = useAppContext()

  const periodOptions = [
    { value: "今月", label: "今月" },
    { value: "前月", label: "前月" },
    { value: "今四半期", label: "今四半期" },
    { value: "カスタム", label: "カスタム" },
  ]

  const getPeriodLabel = (periodValue: string) => {
    const option = periodOptions.find((opt) => opt.value === periodValue)
    return option ? option.label : "今月"
  }

  const mainTabs = [
    { id: "sales", label: "📊 売上分析", icon: "📊" },
    { id: "customers", label: "👥 顧客分析", icon: "👥" },
 // { id: "ai", label: "🤖 AI分析", icon: "🤖" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ロゴとタイトル */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  📊 Shopify ECマーケティング分析
                </h1>
              </div>
            </div>

            {/* 右側のコントロール */}
            <div className="flex items-center gap-3">
              {/* 期間選択 */}
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>
                    <span>{getPeriodLabel(selectedPeriod)}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* アクションボタン */}
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>

              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </Button>

              {/* 通知・設定 */}
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* メインナビゲーション */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 border-b border-gray-200">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "sales" | "customers" | "ai")}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
