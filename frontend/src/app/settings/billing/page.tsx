'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Package, 
  Receipt, 
  Settings,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  Users,
  Shield,
  Loader2
} from 'lucide-react';

// Import our custom components
import { BillingStatus } from '@/components/billing/BillingStatus';
import { PlanSelector } from '@/components/billing/PlanSelector';
import { PlanComparison } from '@/components/billing/PlanComparison';
import { TrialBanner } from '@/components/billing/TrialBanner';

// Import hooks
import { useSubscription } from '@/hooks/useSubscription';
import { useComprehensiveFeatureAccess } from '@/hooks/useFeatureAccess';

interface BillingHistoryItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
}

export default function BillingSettingsPage() {
  const {
    subscription,
    plans,
    currentPlan,
    loading,
    error,
    isProcessing,
    isTrialing,
    trialDaysRemaining,
    updateSubscription,
    cancelSubscription,
    fetchBillingHistory
  } = useSubscription({ autoRefresh: true });

  const { checkUsageLimit } = useComprehensiveFeatureAccess();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Fetch billing history
  useEffect(() => {
    const loadBillingHistory = async () => {
      setLoadingHistory(true);
      try {
        const history = await fetchBillingHistory();
        setBillingHistory(history);
      } catch (err) {
        console.error('Failed to load billing history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (subscription) {
      loadBillingHistory();
    }
  }, [subscription, fetchBillingHistory]);

  // Handle plan selection
  const handlePlanSelect = async (planId: string) => {
    try {
      await updateSubscription(planId);
    } catch (err) {
      console.error('Failed to update plan:', err);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      setShowCancelDialog(false);
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    }
  };

  // Check usage limits
  const productUsage = checkUsageLimit('max_products');
  const orderUsage = checkUsageLimit('max_orders');

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">課金設定</h1>
          <p className="text-gray-600 mt-1">プランの管理と支払い情報の確認</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          請求書をダウンロード
        </Button>
      </div>

      {/* Trial Banner */}
      {isTrialing && trialDaysRemaining > 0 && (
        <TrialBanner 
          trialDaysRemaining={trialDaysRemaining}
          variant={trialDaysRemaining <= 3 ? 'alert' : 'default'}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="plans">プラン</TabsTrigger>
          <TabsTrigger value="usage">利用状況</TabsTrigger>
          <TabsTrigger value="history">支払い履歴</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Billing Status */}
            <div className="lg:col-span-2">
              <BillingStatus
                subscription={subscription}
                currentPlan={currentPlan}
                trialDaysRemaining={trialDaysRemaining}
                loading={isProcessing}
              />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>クイックアクション</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => setActiveTab('plans')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  プランをアップグレード
                </Button>
                <Button variant="outline" className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  支払い方法を更新
                </Button>
                <Button variant="outline" className="w-full">
                  <Receipt className="h-4 w-4 mr-2" />
                  請求先情報を編集
                </Button>
                {subscription && subscription.status !== 'cancelled' && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    サブスクリプションをキャンセル
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Features Overview */}
          <Card>
            <CardHeader>
              <CardTitle>現在利用可能な機能</CardTitle>
              <CardDescription>
                {currentPlan?.name}プランで利用できる機能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPlan?.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <PlanSelector
            plans={plans}
            currentPlanId={currentPlan?.id}
            onSelectPlan={handlePlanSelect}
            loading={isProcessing}
          />
          
          <PlanComparison
            plans={plans}
            currentPlanId={currentPlan?.id}
            onSelectPlan={handlePlanSelect}
          />
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>商品数</span>
                  {productUsage.isNearLimit && (
                    <Badge variant="secondary" className="bg-orange-100">
                      制限に近づいています
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-2xl font-bold">
                    <span>{productUsage.used.toLocaleString()}</span>
                    <span className="text-gray-400">
                      / {productUsage.limit ? productUsage.limit.toLocaleString() : '無制限'}
                    </span>
                  </div>
                  {productUsage.limit && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            productUsage.isOverLimit ? 'bg-red-500' :
                            productUsage.isNearLimit ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, productUsage.percentage)}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">
                        使用率: {productUsage.percentage.toFixed(1)}%
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>月間注文数</span>
                  {orderUsage.isNearLimit && (
                    <Badge variant="secondary" className="bg-orange-100">
                      制限に近づいています
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-2xl font-bold">
                    <span>{orderUsage.used.toLocaleString()}</span>
                    <span className="text-gray-400">
                      / {orderUsage.limit ? orderUsage.limit.toLocaleString() : '無制限'}
                    </span>
                  </div>
                  {orderUsage.limit && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            orderUsage.isOverLimit ? 'bg-red-500' :
                            orderUsage.isNearLimit ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, orderUsage.percentage)}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">
                        使用率: {orderUsage.percentage.toFixed(1)}%
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Alerts */}
          {(productUsage.isNearLimit || orderUsage.isNearLimit) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                利用制限に近づいています。より多くのリソースが必要な場合は、プランのアップグレードをご検討ください。
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>支払い履歴</CardTitle>
              <CardDescription>
                過去の請求と支払いの記録
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>支払い履歴がありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {billingHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${
                          item.status === 'paid' ? 'bg-green-100' :
                          item.status === 'pending' ? 'bg-yellow-100' :
                          'bg-red-100'
                        }`}>
                          {item.status === 'paid' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : item.status === 'pending' ? (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(item.date).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold">${item.amount}</p>
                          <Badge variant={
                            item.status === 'paid' ? 'default' :
                            item.status === 'pending' ? 'secondary' :
                            'destructive'
                          }>
                            {item.status === 'paid' ? '支払済み' :
                             item.status === 'pending' ? '保留中' :
                             '失敗'}
                          </Badge>
                        </div>
                        {item.invoiceUrl && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>サブスクリプションのキャンセル</CardTitle>
              <CardDescription>
                本当にサブスクリプションをキャンセルしますか？
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  キャンセルすると、現在の請求期間の終了時にサービスへのアクセスが失われます。
                </AlertDescription>
              </Alert>
            </CardContent>
            <div className="flex justify-end space-x-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                戻る
              </Button>
              <Button variant="destructive" onClick={handleCancelSubscription}>
                キャンセルする
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}