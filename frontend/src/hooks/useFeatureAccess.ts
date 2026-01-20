'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

// Type definitions
export type PlanId = 'starter' | 'professional' | 'enterprise';
export type SelectableFeatureId = 'dormant_analysis' | 'year_over_year' | 'frequency_detail';

// Feature definitions with plan requirements
export const FEATURES = {
  // Basic features (available to all plans)
  DASHBOARD: {
    id: 'dashboard',
    name: 'ダッシュボード',
    plans: ['starter', 'professional', 'enterprise'] as PlanId[],
    description: '基本的なダッシュボード機能'
  },
  BASIC_ANALYTICS: {
    id: 'basic_analytics',
    name: '基本分析',
    plans: ['starter', 'professional', 'enterprise'] as PlanId[],
    description: '売上・顧客の基本分析'
  },
  CUSTOMER_ANALYSIS: {
    id: 'customer_analysis',
    name: '顧客分析',
    plans: ['starter', 'professional', 'enterprise'] as PlanId[],
    description: '顧客データの分析'
  },
  PRODUCT_ANALYSIS: {
    id: 'product_analysis',
    name: '商品分析',
    plans: ['starter', 'professional', 'enterprise'] as PlanId[],
    description: '商品パフォーマンス分析'
  },
  DATA_EXPORT: {
    id: 'data_export',
    name: 'データエクスポート',
    plans: ['starter', 'professional', 'enterprise'] as PlanId[],
    description: 'CSVファイルへのエクスポート'
  },

  // Professional features
  AI_PREDICTIONS: {
    id: 'ai_predictions',
    name: 'AI予測分析',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: 'AIによる売上予測と分析'
  },
  CUSTOM_REPORTS: {
    id: 'custom_reports',
    name: 'カスタムレポート',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: 'カスタマイズ可能なレポート作成'
  },
  API_ACCESS: {
    id: 'api_access',
    name: 'APIアクセス',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: '外部システムとのAPI連携'
  },
  ADVANCED_FILTERS: {
    id: 'advanced_filters',
    name: '高度なフィルター',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: '複雑な条件でのデータ絞り込み'
  },
  BULK_OPERATIONS: {
    id: 'bulk_operations',
    name: '一括操作',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: '複数データの一括処理'
  },
  SCHEDULED_REPORTS: {
    id: 'scheduled_reports',
    name: 'スケジュールレポート',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: '定期的な自動レポート生成'
  },
  YEAR_OVER_YEAR: {
    id: 'year_over_year',
    name: '前年比分析',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: '前年同期比較分析'
  },
  PURCHASE_FREQUENCY: {
    id: 'purchase_frequency',
    name: '購買頻度分析',
    plans: ['professional', 'enterprise'] as PlanId[],
    description: '顧客の購買パターン分析'
  },

  // Enterprise features
  ADVANCED_AI: {
    id: 'advanced_ai',
    name: '高度なAI分析',
    plans: ['enterprise'] as PlanId[],
    description: '機械学習による高度な予測'
  },
  CUSTOM_DASHBOARD: {
    id: 'custom_dashboard',
    name: 'カスタムダッシュボード',
    plans: ['enterprise'] as PlanId[],
    description: '完全カスタマイズ可能なダッシュボード'
  },
  WHITE_LABEL: {
    id: 'white_label',
    name: 'ホワイトラベル',
    plans: ['enterprise'] as PlanId[],
    description: '自社ブランドでの提供'
  },
  UNLIMITED_USERS: {
    id: 'unlimited_users',
    name: '無制限ユーザー',
    plans: ['enterprise'] as PlanId[],
    description: 'ユーザー数無制限'
  },
  CUSTOM_INTEGRATIONS: {
    id: 'custom_integrations',
    name: 'カスタム統合',
    plans: ['enterprise'] as PlanId[],
    description: '独自システムとの統合'
  },
  DORMANT_ANALYSIS: {
    id: 'dormant_analysis',
    name: '休眠顧客分析',
    plans: ['enterprise'] as PlanId[],
    description: '休眠顧客の詳細分析と対策'
  },
  MARKET_BASKET: {
    id: 'market_basket',
    name: 'バスケット分析',
    plans: ['enterprise'] as PlanId[],
    description: '商品の併売分析'
  }
} as const;

// Usage limits by plan
export const USAGE_LIMITS = {
  starter: {
    max_products: 1000,
    max_orders: 10000,
    max_customers: 5000,
    max_reports_per_month: 10,
    max_api_calls_per_day: 100
  },
  professional: {
    max_products: 5000,
    max_orders: 50000,
    max_customers: 25000,
    max_reports_per_month: 100,
    max_api_calls_per_day: 1000
  },
  enterprise: {
    max_products: null, // unlimited
    max_orders: null,
    max_customers: null,
    max_reports_per_month: null,
    max_api_calls_per_day: null
  }
} as const;

