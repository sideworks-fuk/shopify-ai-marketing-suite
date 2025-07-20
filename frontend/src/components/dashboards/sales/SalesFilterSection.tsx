import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, TrendingUp } from "lucide-react";

interface SalesFilterSectionProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export const SalesFilterSection: React.FC<SalesFilterSectionProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const periodOptions = [
    { value: "thisMonth", label: "今月" },
    { value: "lastMonth", label: "先月" },
    { value: "last3Months", label: "過去3ヶ月" },
    { value: "thisQuarter", label: "今四半期" },
    { value: "lastQuarter", label: "前四半期" },
    { value: "thisYear", label: "今年" },
    { value: "lastYear", label: "昨年" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-600" />
        <span className="text-sm font-medium text-slate-700">期間選択</span>
      </div>
      
      <Select value={selectedPeriod} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="期間を選択" />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1 text-xs text-slate-500">
        <TrendingUp className="w-3 h-3" />
        前年同期との比較データを表示
      </div>
    </div>
  );
}; 