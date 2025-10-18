'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Download,
  Settings,
  XCircle
} from 'lucide-react';
import type { BillingPlan, Subscription } from '@/types/billing';

// Mock data
const mockSubscription: Subscription = {
  id: 'sub_123456789',
  planId: 'professional',
  status: 'active',
  currentPeriodStart: new Date('2025-01-01'),
  currentPeriodEnd: new Date('2025-02-01'),
  trialEnd: new Date('2024-12-15'),
};

const mockPlan: BillingPlan = {
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
    '優先サポート',
    'APIアクセス',
  ],
  maxProducts: 5000,
  maxOrders: 50000,
};

// Mock invoice data
const mockInvoices = [
  {
    id: 'inv_001',
    date: new Date('2025-01-01'),
    amount: 80,
    status: 'paid',
    downloadUrl: '#',
  },
  {
    id: 'inv_002',
    date: new Date('2024-12-01'),
    amount: 80,
    status: 'paid',
    downloadUrl: '#',
  },
  {
    id: 'inv_003',
    date: new Date('2024-11-01'),
    amount: 80,
    status: 'paid',
    downloadUrl: '#',
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setSubscription(mockSubscription);
        setPlan(mockPlan);
      } catch (error) {
        console.error('Failed to fetch subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, []);

  const getStatusBadge = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">有効</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">トライアル中</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">解約済み</Badge>;
      case 'past_due':
        return <Badge className="bg-red-100 text-red-800">支払い遅延</Badge>;
      default:
        return null;
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update subscription status
      if (subscription) {
        setSubscription({
          ...subscription,
          status: 'cancelled',
          cancelledAt: new Date(),
        });
      }
      
      setCancelModalOpen(false);
      alert('サブスクリプションの解約が完了しました。現在の請求期間の終了まで機能をご利用いただけます。');
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('解約処理中にエラーが発生しました。');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!subscription || !plan) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>
            サブスクリプション情報の取得に失敗しました。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">サブスクリプション管理</h1>
        <p className="text-gray-600">現在のプランと請求情報を管理します</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Subscription Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>現在のプラン</CardTitle>
                {getStatusBadge(subscription.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="text-gray-600">${plan.price}/{plan.interval === 'monthly' ? '月' : '年'}</p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/billing')}
                >
                  プラン変更
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    現在の請求期間
                  </span>
                  <span className="font-medium">
                    {subscription.currentPeriodStart.toLocaleDateString('ja-JP')} - 
                    {subscription.currentPeriodEnd.toLocaleDateString('ja-JP')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    次回請求日
                  </span>
                  <span className="font-medium">
                    {subscription.currentPeriodEnd.toLocaleDateString('ja-JP')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    支払い方法
                  </span>
                  <Button variant="ghost" size="sm">
                    •••• 4242 <Settings className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50">
              {subscription.status === 'cancelled' ? (
                <div className="w-full">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>解約済み</AlertTitle>
                    <AlertDescription>
                      {subscription.currentPeriodEnd.toLocaleDateString('ja-JP')}にサブスクリプションが終了します。
                      それまでは全機能をご利用いただけます。
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setCancelModalOpen(true)}
                >
                  サブスクリプションを解約
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle>使用状況</CardTitle>
              <CardDescription>
                現在の請求期間における使用状況
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">商品数</span>
                  <span className="text-sm font-medium">
                    2,341 / {plan.maxProducts ? plan.maxProducts.toLocaleString() : '無制限'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: plan.maxProducts ? `${(2341 / plan.maxProducts) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">月間注文数</span>
                  <span className="text-sm font-medium">
                    15,234 / {plan.maxOrders ? plan.maxOrders.toLocaleString() : '無制限'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: plan.maxOrders ? `${(15234 / plan.maxOrders) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">API呼び出し</span>
                  <span className="text-sm font-medium">
                    45,123 / 100,000
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: '45%' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Billing History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>請求履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">${invoice.amount}</p>
                      <p className="text-sm text-gray-600">
                        {invoice.date.toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {invoice.status === 'paid' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                すべての請求書を見る
              </Button>
            </CardFooter>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プラン機能</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">サブスクリプションの解約</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ご確認ください</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>解約後も現在の請求期間終了まで機能をご利用いただけます</li>
                    <li>データは保持されますが、再開するまでアクセスできません</li>
                    <li>いつでも再開することができます</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelLoading}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
              >
                {cancelLoading ? '処理中...' : '解約する'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}