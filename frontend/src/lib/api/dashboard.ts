import { DashboardData, DashboardFilters } from '@/types/dashboard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7059/api';

export async function getDashboardData(filters?: DashboardFilters): Promise<DashboardData> {
  try {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString());
        params.append('endDate', filters.dateRange.end.toISOString());
      }
      if (filters.storeId) {
        params.append('storeId', filters.storeId);
      }
    }

    const response = await fetch(`${API_BASE_URL}/dashboard?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        // 'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

export async function refreshDashboardData(storeId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storeId }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh dashboard data: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error refreshing dashboard data:', error);
    throw error;
  }
}

// Mock data generator for development
export function generateMockDashboardData(): DashboardData {
  const today = new Date();
  const salesData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    salesData.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 5000) + 3000,
      orders: Math.floor(Math.random() * 15) + 10,
    });
  }

  return {
    summary: {
      totalRevenue: 125840.50,
      totalOrders: 342,
      averageOrderValue: 368.01,
      conversionRate: 3.42,
      revenueChange: Math.random() * 20 - 10,
      ordersChange: Math.random() * 20 - 10,
      aovChange: Math.random() * 10 - 5,
      conversionChange: Math.random() * 5 - 2.5,
    },
    salesChart: {
      data: salesData,
    },
    topProducts: [
      { id: '1', name: 'Premium Wireless Headphones', revenue: 12500, units: 50, trend: 15.3 },
      { id: '2', name: 'Smart Watch Pro', revenue: 9800, units: 35, trend: 8.7 },
      { id: '3', name: 'Laptop Stand Adjustable', revenue: 7600, units: 120, trend: -2.1 },
      { id: '4', name: 'USB-C Hub 7-in-1', revenue: 6200, units: 95, trend: 22.4 },
      { id: '5', name: 'Mechanical Keyboard RGB', revenue: 5400, units: 30, trend: 5.6 },
    ],
    recentOrders: [
      {
        id: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customer: '山田太郎',
        total: 15800,
        status: 'fulfilled',
        date: new Date().toISOString(),
        items: 3,
      },
      {
        id: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customer: '佐藤花子',
        total: 8900,
        status: 'processing',
        date: new Date(Date.now() - 3600000).toISOString(),
        items: 2,
      },
      {
        id: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customer: '鈴木一郎',
        total: 23500,
        status: 'pending',
        date: new Date(Date.now() - 7200000).toISOString(),
        items: 5,
      },
      {
        id: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customer: '高橋美咲',
        total: 12300,
        status: 'fulfilled',
        date: new Date(Date.now() - 86400000).toISOString(),
        items: 2,
      },
      {
        id: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customer: '田中健二',
        total: 6700,
        status: 'cancelled',
        date: new Date(Date.now() - 172800000).toISOString(),
        items: 1,
      },
    ],
  };
}