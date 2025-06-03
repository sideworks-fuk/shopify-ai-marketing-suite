import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon?: React.ReactNode;
  color?: "default" | "success" | "warning" | "critical";
  className?: string;
}

const colorMap = {
  default: "bg-white text-slate-900",
  success: "bg-green-50 text-green-700",
  warning: "bg-yellow-50 text-yellow-700",
  critical: "bg-red-50 text-red-700",
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  change,
  icon,
  color = "default",
  className,
}) => {
  return (
    <Card
      className={cn(
        "flex flex-col justify-between h-[100px] p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md border border-slate-200",
        colorMap[color],
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-xl">{icon}</span>}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-end gap-2 mt-2">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
        {change && (
          <span
            className={
              change.type === "increase"
                ? "text-green-600 text-xs ml-2"
                : "text-red-600 text-xs ml-2"
            }
          >
            {change.type === "increase" ? "+" : "-"}
            {change.value}%
          </span>
        )}
      </div>
    </Card>
  );
}; 