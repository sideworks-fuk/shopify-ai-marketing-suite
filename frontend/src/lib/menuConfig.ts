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
  // 一時的に非表示 - 休眠顧客分析のみ表示
  // {
  //   id: "sales-overview",
  //   label: "売上ダッシュボード【概要】",
  //   icon: "📊",
  //   href: "/sales/dashboard",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "売上の全体像と主要KPIをリアルタイム確認"
  // },
  // {
  //   id: "year-over-year",
  //   label: "前年同月比較【商品別】",
  //   icon: "📈",
  //   href: "/sales/year-over-year",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "商品別の売上トレンドを前年と詳細比較"
  // },
  // {
  //   id: "purchase-frequency",
  //   label: "リピート購入分析【商品】",
  //   icon: "🔄",
  //   href: "/sales/purchase-frequency",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "商品別のリピート購入パターンと頻度分析"
  // },
  // {
  //   id: "market-basket",
  //   label: "バスケット分析【商品】",
  //   icon: "🛒",
  //   href: "/sales/market-basket",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "一緒に購入される商品の組み合わせとトレンド分析"
  // },
  // {
  //   id: "monthly-stats",
  //   label: "月次売上レポート【購買】",
  //   icon: "📅",
  //   href: "/sales/monthly-stats",
  //   category: "purchase",
  //   isImplemented: true,
  //   description: "商品別×月別の売上推移を数量・金額で詳細把握"
  // },
  // {
  //   id: "frequency-detail",
  //   label: "購入回数セグメント【購買】",
  //   icon: "🔢",
  //   href: "/purchase/frequency-detail",
  //   category: "purchase",
  //   isImplemented: true,
  //   description: "顧客の購入回数別セグメント分析と前年比較レポート"
  // },
  // {
  //   id: "f-tier-trend",
  //   label: "顧客階層トレンド【購買】",
  //   icon: "📊",
  //   href: "/purchase/f-tier-trend",
  //   category: "purchase",
  //   isImplemented: true,
  //   description: "購入頻度による顧客階層の時系列変化とトレンド分析"
  // },
  // {
  //   id: "customer-profile",
  //   label: "顧客プロファイル【顧客】",
  //   icon: "👤",
  //   href: "/customers/profile",
  //   category: "customers",
  //   isImplemented: true,
  //   description: "顧客別の詳細な購買履歴とプロファイル分析"
  // },
  {
    id: "dormant-customers",
    label: "休眠顧客【顧客】",
    icon: "😴",
    href: "/customers/dormant",
    category: "customers",
    isImplemented: true,
    description: "最終購入からの経過期間別顧客分類と復帰施策管理"
  },
]

export const getMenuByCategory = (category: string) => {
  return menuStructure.filter(item => item.category === category)
} 