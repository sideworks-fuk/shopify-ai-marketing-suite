import { LucideIcon, RefreshCw, TrendingUp, ShoppingCart, UserCheck, Package, Brain, Settings } from 'lucide-react'

export interface MenuItem {
  id: string
  label: string
  icon: LucideIcon | string  // Lucide icon or legacy string
  href?: string  // Optional for parent items
  category: "settings" | "sales" | "purchase" | "customers" | "ai-insights"
  isImplemented: boolean
  description?: string
  children?: MenuItem[]  // For submenu items
}

export const menuStructure: MenuItem[] = [
  {
    id: "data-sync",
    label: "データ同期",
    icon: RefreshCw,
    href: "/setup/initial",
    category: "settings",
    isImplemented: true,
    description: "データ同期設定・管理画面"
  },
  {
    id: "year-over-year",
    label: "前年同月比分析【商品】",
    icon: TrendingUp,
    href: "/sales/year-over-year",
    category: "sales",
    isImplemented: true,
    description: "商品別の売上トレンドを前年と詳細比較"
  },
  // {
  //   id: "purchase-frequency",
  //   label: "リピート購入分析【商品】",
  //   icon: RefreshCw,
  //   href: "/sales/purchase-frequency",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "商品別のリピート購入パターンと頻度分析"
  // },
  // {
  //   id: "market-basket",
  //   label: "バスケット分析【商品】",
  //   icon: ShoppingCart,
  //   href: "/sales/market-basket",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "一緒に購入される商品の組み合わせとトレンド分析"
  // },
  // {
  //   id: "monthly-stats",
  //   label: "月次売上レポート【購買】",
  //   icon: Package,
  //   href: "/sales/monthly-stats",
  //   category: "purchase",
  //   isImplemented: true,
  //   description: "商品別×月別の売上推移を数量・金額で詳細把握"
  // },
  {
    id: "purchase-count",
    label: "購入回数分析【購買】",
    icon: ShoppingCart,
    href: "/purchase/count-analysis",
    category: "purchase",
    isImplemented: true,
    description: "顧客の購買頻度分析"
  },
  // {
  //   id: "f-tier-trend",
  //   label: "顧客階層トレンド【購買】",
  //   icon: TrendingUp,
  //   href: "/purchase/f-tier-trend",
  //   category: "purchase",
  //   isImplemented: true,
  //   description: "購入頻度による顧客階層の時系列変化とトレンド分析"
  // },
  // {
  //   id: "customer-profile",
  //   label: "顧客プロファイル【顧客】",
  //   icon: UserCheck,
  //   href: "/customers/profile",
  //   category: "customers",
  //   isImplemented: true,
  //   description: "顧客別の詳細な購買履歴とプロファイル分析"
  // },
  {
    id: "dormant-customers",
    label: "休眠顧客分析【顧客】",
    icon: UserCheck,
    href: "/customers/dormant",
    category: "customers",
    isImplemented: true,
    description: "休眠顧客の分析"
  },
]

export const getMenuByCategory = (category: string) => {
  return menuStructure.filter(item => item.category === category)
} 
