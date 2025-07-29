"use client"

import React, { useState, useEffect } from "react"
import YearOverYearProductAnalysis from "./YearOverYearProductAnalysis"
import { yearOverYearApi } from "../../lib/api/year-over-year"

/**
 * 前年同月比【商品】分析 - ラッパーコンポーネント
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description カテゴリ一覧の取得などの初期化処理を行うラッパー
 */

export const YearOverYearProductAnalysisWithCondition = () => {
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  
  // カテゴリ一覧の取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // TODO: カテゴリ一覧取得APIを実装
        // 暫定的にハードコードされたカテゴリを使用
        setAvailableCategories([
          "アパレル",
          "アクセサリー",
          "バッグ",
          "シューズ",
          "コスメ",
          "食品",
          "雑貨",
          "家具",
          "電化製品",
          "その他"
        ])
      } catch (error) {
        console.error("Failed to fetch categories:", error)
        setAvailableCategories([])
      }
    }
    
    fetchCategories()
  }, [])
  
  return <YearOverYearProductAnalysis />
}

export default YearOverYearProductAnalysisWithCondition