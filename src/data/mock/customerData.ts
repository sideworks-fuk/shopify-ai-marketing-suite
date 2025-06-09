import { getRandomProducts, SAMPLE_PRODUCTS, getCategoryName } from "../../lib/sample-products"

// 顧客データの型定義
export interface CustomerSegment {
  name: string;
  value: number;
  color: string;
}

export interface CustomerAcquisition {
  month: string;
  newCustomers: number;
  cost: number;
}

export interface CustomerLifetimeValue {
  segment: string;
  ltv: number;
  orders: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  orders: number;
  lastOrder: string;
  segment: string;
}

export interface PurchaseFrequency {
  frequency: string;
  current: number;
  previous: number;
}

export interface FLayerTrend {
  month: string;
  F1: number;
  F2: number;
  F3: number;
  F4: number;
  F5: number;
}

export interface DormantCustomer {
  period: string;
  count: number;
  action: string;
}

// Phase 2: 商品情報のインターフェース
export interface ProductInfo {
  name: string;
  count: number;
  percentage: number;
  category: string;
  isRepeat: boolean;
}

export interface CustomerDetail {
  id: string;
  name: string;
  purchaseCount: number;
  totalAmount: number;
  frequency: number;
  avgInterval: number;
  topProduct: string;
  status: "VIP" | "リピーター" | "新規" | "休眠";
  lastOrderDate: Date;
  // Phase 2: 商品情報を追加
  topProducts: ProductInfo[];
  productCategories: string[];
  repeatProducts: number;
}

// 休眠顧客分析用の型定義
export type DormancyReason = 
  | 'price_sensitivity'
  | 'product_dissatisfaction' 
  | 'competitor_switch'
  | 'natural_churn'
  | 'seasonal'
  | 'unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DormantAction {
  id: string;
  name: string;
  description: string;
  priority: number;
  estimatedCost: number;
  expectedReturn: number;
}

export interface DormantCustomerDetail extends CustomerDetail {
  dormancy: {
    lastPurchaseDate: Date;
    daysSincePurchase: number;
    previousFrequency: number; // 休眠前の平均購入頻度（日数）
    estimatedReason: DormancyReason;
    riskLevel: RiskLevel;
  };
  analytics: {
    ltv: number;
    averageOrderValue: number;
    favoriteCategories: string[];
    seasonalPattern?: string;
    purchaseDecline: number; // 購入頻度の減少率（%）
  };
  reactivation: {
    probability: number; // 復帰可能性スコア（0-100）
    recommendedActions: DormantAction[];
    optimalTiming: Date;
    estimatedValue: number; // 復帰時の推定売上
  };
}

