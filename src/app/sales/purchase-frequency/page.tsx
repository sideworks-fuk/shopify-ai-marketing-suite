"use client"

import ProductPurchaseFrequencyAnalysis from "@/components/dashboards/ProductPurchaseFrequencyAnalysis"

export default function PurchaseFrequencyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔄 購入頻度【商品】</h1>
        <p className="text-gray-600 mt-2">商品別のリピート購入パターンを分析し、定番商品化の判断やサンプル施策の対象選定に活用できます</p>
      </div>
      <ProductPurchaseFrequencyAnalysis />
    </div>
  )
} 