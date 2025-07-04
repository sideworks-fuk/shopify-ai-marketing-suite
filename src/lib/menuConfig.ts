export interface MenuItem {
  id: string
  label: string
  icon: string
  href?: string  // Optional for parent items
  category: "sales" | "purchase" | "customers" | "ai-insights"
  isImplemented: boolean
  description?: string
  children?: MenuItem[]  // For submenu items
}

export const menuStructure: MenuItem[] = [
  // 一時的に非表示
  // {
  //   id: "sales-dashboard",
  //   label: "売上ダッシュボード",
  //   icon: "📊",
  //   href: "/sales/dashboard",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "売上の全体像と主要KPIを確認"
  // },
  {
    id: "year-over-year",
    label: "前年同月比【商品】",
    icon: "📈",
    href: "/sales/year-over-year",
    category: "sales",
    isImplemented: true,
    description: "商品別の売上トレンドを前年と比較"
  },
  {
    id: "purchase-frequency",
    label: "購入頻度【商品】",
    icon: "🔄",
    href: "/sales/purchase-frequency",
    category: "sales",
    isImplemented: true,
    description: "商品別のリピート購入パターン分析"
  },
  {
    id: "market-basket",
    label: "組み合わせ商品【商品】",
    icon: "🛒",
    href: "/sales/market-basket",
    category: "sales",
    isImplemented: true,
    description: "一緒に購入される商品の組み合わせ分析"
  },
  {
    id: "monthly-stats",
    label: "月別売上統計【購買】",
    icon: "📅",
    href: "/sales/monthly-stats",
    category: "purchase",
    isImplemented: true,
    description: "商品別×月別の売上推移を数量・金額で把握"
  },
  {
    id: "frequency-detail",
    label: "購入回数【購買】",
    icon: "🔢",
    href: "/purchase/frequency-detail",
    category: "purchase",
    isImplemented: true,
    description: "顧客の購入回数別セグメント分析と前年比較"
  },
  {
    id: "f-tier-trend",
    label: "F階層傾向【購買】",
    icon: "📊",
    href: "/purchase/f-tier-trend",
    category: "purchase",
    isImplemented: true,
    description: "購入頻度による顧客階層の時系列変化分析"
  },
  // 一時的に非表示
  // {
  //   id: "customer-dashboard",
  //   label: "顧客ダッシュボード",
  //   icon: "👥",
  //   href: "/customers/dashboard",
  //   category: "customers",
  //   isImplemented: true,
  //   description: "顧客の全体像と主要セグメント"
  // },
  {
    id: "customer-profile",
    label: "顧客購買【顧客】",
    icon: "👤",
    href: "/customers/profile",
    category: "customers",
    isImplemented: true,
    description: "顧客別の詳細な購買プロファイル分析"
  },
  {
    id: "dormant-customers",
    label: "休眠顧客【顧客】",
    icon: "😴",
    href: "/customers/dormant",
    category: "customers",
    isImplemented: true,
    description: "最終購入からの経過期間別に顧客を分類・管理"
  },
  // 一時的に非表示
  // {
  //   id: "ai-insights",
  //   label: "AIインサイト",
  //   icon: "🤖",
  //   href: "/ai-insights",
  //   category: "ai-insights",
  //   isImplemented: true,
  //   description: "AIによる予測分析と自動インサイト生成"
  // }
]

export const getMenuByCategory = (category: string) => {
  return menuStructure.filter(item => item.category === category)
} 