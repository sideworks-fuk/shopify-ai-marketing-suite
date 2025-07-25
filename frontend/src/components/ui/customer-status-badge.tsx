import React from "react";
import { Badge } from "./badge";
import { Diamond, Users, UserPlus, Moon } from "lucide-react";

// ステータスのUnion Type定義
export type CustomerStatus = "VIP" | "リピーター" | "新規" | "休眠";

interface CustomerStatusBadgeProps {
  status: CustomerStatus;
  size?: "sm" | "md" | "lg";
}

// ステータス設定の型定義
interface StatusConfig {
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  icon: React.ElementType;
  label: string;
}

const statusConfigs: Record<CustomerStatus, StatusConfig> = {
  VIP: {
    variant: "default",
    className: "bg-amber-500 hover:bg-amber-600 text-white",
    icon: Diamond,
    label: "VIP"
  },
  リピーター: {
    variant: "default", 
    className: "bg-green-500 hover:bg-green-600 text-white",
    icon: Users,
    label: "リピーター"
  },
  新規: {
    variant: "default",
    className: "bg-blue-500 hover:bg-blue-600 text-white", 
    icon: UserPlus,
    label: "新規"
  },
  休眠: {
    variant: "secondary",
    className: "bg-gray-500 hover:bg-gray-600 text-white",
    icon: Moon,
    label: "休眠"
  }
} as const;

export const CustomerStatusBadge = ({ 
  status, 
  size = "sm" 
}: CustomerStatusBadgeProps) => {
  const config = statusConfigs[status];
  const Icon = config.icon;
  
  const iconSize = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <Badge className={config.className}>
      <Icon className={`${iconSize} mr-1`} />
      {config.label}
    </Badge>
  );
}; 