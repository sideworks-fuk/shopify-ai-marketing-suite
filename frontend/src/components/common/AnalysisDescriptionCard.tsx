import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  Info, 
  Target, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  BarChart3,
  Lightbulb 
} from "lucide-react";

export interface AnalysisDescriptionCardProps {
  title: string;
  description: string | React.ReactNode;
  variant?: "purpose" | "usage" | "insight" | "warning" | "tip";
  icon?: React.ComponentType<any>;
  compact?: boolean;
  className?: string;
}

// バリアント別のスタイル定義
const variantStyles = {
  purpose: {
    card: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-900",
    description: "text-blue-800",
    defaultIcon: Target
  },
  usage: {
    card: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
    icon: "text-green-600",
    title: "text-green-900",
    description: "text-green-800",
    defaultIcon: Info
  },
  insight: {
    card: "bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200",
    icon: "text-purple-600",
    title: "text-purple-900",
    description: "text-purple-800",
    defaultIcon: Lightbulb
  },
  warning: {
    card: "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200",
    icon: "text-amber-600",
    title: "text-amber-900",
    description: "text-amber-800",
    defaultIcon: AlertTriangle
  },
  tip: {
    card: "bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200",
    icon: "text-slate-600",
    title: "text-slate-900",
    description: "text-slate-700",
    defaultIcon: Info
  }
};

export const AnalysisDescriptionCard: React.FC<AnalysisDescriptionCardProps> = ({
  title,
  description,
  variant = "purpose",
  icon,
  compact = false,
  className
}) => {
  const styles = variantStyles[variant];
  const IconComponent = icon || styles.defaultIcon;

  return (
    <Card className={cn(styles.card, className)}>
      <CardContent className={cn("pt-6", compact && "pt-4")}>
        <div className="flex items-start gap-4">
          <IconComponent className={cn(
            "flex-shrink-0 mt-1",
            styles.icon,
            compact ? "h-5 w-5" : "h-6 w-6"
          )} />
          <div>
            <h3 className={cn(
              "font-semibold mb-2",
              styles.title,
              compact ? "text-sm" : "text-base"
            )}>
              {title}
            </h3>
            <div className={cn(
              "leading-relaxed",
              styles.description,
              compact ? "text-xs" : "text-sm"
            )}>
              {typeof description === 'string' ? (
                <p dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br />') }} />
              ) : (
                description
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// プリセット定義（各分析画面用）
export const analysisDescriptions = {
  // 休眠顧客分析
  dormantCustomer: {
    title: "休眠顧客分析の目的",
    description: "休眠顧客が何ヶ月も購入していないのか？その商品に満足していないのか？\n購買頻度が低いターゲットのペルソナ設定などを行い、再度購入してもらえるような施策を検討するために、購入が途切れたケースなどを洗い出します。",
    variant: "purpose" as const,
    icon: Target
  },

  // 前年同月比分析
  yearOverYear: {
    title: "前年同月比分析の活用法",
    description: "商品別の成長率を前年と比較することで、好調商品の特定と要注意商品の早期発見ができます。\n季節性や市場トレンドの変化を捉え、在庫計画や販売戦略の最適化に活用してください。",
    variant: "usage" as const,
    icon: TrendingUp
  },

  // 購入頻度分析
  purchaseFrequency: {
    title: "購入頻度分析で得られるインサイト",
    description: "顧客の購入回数分布を分析することで、リピート購入パターンを把握できます。\n1回購入→2回購入の転換率向上が、LTV（顧客生涯価値）最大化の鍵となります。",
    variant: "insight" as const,
    icon: BarChart3
  },

  // 顧客購買分析
  customerPurchase: {
    title: "顧客購買分析のビジネス価値",
    description: "個別顧客の購買プロファイルを詳細分析することで、パーソナライゼーション施策の精度が向上します。\nVIP顧客の特定から新規顧客の育成まで、データドリブンな顧客戦略を実現できます。",
    variant: "purpose" as const,
    icon: Users
  },

  // マーケットバスケット分析
  marketBasket: {
    title: "組み合わせ購買の戦略的活用",
    description: "商品の同時購買パターンを分析することで、クロスセル・アップセルの機会を発見できます。\n推奨商品の提案精度向上や、セット商品企画の根拠データとして活用してください。",
    variant: "usage" as const,
    icon: ShoppingCart
  },

  // 注意・警告系
  dataNote: {
    title: "データ利用上の注意点",
    description: "本分析は過去の購買データに基づく傾向分析です。\n外部要因（季節性、市場環境、プロモーション等）の影響も考慮し、総合的な判断を行ってください。",
    variant: "warning" as const,
    icon: AlertTriangle
  }
};

export default AnalysisDescriptionCard; 