export type FeatureId = keyof typeof FEATURES;

interface FeatureAccessResult {
  hasAccess: boolean;
  requiresPlan?: PlanId;
  upgradeMessage?: string;
}

interface UsageStatus {
  used: number;
  limit: number | null;
  percentage: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

interface UseFeatureAccessReturn {
  // Feature access checks
  canAccess: (featureId: FeatureId | string) => boolean;
  checkFeatureAccess: (featureId: FeatureId | string) => FeatureAccessResult;
  getAccessibleFeatures: () => typeof FEATURES[FeatureId][];
  getBlockedFeatures: () => typeof FEATURES[FeatureId][];
  
  // Usage limits
  checkUsageLimit: (metric: keyof typeof USAGE_LIMITS.starter) => UsageStatus;
  isWithinLimits: (metric: keyof typeof USAGE_LIMITS.starter, currentUsage: number) => boolean;
  getRemainingUsage: (metric: keyof typeof USAGE_LIMITS.starter, currentUsage: number) => number | null;
  
  // Plan information
  currentPlan: PlanId | null;
  getRequiredPlan: (featureId: FeatureId | string) => PlanId | null;
  getPlanFeatures: (planId: PlanId) => typeof FEATURES[FeatureId][];
  comparePlans: (planA: PlanId, planB: PlanId) => {
    added: typeof FEATURES[FeatureId][];
    removed: typeof FEATURES[FeatureId][];
  };
}

// Hook for checking access to selectable features (free plan)
export function useFeatureAccess(featureId?: SelectableFeatureId) {
  const { currentPlan, loading: subscriptionLoading } = useSubscriptionContext();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  const currentPlanId = (currentPlan?.id as PlanId) || 'starter'; // Default to starter (free) plan
  const gateDisabled = process.env.NEXT_PUBLIC_DISABLE_FEATURE_GATES === 'true';

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      
      // 環境フラグで機能ゲートを一時無効化
      if (gateDisabled) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }
      
      // プラン情報の取得中は、デフォルトでロック解除（誤ったロックを防ぐ）
      // プラン情報が取得された後に、正しい判定を実行
      if (subscriptionLoading) {
        setHasAccess(true); // デフォルトでロック解除
        setIsLoading(true); // ローディング中
        return;
      }
      
      // If user has a paid plan, they have access to all features
      if (currentPlanId && currentPlanId !== 'starter') {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // For free plan users, only allow access to dormant_analysis
      // 無料プランは「休眠顧客分析」のみ利用可能
      if (currentPlanId === 'starter') {
        setHasAccess(featureId === 'dormant_analysis');
      } else {
        setHasAccess(false);
      }
      
      setIsLoading(false);
    };

    checkAccess();
  }, [currentPlanId, featureId, gateDisabled, subscriptionLoading]);

  return {
    hasAccess,
    isLoading,
    selectedFeature: featureId === 'dormant_analysis' ? { featureId: 'dormant_analysis', name: '休眠顧客分析' } : null,
    currentPlan: currentPlanId
  };
}