export interface DormantSegment {
  id: string;
  label: string;
  range: [number, number]; // [最小日数, 最大日数]
  count: number;
  color: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface DormantKPI {
  totalDormantCustomers: number;
  dormancyRate: number; // 全顧客に対する休眠率（%）
  averageDormancyPeriod: number; // 平均休眠期間（日）
  reactivationRate: number; // 復帰成功率（%）
  estimatedLoss: number; // 休眠による推定損失額
  recoveredRevenue: number; // 復帰による回復売上
}

export interface DormantTrend {
  month: string;
  newDormant: number; // 新規休眠顧客数
  reactivated: number; // 復帰顧客数
  netChange: number; // 純増減
  totalDormant: number; // 累計休眠顧客数
}

// モックデータ
export const customerSegmentData: CustomerSegment[] = [
  { name: "新規顧客", value: 35, color: "#3b82f6" },
  { name: "リピーター", value: 45, color: "#10b981" },
  { name: "VIP顧客", value: 15, color: "#f59e0b" },
  { name: "休眠顧客", value: 5, color: "#ef4444" },
];

export const customerAcquisitionData: CustomerAcquisition[] = [
  { month: "1月", newCustomers: 120, cost: 45000 },
  { month: "2月", newCustomers: 135, cost: 52000 },
  { month: "3月", newCustomers: 158, cost: 48000 },
  { month: "4月", newCustomers: 142, cost: 51000 },
  { month: "5月", newCustomers: 167, cost: 49000 },
  { month: "6月", newCustomers: 189, cost: 53000 },
];

export const customerLifetimeValueData: CustomerLifetimeValue[] = [
  { segment: "新規", ltv: 15000, orders: 1.2 },
  { segment: "リピーター", ltv: 45000, orders: 3.8 },
  { segment: "VIP", ltv: 120000, orders: 8.5 },
  { segment: "休眠", ltv: 8000, orders: 0.8 },
];

export const topCustomers: TopCustomer[] = [
  { id: "C001", name: "田中 太郎", totalSpent: 450000, orders: 12, lastOrder: "2024-03-15", segment: "VIP" },
  { id: "C002", name: "佐藤 花子", totalSpent: 380000, orders: 9, lastOrder: "2024-03-18", segment: "VIP" },
  { id: "C003", name: "鈴木 一郎", totalSpent: 320000, orders: 8, lastOrder: "2024-03-20", segment: "リピーター" },
  { id: "C004", name: "高橋 美咲", totalSpent: 280000, orders: 7, lastOrder: "2024-03-12", segment: "リピーター" },
  { id: "C005", name: "伊藤 健太", totalSpent: 250000, orders: 6, lastOrder: "2024-03-22", segment: "リピーター" },
];

export const purchaseFrequencyData: PurchaseFrequency[] = [
  { frequency: "1回", current: 1500, previous: 1200 },
  { frequency: "2回", current: 800, previous: 750 },
  { frequency: "3回", current: 450, previous: 520 },
  { frequency: "4回", current: 280, previous: 290 },
  { frequency: "5回", current: 180, previous: 200 },
  { frequency: "6回", current: 120, previous: 130 },
  { frequency: "7回", current: 90, previous: 85 },
  { frequency: "8回", current: 70, previous: 65 },
  { frequency: "9回", current: 55, previous: 50 },
  { frequency: "10回", current: 45, previous: 40 },
];

export const fLayerTrendData: FLayerTrend[] = [
  { month: "1月", F1: 120, F2: 80, F3: 45, F4: 28, F5: 15 },
  { month: "2月", F1: 135, F2: 85, F3: 50, F4: 30, F5: 18 },
  { month: "3月", F1: 150, F2: 90, F3: 55, F4: 32, F5: 20 },
  { month: "4月", F1: 140, F2: 88, F3: 52, F4: 31, F5: 19 },
  { month: "5月", F1: 160, F2: 95, F3: 58, F4: 35, F5: 22 },
  { month: "6月", F1: 170, F2: 100, F3: 60, F4: 38, F5: 24 },
  { month: "7月", F1: 180, F2: 105, F3: 65, F4: 40, F5: 26 },
  { month: "8月", F1: 190, F2: 110, F3: 68, F4: 42, F5: 28 },
  { month: "9月", F1: 175, F2: 102, F3: 62, F4: 39, F5: 25 },
  { month: "10月", F1: 165, F2: 98, F3: 59, F4: 36, F5: 23 },
  { month: "11月", F1: 155, F2: 92, F3: 56, F4: 34, F5: 21 },
  { month: "12月", F1: 145, F2: 87, F3: 53, F4: 33, F5: 20 },
];

export const dormantCustomersData: DormantCustomer[] = [
  { period: "3ヶ月", count: 89, action: "早期リテンション" },
  { period: "6ヶ月", count: 156, action: "復帰キャンペーン" },
  { period: "12ヶ月", count: 67, action: "特別オファー" },
  { period: "24ヶ月+", count: 45, action: "最終アプローチ" },
];

// 実際の商品名を生成する関数
const getRandomProductName = (): string => {
  const randomProduct = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)]
  return randomProduct.name
}

