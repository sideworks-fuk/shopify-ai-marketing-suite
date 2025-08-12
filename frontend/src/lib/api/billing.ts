import type { BillingPlan, Subscription, BillingInfo, PlanChangeRequest } from '@/types/billing';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * 利用可能なプラン一覧を取得
 */
export async function getAvailablePlans(): Promise<BillingPlan[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch billing plans');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching billing plans:', error);
    throw error;
  }
}

/**
 * 現在のサブスクリプション情報を取得
 */
export async function getCurrentSubscription(): Promise<Subscription | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/subscription`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.status === 404) {
      return null; // No active subscription
    }

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
}

/**
 * 完全な課金情報を取得
 */
export async function getBillingInfo(): Promise<BillingInfo> {
  try {
    const [plans, subscription] = await Promise.all([
      getAvailablePlans(),
      getCurrentSubscription(),
    ]);

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (subscription?.status === 'trialing' && subscription.trialEnd) {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEnd);
      const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
      trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Determine upgrade/downgrade capabilities
    const currentPlanIndex = subscription 
      ? plans.findIndex(p => p.id === subscription.planId)
      : -1;
    
    return {
      subscription,
      plans,
      trialDaysRemaining,
      canUpgrade: currentPlanIndex < plans.length - 1,
      canDowngrade: currentPlanIndex > 0,
    };
  } catch (error) {
    console.error('Error fetching billing info:', error);
    throw error;
  }
}

/**
 * プランを変更（アップグレード/ダウングレード）
 */
export async function changePlan(request: PlanChangeRequest): Promise<Subscription> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/change-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to change plan');
    }

    return await response.json();
  } catch (error) {
    console.error('Error changing plan:', error);
    throw error;
  }
}

/**
 * サブスクリプションを作成（初回登録）
 */
export async function createSubscription(planId: string): Promise<Subscription> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ planId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

/**
 * サブスクリプションをキャンセル
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/subscription/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel subscription');
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

/**
 * サブスクリプションを再開
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Subscription> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/subscription/${subscriptionId}/reactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reactivate subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * 請求履歴を取得
 */
export interface Invoice {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
  description: string;
}

export async function getInvoiceHistory(limit: number = 10): Promise<Invoice[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/invoices?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoice history');
    }

    const invoices = await response.json();
    
    // Convert date strings to Date objects
    return invoices.map((invoice: any) => ({
      ...invoice,
      date: new Date(invoice.date),
    }));
  } catch (error) {
    console.error('Error fetching invoice history:', error);
    throw error;
  }
}

/**
 * 使用状況を取得
 */
export interface UsageStats {
  products: {
    current: number;
    limit: number | null;
  };
  orders: {
    current: number;
    limit: number | null;
  };
  apiCalls: {
    current: number;
    limit: number;
  };
  storage: {
    current: number; // in MB
    limit: number; // in MB
  };
}

export async function getUsageStats(): Promise<UsageStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch usage stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    throw error;
  }
}