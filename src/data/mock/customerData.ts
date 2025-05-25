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

export interface CustomerDetail {
  id: string;
  name: string;
  purchaseCount: number;
  totalAmount: number;
  frequency: number;
  avgInterval: number;
  topProduct: string;
  status: "VIP" | "リピーター" | "新規" | "休眠";
  lastOrderDate: string;
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

export const customerDetailData: CustomerDetail[] = [
  {
    id: "12345",
    name: "田中太郎",
    purchaseCount: 15,
    totalAmount: 450000,
    frequency: 2.5,
    avgInterval: 14,
    topProduct: "商品A",
    status: "VIP",
    lastOrderDate: "2024-05-20",
  },
  {
    id: "12346",
    name: "佐藤花子",
    purchaseCount: 3,
    totalAmount: 89000,
    frequency: 0.8,
    avgInterval: 45,
    topProduct: "商品B",
    status: "リピーター",
    lastOrderDate: "2024-04-15",
  },
  {
    id: "12347",
    name: "鈴木一郎",
    purchaseCount: 1,
    totalAmount: 25000,
    frequency: 0.3,
    avgInterval: 0,
    topProduct: "商品C",
    status: "新規",
    lastOrderDate: "2024-05-10",
  },
  {
    id: "12348",
    name: "高橋雅子",
    purchaseCount: 8,
    totalAmount: 230000,
    frequency: 1.5,
    avgInterval: 21,
    topProduct: "商品D",
    status: "リピーター",
    lastOrderDate: "2024-05-18",
  },
  {
    id: "12349",
    name: "伊藤健太",
    purchaseCount: 2,
    totalAmount: 45000,
    frequency: 0.5,
    avgInterval: 60,
    topProduct: "商品E",
    status: "リピーター",
    lastOrderDate: "2024-03-25",
  },
  {
    id: "12350",
    name: "渡辺美咲",
    purchaseCount: 0,
    totalAmount: 35000,
    frequency: 0,
    avgInterval: 180,
    topProduct: "商品F",
    status: "休眠",
    lastOrderDate: "2023-12-05",
  },
  {
    id: "12351",
    name: "山本大輔",
    purchaseCount: 22,
    totalAmount: 680000,
    frequency: 3.2,
    avgInterval: 10,
    topProduct: "商品G",
    status: "VIP",
    lastOrderDate: "2024-05-22",
  },
  {
    id: "12352",
    name: "中村優子",
    purchaseCount: 5,
    totalAmount: 120000,
    frequency: 1.2,
    avgInterval: 28,
    topProduct: "商品H",
    status: "リピーター",
    lastOrderDate: "2024-04-30",
  },
  {
    id: "12353",
    name: "小林正人",
    purchaseCount: 0,
    totalAmount: 28000,
    frequency: 0,
    avgInterval: 120,
    topProduct: "商品I",
    status: "休眠",
    lastOrderDate: "2024-01-15",
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
    lastOrderDate: "2024-05-15",
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