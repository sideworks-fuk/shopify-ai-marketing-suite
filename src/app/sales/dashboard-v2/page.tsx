"use client"

import { useState } from "react"
import { DollarSign, ShoppingCart, TrendingUp, Package, Download, FileText, MessageSquare, BarChart3 } from "lucide-react"
import { 
  AnalyticsPageLayoutV2, 
  QuickAction, 
  NavigationCard 
} from "@/components/layout/AnalyticsPageLayoutV2"
import { KPICardProps } from "@/components/common/KPICard"
import { SalesMainContent } from "@/components/dashboards/sales/SalesMainContent"
import { SalesFilterSection } from "@/components/dashboards/sales/SalesFilterSection"
import { Badge } from "@/components/ui/badge"

export default function SalesDashboardV2Page() {
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth")

  // KPIデータ
  const kpiData = {
    totalSales: { current: 2450000, previous: 2180000, change: 12.4 },
    totalOrders: { current: 1234, previous: 1156, change: 6.7 },
    averageOrderValue: { current: 1986, previous: 1886, change: 5.3 },
    totalProducts: { current: 89, previous: 85, change: 4.7 },
  }

  // KPIカード配列（最大4つ）- V2用に最適化
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
        type: "increase",
        period: "前月比",
        unit: "%"
      },
      icon: DollarSign,
      variant: "primary",
      customColor: "#3B82F6"
    },
    {
      title: "注文数",
      value: kpiData.totalOrders.current.toLocaleString(),
      unit: "件",
      change: {
        value: kpiData.totalOrders.change,
        type: "increase",
        period: "前月比",
        unit: "%"
      },
      icon: ShoppingCart,
      variant: "success",
      customColor: "#10B981"
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
        type: "increase",
        period: "前月比",
        unit: "%"
      },
      icon: TrendingUp,
      variant: "warning",
      customColor: "#F59E0B"
    },
    {
      title: "売上商品数",
      value: kpiData.totalProducts.current,
      unit: "商品",
      change: {
        value: kpiData.totalProducts.change,
        type: "increase",
        period: "前月比",
        unit: "%"
      },
      icon: Package,
      variant: "default",
      customColor: "#8B5CF6"
    },
  ]

  // クイックアクションボタン - V2用に最適化
  const actionButtons = (
    <div className="flex gap-2">
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
      <QuickAction
        label="AI分析"
        onClick={() => console.log("AI分析")}
        icon={<BarChart3 className="w-4 h-4" />}
        variant="secondary"
      />
    </div>
  )

  // フィルターセクション - 改良版
  const filterSection = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <SalesFilterSection 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            📊 リアルタイムデータ
          </Badge>
          <Badge variant="outline" className="text-xs">
            🔄 自動更新: 30分
          </Badge>
        </div>
      </div>
    </div>
  )

  // メインコンテンツ - V2最適化
  const mainContent = (
    <div className="space-y-6">
      <SalesMainContent selectedPeriod={selectedPeriod} />
    </div>
  )

  // サブコンテンツ（ナビゲーションカード）- レスポンシブ改良
  const subContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">関連分析</h3>
        <Badge variant="secondary" className="text-xs">
          3つの推奨分析
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
    </div>
  )

  return (
    <AnalyticsPageLayoutV2
      title="📊 売上ダッシュボード V2"
      description="改良されたレイアウトで売上の全体像と主要KPIを効率的に確認"
      kpiCards={kpiCards}
      filterSection={filterSection}
      mainContent={mainContent}
      subContent={subContent}
      actionButtons={actionButtons}
      compactMode={false} // 初期状態は展開モード
      className="bg-gradient-to-br from-slate-50 to-slate-100"
    />
  )
} 