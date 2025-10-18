'use client';

import { Page, Layout, Card, Text, Badge, DataTable } from '@shopify/polaris';
import NavigationLayout from '@/components/layout/Navigation';
import { useEffect, useState } from 'react';
import { ordersApi } from '@/lib/api';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  monthlyTrackings: number;
  planLimit: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    shippedOrders: 0,
    monthlyTrackings: 0,
    planLimit: 10,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 注文データの取得（実際のAPIが準備できたら置き換え）
      // const data = await ordersApi.getOrders({ limit: 5 });
      
      // ダミーデータ
      setStats({
        totalOrders: 150,
        pendingOrders: 32,
        shippedOrders: 118,
        monthlyTrackings: 5,
        planLimit: 10,
      });

      setRecentOrders([
        ['#1001', 'John Doe', 'Pending', '$100.00', '2025-09-06'],
        ['#1002', 'Jane Smith', 'Shipped', '$250.00', '2025-09-06'],
        ['#1003', 'Bob Johnson', 'Pending', '$75.00', '2025-09-05'],
        ['#1004', 'Alice Brown', 'Shipped', '$180.00', '2025-09-05'],
        ['#1005', 'Charlie Wilson', 'Pending', '$95.00', '2025-09-04'],
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const rows = recentOrders;

  return (
    <NavigationLayout>
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <Card>
                <Text variant="headingMd" as="h3">
                  Total Orders
                </Text>
                <div style={{ marginTop: '0.5rem' }}>
                  <Text variant="heading2xl" as="p">
                    {stats.totalOrders}
                  </Text>
                </div>
              </Card>

              <Card>
                <Text variant="headingMd" as="h3">
                  Pending Shipments
                </Text>
                <div style={{ marginTop: '0.5rem' }}>
                  <Text variant="heading2xl" as="p">
                    {stats.pendingOrders}
                  </Text>
                </div>
              </Card>

              <Card>
                <Text variant="headingMd" as="h3">
                  Shipped Orders
                </Text>
                <div style={{ marginTop: '0.5rem' }}>
                  <Text variant="heading2xl" as="p" tone="success">
                    {stats.shippedOrders}
                  </Text>
                </div>
              </Card>

              <Card>
                <Text variant="headingMd" as="h3">
                  Monthly Usage
                </Text>
                <div style={{ marginTop: '0.5rem' }}>
                  <Text variant="heading2xl" as="p">
                    {stats.monthlyTrackings} / {stats.planLimit}
                  </Text>
                  {stats.monthlyTrackings >= stats.planLimit && (
                    <Badge tone="critical">Limit Reached</Badge>
                  )}
                </div>
              </Card>
            </div>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Text variant="headingMd" as="h3">
                  Recent Orders
                </Text>
              </div>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'numeric', 'text']}
                headings={['Order', 'Customer', 'Status', 'Total', 'Date']}
                rows={rows}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </NavigationLayout>
  );
}