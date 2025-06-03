"use client"

// 統一KPICardコンポーネント - 技術的負債解消 Phase 1-6
// 重複解消、一貫したデザイン、ローディング状態・エラー状態対応

import React from "react"
import { LucideIcon, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"

// =============================================================================
// 型定義
// =============================================================================

export type ChangeType = 'increase' | 'decrease' | 'neutral' | 'unknown';
export type KPIVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export type LoadingState = 'idle' | 'loading' | 'error' | 'success';

export interface KPIChange {
  value: number;
  type: ChangeType;
  period?: string; // "前月比", "前年同月比" など
  unit?: '%' | '件' | '円' | '人' | string;
}

export interface KPIBadge {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color?: string;
}

export interface KPIAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
}

export interface KPICardProps {
  // 基本情報
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  
  // 変化・トレンド
  change?: KPIChange;
  
  // 外観
  icon?: LucideIcon;
  variant?: KPIVariant;
  customColor?: string;
  
  // 状態表示
  badge?: KPIBadge;
  loadingState?: LoadingState;
  
  // インタラクション
  onClick?: () => void;
  actions?: KPIAction[];
  
  // エラー処理
  error?: string | Error;
  onRetry?: () => void;
  
  // レイアウト
  compact?: boolean;
  className?: string;
}

// =============================================================================
// スタイル定義
// =============================================================================

const variantStyles: Record<KPIVariant, {
  card: string;
  title: string;
  value: string;
  icon: string;
}> = {
  default: {
    card: "border-slate-200 bg-white",
    title: "text-slate-600",
    value: "text-slate-900",
    icon: "text-slate-500"
  },
  primary: {
    card: "border-blue-200 bg-blue-50",
    title: "text-blue-700",
    value: "text-blue-900",
    icon: "text-blue-600"
  },
  success: {
    card: "border-green-200 bg-green-50",
    title: "text-green-700",
    value: "text-green-900",
    icon: "text-green-600"
  },
  warning: {
    card: "border-amber-200 bg-amber-50",
    title: "text-amber-700",
    value: "text-amber-900",
    icon: "text-amber-600"
  },
  danger: {
    card: "border-red-200 bg-red-50",
    title: "text-red-700",
    value: "text-red-900",
    icon: "text-red-600"
  }
};