const getTopProductsByCategory = (categories: string[]): Array<{ name: string; count: number; percentage: number; category: string; isRepeat: boolean }> => {
  const products: Array<{ name: string; count: number; percentage: number; category: string; isRepeat: boolean }> = []
  
  categories.forEach((category, index) => {
    let categoryProducts: any[] = []
    
    // カテゴリに基づいて商品を選択
    if (category === "デコ箱・ケーキ系") {
      categoryProducts = SAMPLE_PRODUCTS.filter(p => 
        p.name.includes('デコ箱') || p.name.includes('カットケーキ箱')
      )
    } else if (category === "パウンドケーキ箱") {
      categoryProducts = SAMPLE_PRODUCTS.filter(p => 
        p.name.includes('パウンドケーキ箱')
      )
    } else if (category === "ギフト・包装材") {
      categoryProducts = SAMPLE_PRODUCTS.filter(p => 
        p.name.includes('ギフトボックス') || p.name.includes('紙袋') || p.name.includes('透明バッグ')
      )
    } else if (category === "プラトレー・紙トレー") {
      categoryProducts = SAMPLE_PRODUCTS.filter(p => 
        p.name.includes('プラトレー') || p.name.includes('紙トレー')
      )
    } else if (category === "配送・保冷材") {
      categoryProducts = SAMPLE_PRODUCTS.filter(p => 
        p.name.includes('ダンボール') || p.name.includes('保冷') || p.name.includes('hacobo')
      )
    } else {
      // その他のカテゴリ
      categoryProducts = SAMPLE_PRODUCTS.filter(p => p.category === 'specialty')
    }
    
    if (categoryProducts.length > 0) {
      const selectedProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)]
      const count = Math.floor(Math.random() * 8) + 1
      const percentage = index === 0 ? 50 + Math.floor(Math.random() * 30) : 
                        index === 1 ? 25 + Math.floor(Math.random() * 20) :
                        10 + Math.floor(Math.random() * 15)
      
      products.push({
        name: selectedProduct.name,
        count,
        percentage,
        category,
        isRepeat: Math.random() > 0.3
      })
    }
  })
  
  return products
}

