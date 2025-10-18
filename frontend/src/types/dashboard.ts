export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  revenueChange: number;
  ordersChange: number;
  aovChange: number;
  conversionChange: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
}

export interface Product {
  id: string;
  name: string;
  revenue: number;
  units: number;
  trend: number;
}

export interface Order {
  id: string;
  customer: string;
  total: number;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled';
  date: string;
  items: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  salesChart: {
    data: SalesChartData[];
  };
  topProducts: Product[];
  recentOrders: Order[];
}

export interface DashboardFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  storeId?: string;
}