// Original comprehensive feature access hook
export function useComprehensiveFeatureAccess(): UseFeatureAccessReturn {
  const { currentPlan } = useSubscriptionContext();
  
  const currentPlanId = (currentPlan?.id as PlanId) || null;
  const gateDisabled = process.env.NEXT_PUBLIC_DISABLE_FEATURE_GATES === 'true';

  // Check if user can access a specific feature
  const canAccess = useCallback((featureId: FeatureId | string): boolean => {
    if (gateDisabled) return true;
    if (!currentPlanId) return false;

    const feature = Object.values(FEATURES).find(f => f.id === featureId);
    if (!feature) return false;

    return feature.plans.includes(currentPlanId);
  }, [currentPlanId, gateDisabled]);

  // Check feature access with details
  const checkFeatureAccess = useCallback((featureId: FeatureId | string): FeatureAccessResult => {
    if (gateDisabled) {
      return { hasAccess: true };
    }
    const feature = Object.values(FEATURES).find(f => f.id === featureId);
    
    if (!feature) {
      return { hasAccess: false };
    }

    if (!currentPlanId) {
      return {
        hasAccess: false,
        requiresPlan: feature.plans[0] as PlanId,
        upgradeMessage: 'プランを選択してこの機能を利用してください'
      };
    }

    const hasAccess = feature.plans.includes(currentPlanId);
    
    if (!hasAccess) {
      const requiredPlan = feature.plans[0] as PlanId;
      return {
        hasAccess: false,
        requiresPlan: requiredPlan,
        upgradeMessage: `この機能を利用するには${requiredPlan}プラン以上が必要です`
      };
    }

    return { hasAccess: true };
  }, [currentPlanId, gateDisabled]);

  // Get all accessible features for current plan
  const getAccessibleFeatures = useCallback(() => {
    if (gateDisabled) return Object.values(FEATURES);
    if (!currentPlanId) return [];
    
    return Object.values(FEATURES).filter(feature => 
      feature.plans.includes(currentPlanId)
    );
  }, [currentPlanId, gateDisabled]);

  // Get all blocked features for current plan
  const getBlockedFeatures = useCallback(() => {
    if (gateDisabled) return [] as typeof FEATURES[FeatureId][];
    if (!currentPlanId) {
      return Object.values(FEATURES);
    }
    
    return Object.values(FEATURES).filter(feature => 
      !feature.plans.includes(currentPlanId)
    );
  }, [currentPlanId, gateDisabled]);

  // Check usage limit for a specific metric
  const checkUsageLimit = useCallback((metric: keyof typeof USAGE_LIMITS.starter): UsageStatus => {
    if (!currentPlanId) {
      return {
        used: 0,
        limit: 0,
        percentage: 0,
        isNearLimit: false,
        isOverLimit: false
      };
    }

    const limits = USAGE_LIMITS[currentPlanId];
    const limit = limits[metric];
    
    // For this hook, we'll return mock usage data
    // In production, this would fetch actual usage from the API
    const mockUsage = {
      max_products: 250,
      max_orders: 3500,
      max_customers: 1200,
      max_reports_per_month: 5,
      max_api_calls_per_day: 50
    };

    const used = mockUsage[metric];
    const percentage = limit ? (used / limit) * 100 : 0;

    return {
      used,
      limit,
      percentage,
      isNearLimit: limit ? percentage >= 80 : false,
      isOverLimit: limit ? percentage >= 100 : false
    };
  }, [currentPlanId]);

  // Check if current usage is within limits
  const isWithinLimits = useCallback((
    metric: keyof typeof USAGE_LIMITS.starter,
    currentUsage: number
  ): boolean => {
    if (!currentPlanId) return false;

    const limits = USAGE_LIMITS[currentPlanId];
    const limit = limits[metric];

    if (limit === null) return true; // Unlimited
    return currentUsage <= limit;
  }, [currentPlanId]);

  // Get remaining usage for a metric
  const getRemainingUsage = useCallback((
    metric: keyof typeof USAGE_LIMITS.starter,
    currentUsage: number
  ): number | null => {
    if (!currentPlanId) return 0;

    const limits = USAGE_LIMITS[currentPlanId];
    const limit = limits[metric];

    if (limit === null) return null; // Unlimited
    return Math.max(0, limit - currentUsage);
  }, [currentPlanId]);

  // Get the minimum required plan for a feature
  const getRequiredPlan = useCallback((featureId: FeatureId | string): PlanId | null => {
    const feature = Object.values(FEATURES).find(f => f.id === featureId);
    if (!feature) return null;

    // Return the lowest tier plan that includes this feature
    const planOrder: PlanId[] = ['starter', 'professional', 'enterprise'];
    for (const plan of planOrder) {
      if (feature.plans.includes(plan)) {
        return plan;
      }
    }

    return null;
  }, []);

  // Get all features for a specific plan
  const getPlanFeatures = useCallback((planId: PlanId) => {
    return Object.values(FEATURES).filter(feature => 
      feature.plans.includes(planId)
    );
  }, []);

  // Compare features between two plans
  const comparePlans = useCallback((planA: PlanId, planB: PlanId) => {
    const featuresA = getPlanFeatures(planA);
    const featuresB = getPlanFeatures(planB);

    const added = featuresB.filter(f => !featuresA.includes(f));
    const removed = featuresA.filter(f => !featuresB.includes(f));

    return { added, removed };
  }, [getPlanFeatures]);

  return {
    // Feature access checks
    canAccess,
    checkFeatureAccess,
    getAccessibleFeatures,
    getBlockedFeatures,
    
    // Usage limits
    checkUsageLimit,
    isWithinLimits,
    getRemainingUsage,
    
    // Plan information
    currentPlan: currentPlanId,
    getRequiredPlan,
    getPlanFeatures,
    comparePlans
  };
}