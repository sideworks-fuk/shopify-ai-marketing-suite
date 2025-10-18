'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { BillingPlan, Subscription } from '@/types/billing';

// Mock data
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
    ],
    maxProducts: undefined,
    maxOrders: undefined,
  },
];

const mockCurrentSubscription: Subscription = {
  id: 'sub_123',
  planId: 'starter',
  status: 'active',
  currentPeriodStart: new Date('2025-01-01'),
  currentPeriodEnd: new Date('2025-02-01'),
};

export default function UpgradePage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<BillingPlan | null>(null);
  const [targetPlan, setTargetPlan] = useState<BillingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get current plan details
    const current = mockPlans.find(p => p.id === mockCurrentSubscription.planId);
    setCurrentPlan(current || null);

    // Get target plan from URL params (in real app)
    // For demo, default to professional
    const target = mockPlans.find(p => p.id === 'professional');
    setTargetPlan(target || null);
  }, []);

  const calculateProratedAmount = () => {
    if (!currentPlan || !targetPlan) return 0;
    
    const daysRemaining = Math.ceil(
      (new Date(mockCurrentSubscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysInPeriod = 30;
    const proratedCredit = (currentPlan.price * daysRemaining) / daysInPeriod;
    const proratedCharge = (targetPlan.price * daysRemaining) / daysInPeriod;
    
    return Math.max(0, proratedCharge - proratedCredit);
  };

  const handleConfirmUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success
      setShowConfirmation(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/billing');
      }, 3000);
      
    } catch (err) {
      setError('アップグレード処理中にエラーが発生しました。もう一度お試しください。');
      console.error('Upgrade error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/billing');
  };

  if (!currentPlan || !targetPlan) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p>プラン情報を読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isUpgrade = mockPlans.findIndex(p => p.id === targetPlan.id) > 
                    mockPlans.findIndex(p => p.id === currentPlan.id);
  const proratedAmount = calculateProratedAmount();

  if (showConfirmation) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <CardTitle className="text-green-900">
                プラン変更が完了しました
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-green-800">
              {targetPlan.name}プランへの{isUpgrade ? 'アップグレード' : 'ダウングレード'}が正常に処理されました。
            </p>
            <p className="text-green-700 mt-2">
              まもなく料金プランページにリダイレクトされます...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          プラン{isUpgrade ? 'アップグレード' : 'ダウングレード'}の確認
        </h1>
        <p className="text-gray-600 mt-2">
          以下の内容でプランを変更します。内容をご確認ください。
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Plan */}
        <Card className="opacity-75">
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2">現在のプラン</Badge>
            <CardTitle>{currentPlan.name}</CardTitle>
            <CardDescription>
              ${currentPlan.price}/月
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              {currentPlan.features.slice(0, 4).map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <ArrowRight className="h-8 w-8 text-gray-400" />
        </div>

        {/* Target Plan */}
        <Card className="ring-2 ring-primary">
          <CardHeader>
            <Badge className="w-fit mb-2">新しいプラン</Badge>
            <CardTitle>{targetPlan.name}</CardTitle>
            <CardDescription>
              ${targetPlan.price}/月
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {targetPlan.features.slice(0, 4).map((feature, i) => (
                <li key={i} className="font-medium">{feature}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Billing Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>請求詳細</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">変更タイミング</span>
            <span className="font-medium">即時</span>
          </div>
          
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">現在の請求期間</span>
            <span className="font-medium">
              {new Date(mockCurrentSubscription.currentPeriodStart).toLocaleDateString('ja-JP')} - 
              {new Date(mockCurrentSubscription.currentPeriodEnd).toLocaleDateString('ja-JP')}
            </span>
          </div>

          {proratedAmount > 0 && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">日割り調整額</span>
              <span className="font-medium">${proratedAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between py-2 text-lg font-semibold">
            <span>次回請求額</span>
            <span>${targetPlan.price}/月</span>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>ご注意</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            {isUpgrade ? (
              <>
                <li>アップグレードは即座に適用されます</li>
                <li>新機能はすぐにご利用いただけます</li>
                <li>残り期間分は日割り計算で調整されます</li>
              </>
            ) : (
              <>
                <li>ダウングレードは次の請求サイクルから適用されます</li>
                <li>現在の請求期間中は現在のプランの機能をご利用いただけます</li>
                <li>データは保持されますが、一部機能が制限される場合があります</li>
              </>
            )}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={loading}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleConfirmUpgrade}
          disabled={loading}
        >
          {loading ? '処理中...' : `${isUpgrade ? 'アップグレード' : 'ダウングレード'}を確定`}
        </Button>
      </div>
    </div>
  );
}