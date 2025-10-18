'use client';

import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Badge,
  ProgressBar,
  Banner,
  Modal,
  TextContainer,
  List,
} from '@shopify/polaris';
import NavigationLayout from '@/components/layout/Navigation';
import { useState, useEffect, useCallback } from 'react';
import { billingApi } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  trackingLimit: number;
  features: string[];
}

interface Usage {
  current: number;
  limit: number;
  resetDate: string;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [usage, setUsage] = useState<Usage>({
    current: 5,
    limit: 10,
    resetDate: '2025-10-01T00:00:00Z',
  });
  const [loading, setLoading] = useState(true);
  const [modalActive, setModalActive] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [cancelModalActive, setCancelModalActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      // 実際のAPIが準備できたら使用
      // const data = await billingApi.getPlans();
      
      // ダミーデータ
      const dummyPlans: Plan[] = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          currency: 'USD',
          trackingLimit: 10,
          features: [
            '10 trackings per month',
            'Basic support',
            'Manual tracking entry',
          ],
        },
        {
          id: 'basic',
          name: 'Basic',
          price: 9.99,
          currency: 'USD',
          trackingLimit: 100,
          features: [
            '100 trackings per month',
            'Email support',
            'Bulk upload (CSV)',
            'Email notifications',
          ],
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 29.99,
          currency: 'USD',
          trackingLimit: -1,
          features: [
            'Unlimited trackings',
            'Priority support',
            'Bulk upload (CSV)',
            'API access',
            'Custom carriers',
            'Advanced analytics',
            'White-label emails',
          ],
        },
      ];
      
      setPlans(dummyPlans);
      setCurrentPlan('free');
      setUsage({
        current: 5,
        limit: 10,
        resetDate: '2025-10-01T00:00:00Z',
      });
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setModalActive(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      setProcessing(true);
      // const response = await billingApi.subscribe(selectedPlan.id);
      
      // Simulate redirect to Shopify billing confirmation
      console.log('Redirecting to billing confirmation...');
      
      // In real implementation, redirect to:
      // window.location.href = response.confirmationUrl;
      
      setModalActive(false);
      // Show success message
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPlan = async () => {
    try {
      setProcessing(true);
      // await billingApi.cancel();
      
      console.log('Plan cancelled');
      setCancelModalActive(false);
      
      // Refresh billing data
      await fetchBillingData();
    } catch (error) {
      console.error('Failed to cancel plan:', error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleModal = useCallback(() => setModalActive((active) => !active), []);
  const toggleCancelModal = useCallback(() => setCancelModalActive((active) => !active), []);

  const usagePercentage = usage.limit > 0 ? (usage.current / usage.limit) * 100 : 0;
  const daysUntilReset = Math.ceil(
    (new Date(usage.resetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getPlanTone = (planId: string): "base" | "success" | "info" | undefined => {
    if (planId === currentPlan) return 'success';
    if (planId === 'pro') return 'info';
    return undefined;
  };

  return (
    <NavigationLayout>
      <Page title="Billing & Plans">
        <Layout>
          <Layout.Section>
            {usagePercentage >= 90 && (
              <Banner
                title="Approaching tracking limit"
                tone="warning"
                action={{ content: 'Upgrade Plan', onAction: () => handleUpgrade(plans.find(p => p.id === 'basic')!) }}
              >
                <p>
                  You've used {usage.current} of your {usage.limit} monthly trackings.
                  Upgrade to continue adding tracking numbers.
                </p>
              </Banner>
            )}

            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h2">
                  Current Usage
                </Text>
                
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <Text as="p">
                      {usage.current} / {usage.limit === -1 ? 'Unlimited' : usage.limit} trackings used
                    </Text>
                    <Text as="p" tone="subdued">
                      Resets in {daysUntilReset} days
                    </Text>
                  </div>
                  
                  {usage.limit > 0 && (
                    <ProgressBar
                      progress={usagePercentage}
                      tone="success"
                    />
                  )}
                </div>
              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <Text variant="headingLg" as="h3">
                        {plan.name}
                      </Text>
                      {plan.id === currentPlan && (
                        <Badge tone="success">Current Plan</Badge>
                      )}
                      {plan.id === 'pro' && plan.id !== currentPlan && (
                        <Badge tone="info">Most Popular</Badge>
                      )}
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <Text variant="heading2xl" as="p">
                        ${plan.price}
                      </Text>
                      <Text as="p" tone="subdued">
                        per month
                      </Text>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <Text as="p" fontWeight="semibold">
                        {plan.trackingLimit === -1 ? 'Unlimited' : plan.trackingLimit} trackings/month
                      </Text>
                    </div>

                    <List>
                      {plan.features.map((feature, index) => (
                        <List.Item key={index}>{feature}</List.Item>
                      ))}
                    </List>

                    <div style={{ marginTop: '1.5rem' }}>
                      {plan.id === currentPlan ? (
                        plan.id !== 'free' ? (
                          <Button fullWidth variant="plain" tone="critical" onClick={toggleCancelModal}>
                            Cancel Plan
                          </Button>
                        ) : (
                          <Button fullWidth disabled>
                            Current Plan
                          </Button>
                        )
                      ) : plan.price > 0 ? (
                        <Button
                          fullWidth
                          variant={plan.id === 'pro' ? 'primary' : 'secondary'}
                          onClick={() => handleUpgrade(plan)}
                        >
                          {plan.price > plans.find(p => p.id === currentPlan)?.price! ? 'Upgrade' : 'Downgrade'} to {plan.name}
                        </Button>
                      ) : (
                        <Button fullWidth disabled>
                          Free Plan
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h2">
                  Frequently Asked Questions
                </Text>
                
                <div style={{ marginTop: '1rem' }}>
                  <Text variant="headingSm" as="h3">
                    When will I be charged?
                  </Text>
                  <Text as="p" tone="subdued">
                    You'll be charged immediately upon upgrading, then monthly on the same date.
                  </Text>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <Text variant="headingSm" as="h3">
                    Can I change plans anytime?
                  </Text>
                  <Text as="p" tone="subdued">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </Text>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <Text variant="headingSm" as="h3">
                    What happens if I exceed my limit?
                  </Text>
                  <Text as="p" tone="subdued">
                    You won't be able to add new tracking numbers until the next billing cycle or you upgrade your plan.
                  </Text>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>

        <Modal
          open={modalActive}
          onClose={toggleModal}
          title={`Upgrade to ${selectedPlan?.name}`}
          primaryAction={{
            content: 'Confirm Upgrade',
            onAction: handleConfirmUpgrade,
            loading: processing,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: toggleModal,
            },
          ]}
        >
          <Modal.Section>
            <TextContainer>
              <p>
                You're about to upgrade to the {selectedPlan?.name} plan for ${selectedPlan?.price}/month.
              </p>
              <p>
                This plan includes:
              </p>
              <List>
                {selectedPlan?.features.map((feature, index) => (
                  <List.Item key={index}>{feature}</List.Item>
                ))}
              </List>
              <p>
                You'll be redirected to Shopify's billing page to confirm your subscription.
              </p>
            </TextContainer>
          </Modal.Section>
        </Modal>

        <Modal
          open={cancelModalActive}
          onClose={toggleCancelModal}
          title="Cancel Subscription"
          primaryAction={{
            content: 'Cancel Subscription',
            onAction: handleCancelPlan,
            destructive: true,
            loading: processing,
          }}
          secondaryActions={[
            {
              content: 'Keep Subscription',
              onAction: toggleCancelModal,
            },
          ]}
        >
          <Modal.Section>
            <TextContainer>
              <p>
                Are you sure you want to cancel your subscription?
              </p>
              <p>
                You'll lose access to:
              </p>
              <List>
                <List.Item>Premium features</List.Item>
                <List.Item>Increased tracking limits</List.Item>
                <List.Item>Priority support</List.Item>
              </List>
              <p>
                Your subscription will remain active until the end of the current billing period.
              </p>
            </TextContainer>
          </Modal.Section>
        </Modal>
      </Page>
    </NavigationLayout>
  );
}