const changeTypeStyles: Record<ChangeType, {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = {
  increase: {
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  decrease: {
    icon: TrendingDown,
    color: "text-red-600",
    bgColor: "bg-red-100"
  },
  neutral: {
    icon: Minus,
    color: "text-gray-600",
    bgColor: "bg-gray-100"
  },
  unknown: {
    icon: Minus,
    color: "text-gray-400",
    bgColor: "bg-gray-50"
  }
};

// =============================================================================
// ユーティリティ関数
// =============================================================================

const formatValue = (value: string | number, unit?: string): string => {
  if (typeof value === 'number') {
    // 数値のフォーマット
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M${unit || ''}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K${unit || ''}`;
    } else {
      return `${value.toLocaleString('ja-JP')}${unit || ''}`;
    }
  }
  return `${value}${unit || ''}`;
};

const formatChangeValue = (change: KPIChange): string => {
  const sign = change.value > 0 ? '+' : '';
  const formatted = Math.abs(change.value) >= 100 
    ? change.value.toFixed(0) 
    : change.value.toFixed(1);
  return `${sign}${formatted}${change.unit || '%'}`;
};

// =============================================================================
// サブコンポーネント
// =============================================================================

const LoadingKPICard: React.FC<Pick<KPICardProps, 'compact' | 'className'>> = ({ 
  compact, 
  className 
}) => (
  <Card className={`${variantStyles.default.card} ${className || ''}`}>
    <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-2' : 'space-y-0 pb-2'}`}>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent className={compact ? 'pt-0' : ''}>
      <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
      <div className="h-3 bg-gray-100 rounded animate-pulse w-20"></div>
    </CardContent>
  </Card>
);

const ErrorKPICard: React.FC<Pick<KPICardProps, 'error' | 'onRetry' | 'title' | 'compact' | 'className'>> = ({
  error,
  onRetry,
  title,
  compact,
  className
}) => (
  <Card className={`${variantStyles.danger.card} ${className || ''}`}>
    <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-2' : 'space-y-0 pb-2'}`}>
      <CardTitle className={`${compact ? 'text-sm' : 'text-sm'} font-medium text-red-700`}>
        {title || 'エラー'}
      </CardTitle>
      <AlertTriangle className="h-4 w-4 text-red-500" />
    </CardHeader>
    <CardContent className={compact ? 'pt-0' : ''}>
      <div className="text-center py-2">
        <p className="text-sm text-red-600 mb-2">
          {error instanceof Error ? error.message : error || 'データの読み込みに失敗しました'}
        </p>
        {onRetry && (
          <Button 
            onClick={onRetry} 
            variant="outline" 
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            再試行
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

// =============================================================================
// メインコンポーネント
// =============================================================================

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  description,
  change,
  icon: Icon,
  variant = 'default',
  customColor,
  badge,
  loadingState = 'idle',
  onClick,
  actions,
  error,
  onRetry,
  compact = false,
  className = ""
}) => {
  // ローディング状態の表示
  if (loadingState === 'loading') {
    return <LoadingKPICard compact={compact} className={className} />;
  }

  // エラー状態の表示
  if (loadingState === 'error' || error) {
    return (
      <ErrorKPICard 
        error={error} 
        onRetry={onRetry} 
        title={title}
        compact={compact} 
        className={className} 
      />
    );
  }

  const styles = variantStyles[variant];
  const isClickable = Boolean(onClick);

  return (
    <Card 
      className={`
        ${styles.card} 
        ${className}
        ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      `}
      onClick={onClick}
    >
      <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-2' : 'space-y-0 pb-2'}`}>
        <CardTitle className={`${compact ? 'text-sm' : 'text-sm'} font-medium ${styles.title}`}>
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.label}
            </Badge>
          )}
          {Icon && (
            <Icon 
              className={`h-4 w-4 ${styles.icon}`} 
              style={customColor ? { color: customColor } : {}}
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent className={compact ? 'pt-0' : ''}>
        {/* 値の表示 */}
        <div className="flex items-center gap-2 mb-1">
          <div 
            className={`${compact ? 'text-xl' : 'text-2xl'} font-bold ${styles.value}`}
            style={customColor ? { color: customColor } : {}}
          >
            {formatValue(value, unit)}
          </div>
          
          {/* 変化の表示 */}
          {change && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${changeTypeStyles[change.type].bgColor}`}>
              {React.createElement(changeTypeStyles[change.type].icon, {
                className: `h-3 w-3 ${changeTypeStyles[change.type].color}`
              })}
              <span className={`text-xs font-medium ${changeTypeStyles[change.type].color}`}>
                {formatChangeValue(change)}
              </span>
            </div>
          )}
        </div>
        
        {/* 説明文 */}
        {description && (
          <p className={`text-xs ${styles.title} ${compact ? 'mt-1' : 'mt-1'}`}>
            {description}
          </p>
        )}
        
        {/* 変化の期間情報 */}
        {change?.period && (
          <p className="text-xs text-slate-500 mt-1">
            {change.period}
          </p>
        )}
        
        {/* アクションボタン */}
        {actions && actions.length > 0 && (
          <div className={`flex gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                variant={action.variant || 'outline'}
                size="sm"
                disabled={action.disabled}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =============================================================================
// プリセットコンポーネント
// =============================================================================

export const MetricCard: React.FC<Omit<KPICardProps, 'variant'>> = (props) => (
  <KPICard {...props} variant="default" />
);

export const PerformanceCard: React.FC<Omit<KPICardProps, 'variant'>> = (props) => (
  <KPICard {...props} variant="primary" />
);

export const SuccessCard: React.FC<Omit<KPICardProps, 'variant'>> = (props) => (
  <KPICard {...props} variant="success" />
);

export const WarningCard: React.FC<Omit<KPICardProps, 'variant'>> = (props) => (
  <KPICard {...props} variant="warning" />
);

export const DangerCard: React.FC<Omit<KPICardProps, 'variant'>> = (props) => (
  <KPICard {...props} variant="danger" />
);

// =============================================================================
// デフォルトエクスポート
// =============================================================================

export default KPICard; 