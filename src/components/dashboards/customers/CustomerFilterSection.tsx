"use client"

import { Calendar, Users, UserPlus, Repeat, Crown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { useAppContext } from "../../../contexts/AppContext"

export function CustomerFilterSection() {
  const { selectedPeriod, setSelectedPeriod, selectedCustomerSegment, setSelectedCustomerSegment } = useAppContext()

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full sm:w-[140px]">
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

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <Select value={selectedCustomerSegment} onValueChange={setSelectedCustomerSegment}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全顧客">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                全顧客
              </div>
            </SelectItem>
            <SelectItem value="新規">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                新規顧客
              </div>
            </SelectItem>
            <SelectItem value="リピーター">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                リピーター
              </div>
            </SelectItem>
            <SelectItem value="VIP">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                VIP顧客
              </div>
            </SelectItem>
            <SelectItem value="休眠">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                休眠顧客
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 