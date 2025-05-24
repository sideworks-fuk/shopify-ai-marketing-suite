"use client"

import { cn } from "@/lib/utils"

import type React from "react"

import { useState, useEffect } from "react"
import { useAppContext } from "@/contexts/AppContext"
import {
  BarChart3,
  Users,
  Sparkles,
  Settings,
  HelpCircle,
  Bell,
  Menu,
  X,
  RefreshCw,
  Download,
  Calendar,
} from "lucide-react"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const {
    activeTab,
    setActiveTab,
    refreshData,
    isLoading,
    selectedPeriod,
    setSelectedPeriod,
    exportData,
    isExporting,
  } = useAppContext()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // スクロール検出
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value as "sales" | "customers" | "ai")
  }

  // タブごとの色を定義
  const getTabColor = (tab: string) => {
    switch (tab) {
      case "sales":
        return "bg-blue-600 hover:bg-blue-700"
      case "customers":
        return "bg-green-600 hover:bg-green-700"
      case "ai":
        return "bg-purple-600 hover:bg-purple-700"
      default:
        return "bg-gray-600 hover:bg-gray-700"
    }
  }

  // タブごとのアイコン色を定義
  const getIconColor = (tab: string) => {
    switch (tab) {
      case "sales":
        return "text-blue-600"
      case "customers":
        return "text-green-600"
      case "ai":
        return "text-purple-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top Navigation Bar */}
        <header
          className={cn(
            "bg-white border-b border-gray-200 sticky top-0 z-30 transition-shadow duration-200",
            scrolled && "shadow-md",
          )}
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden mr-2"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="mr-2 text-2xl">📊</span>
                <span className="hidden sm:inline">Shopify ECマーケティング分析</span>
                <span className="sm:hidden">EC分析</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="今月">今月</SelectItem>
                    <SelectItem value="前月">前月</SelectItem>
                    <SelectItem value="今四半期">今四半期</SelectItem>
                    <SelectItem value="カスタム">カスタム</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="relative" onClick={refreshData} disabled={isLoading}>
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>データを更新</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                    onClick={exportData}
                    disabled={isExporting}
                  >
                    <Download className={cn("h-4 w-4", isExporting && "animate-pulse")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>データをエクスポート</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>通知</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>設定</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>アカウント設定</DropdownMenuItem>
                  <DropdownMenuItem>API連携</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>通知設定</DropdownMenuItem>
                  <DropdownMenuItem>テーマ設定</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>ヘルプ</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar */}
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity",
            isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={() => setIsSidebarOpen(false)}
        ></div>

        <div
          className={cn(
            "fixed left-0 top-16 bottom-0 w-64 bg-white z-20 transform transition-transform md:hidden border-r border-gray-200",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="p-4">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn("w-full justify-start", activeTab === "sales" && "bg-blue-50 text-blue-700")}
                onClick={() => {
                  setActiveTab("sales")
                  setIsSidebarOpen(false)
                }}
              >
                <BarChart3 className={cn("h-4 w-4 mr-2", getIconColor("sales"))} />
                売上分析
              </Button>
              <Button
                variant="ghost"
                className={cn("w-full justify-start", activeTab === "customers" && "bg-green-50 text-green-700")}
                onClick={() => {
                  setActiveTab("customers")
                  setIsSidebarOpen(false)
                }}
              >
                <Users className={cn("h-4 w-4 mr-2", getIconColor("customers"))} />
                顧客分析
              </Button>
              <Button
                variant="ghost"
                className={cn("w-full justify-start", activeTab === "ai" && "bg-purple-50 text-purple-700")}
                onClick={() => {
                  setActiveTab("ai")
                  setIsSidebarOpen(false)
                }}
              >
                <Sparkles className={cn("h-4 w-4 mr-2", getIconColor("ai"))} />
                AI分析
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="今月">今月</SelectItem>
                  <SelectItem value="前月">前月</SelectItem>
                  <SelectItem value="今四半期">今四半期</SelectItem>
                  <SelectItem value="カスタム">カスタム</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-6">
            {/* Tabs */}
            <div className="mb-6 hidden md:block">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger
                    value="sales"
                    className={cn(
                      "flex items-center transition-all duration-200",
                      activeTab === "sales" && "text-blue-700",
                    )}
                  >
                    <BarChart3 className={cn("h-4 w-4 mr-2", getIconColor("sales"))} />
                    売上分析
                    {activeTab === "sales" && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                        layoutId="activeTabIndicator"
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="customers"
                    className={cn(
                      "flex items-center transition-all duration-200",
                      activeTab === "customers" && "text-green-700",
                    )}
                  >
                    <Users className={cn("h-4 w-4 mr-2", getIconColor("customers"))} />
                    顧客分析
                    {activeTab === "customers" && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"
                        layoutId="activeTabIndicator"
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className={cn(
                      "flex items-center transition-all duration-200",
                      activeTab === "ai" && "text-purple-700",
                    )}
                  >
                    <Sparkles className={cn("h-4 w-4 mr-2", getIconColor("ai"))} />
                    AI分析
                    {activeTab === "ai" && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                        layoutId="activeTabIndicator"
                      />
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Dashboard Content with Animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>© 2025 Shopify ECマーケティング分析. All rights reserved.</p>
            <div className="flex gap-4 mt-2 sm:mt-0">
              <a href="#" className="hover:text-gray-700 transition-colors">
                プライバシーポリシー
              </a>
              <a href="#" className="hover:text-gray-700 transition-colors">
                利用規約
              </a>
              <a href="#" className="hover:text-gray-700 transition-colors">
                お問い合わせ
              </a>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
