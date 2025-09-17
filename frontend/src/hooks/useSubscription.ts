'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { BillingPlan, Subscription, BillingInfo } from '@/types/billing';

interface UseSubscriptionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseSubscriptionReturn {
  // Data
  subscription: Subscription | null;
  plans: BillingPlan[];
  currentPlan: BillingPlan | null;
  billingInfo: BillingInfo | null;
  
  // State
  loading: boolean;
  error: string | null;
  isProcessing: boolean;
  
  // Computed
  isTrialing: boolean;
  trialDaysRemaining: number;
  canUpgrade: boolean;
  canDowngrade: boolean;
  hasActiveSubscription: boolean;
  
  // Actions
  createSubscription: (planId: string) => Promise<void>;
  updateSubscription: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  fetchSubscriptionData: () => Promise<void>;
  fetchBillingHistory: () => Promise<any[]>;
  validatePlanChange: (fromPlanId: string, toPlanId: string) => boolean;
}

// Mock data for development
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
      'メールサポート'
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
      '優先サポート'
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
      'SLA保証'
    ],
    maxProducts: undefined,
    maxOrders: undefined
  }
];

export function useSubscription(
  options: UseSubscriptionOptions = {}
): UseSubscriptionReturn {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  const router = useRouter();

  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get backend URL
  const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL as string;
  };

  // Cookieベース認証を使用するため、Authorizationヘッダは付与しない

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = getBackendUrl();

      // Parallel fetch for better performance
      const [subResponse, plansResponse] = await Promise.all([
        fetch(`${backendUrl}/api/subscription/current`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${backendUrl}/api/subscription/plans`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      // Handle subscription response
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription || null);
      } else if (subResponse.status === 404) {
        setSubscription(null);
      } else if (subResponse.status === 401) {
        // Unauthorized - redirect to login
        router.push('/auth/error?error=unauthorized');
        return;
      }

      // Handle plans response
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.plans || MOCK_PLANS);
      } else {
        // Use mock plans as fallback
        setPlans(MOCK_PLANS);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
      
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        setPlans(MOCK_PLANS);
        setSubscription({
          id: 'sub_mock',
          planId: 'starter',
          status: 'trialing',
          currentPeriodStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
          trialEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
        });
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Create a new subscription
  const createSubscription = useCallback(async (planId: string) => {
    try {
      setIsProcessing(true);
      setError(null);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/subscription/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create subscription');
      }

      const data = await response.json();

      // Redirect to Shopify confirmation if URL provided
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        await fetchSubscriptionData();
        router.push('/billing/success');
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSubscriptionData, router]);

  // Update existing subscription
  const updateSubscription = useCallback(async (planId: string) => {
    try {
      setIsProcessing(true);
      setError(null);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/subscription/upgrade`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update subscription');
      }

      const data = await response.json();

      // Redirect to Shopify confirmation if URL provided
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        await fetchSubscriptionData();
        router.push('/billing/success');
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSubscriptionData, router]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/subscription/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to cancel subscription');
      }

      await fetchSubscriptionData();
      router.push('/billing');
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSubscriptionData, router]);

  // Reactivate cancelled subscription
  const reactivateSubscription = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/subscription/reactivate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to reactivate subscription');
      }

      await fetchSubscriptionData();
      router.push('/billing/success');
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to reactivate subscription');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSubscriptionData, router]);

  // Fetch billing history
  const fetchBillingHistory = useCallback(async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/subscription/history`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch billing history');
      }

      const data = await response.json();
      return data.history || [];
    } catch (err) {
      console.error('Error fetching billing history:', err);
      return [];
    }
  }, []);

  // Validate if plan change is allowed
  const validatePlanChange = useCallback((fromPlanId: string, toPlanId: string): boolean => {
    // Cannot change to the same plan
    if (fromPlanId === toPlanId) return false;

    // Check if plans exist
    const fromPlan = plans.find(p => p.id === fromPlanId);
    const toPlan = plans.find(p => p.id === toPlanId);
    
    if (!fromPlan || !toPlan) return false;

    // Additional validation logic can be added here
    // For example, checking if downgrade is allowed based on usage

    return true;
  }, [plans]);

  // Calculate computed values
  const currentPlan = plans.find(p => p.id === subscription?.planId) || null;
  const isTrialing = subscription?.status === 'trialing';
  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';

  const trialDaysRemaining = (() => {
    if (!isTrialing || !subscription?.trialEnd) return 0;
    const now = new Date();
    const trialEnd = new Date(subscription.trialEnd);
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const canUpgrade = (() => {
    if (!currentPlan || !plans.length) return false;
    const currentIndex = plans.findIndex(p => p.id === currentPlan.id);
    return currentIndex < plans.length - 1;
  })();

  const canDowngrade = (() => {
    if (!currentPlan || !plans.length) return false;
    const currentIndex = plans.findIndex(p => p.id === currentPlan.id);
    return currentIndex > 0;
  })();

  const billingInfo: BillingInfo = {
    subscription,
    plans,
    trialDaysRemaining,
    canUpgrade,
    canDowngrade
  };

  // Initial fetch
  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSubscriptionData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSubscriptionData]);

  return {
    // Data
    subscription,
    plans,
    currentPlan,
    billingInfo,
    
    // State
    loading,
    error,
    isProcessing,
    
    // Computed
    isTrialing,
    trialDaysRemaining,
    canUpgrade,
    canDowngrade,
    hasActiveSubscription,
    
    // Actions
    createSubscription,
    updateSubscription,
    cancelSubscription,
    reactivateSubscription,
    fetchSubscriptionData,
    fetchBillingHistory,
    validatePlanChange
  };
}