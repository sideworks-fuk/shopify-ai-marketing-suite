export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  isPopular?: boolean;
  maxProducts?: number;
  maxOrders?: number;
}

export interface Subscription {
  id: string;
  planId: string;
  status: 'active' | 'trialing' | 'cancelled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
}

export interface BillingInfo {
  subscription: Subscription | null;
  plans: BillingPlan[];
  trialDaysRemaining?: number;
  canUpgrade: boolean;
  canDowngrade: boolean;
}

export interface PlanChangeRequest {
  fromPlanId: string;
  toPlanId: string;
  effectiveDate?: Date;
}