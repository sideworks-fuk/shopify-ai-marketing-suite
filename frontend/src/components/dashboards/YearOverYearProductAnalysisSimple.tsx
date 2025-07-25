"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

const YearOverYearProductAnalysisSimple = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 前年同月比【商品】分析（軽量版）
          </CardTitle>
          <CardDescription>
            サイドメニューが正常に表示されるかテスト用の軽量版コンポーネント
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-bold text-green-800">✅ 軽量版テスト</h3>
              <p className="text-green-700 mt-2">
                このコンポーネントでサイドメニューが表示される場合、
                問題は元のコンポーネントの複雑さ（rechartsライブラリ、大量データ処理など）にあります。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">¥10,450,000</div>
                <div className="text-sm text-gray-600 mt-1">2024年合計</div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">¥12,543,841</div>
                <div className="text-sm text-gray-600 mt-1">2025年合計</div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-600">+20.1%</div>
                <div className="text-sm text-gray-600 mt-1">成長率</div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700">
                📊 元のコンポーネントは以下の重い処理を含んでいます：
              </p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• 大量のサンプルデータ生成（22商品 × 24ヶ月のデータ）</li>
                <li>• Rechartsライブラリによる複雑なチャート描画</li>
                <li>• 大きなテーブルのレンダリング（12列 × 商品数行）</li>
                <li>• 複雑なフィルタリングとソート処理</li>
                <li>• useMemo、useCallbackの大量使用</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisSimple 