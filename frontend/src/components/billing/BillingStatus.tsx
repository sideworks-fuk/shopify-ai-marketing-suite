'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Calendar, 
  Package, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Subscription, BillingPlan } from '@/types/billing';

interface BillingStatusProps {
  subscription: Subscription | null;
  currentPlan?: BillingPlan | null;
  trialDaysRemaining?: number;
  loading?: boolean;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
}

export function BillingStatus({ 
  subscription, 
  currentPlan,
  trialDaysRemaining = 0,
  loading = false,
  onUpgrade,
  onManageBilling
}: BillingStatusProps) {
  const router = useRouter();
  const [usagePercentage, setUsagePercentage] = useState(0);

  useEffect(() => {
    // Calculate usage percentage based on current period
    if (subscription) {
      const start = new Date(subscription.currentPeriodStart);
      const end = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const percentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
      setUsagePercentage(percentage);
    }
  }, [subscription]);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/billing/upgrade');
    }
  };

  const handleManageBilling = () => {
    if (onManageBilling) {
      onManageBilling();
    } else {
      router.push('/billing');
    }
  };

  const getStatusBadge = () => {
    if (!subscription) {
      return <Badge variant="secondary">未登録</Badge>;
    }

    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-600">アクティブ</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-600">トライアル中</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">キャンセル済み</Badge>;
      case 'past_due':
        return <Badge variant="destructive">支払い遅延</Badge>;
      default:
        return <Badge variant="secondary">不明</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (!subscription) return <AlertCircle className="h-5 w-5 text-gray-400" />;

    switch (subscription.status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'trialing':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
      case 'past_due':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>課金ステータス</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>課金ステータス</span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <AlertCircle className="h-5 w-5" />
              <span>プランが選択されていません</span>
            </div>
            <Button onClick={handleManageBilling} className="w-full">
              プランを選択する
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>課金ステータス</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">現在のプラン</span>
            </div>
            <span className="font-semibold text-lg">
              {currentPlan?.name || 'Unknown Plan'}
            </span>
          </div>
          {currentPlan && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">料金</span>
              <span className="font-medium">
                ${currentPlan.price}/{currentPlan.interval === 'monthly' ? '月' : '年'}
              </span>
            </div>
          )}
        </div>

        {/* Trial Information */}
        {subscription.status === 'trialing' && trialDaysRemaining > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  トライアル期間
                </span>
              </div>
              <Badge className="bg-blue-600">
                残り{trialDaysRemaining}日
              </Badge>
            </div>
            <Progress value={(7 - trialDaysRemaining) / 7 * 100} className="h-2" />
          </div>
        )}

        {/* Billing Period */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">請求期間</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{new Date(subscription.currentPeriodStart).toLocaleDateString('ja-JP')}</span>
            <span>〜</span>
            <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString('ja-JP')}</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-xs text-gray-500 text-right">
            期間の{Math.round(usagePercentage)}%が経過
          </p>
        </div>

        {/* Usage Limits */}
        {currentPlan && (currentPlan.maxProducts || currentPlan.maxOrders) && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">利用状況</span>
            </div>
            {currentPlan.maxProducts && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">商品数</span>
                  <span className="font-medium">0 / {currentPlan.maxProducts.toLocaleString()}</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            )}
            {currentPlan.maxOrders && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">月間注文数</span>
                  <span className="font-medium">0 / {currentPlan.maxOrders.toLocaleString()}</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Payment Method */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">支払い方法</span>
          </div>
          <span className="text-sm font-medium">Shopify Payments</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {subscription.status === 'trialing' && (
            <Button 
              onClick={handleUpgrade}
              className="flex-1"
            >
              アップグレード
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={handleManageBilling}
            className={subscription.status === 'trialing' ? 'flex-1' : 'w-full'}
          >
            課金管理
          </Button>
        </div>

        {/* Alerts */}
        {subscription.status === 'past_due' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-900">支払いの確認が必要です</p>
                <p className="text-red-700">
                  お支払い方法を更新してください。
                </p>
              </div>
            </div>
          </div>
        )}

        {subscription.cancelledAt && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">サブスクリプションがキャンセルされました</p>
                <p className="text-yellow-700">
                  {new Date(subscription.cancelledAt).toLocaleDateString('ja-JP')}にキャンセル済み
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard
export function BillingStatusCompact({ 
  subscription, 
  currentPlan,
  trialDaysRemaining = 0 
}: Pick<BillingStatusProps, 'subscription' | 'currentPlan' | 'trialDaysRemaining'>) {
  const router = useRouter();

  const getStatusColor = () => {
    if (!subscription) return 'text-gray-500';
    switch (subscription.status) {
      case 'active': return 'text-green-600';
      case 'trialing': return 'text-blue-600';
      case 'cancelled':
      case 'past_due': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div 
      className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => router.push('/billing')}
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${subscription?.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>
          <CreditCard className={`h-5 w-5 ${getStatusColor()}`} />
        </div>
        <div>
          <p className="font-medium">
            {currentPlan?.name || 'プラン未選択'}
          </p>
          <p className="text-sm text-gray-500">
            {subscription?.status === 'trialing' && trialDaysRemaining > 0
              ? `トライアル残り${trialDaysRemaining}日`
              : subscription?.status === 'active'
              ? '有効'
              : 'プランを選択してください'}
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </div>
  );
}