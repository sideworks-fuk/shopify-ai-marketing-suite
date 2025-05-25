"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAppContext } from "../../contexts/AppContext"
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
  ChevronDown,
} from "lucide-react"

// Simple utility function for conditional class names
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ")
}

// Simple Button component
const Button = ({
  children,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  onClick,
  ...props
}: {
  children: React.ReactNode
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
  className?: string
  disabled?: boolean
  onClick?: () => void
  [key: string]: any
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-blue-500",
  }

  const sizeClasses = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-sm",
    icon: "p-2",
  }

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

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
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)

  // スクロール検出
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period as any)
    setIsPeriodOpen(false)
  }

  return (
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
            <div className="hidden sm:block relative">
              <button
                className="flex items-center justify-between w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                <span>{selectedPeriod}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              {isPeriodOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handlePeriodSelect("今月")}
                  >
                    今月
                  </button>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handlePeriodSelect("前月")}
                  >
                    前月
                  </button>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handlePeriodSelect("今四半期")}
                  >
                    今四半期
                  </button>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handlePeriodSelect("カスタム")}
                  >
                    カスタム
                  </button>
                </div>
              )}
            </div>

            <Button variant="outline" size="icon" onClick={refreshData} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>

            <Button variant="outline" size="icon" onClick={exportData} disabled={isExporting}>
              <Download className={cn("h-4 w-4", isExporting && "animate-pulse")} />
            </Button>

            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="icon">
              <HelpCircle className="h-4 w-4" />
            </Button>
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
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* Main Navigation Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("sales")}
                className={cn(
                  "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === "sales" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900",
                )}
              >
                <BarChart3 className={cn("h-4 w-4 mr-2", getIconColor("sales"))} />
                売上分析
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className={cn(
                  "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === "customers" ? "bg-white text-green-700 shadow-sm" : "text-gray-600 hover:text-gray-900",
                )}
              >
                <Users className={cn("h-4 w-4 mr-2", getIconColor("customers"))} />
                顧客分析
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={cn(
                  "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === "ai" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900",
                )}
              >
                <Sparkles className={cn("h-4 w-4 mr-2", getIconColor("ai"))} />
                AI分析
              </button>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="transition-opacity duration-200">{children}</div>
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
  )
}
