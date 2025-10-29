"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { getMenuByCategory, type MenuItem } from "@/lib/menuConfig"
import { useAppStore } from "@/stores/appStore"
import ErrorBoundaryWrapper from "@/components/ErrorBoundary"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import Image from "next/image"
import { 
  RefreshCw, 
  Download, 
  Bell, 
  Settings, 
  HelpCircle, 
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { BackendConnectionStatus } from "../common/BackendConnectionStatus"

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const selectedPeriod = useAppStore((state) => state.globalFilters.selectedPeriod)
  const setSelectedPeriod = useAppStore((state) => state.setSelectedPeriod)
  const refreshData = useAppStore((state) => state.refreshData)
  const exportData = useAppStore((state) => state.exportData)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["settings", "sales", "purchase", "customers", "ai-insights"])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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

  // カテゴリ情報の定義
  const categories = [
    {
      id: "settings",
      label: "⚙️ 設定",
      description: "システム設定"
    },
    {
      id: "sales",
      label: "📦 商品分析",
      description: "売上・商品分析"
    },
    {
      id: "purchase", 
      label: "🛍️ 購買分析",
      description: "購買行動分析"
    },
    {
      id: "customers",
      label: "👥 顧客分析", 
      description: "顧客セグメント分析"
    },
    // 一時的に非表示
    // {
    //   id: "ai-insights",
    //   label: "🤖 AIインサイト",
    //   description: "AI予測・提案"
    // }
  ]

  const handleMenuClick = (item: MenuItem) => {
    if (item.isImplemented && item.href) {
      router.push(item.href)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const isActiveRoute = (href: string | undefined) => {
    if (!href) return false
    return pathname === href
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* モバイル用のオーバーレイ */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* サイドナビゲーション */}
      <div className={`w-80 bg-white border-r border-gray-200 overflow-y-auto fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/branding/logo.png"
              alt="EC Ranger"
              width={200}
              height={64}
              className="h-10 md:h-12 w-auto object-contain cursor-pointer"
              priority
            />
          </Link>
          {/* モバイル用の閉じるボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className="p-4">
          <div className="space-y-2">
            {categories.map(category => {
              const menuItems = getMenuByCategory(category.id)
              const isExpanded = expandedCategories.includes(category.id)
              
              return (
                <div key={category.id} className="space-y-1">
                  {/* カテゴリヘッダー */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{category.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{menuItems.length}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* メニューアイテム */}
                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {menuItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleMenuClick(item)}
                          disabled={!item.isImplemented}
                          className={`w-full flex items-center justify-between p-3 text-left rounded-lg text-sm transition-colors ${
                            isActiveRoute(item.href)
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : item.isImplemented
                                ? "hover:bg-gray-50 text-gray-700"
                                : "text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span>{item.icon}</span>
                            <div>
                              <div className="font-medium">{item.label}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!item.isImplemented && (
                              <Badge variant="outline" className="text-xs">
                                実装予定
                              </Badge>
                            )}
                            {isActiveRoute(item.href) && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0 overflow-hidden">
        {/* トップバー */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* モバイル用のハンバーガーメニューボタン */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              {/* パンくずナビゲーション */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>ホーム</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">
                  {pathname?.split('/').filter(Boolean).join(' / ') || ''}
                </span>
              </div>
            </div>

            {/* 右側のコントロール */}
            <div className="flex items-center gap-3">

              {/* 期間選択 - 非表示 */}
              {/* <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
              </Select> */}

              {/* アクションボタン - 非表示 */}
              {/* <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>

              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </Button> */}

              {/* その他のアクション - 設定ボタンのみ表示 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>設定</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Bell className="h-4 w-4 mr-2" />
                    通知設定
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    ヘルプ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 p-6 overflow-y-auto min-w-0 overflow-x-hidden">
          <ErrorBoundaryWrapper
            fallbackTitle="ページの読み込みでエラーが発生しました"
            fallbackDescription="現在のページでエラーが発生しましたが、サイドメニューから他のページに移動できます。"
          >
            {children}
          </ErrorBoundaryWrapper>
        </main>
      </div>
      
      {/* バックエンド接続状態の表示（開発環境のみ） */}
      <BackendConnectionStatus />
    </div>
  )
}
