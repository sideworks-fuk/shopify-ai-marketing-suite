import React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./card";
import { ChevronUp, ChevronDown, AlertTriangle, Moon, Diamond } from "lucide-react";

interface StatusCardProps {
  title: string;
  count: number;
  change: number;
  icon: LucideIcon;
  color: string;
  variant?: "default" | "warning" | "danger" | "success";
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("ja-JP").format(value);
};

export const StatusCard = ({
  title,
  count,
  change,
  icon: Icon,
  color,
  variant = "default"
}: StatusCardProps) => {
  const getChangeIcon = () => {
    switch (title) {
      case "休眠リスク":
        return <AlertTriangle className="h-4 w-4 text-amber-500 mr-1" />;
      case "休眠顧客":
        return <Moon className="h-4 w-4 text-gray-500 mr-1" />;
      case "高価値顧客":
        return <Diamond className="h-4 w-4 text-amber-500 mr-1" />;
      default:
        return change >= 0 ? (
          <ChevronUp className="h-4 w-4 text-green-500 mr-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-red-500 mr-1" />
        );
    }
  };

  const getChangeTextColor = () => {
    if (["休眠リスク", "休眠顧客", "高価値顧客"].includes(title)) {
      return "text-amber-600";
    }
    return change >= 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {formatNumber(count)}
            </p>
          </div>
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          {getChangeIcon()}
          <span className={`text-sm font-medium ${getChangeTextColor()}`}>
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
          <span className="text-sm text-gray-500 ml-1">前月比</span>
        </div>
      </CardContent>
    </Card>
  );
}; 