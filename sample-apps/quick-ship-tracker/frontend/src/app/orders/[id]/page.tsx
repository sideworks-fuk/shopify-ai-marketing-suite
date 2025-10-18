'use client';

import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Banner,
  DescriptionList,
  Divider,
  Modal,
  Toast,
} from '@shopify/polaris';
import NavigationLayout from '@/components/layout/Navigation';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ordersApi, trackingApi } from '@/lib/api';

interface OrderDetail {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  lineItems: Array<{
    id: string;
    title: string;
    variantTitle?: string;
    quantity: number;
    price: string;
  }>;
  totalPrice: string;
  currency: string;
  fulfillmentStatus: string;
  financialStatus: string;
  createdAt: string;
  trackingInfo?: {
    id: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    shippedAt: string;
  };
}

const carrierOptions = [
  { label: 'USPS', value: 'USPS' },
  { label: 'FedEx', value: 'FedEx' },
  { label: 'UPS', value: 'UPS' },
  { label: 'DHL', value: 'DHL' },
  { label: 'Canada Post', value: 'Canada Post' },
  { label: 'Other', value: 'Other' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tracking form state
  const [carrier, setCarrier] = useState('USPS');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  
  // Modal and toast state
  const [modalActive, setModalActive] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      // 実際のAPIが準備できたら使用
      // const data = await ordersApi.getOrder(orderId);
      
      // ダミーデータ
      const dummyOrder: OrderDetail = {
        id: orderId,
        orderNumber: '#1001',
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        shippingAddress: {
          name: 'John Doe',
          address1: '123 Main St',
          address2: 'Apt 4',
          city: 'New York',
          province: 'NY',
          country: 'US',
          zip: '10001',
        },
        lineItems: [
          {
            id: '1',
            title: 'T-Shirt',
            variantTitle: 'Size: M, Color: Blue',
            quantity: 2,
            price: '25.00',
          },
          {
            id: '2',
            title: 'Hat',
            variantTitle: 'One Size',
            quantity: 1,
            price: '50.00',
          },
        ],
        totalPrice: '100.00',
        currency: 'USD',
        fulfillmentStatus: 'pending',
        financialStatus: 'paid',
        createdAt: '2025-09-06T10:00:00Z',
      };
      
      setOrder(dummyOrder);
      
      // If order has tracking info, populate the form
      if (dummyOrder.trackingInfo) {
        setCarrier(dummyOrder.trackingInfo.carrier);
        setTrackingNumber(dummyOrder.trackingInfo.trackingNumber);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      showToast('Failed to load order details', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTracking = async () => {
    if (!trackingNumber.trim()) {
      showToast('Please enter a tracking number', true);
      return;
    }

    try {
      setSaving(true);
      
      if (order?.trackingInfo) {
        // Update existing tracking
        // await trackingApi.updateTracking(order.trackingInfo.id, {
        //   carrier,
        //   trackingNumber,
        // });
        showToast('Tracking information updated successfully');
      } else {
        // Create new tracking
        // await trackingApi.createTracking({
        //   orderId,
        //   carrier,
        //   trackingNumber,
        //   notifyCustomer,
        // });
        showToast('Tracking information added successfully');
      }
      
      // Refresh order data
      await fetchOrderDetail();
    } catch (error: any) {
      if (error.response?.data?.error === 'PLAN_LIMIT_EXCEEDED') {
        showToast('You have reached your monthly tracking limit. Please upgrade your plan.', true);
      } else {
        showToast('Failed to save tracking information', true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTracking = async () => {
    if (!order?.trackingInfo) return;

    try {
      setSaving(true);
      // await trackingApi.deleteTracking(order.trackingInfo.id);
      showToast('Tracking information removed');
      setModalActive(false);
      await fetchOrderDetail();
    } catch (error) {
      showToast('Failed to delete tracking information', true);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string, error = false) => {
    setToastMessage(message);
    setToastError(error);
    setToastActive(true);
  };

  const toggleModal = useCallback(() => setModalActive((active) => !active), []);
  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  if (loading || !order) {
    return (
      <NavigationLayout>
        <Page title="Loading...">
          <Card>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              Loading order details...
            </div>
          </Card>
        </Page>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <Page
        title={`Order ${order.orderNumber}`}
        backAction={{ content: 'Orders', url: '/orders' }}
        secondaryActions={[
          {
            content: 'View in Shopify',
            external: true,
            url: '#',
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Text variant="headingMd" as="h2">
                  Order Information
                </Text>
              </div>
              
              <DescriptionList
                items={[
                  {
                    term: 'Order Number',
                    description: order.orderNumber,
                  },
                  {
                    term: 'Date',
                    description: new Date(order.createdAt).toLocaleString(),
                  },
                  {
                    term: 'Payment Status',
                    description: (
                      <Badge tone={order.financialStatus === 'paid' ? 'success' : 'warning'}>
                        {order.financialStatus}
                      </Badge>
                    ),
                  },
                  {
                    term: 'Fulfillment Status',
                    description: (
                      <Badge tone={order.fulfillmentStatus === 'shipped' ? 'success' : 'warning'}>
                        {order.fulfillmentStatus}
                      </Badge>
                    ),
                  },
                ]}
              />
            </Card>

            <Card>
              <div style={{ padding: '1rem' }}>
                <Text variant="headingMd" as="h2">
                  Customer Details
                </Text>
              </div>
              
              <DescriptionList
                items={[
                  {
                    term: 'Name',
                    description: order.customer.name,
                  },
                  {
                    term: 'Email',
                    description: order.customer.email,
                  },
                  {
                    term: 'Phone',
                    description: order.customer.phone || 'N/A',
                  },
                ]}
              />

              <Divider />

              <div style={{ padding: '1rem' }}>
                <Text variant="headingMd" as="h3">
                  Shipping Address
                </Text>
              </div>

              <div style={{ padding: '0 1rem 1rem' }}>
                <Text as="p">{order.shippingAddress.name}</Text>
                <Text as="p">{order.shippingAddress.address1}</Text>
                {order.shippingAddress.address2 && (
                  <Text as="p">{order.shippingAddress.address2}</Text>
                )}
                <Text as="p">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                </Text>
                <Text as="p">{order.shippingAddress.country}</Text>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '1rem' }}>
                <Text variant="headingMd" as="h2">
                  Line Items
                </Text>
              </div>

              <div style={{ padding: '0 1rem 1rem' }}>
                {order.lineItems.map((item) => (
                  <div key={item.id} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {item.title}
                        </Text>
                        {item.variantTitle && (
                          <Text as="p" variant="bodySm" tone="subdued">
                            {item.variantTitle}
                          </Text>
                        )}
                        <Text as="p" variant="bodySm">
                          Quantity: {item.quantity}
                        </Text>
                      </div>
                      <Text as="p" variant="bodyMd">
                        {order.currency} {item.price}
                      </Text>
                    </div>
                  </div>
                ))}
                
                <Divider />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Total
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {order.currency} {order.totalPrice}
                  </Text>
                </div>
              </div>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <div style={{ padding: '1rem' }}>
                <Text variant="headingMd" as="h2">
                  Tracking Information
                </Text>
              </div>

              {order.trackingInfo ? (
                <div style={{ padding: '0 1rem 1rem' }}>
                  <DescriptionList
                    items={[
                      {
                        term: 'Carrier',
                        description: order.trackingInfo.carrier,
                      },
                      {
                        term: 'Tracking Number',
                        description: order.trackingInfo.trackingNumber,
                      },
                      {
                        term: 'Shipped At',
                        description: new Date(order.trackingInfo.shippedAt).toLocaleString(),
                      },
                    ]}
                  />
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Button url={order.trackingInfo.trackingUrl} external>
                      Track Package
                    </Button>
                    <div style={{ marginTop: '0.5rem' }}>
                      <Button variant="plain" tone="critical" onClick={toggleModal}>
                        Remove Tracking
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0 1rem 1rem' }}>
                  {order.fulfillmentStatus === 'shipped' ? (
                    <Banner tone="warning">
                      This order is marked as shipped but has no tracking information.
                    </Banner>
                  ) : (
                    <FormLayout>
                      <Select
                        label="Carrier"
                        options={carrierOptions}
                        onChange={setCarrier}
                        value={carrier}
                      />
                      
                      <TextField
                        label="Tracking Number"
                        value={trackingNumber}
                        onChange={setTrackingNumber}
                        placeholder="Enter tracking number"
                        autoComplete="off"
                      />
                      
                      <Checkbox
                        label="Notify customer"
                        checked={notifyCustomer}
                        onChange={setNotifyCustomer}
                        helpText="Send tracking information to customer via email"
                      />
                      
                      <Button
                        variant="primary"
                        onClick={handleSubmitTracking}
                        loading={saving}
                        disabled={!trackingNumber.trim()}
                      >
                        Add Tracking
                      </Button>
                    </FormLayout>
                  )}
                </div>
              )}
            </Card>
          </Layout.Section>
        </Layout>

        <Modal
          open={modalActive}
          onClose={toggleModal}
          title="Remove tracking information"
          primaryAction={{
            content: 'Remove',
            onAction: handleDeleteTracking,
            destructive: true,
            loading: saving,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: toggleModal,
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to remove the tracking information for this order?
              This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>

        {toastActive && (
          <Toast
            content={toastMessage}
            onDismiss={toggleToast}
            error={toastError}
          />
        )}
      </Page>
    </NavigationLayout>
  );
}