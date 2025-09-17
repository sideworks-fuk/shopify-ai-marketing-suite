'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopProducts } from '@/components/dashboard/TopProducts';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardData } from '@/lib/api/dashboard';
import type { DashboardData } from '@/types/dashboard';

// Mock data for initial development
const mockDashboardData: DashboardData = {
  summary: {
    totalRevenue: 125840.50,
    totalOrders: 342,
    averageOrderValue: 368.01,
    conversionRate: 3.42,
    revenueChange: 12.5,
    ordersChange: 8.3,
    aovChange: 4.1,
    conversionChange: -0.3,
  },
  salesChart: {
    data: [
      { date: '2025-01-01', revenue: 4200, orders: 12 },
      { date: '2025-01-02', revenue: 3800, orders: 10 },
      { date: '2025-01-03', revenue: 5100, orders: 15 },
      { date: '2025-01-04', revenue: 4500, orders: 13 },
      { date: '2025-01-05', revenue: 6200, orders: 18 },
      { date: '2025-01-06', revenue: 5800, orders: 16 },
      { date: '2025-01-07', revenue: 7200, orders: 21 },
    ],
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
      id: 'ORD-001',
      customer: '山田太郎',
      total: 15800,
      status: 'fulfilled',
      date: '2025-01-07T10:30:00Z',
      items: 3,
    },
    {
      id: 'ORD-002',
      customer: '佐藤花子',
      total: 8900,
      status: 'processing',
      date: '2025-01-07T09:15:00Z',
      items: 2,
    },
    {
      id: 'ORD-003',
      customer: '鈴木一郎',
      total: 23500,
      status: 'pending',
      date: '2025-01-07T08:45:00Z',
      items: 5,
    },
    {
      id: 'ORD-004',
      customer: '高橋美咲',
      total: 12300,
      status: 'fulfilled',
      date: '2025-01-06T16:20:00Z',
      items: 2,
    },
    {
      id: 'ORD-005',
      customer: '田中健二',
      total: 6700,
      status: 'cancelled',
      date: '2025-01-06T14:10:00Z',
      items: 1,
    },
  ],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardData = await getDashboardData();
        setData(dashboardData);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <div className="text-sm text-gray-500">
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="総売上"
          value={data.summary.totalRevenue}
          change={data.summary.revenueChange}
          format="currency"
        />
        <SummaryCard
          title="注文数"
          value={data.summary.totalOrders}
          change={data.summary.ordersChange}
          format="number"
        />
        <SummaryCard
          title="平均注文金額"
          value={data.summary.averageOrderValue}
          change={data.summary.aovChange}
          format="currency"
        />
        <SummaryCard
          title="コンバージョン率"
          value={data.summary.conversionRate}
          change={data.summary.conversionChange}
          format="percent"
        />
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={data.salesChart.data} />
        </CardContent>
      </Card>

      {/* Bottom Section: Top Products and Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>売上上位商品</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProducts products={data.topProducts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近の注文</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentOrders orders={data.recentOrders} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-16 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}