'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { BillingPlan, Subscription, BillingInfo } from '@/types/billing';

// Feature access levels by plan
const FEATURE_ACCESS = {
  starter: [
    'basic_analytics',
    'customer_analysis',
    'product_analysis',
    'email_support',
    'basic_reports',
    'dashboard',
    'data_export'
  ],
  professional: [
    'basic_analytics',
    'customer_analysis',
    'product_analysis',
    'email_support',
    'basic_reports',
    'dashboard',
    'data_export',
    'ai_predictions',
    'custom_reports',
    'api_access',
    'priority_support',
    'advanced_filters',
    'bulk_operations',
    'scheduled_reports'
  ],
  enterprise: [
    'basic_analytics',
    'customer_analysis',
    'product_analysis',
    'email_support',
    'basic_reports',
    'dashboard',
    'data_export',
    'ai_predictions',
    'custom_reports',
    'api_access',
    'priority_support',
    'advanced_filters',
    'bulk_operations',
    'scheduled_reports',
    'advanced_ai',
    'custom_dashboard',
    'white_label',
    'dedicated_support',
    'sla',
    'unlimited_users',
    'custom_integrations'
  ]
};

// Mock plans for development
const MOCK_PLANS: BillingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 50,
    currency: 'USD',
    interval: 'monthly',
    features: [
      '基本的な分析機能',
      '月間10,000件の注文まで',
      '顧客分析',
      '商品分析',
      'メールサポート',
      '7日間の無料トライアル'
    ],
    maxProducts: 1000,
    maxOrders: 10000
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 80,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'すべてのStarter機能',
      '月間50,000件の注文まで',
      'AI予測分析',
      'カスタムレポート',
      'APIアクセス',
      '優先サポート',
      '14日間の無料トライアル'
    ],
    isPopular: true,
    maxProducts: 5000,
    maxOrders: 50000
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 100,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'すべてのProfessional機能',
      '無制限の注文処理',
      '高度なAI分析',
      'カスタマイズ可能なダッシュボード',
      'ホワイトラベル対応',
      '専任サポート',
      'SLA保証',
      '30日間の無料トライアル'
    ],
    maxProducts: undefined,
    maxOrders: undefined
  }
];

interface SelectedFeature {
  featureId: string;
  selectedAt: string;
  canChangeAt?: string;
}

export interface SubscriptionContextType {
  // State
  currentPlan: BillingPlan | null;
  subscription: Subscription | null;
  plans: BillingPlan[];
  isTrialing: boolean;
  trialDaysLeft: number;
  loading: boolean;
  error: string | null;
  selectedFeature?: SelectedFeature | null;

  // Actions
  canAccessFeature: (feature: string) => boolean;
  upgradePlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  getFeatureLimit: (feature: string) => number | null;
  isFeatureLimited: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>(MOCK_PLANS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);

  // Fetch selected feature for free plan users
  const fetchSelectedFeature = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140';
      const response = await fetch(`${backendUrl}/api/subscription/selected-feature`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedFeature(data.selectedFeature || null);
      }
    } catch (err) {
      console.error('Error fetching selected feature:', err);
    }
  }, []);

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140';
      
      // Fetch current subscription
      const subResponse = await fetch(`${backendUrl}/api/subscription/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription || null);
      } else if (subResponse.status === 404) {
        // No subscription found - that's ok for new users
        setSubscription(null);
      } else {
        throw new Error('Failed to fetch subscription data');
      }

      // Fetch available plans
      const plansResponse = await fetch(`${backendUrl}/api/subscription/plans`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.plans || MOCK_PLANS);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        setSubscription({
          id: 'sub_mock',
          planId: 'starter',
          status: 'trialing',
          currentPeriodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
    fetchSelectedFeature();
  }, [fetchSubscriptionData, fetchSelectedFeature]);

  // Calculate derived values
  const currentPlan = plans.find(p => p.id === subscription?.planId) || null;
  const isTrialing = subscription?.status === 'trialing';
  
  const trialDaysLeft = (() => {
    if (!isTrialing || !subscription?.trialEnd) return 0;
    const now = new Date();
    const trialEnd = new Date(subscription.trialEnd);
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  // Check if user can access a feature
  const canAccessFeature = useCallback((feature: string): boolean => {
    if (!currentPlan) return false;
    
    const planFeatures = FEATURE_ACCESS[currentPlan.id as keyof typeof FEATURE_ACCESS];
    if (!planFeatures) return false;
    
    return planFeatures.includes(feature);
  }, [currentPlan]);

  // Get feature limit (e.g., max products, max orders)
  const getFeatureLimit = useCallback((feature: string): number | null => {
    if (!currentPlan) return null;

    switch (feature) {
      case 'max_products':
        return currentPlan.maxProducts || null;
      case 'max_orders':
        return currentPlan.maxOrders || null;
      default:
        return null;
    }
  }, [currentPlan]);

  // Check if a feature is limited in the current plan
  const isFeatureLimited = useCallback((feature: string): boolean => {
    const limit = getFeatureLimit(feature);
    return limit !== null;
  }, [getFeatureLimit]);

  // Upgrade to a new plan
  const upgradePlan = useCallback(async (planId: string) => {
    try {
      setError(null);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140';
      const response = await fetch(`${backendUrl}/api/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade plan');
      }

      const data = await response.json();
      
      // If Shopify returns a confirmation URL, redirect to it
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        // Otherwise refresh subscription data
        await fetchSubscriptionData();
        router.push('/billing/success');
      }
    } catch (err) {
      console.error('Error upgrading plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade plan');
      throw err;
    }
  }, [fetchSubscriptionData, router]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    try {
      setError(null);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140';
      const response = await fetch(`${backendUrl}/api/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      await fetchSubscriptionData();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      throw err;
    }
  }, [fetchSubscriptionData]);

  const value: SubscriptionContextType = {
    currentPlan,
    subscription,
    plans,
    isTrialing,
    trialDaysLeft,
    loading,
    error,
    selectedFeature,
    canAccessFeature,
    upgradePlan,
    cancelSubscription,
    refreshSubscription: fetchSubscriptionData,
    getFeatureLimit,
    isFeatureLimited
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}