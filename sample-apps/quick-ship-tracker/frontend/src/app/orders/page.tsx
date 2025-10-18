'use client';

import {
  Page,
  Layout,
  Card,
  DataTable,
  TextField,
  Button,
  Badge,
  Filters,
  ChoiceList,
  RangeSlider,
  EmptyState,
  Spinner,
} from '@shopify/polaris';
import NavigationLayout from '@/components/layout/Navigation';
import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '@/lib/api';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
  fulfillmentStatus: string;
  trackingInfo?: {
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    shippedAt: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryValue, setQueryValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // 実際のAPIが準備できたら使用
      // const data = await ordersApi.getOrders({
      //   page: currentPage,
      //   limit: 50,
      //   status: statusFilter[0],
      //   search: queryValue,
      // });

      // ダミーデータ
      const dummyOrders: Order[] = [
        {
          id: '1',
          orderNumber: '#1001',
          customerName: 'John Doe',
          email: 'john@example.com',
          totalPrice: '100.00',
          currency: 'USD',
          createdAt: '2025-09-06T10:00:00Z',
          fulfillmentStatus: 'pending',
        },
        {
          id: '2',
          orderNumber: '#1002',
          customerName: 'Jane Smith',
          email: 'jane@example.com',
          totalPrice: '250.00',
          currency: 'USD',
          createdAt: '2025-09-06T09:00:00Z',
          fulfillmentStatus: 'shipped',
          trackingInfo: {
            carrier: 'USPS',
            trackingNumber: '9400100000000000000001',
            trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=9400100000000000000001',
            shippedAt: '2025-09-06T12:00:00Z',
          },
        },
        {
          id: '3',
          orderNumber: '#1003',
          customerName: 'Bob Johnson',
          email: 'bob@example.com',
          totalPrice: '75.00',
          currency: 'USD',
          createdAt: '2025-09-05T15:00:00Z',
          fulfillmentStatus: 'pending',
        },
      ];

      setOrders(dummyOrders);
      setTotalPages(3);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersQueryChange = useCallback(
    (value: string) => setQueryValue(value),
    []
  );

  const handleStatusFilterChange = useCallback(
    (value: string[]) => setStatusFilter(value),
    []
  );

  const handleFiltersClearAll = useCallback(() => {
    setQueryValue('');
    setStatusFilter([]);
  }, []);

  const filters = [
    {
      key: 'status',
      label: 'Fulfillment Status',
      filter: (
        <ChoiceList
          title="Fulfillment Status"
          titleHidden
          choices={[
            { label: 'All', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Shipped', value: 'shipped' },
          ]}
          selected={statusFilter}
          onChange={handleStatusFilterChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = statusFilter.length > 0
    ? [{
        key: 'status',
        label: `Status: ${statusFilter.join(', ')}`,
        onRemove: handleFiltersClearAll,
      }]
    : [];

  const rows = orders.map((order) => [
    <Link href={`/orders/${order.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      {order.orderNumber}
    </Link>,
    order.customerName,
    order.email,
    order.fulfillmentStatus === 'shipped' ? (
      <Badge tone="success">Shipped</Badge>
    ) : (
      <Badge tone="warning">Pending</Badge>
    ),
    order.trackingInfo?.trackingNumber || '-',
    `${order.currency} ${order.totalPrice}`,
    new Date(order.createdAt).toLocaleDateString(),
  ]);

  const emptyStateMarkup = (
    <EmptyState
      heading="No orders found"
      action={{ content: 'Refresh', onAction: fetchOrders }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Try adjusting your filters or search term</p>
    </EmptyState>
  );

  return (
    <NavigationLayout>
      <Page
        title="Orders"
        primaryAction={{
          content: 'Sync Orders',
          onAction: fetchOrders,
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Filters
                  queryValue={queryValue}
                  filters={filters}
                  appliedFilters={appliedFilters}
                  onQueryChange={handleFiltersQueryChange}
                  onQueryClear={() => setQueryValue('')}
                  onClearAll={handleFiltersClearAll}
                />
              </div>
              
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Spinner accessibilityLabel="Loading orders" size="large" />
                </div>
              ) : orders.length === 0 ? (
                emptyStateMarkup
              ) : (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'numeric', 'text']}
                  headings={[
                    'Order',
                    'Customer',
                    'Email',
                    'Status',
                    'Tracking',
                    'Total',
                    'Date',
                  ]}
                  rows={rows}
                  footerContent={`Showing ${orders.length} of ${orders.length} orders`}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </NavigationLayout>
  );
}