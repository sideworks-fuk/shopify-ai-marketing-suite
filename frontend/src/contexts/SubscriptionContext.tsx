'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
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
  const pathname = usePathname();
  const { getApiClient, isApiClientReady, currentStoreId } = useAuth(); // ApiClientを取得（認証ヘッダーを自動設定）
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>(MOCK_PLANS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  
  // インストールページまたはルートページではAPIを呼び出さない（認証が必要なAPIを呼び出すと401エラーが発生するため）
  // ルートページ（/）は認証状態を確認中で、認証が完了していない可能性があるため
  const isInstallPage = pathname === '/install';
  const isRootPage = pathname === '/';
  const isAuthSuccessPage = pathname === '/auth/success';
  const isSyncingPage = pathname?.startsWith('/setup/syncing'); // 🆕 同期ページではAPIを呼び出さない（currentStoreIdが設定される前の可能性があるため）

  // Fetch selected feature for free plan users
  const fetchSelectedFeature = useCallback(async () => {
    try {
      const apiClient = getApiClient();
      const response = await apiClient.get<{ selectedFeature: SelectedFeature | null }>('/api/feature-selection/current');
      
      if (response && response.selectedFeature !== undefined) {
        setSelectedFeature(response.selectedFeature || null);
      }
    } catch (err) {
      console.error('Error fetching selected feature:', err);
      // エラー時はnullを設定（404など）
      setSelectedFeature(null);
    }
  }, [getApiClient]);

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiClient = getApiClient();
      
      // Fetch current subscription
      try {
        const subData = await apiClient.get<{ subscription: Subscription | null }>('/api/subscription/status');
        setSubscription(subData.subscription || null);
      } catch (subErr: any) {
        // 404エラーの場合はサブスクリプションなしとして扱う
        if (subErr?.message?.includes('404') || subErr?.message?.includes('Not Found')) {
          setSubscription(null);
        } else {
          throw subErr;
        }
      }

      // Fetch available plans
      try {
        const plansData = await apiClient.get<{ plans: BillingPlan[] }>('/api/subscription/plans');
        if (plansData.plans && Array.isArray(plansData.plans)) {
          setPlans(plansData.plans);
        }
      } catch (plansErr) {
        console.warn('Failed to fetch plans, using mock plans:', plansErr);
        // プラン取得に失敗してもモックプランを使用して続行
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Use mock data in development
      if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
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
  }, [getApiClient]);

  useEffect(() => {
    // インストールページ、ルートページ、認証成功ページ、または同期ページではAPIを呼び出さない
    // ルートページ（/）は認証状態を確認中で、認証が完了していない可能性があるため
    // 認証成功ページ（/auth/success）は認証処理中で、認証が完了していない可能性があるため
    // 同期ページ（/setup/syncing）はcurrentStoreIdが設定される前の可能性があるため
    if (isInstallPage || isRootPage || isAuthSuccessPage || isSyncingPage) {
      console.log('⏸️ インストールページ、ルートページ、認証成功ページ、または同期ページのため、サブスクリプションデータの取得をスキップします', { pathname, isInstallPage, isRootPage, isAuthSuccessPage, isSyncingPage });
      setLoading(false);
      return;
    }
    
    // ApiClientが初期化されるまで待機
    if (!isApiClientReady) {
      console.log('⏳ ApiClientの初期化を待機中...');
      return;
    }
    
    console.log('✅ ApiClientが準備完了、サブスクリプションデータを取得します');
    // currentStoreIdが設定されている場合のみAPIを呼び出す
    if (currentStoreId === null || currentStoreId <= 0) {
      console.log('⏸️ currentStoreIdが設定されていないため、サブスクリプションデータの取得をスキップします', { currentStoreId });
      return;
    }
    
    fetchSubscriptionData();
    fetchSelectedFeature();
  }, [isApiClientReady, fetchSubscriptionData, fetchSelectedFeature, isInstallPage, isRootPage, isAuthSuccessPage, isSyncingPage, pathname, currentStoreId]);

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
      
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${backendUrl}/api/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
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
      
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${backendUrl}/api/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
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