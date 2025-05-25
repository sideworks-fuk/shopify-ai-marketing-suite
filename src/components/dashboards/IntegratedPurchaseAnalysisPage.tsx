"use client"

import { useState } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3 } from "lucide-react"
import { Users } from "lucide-react"
import { Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import ProductPurchaseFrequencyAnalysis from "./ProductPurchaseFrequencyAnalysis"
import CustomerSegmentAnalysis from "./CustomerSegmentAnalysis"

const IntegratedPurchaseAnalysisPage = () => {
  const [selectedTab, setSelectedTab] = useState<
    "product-frequency" | "customer-purchase-count" | "integrated-insights"
  >("product-frequency")
  const [selectedPeriod, setSelectedPeriod] = useState("2025-01")

  // Update the tab configuration with clearer names
  const tabs = [
    {
      id: "product-frequency",
      content: "商品別購入頻度分析",
      component: <ProductPurchaseFrequencyAnalysis />,
    },
    {
      id: "customer-purchase-count",
      content: "👥 購入回数別分析",
      component: <CustomerSegmentAnalysis />,
    },
    {
      id: "integrated-insights",
      content: "💡 統合インサイト",
      component: <div className="text-center py-8 text-gray-500">統合インサイト機能は開発中です</div>,
    },
  ]

  // More descriptive period options
  const periodOptions = [
    { value: "2025-01", label: "2025年1月" },
    { value: "2024-12", label: "2024年12月" },
    { value: "2024-11", label: "2024年11月" },
    { value: "2024-10", label: "2024年10月" },
    { value: "2024-q4", label: "2024年第4四半期" },
    { value: "2024-q3", label: "2024年第3四半期" },
    { value: "custom", label: "カスタム期間" },
  ]

  const getCurrentPeriodLabel = () => {
    const option = periodOptions.find((opt) => opt.value === selectedPeriod)
    return option ? option.label : selectedPeriod
  }

  return (
    <div className="space-y-6">
      {/* 売上分析ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">📊 売上分析</CardTitle>
              <CardDescription>商品戦略と顧客戦略の統合分析プラットフォーム</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                期間: {getCurrentPeriodLabel()}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* タブ分割コンテンツ */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger value={tab.id} className="flex items-center text-sm" key={tab.id}>
              {tab.id === "product-frequency" && <BarChart3 className="h-4 w-4 mr-2" />}
              {tab.id === "customer-purchase-count" && <Users className="h-4 w-4 mr-2" />}
              {tab.id === "integrated-insights" && <Lightbulb className="h-4 w-4 mr-2" />}
              {tab.content}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-6">
          {tabs.map((tab) => (
            <TabsContent value={tab.id} className="space-y-6" key={tab.id}>
              {tab.component}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}

export default IntegratedPurchaseAnalysisPage
