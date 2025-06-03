"use client"

import { useState } from "react"
import { DollarSign, ShoppingCart, TrendingUp, Package, Download, FileText, MessageSquare } from "lucide-react"
import { 
  AnalyticsPageLayout, 
  QuickAction, 
  NavigationCard 
} from "@/components/layout/AnalyticsPageLayout"
import { KPICardProps } from "@/components/common/KPICard"
import { SalesMainContent } from "@/components/dashboards/sales/SalesMainContent"
import { SalesFilterSection } from "@/components/dashboards/sales/SalesFilterSection"

export default function SalesDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth")

  // KPIデータ
  const kpiData = {
    totalSales: { current: 2450000, previous: 2180000, change: 12.4 },
    totalOrders: { current: 1234, previous: 1156, change: 6.7 },
    averageOrderValue: { current: 1986, previous: 1886, change: 5.3 },
    totalProducts: { current: 89, previous: 85, change: 4.7 },
  }

  // KPIカード配列（最大4つ）
  const kpiCards: KPICardProps[] = [
    {
      title: "今月売上",
      value: new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        minimumFractionDigits: 0,
      }).format(kpiData.totalSales.current),
      change: {
        value: kpiData.totalSales.change,
        type: "increase"
      },
      icon: DollarSign,
      variant: "default"
    },
    {
      title: "注文数",
      value: kpiData.totalOrders.current.toLocaleString(),
      unit: "件",
      change: {
        value: kpiData.totalOrders.change,
        type: "increase"
      },
      icon: ShoppingCart,
      variant: "success"
    },
    {
      title: "平均注文額",
      value: new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        minimumFractionDigits: 0,
      }).format(kpiData.averageOrderValue.current),
      change: {
        value: kpiData.averageOrderValue.change,
        type: "increase"
      },
      icon: TrendingUp,
      variant: "warning"
    },
    {
      title: "売上商品数",
      value: kpiData.totalProducts.current,
      unit: "商品",
      change: {
        value: kpiData.totalProducts.change,
        type: "increase"
      },
      icon: Package,
      variant: "default"
    },
  ]

  // クイックアクションボタン
  const actionButtons = (
    <>
      <QuickAction
        label="レポート出力"
        onClick={() => console.log("レポート出力")}
        icon={<Download className="w-4 h-4" />}
        variant="outline"
      />
      <QuickAction
        label="詳細分析"
        onClick={() => console.log("詳細分析")}
        icon={<FileText className="w-4 h-4" />}
        variant="default"
      />
    </>
  )

  // フィルターセクション
  const filterSection = (
    <SalesFilterSection 
      selectedPeriod={selectedPeriod}
      onPeriodChange={setSelectedPeriod}
    />
  )

  // メインコンテンツ
  const mainContent = (
    <SalesMainContent selectedPeriod={selectedPeriod} />
  )

  // サブコンテンツ（ナビゲーションカード）
  const subContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NavigationCard
        title="商品分析"
        description="商品別の売上・在庫状況を詳しく分析"
        onClick={() => window.location.href = "/products/analysis"}
        icon={<Package className="w-5 h-5" />}
      />
      <NavigationCard
        title="購買分析"
        description="月別・カテゴリ別の購買傾向を確認"
        onClick={() => window.location.href = "/purchases/monthly"}
        icon={<TrendingUp className="w-5 h-5" />}
      />
      <NavigationCard
        title="DM作成"
        description="売上データを基にマーケティングDMを作成"
        onClick={() => window.location.href = "/dm-creation"}
        icon={<MessageSquare className="w-5 h-5" />}
      />
    </div>
  )

  return (
    <AnalyticsPageLayout
      title="📊 売上ダッシュボード"
      description="売上の全体像と主要KPIを確認できます"
      kpiCards={kpiCards}
      filterSection={filterSection}
      mainContent={mainContent}
      subContent={subContent}
      actionButtons={actionButtons}
    />
  )
} 