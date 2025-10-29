import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Calendar, Filter, BarChart3 } from "lucide-react";

export interface AnalyticsHeaderUnifiedProps {
  // 基本情報
  mainTitle: string;
  description: string;
  
  // サブ分析タブ（複数分析がある場合）
  subAnalyses?: {
    id: string;
    label: string;
    icon?: React.ComponentType<any>;
    active?: boolean;
  }[];
  
  // 現在の分析状況
  currentAnalysis?: {
    title: string;
    description: string;
    period?: string;
    targetCount?: number;
  };
  
  // バッジ情報
  badges?: {
    label: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
    icon?: React.ComponentType<any>;
  }[];
  
  // スタイル制御
  className?: string;
  compact?: boolean;
}

export const AnalyticsHeaderUnified: React.FC<AnalyticsHeaderUnifiedProps> = ({
  mainTitle,
  description,
  subAnalyses,
  currentAnalysis,
  badges = [],
  className,
  compact = false,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* メイン分析ヘッダー */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className={cn("pb-4", compact && "pb-3")}>
          <div className="space-y-2">
            {/* メインタイトル */}
            <CardTitle className={cn(
              "flex items-center gap-3",
              compact ? "text-xl" : "text-2xl lg:text-3xl"
            )}>
              <BarChart3 className="h-6 w-6 text-blue-600" />
              {mainTitle}
              {badges.length > 0 && (
                <div className="flex gap-2">
                  {badges.map((badge, index) => (
                    <Badge 
                      key={index} 
                      variant={badge.variant || "outline"}
                      className="text-xs"
                    >
                      {badge.icon && <badge.icon className="h-3 w-3 mr-1" />}
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
            </CardTitle>
            
            {/* メイン説明 */}
            {!compact && (
              <p className="text-slate-600 text-sm lg:text-base leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </CardHeader>
        
        {/* サブ分析タブ（複数分析がある場合） */}
        {subAnalyses && subAnalyses.length > 0 && (
          <CardContent className="pt-0">
            <Tabs defaultValue={subAnalyses.find(s => s.active)?.id || subAnalyses[0]?.id}>
              <TabsList className="grid w-full grid-cols-auto gap-1">
                {subAnalyses.map((sub) => (
                  <TabsTrigger 
                    key={sub.id} 
                    value={sub.id}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {sub.icon && <sub.icon className="h-4 w-4" />}
                    {sub.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        )}
      </Card>
      
      {/* 現在の分析コンテキスト（詳細分析時） */}
      {currentAnalysis && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  {currentAnalysis.title}
                </h3>
                <p className="text-blue-800 text-sm">
                  {currentAnalysis.description}
                </p>
                
                {/* 分析条件サマリー */}
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
                  {currentAnalysis.period && (
                    <div className="flex items-center gap-1 text-blue-700">
                      <Calendar className="h-3 w-3" />
                      <span>期間: {currentAnalysis.period}</span>
                    </div>
                  )}
                  {currentAnalysis.targetCount && currentAnalysis.targetCount > 0 && (
                    <div className="flex items-center gap-1 text-blue-700">
                      <Filter className="h-3 w-3" />
                      <span>対象: {currentAnalysis.targetCount}件</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// 使用例のプリセット
export const createYearOverYearHeader = (selectedYear: number, productCount: number) => ({
  mainTitle: "前年同月比分析【商品】",
  description: "商品別の売上トレンドを前年と比較し、成長商品と要注意商品を特定できます",
  subAnalyses: [
    { id: "summary", label: "サマリー表示", icon: BarChart3 },
    { id: "monthly", label: "月別詳細", icon: Calendar },
  ],
  currentAnalysis: {
    title: `${selectedYear}年 vs ${selectedYear - 1}年 詳細比較`,
    description: "商品別月別の前年同月比較分析を表示しています",
    period: `${selectedYear - 1}年1月 〜 ${selectedYear}年12月`,
    targetCount: productCount
  },
  badges: [
    { label: `${productCount}商品`, variant: "outline" as const, icon: Filter }
  ]
});

export const createCustomerAnalysisHeader = (segmentCount: number) => ({
  mainTitle: "顧客購買分析【顧客】",
  description: "顧客別の詳細な購買プロファイルを分析し、VIP顧客の特定とパーソナライゼーション施策に活用",
  currentAnalysis: {
    title: "顧客セグメント別購買パターン分析",
    description: "購買頻度と金額による顧客セグメンテーションを実施中",
    targetCount: segmentCount
  },
  badges: [
    { label: `${segmentCount}名`, variant: "outline" as const },
    { label: "リアルタイムデータ", variant: "secondary" as const }
  ]
});

export default AnalyticsHeaderUnified; 