export const customerDetailData: CustomerDetail[] = [
  {
    id: "12345",
    name: "田中太郎",
    purchaseCount: 15,
    totalAmount: 450000,
    frequency: 2.5,
    avgInterval: 14,
    topProduct: getRandomProductName(),
    status: "VIP",
    lastOrderDate: new Date("2024-05-20"),
    topProducts: getTopProductsByCategory(["デコ箱・ケーキ系", "パウンドケーキ箱", "ギフト・包装材"]),
    productCategories: ["デコ箱・ケーキ系", "パウンドケーキ箱", "ギフト・包装材"],
    repeatProducts: 3,
  },
  {
    id: "12346",
    name: "鈴木花子",
    purchaseCount: 8,
    totalAmount: 180000,
    frequency: 1.8,
    avgInterval: 20,
    topProduct: getRandomProductName(),
    status: "リピーター",
    lastOrderDate: new Date("2024-05-15"),
    topProducts: getTopProductsByCategory(["プラトレー・紙トレー", "ギフト・包装材"]),
    productCategories: ["プラトレー・紙トレー", "ギフト・包装材"],
    repeatProducts: 2,
  },
  {
    id: "12347",
    name: "佐藤次郎",
    purchaseCount: 3,
    totalAmount: 75000,
    frequency: 0.8,
    avgInterval: 45,
    topProduct: getRandomProductName(),
    status: "新規",
    lastOrderDate: new Date("2024-05-10"),
    topProducts: getTopProductsByCategory(["デコ箱・ケーキ系"]),
    productCategories: ["デコ箱・ケーキ系"],
    repeatProducts: 1,
  },
  {
    id: "12348",
    name: "高橋雅子",
    purchaseCount: 8,
    totalAmount: 230000,
    frequency: 1.5,
    avgInterval: 21,
    topProduct: getRandomProductName(),
    status: "リピーター",
    lastOrderDate: new Date("2024-05-18"),
    topProducts: getTopProductsByCategory(["配送・保冷材", "デコ箱・ケーキ系", "ギフト・包装材"]),
    productCategories: ["配送・保冷材", "デコ箱・ケーキ系", "ギフト・包装材"],
    repeatProducts: 2,
  },
  {
    id: "12349",
    name: "伊藤健太",
    purchaseCount: 2,
    totalAmount: 45000,
    frequency: 0.5,
    avgInterval: 60,
    topProduct: getRandomProductName(),
    status: "リピーター",
    lastOrderDate: new Date("2024-03-25"),
    topProducts: getTopProductsByCategory(["パウンドケーキ箱"]),
    productCategories: ["パウンドケーキ箱"],
    repeatProducts: 0,
  },
  {
    id: "12350",
    name: "渡辺美咲",
    purchaseCount: 0,
    totalAmount: 35000,
    frequency: 0,
    avgInterval: 180,
    topProduct: getRandomProductName(),
    status: "休眠",
    lastOrderDate: new Date("2023-12-05"),
    topProducts: getTopProductsByCategory(["ギフト・包装材"]),
    productCategories: ["ギフト・包装材"],
    repeatProducts: 0,
  },
  {
    id: "12351",
    name: "山本大輔",
    purchaseCount: 22,
    totalAmount: 680000,
    frequency: 3.2,
    avgInterval: 10,
    topProduct: getRandomProductName(),
    status: "VIP",
    lastOrderDate: new Date("2024-05-22"),
    topProducts: getTopProductsByCategory(["デコ箱・ケーキ系", "プラトレー・紙トレー", "配送・保冷材"]),
    productCategories: ["デコ箱・ケーキ系", "プラトレー・紙トレー", "配送・保冷材"],
    repeatProducts: 3,
  },
  {
    id: "12352",
    name: "中村優子",
    purchaseCount: 5,
    totalAmount: 120000,
    frequency: 1.2,
    avgInterval: 28,
    topProduct: getRandomProductName(),
    status: "リピーター",
    lastOrderDate: new Date("2024-04-30"),
    topProducts: getTopProductsByCategory(["ギフト・包装材", "パウンドケーキ箱"]),
    productCategories: ["ギフト・包装材", "パウンドケーキ箱"],
    repeatProducts: 1,
  },
  {
    id: "12353",
    name: "小林正人",
    purchaseCount: 0,
    totalAmount: 28000,
    frequency: 0,
    avgInterval: 120,
    topProduct: getRandomProductName(),
    status: "休眠",
    lastOrderDate: new Date("2024-01-15"),
    topProducts: getTopProductsByCategory(["配送・保冷材"]),
    productCategories: ["配送・保冷材"],
    repeatProducts: 0,
  },
  {
    id: "12354",
    name: "加藤裕子",
    purchaseCount: 12,
    totalAmount: 320000,
    frequency: 2.0,
    avgInterval: 16,
    topProduct: "商品J",
    status: "VIP",
    lastOrderDate: new Date("2024-05-15"),
    topProducts: [
      { name: "プレミアム美容液", count: 7, percentage: 58, category: "美容", isRepeat: true },
      { name: "アンチエイジングクリーム", count: 3, percentage: 25, category: "美容", isRepeat: true },
      { name: "フェイスマスク", count: 2, percentage: 17, category: "美容", isRepeat: false }
    ],
    productCategories: ["美容"],
    repeatProducts: 2,
  },
];

