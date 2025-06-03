import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard, type KPICardProps } from "@/components/common/KPICard";
import { cn } from "@/lib/utils";

export interface AnalyticsPageLayoutProps {
  title: string;
  description?: string;
  kpiCards?: KPICardProps[];
  filterSection?: React.ReactNode;
  mainContent: React.ReactNode;
  subContent?: React.ReactNode;
  actionButtons?: React.ReactNode;
  className?: string;
}

export const AnalyticsPageLayout: React.FC<AnalyticsPageLayoutProps> = ({
  title,
  description,
  kpiCards = [],
  filterSection,
  mainContent,
  subContent,
  actionButtons,
  className,
}) => {
  return (
    <div className={cn("w-full space-y-6 p-6", className)}>
      {/* ページヘッダー */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-lg text-slate-600">{description}</p>
          )}
        </div>
        {actionButtons && (
          <div className="flex gap-2">{actionButtons}</div>
        )}
      </div>

      {/* KPIカードセクション */}
      {kpiCards.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.slice(0, 4).map((kpi, index) => (
            <KPICard key={`kpi-${index}`} {...kpi} />
          ))}
        </div>
      )}

      {/* フィルターセクション */}
      {filterSection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">フィルター</CardTitle>
          </CardHeader>
          <CardContent>{filterSection}</CardContent>
        </Card>
      )}

      {/* メインコンテンツ */}
      <div className="space-y-6">{mainContent}</div>

      {/* サブコンテンツ（オプション） */}
      {subContent && <div className="space-y-6">{subContent}</div>}
    </div>
  );
};

// クイックアクションボタン用のヘルパーコンポーネント
export interface QuickActionProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
}

export const QuickAction: React.FC<QuickActionProps> = ({
  label,
  onClick,
  icon,
  variant = "outline",
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
        {
          "bg-slate-900 text-white hover:bg-slate-800": variant === "default",
          "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50":
            variant === "outline",
          "bg-slate-100 text-slate-900 hover:bg-slate-200":
            variant === "secondary",
        }
      )}
    >
      {icon && <span className="text-sm">{icon}</span>}
      {label}
    </button>
  );
};

// ナビゲーションカード用のヘルパーコンポーネント
export interface NavigationCardProps {
  title: string;
  description: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export const NavigationCard: React.FC<NavigationCardProps> = ({
  title,
  description,
  onClick,
  icon,
}) => {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-slate-200 hover:border-slate-300"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{title}</h3>
            <p className="text-slate-600 text-sm">{description}</p>
          </div>
          <span className="text-slate-400 text-xl">→</span>
        </div>
      </CardContent>
    </Card>
  );
}; 