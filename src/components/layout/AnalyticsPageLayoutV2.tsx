import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard, type KPICardProps } from "@/components/common/KPICard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Settings, Filter } from "lucide-react";

export interface AnalyticsPageLayoutV2Props {
  title: string;
  description?: string;
  kpiCards?: KPICardProps[];
  filterSection?: React.ReactNode;
  mainContent: React.ReactNode;
  subContent?: React.ReactNode;
  actionButtons?: React.ReactNode;
  className?: string;
  compactMode?: boolean; // コンパクトモードの有効/無効
}

export const AnalyticsPageLayoutV2: React.FC<AnalyticsPageLayoutV2Props> = ({
  title,
  description,
  kpiCards = [],
  filterSection,
  mainContent,
  subContent,
  actionButtons,
  className,
  compactMode = false,
}) => {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(compactMode);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

  return (
    <div className={cn("w-full min-h-screen bg-slate-50", className)}>
      {/* 第1層: ヘッダー領域 - 最大20%に制限 */}
      <div className={cn(
        "bg-white shadow-sm border-b transition-all duration-300",
        isHeaderCollapsed ? "min-h-[80px]" : "min-h-[120px] max-h-[20vh]"
      )}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={cn(
            "flex flex-col justify-between transition-all duration-300",
            isHeaderCollapsed ? "py-3" : "py-6"
          )}>
            {/* ヘッダーコンテンツ */}
            <div className="flex justify-between items-start">
              <div className={cn(
                "space-y-1 transition-all duration-300",
                isHeaderCollapsed && "space-y-0"
              )}>
                <div className="flex items-center gap-3">
                  <h1 className={cn(
                    "font-bold tracking-tight transition-all duration-300",
                    isHeaderCollapsed ? "text-xl" : "text-2xl lg:text-3xl"
                  )}>
                    {title}
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {isHeaderCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </div>
                {description && !isHeaderCollapsed && (
                  <p className="text-sm lg:text-base text-slate-600">{description}</p>
                )}
              </div>
              {actionButtons && (
                <div className="flex gap-2">{actionButtons}</div>
              )}
            </div>

            {/* KPIカードセクション - ヘッダー内でコンパクト表示 */}
            {kpiCards.length > 0 && !isHeaderCollapsed && (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-4">
                {kpiCards.slice(0, 4).map((kpi, index) => (
                  <CompactKPICard key={`kpi-${index}`} {...kpi} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 第2層: コントロール領域 */}
      {filterSection && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">分析条件設定</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {isFiltersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  設定
                </Button>
              </div>
              
              {!isFiltersCollapsed && (
                <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                  {filterSection}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 第3層: メインコンテンツ領域 - 残り80%の空間を使用 */}
      <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* コンパクトモード時のKPI表示 */}
          {kpiCards.length > 0 && isHeaderCollapsed && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {kpiCards.slice(0, 4).map((kpi, index) => (
                <KPICard key={`kpi-compact-${index}`} {...kpi} />
              ))}
            </div>
          )}

          {/* メインコンテンツ */}
          <div className="space-y-6">{mainContent}</div>

          {/* サブコンテンツ（オプション） */}
          {subContent && <div className="space-y-6">{subContent}</div>}
        </div>
      </div>
    </div>
  );
};

// コンパクト版KPIカード
const CompactKPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  customColor = "#3B82F6",
  ...props
}) => {
  const isPositive = change ? change.value >= 0 : true;
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" style={{ color: customColor }} />}
            <span className="text-xs font-medium text-slate-600 truncate">{title}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold">{formattedValue}</div>
            {change && (
              <div className={cn(
                "text-xs flex items-center gap-1",
                isPositive ? "text-green-600" : "text-red-600"
              )}>
                {isPositive ? "▲" : "▼"} {Math.abs(change.value).toFixed(1)}{change.unit || '%'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 既存のヘルパーコンポーネントを再エクスポート
export { QuickAction, NavigationCard } from "./AnalyticsPageLayout";
export type { QuickActionProps, NavigationCardProps } from "./AnalyticsPageLayout"; 