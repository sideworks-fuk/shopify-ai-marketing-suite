'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XIcon } from 'lucide-react';
import type { BillingPlan, Subscription } from '@/types/billing';

// Mock data for development
const mockPlans: BillingPlan[] = [
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
      'メールサポート',
      '7日間の無料トライアル',
    ],
    maxProducts: 1000,
    maxOrders: 10000,
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
      '優先サポート',
      'APIアクセス',
      '14日間の無料トライアル',
    ],
    isPopular: true,
    maxProducts: 5000,
    maxOrders: 50000,
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
      '専任サポート',
      'ホワイトラベル対応',
      'SLA保証',
      '30日間の無料トライアル',
    ],
    maxProducts: undefined,
    maxOrders: undefined,
  },
];

const mockSubscription: Subscription = {
  id: 'sub_123',
  planId: 'starter',
  status: 'trialing',
  currentPeriodStart: new Date('2025-01-01'),
  currentPeriodEnd: new Date('2025-02-01'),
  trialEnd: new Date('2025-01-14'),
};

export default function BillingPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setPlans(mockPlans);
        setCurrentSubscription(mockSubscription);
      } catch (error) {
        console.error('Failed to fetch billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  const calculateTrialDaysRemaining = () => {
    if (!currentSubscription?.trialEnd) return 0;
    const now = new Date();
    const trialEnd = new Date(currentSubscription.trialEnd);
    const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    // TODO: Implement plan selection logic
    console.log('Selected plan:', planId);
  };

  const handleUpgrade = async (planId: string) => {
    try {
      console.log('Upgrading to plan:', planId);
      // TODO: Implement upgrade API call
      alert(`プラン ${planId} へのアップグレードを処理中...`);
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const trialDaysRemaining = calculateTrialDaysRemaining();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">料金プラン</h1>
        <p className="text-gray-600">ビジネスに最適なプランをお選びください</p>
      </div>

      {/* Trial Status Banner */}
      {currentSubscription?.status === 'trialing' && trialDaysRemaining > 0 && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-blue-900">
                  無料トライアル期間中
                </p>
                <p className="text-blue-700">
                  残り {trialDaysRemaining} 日でトライアルが終了します
                </p>
              </div>
              <Badge variant="default" className="bg-blue-600">
                トライアル中
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.planId === plan.id;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.isPopular ? 'ring-2 ring-primary' : ''} ${isCurrentPlan ? 'bg-gray-50' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white">
                    人気プラン
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="secondary">
                    現在のプラン
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-600">/{plan.interval === 'monthly' ? '月' : '年'}</span>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limits */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600">
                    {plan.maxProducts ? (
                      <>最大 {plan.maxProducts.toLocaleString()} 商品</>
                    ) : (
                      <>無制限の商品数</>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.maxOrders ? (
                      <>月間 {plan.maxOrders.toLocaleString()} 注文まで</>
                    ) : (
                      <>無制限の注文処理</>
                    )}
                  </p>
                </div>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    disabled
                  >
                    利用中
                  </Button>
                ) : (
                  <Button 
                    className="w-full"
                    variant={plan.isPopular ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {currentSubscription && 
                     mockPlans.findIndex(p => p.id === plan.id) > 
                     mockPlans.findIndex(p => p.id === currentSubscription.planId) 
                      ? 'アップグレード' 
                      : '選択する'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* FAQ or Additional Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>よくある質問</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">プランの変更はいつでも可能ですか？</h3>
            <p className="text-gray-600 text-sm">
              はい、いつでもプランのアップグレードまたはダウングレードが可能です。
              変更は次の請求サイクルから適用されます。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">無料トライアル期間中に解約できますか？</h3>
            <p className="text-gray-600 text-sm">
              はい、トライアル期間中はいつでも解約可能で、料金は一切発生しません。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">支払い方法は何が利用できますか？</h3>
            <p className="text-gray-600 text-sm">
              クレジットカード（Visa、Mastercard、American Express）およびShopify Paymentsがご利用いただけます。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}