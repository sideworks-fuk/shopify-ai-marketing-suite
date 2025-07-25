"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  selected?: string
  onChange?: (date: string) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ selected, onChange, className, placeholder }: DatePickerProps) {
  return (
    <Input
      type="date"
      value={selected || ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={className}
      placeholder={placeholder}
    />
  )
} 