// 色定義
export const colors = {
  active: "#10B981", // 緑系
  atRisk: "#F59E0B", // オレンジ系
  vip: "#F59E0B", // ゴールド系
  dormant: "#6B7280", // グレー系
  primary: "#10B981", // プライマリカラー（緑系）
  secondary: "#3B82F6", // セカンダリカラー（青系）
  accent: "#8B5CF6", // アクセントカラー（紫系）
  danger: "#EF4444", // 危険色（赤系）
  heatmap: ["#DCFCE7", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A"], // 緑系グラデーション
} as const;

// 休眠顧客分析用のモックデータ

export const dormantSegments: DormantSegment[] = [
  { id: '3months', label: '3ヶ月', range: [90, 119], count: 45, color: '#FEF3C7', urgency: 'medium' },
  { id: '4months', label: '4ヶ月', range: [120, 149], count: 38, color: '#FED7AA', urgency: 'medium' },
  { id: '5months', label: '5ヶ月', range: [150, 179], count: 29, color: '#FECACA', urgency: 'high' },
  { id: '6months', label: '6ヶ月', range: [180, 209], count: 22, color: '#FCA5A5', urgency: 'high' },
  { id: '9months', label: '9ヶ月', range: [270, 329], count: 18, color: '#F87171', urgency: 'critical' },
  { id: '12months', label: '12ヶ月', range: [360, 449], count: 15, color: '#EF4444', urgency: 'critical' },
  { id: '18months', label: '18ヶ月', range: [540, 629], count: 8, color: '#DC2626', urgency: 'critical' },
  { id: '24months', label: '24ヶ月+', range: [720, 9999], count: 5, color: '#B91C1C', urgency: 'critical' },
];

export const dormantKPIData: DormantKPI = {
  totalDormantCustomers: 180,
  dormancyRate: 12.5, // 全顧客の12.5%が休眠
  averageDormancyPeriod: 156, // 平均5.2ヶ月
  reactivationRate: 18.3, // 18.3%が復帰
  estimatedLoss: 8450000, // 845万円の損失
  recoveredRevenue: 2340000, // 234万円の回復売上
};

export const dormantTrendData: DormantTrend[] = [
  { month: '1月', newDormant: 15, reactivated: 8, netChange: 7, totalDormant: 168 },
  { month: '2月', newDormant: 18, reactivated: 12, netChange: 6, totalDormant: 174 },
  { month: '3月', newDormant: 22, reactivated: 9, netChange: 13, totalDormant: 187 },
  { month: '4月', newDormant: 19, reactivated: 15, netChange: 4, totalDormant: 191 },
  { month: '5月', newDormant: 16, reactivated: 18, netChange: -2, totalDormant: 189 },
  { month: '6月', newDormant: 14, reactivated: 23, netChange: -9, totalDormant: 180 },
];

export const reactivationActions: DormantAction[] = [
  {
    id: 'welcome_back_email',
    name: 'おかえりなさいメール',
    description: '個人化されたウェルカムバックメールを送信',
    priority: 1,
    estimatedCost: 500,
    expectedReturn: 15000,
  },
  {
    id: 'discount_coupon',
    name: '復帰クーポン',
    description: '10-20%割引クーポンを提供',
    priority: 2,
    estimatedCost: 2000,
    expectedReturn: 25000,
  },
  {
    id: 'product_recommendation',
    name: '商品レコメンド',
    description: '過去の購入履歴に基づく商品提案',
    priority: 1,
    estimatedCost: 300,
    expectedReturn: 18000,
  },
  {
    id: 'limited_offer',
    name: '限定オファー',
    description: '期間限定の特別オファー',
    priority: 3,
    estimatedCost: 3000,
    expectedReturn: 35000,
  },
  {
    id: 'loyalty_points',
    name: 'ポイント付与',
    description: 'ボーナスポイントの付与',
    priority: 2,
    estimatedCost: 1500,
    expectedReturn: 20000,
  },
];

// 詳細な休眠顧客データ（既存CustomerDetailDataを拡張）
export const dormantCustomerDetails: DormantCustomerDetail[] = [
  {
    ...customerDetailData[5], // 渡辺美咲
    dormancy: {
      lastPurchaseDate: customerDetailData[5].lastOrderDate,
      daysSincePurchase: 189,
      previousFrequency: 45, // 45日おき
      estimatedReason: 'product_dissatisfaction',
      riskLevel: 'high',
    },
    analytics: {
      ltv: 35000,
      averageOrderValue: 35000,
      favoriteCategories: ['ギフト・包装材'],
      seasonalPattern: 'winter',
      purchaseDecline: 85, // 85%減少
    },
    reactivation: {
      probability: 32,
      recommendedActions: [reactivationActions[0], reactivationActions[1]],
      optimalTiming: new Date('2024-06-15'),
      estimatedValue: 42000,
    },
  },
  {
    ...customerDetailData[8], // 小林正人
    dormancy: {
      lastPurchaseDate: customerDetailData[8].lastOrderDate,
      daysSincePurchase: 127,
      previousFrequency: 30, // 30日おき
      estimatedReason: 'seasonal',
      riskLevel: 'medium',
    },
    analytics: {
      ltv: 28000,
      averageOrderValue: 28000,
      favoriteCategories: ['配送・保冷材'],
      seasonalPattern: 'spring',
      purchaseDecline: 70,
    },
    reactivation: {
      probability: 48,
      recommendedActions: [reactivationActions[2], reactivationActions[4]],
      optimalTiming: new Date('2024-07-01'),
      estimatedValue: 35000,
    },
  },
  // 追加の休眠顧客データ
  {
    id: "12355",
    name: "松本理恵",
    purchaseCount: 6,
    totalAmount: 180000,
    frequency: 1.0,
    avgInterval: 30,
    topProduct: getRandomProductName(),
    status: "休眠",
    lastOrderDate: new Date("2024-02-20"),
    topProducts: getTopProductsByCategory(["ギフト・包装材", "デコ箱・ケーキ系"]),
    productCategories: ["ギフト・包装材", "デコ箱・ケーキ系"],
    repeatProducts: 2,
    dormancy: {
      lastPurchaseDate: new Date('2024-02-20'),
      daysSincePurchase: 101,
      previousFrequency: 30,
      estimatedReason: 'price_sensitivity',
      riskLevel: 'medium',
    },
    analytics: {
      ltv: 180000,
      averageOrderValue: 30000,
      favoriteCategories: ['ギフト・包装材', 'デコ箱・ケーキ系'],
      seasonalPattern: 'summer',
      purchaseDecline: 65,
    },
    reactivation: {
      probability: 55,
      recommendedActions: [reactivationActions[1], reactivationActions[2]],
      optimalTiming: new Date('2024-06-20'),
      estimatedValue: 38000,
    },
  },
  {
    id: "12356",
    name: "岡田慎一",
    purchaseCount: 4,
    totalAmount: 95000,
    frequency: 0.8,
    avgInterval: 40,
    topProduct: getRandomProductName(),
    status: "休眠",
    lastOrderDate: new Date("2023-11-10"),
    topProducts: getTopProductsByCategory(["パウンドケーキ箱", "配送・保冷材"]),
    productCategories: ["パウンドケーキ箱", "配送・保冷材"],
    repeatProducts: 1,
    dormancy: {
      lastPurchaseDate: new Date('2023-11-10'),
      daysSincePurchase: 218,
      previousFrequency: 40,
      estimatedReason: 'competitor_switch',
      riskLevel: 'high',
    },
    analytics: {
      ltv: 95000,
      averageOrderValue: 23750,
      favoriteCategories: ['パウンドケーキ箱', '配送・保冷材'],
      purchaseDecline: 90,
    },
    reactivation: {
      probability: 25,
      recommendedActions: [reactivationActions[3], reactivationActions[0]],
      optimalTiming: new Date('2024-07-10'),
      estimatedValue: 28000,
    },
  }
];

// 休眠理由別の分布データ
export const dormancyReasonData = [
  { reason: '商品不満', count: 35, percentage: 19.4, color: '#EF4444' },
  { reason: '価格感度', count: 45, percentage: 25.0, color: '#F59E0B' },
  { reason: '競合流出', count: 28, percentage: 15.6, color: '#8B5CF6' },
  { reason: '自然離脱', count: 52, percentage: 28.9, color: '#6B7280' },
  { reason: '季節要因', count: 15, percentage: 8.3, color: '#10B981' },
  { reason: '不明', count: 5, percentage: 2.8, color: '#D1D5DB' },
];

// 復帰インサイトデータ
export const reactivationInsights = {
  successRate: 42,
  keyInsights: [
    "購入パターン分析により、月末のアプローチが最も効果的です（復帰率62%向上）",
    "過去購入商品のレコメンドを含むメールの開封率は一般的なメールの3.2倍です",
    "限定オファーと組み合わせた場合、復帰率が85%向上することが判明しました"
  ],
  recommendations: [
    {
      priority: 'high' as const,
      action: 'パーソナライズドオファー',
      description: '高確率復帰見込み顧客に対する限定クーポン＋お気に入り商品レコメンド',
      estimatedCost: 2500,
      estimatedRevenue: 8700,
      targetCount: 45,
      timeline: '即時実行'
    },
    {
      priority: 'medium' as const,
      action: '段階的リエンゲージメント',
      description: '中確率見込み顧客に対する3段階メールシーケンス',
      estimatedCost: 800,
      estimatedRevenue: 4200,
      targetCount: 67,
      timeline: '2週間'
    },
    {
      priority: 'low' as const,
      action: 'ブランド再認知キャンペーン',
      description: '低確率見込み顧客に対する価値提供コンテンツ配信',
      estimatedCost: 300,
      estimatedRevenue: 1800,
      targetCount: 68,
      timeline: '1ヶ月'
    }
  ]
};

// 復帰キャンペーンテンプレート
export const reactivationCampaigns = [
  {
    id: 'welcome_back_premium',
    name: 'プレミアムお帰りなさいキャンペーン',
    description: '3ヶ月以上の休眠顧客向け特別復帰プログラム',
    targetSegment: '90日以上休眠',
    channels: ['メール', 'SMS', 'プッシュ通知'],
    offer: {
      type: '割引クーポン',
      value: '20%OFF',
      conditions: '5,000円以上の購入',
      validDays: 14
    },
    timing: {
      bestDayOfWeek: '金曜日',
      bestTimeOfDay: '19:00-21:00',
      duration: '2週間'
    },
    expectedResults: {
      openRate: 28,
      clickRate: 12,
      conversionRate: 8,
      averageOrderValue: 15000
    },
    creativeElements: [
      'パーソナライズド件名',
      '過去購入商品のレコメンド',
      '限定感を演出するカウントダウン',
      'お客様専用クーポンコード'
    ]
  },
  {
    id: 'seasonal_return',
    name: '季節限定復帰オファー',
    description: '季節要因で休眠した顧客向けの特別提案',
    targetSegment: '季節休眠顧客',
    channels: ['メール', 'LINE'],
    offer: {
      type: '送料無料＋ギフト',
      value: '送料無料＋サンプル3点セット',
      conditions: '3,000円以上の購入',
      validDays: 10
    },
    timing: {
      bestDayOfWeek: '日曜日',
      bestTimeOfDay: '10:00-12:00',
      duration: '10日間'
    },
    expectedResults: {
      openRate: 35,
      clickRate: 18,
      conversionRate: 12,
      averageOrderValue: 8500
    },
    creativeElements: [
      '季節感のあるビジュアル',
      '新商品の先行紹介',
      'お得感を強調したヘッダー',
      'SNSシェア特典'
    ]
  },
  {
    id: 'loyalty_recovery',
    name: 'ロイヤルティ復活プログラム',
    description: '過去のVIP顧客向け特別待遇復帰施策',
    targetSegment: '元VIP休眠顧客',
    channels: ['メール', '電話', 'DM'],
    offer: {
      type: 'VIP特典復活',
      value: 'VIPステータス即時復活＋30%OFF',
      conditions: '10,000円以上の購入',
      validDays: 21
    },
    timing: {
      bestDayOfWeek: '水曜日',
      bestTimeOfDay: '14:00-16:00',
      duration: '3週間'
    },
    expectedResults: {
      openRate: 45,
      clickRate: 25,
      conversionRate: 15,
      averageOrderValue: 25000
    },
    creativeElements: [
      'VIP専用デザイン',
      '限定商品への先行アクセス',
      '専用カスタマーサポート',
      'パーソナルショッピングサービス'
    ]
  }
]; 