"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface MultiYearSelectorProps {
  selectedYears: number[]
  onYearsChange: (years: number[]) => void
  availableYears: number[]
  placeholder?: string
  className?: string
}

export function MultiYearSelector({
  selectedYears,
  onYearsChange,
  availableYears,
  placeholder = "年を選択",
  className
}: MultiYearSelectorProps) {
  const handleSelect = (yearString: string) => {
    const year = parseInt(yearString)
    if (isNaN(year)) return

    const updatedYears = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year].sort((a, b) => b - a) // 降順でソート

    onYearsChange(updatedYears)
  }

  const handleRemoveYear = (year: number) => {
    const updatedYears = selectedYears.filter(y => y !== year)
    onYearsChange(updatedYears)
  }

  const handleClearAll = () => {
    onYearsChange([])
  }

  const getAvailableYearsForSelection = () => {
    return availableYears.filter(year => !selectedYears.includes(year))
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2">
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {getAvailableYearsForSelection().map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedYears.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearAll}
            className="whitespace-nowrap"
          >
            すべてクリア
          </Button>
        )}
      </div>

      {/* 選択された年のバッジ表示 */}
      {selectedYears.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 flex items-center">選択中:</span>
          {selectedYears.map((year) => (
            <Badge
              key={year}
              variant="secondary"
              className="cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
              onClick={() => handleRemoveYear(year)}
            >
              {year}年
              <span className="ml-1 text-xs">✕</span>
            </Badge>
          ))}
        </div>
      )}

      {selectedYears.length === 0 && (
        <div className="text-sm text-gray-500">
          {placeholder}してください（複数選択可能）
        </div>
      )}
    </div>
  )
} 