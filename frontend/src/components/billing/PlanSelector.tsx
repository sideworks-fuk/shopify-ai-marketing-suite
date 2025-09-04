'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check, 
  X, 
  Sparkles,
  Zap,
  Building2,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import type { BillingPlan } from '@/types/billing';

interface PlanSelectorProps {
  plans: BillingPlan[];
  currentPlanId?: string;
  onSelectPlan: (planId: string) => Promise<void>;
  loading?: boolean;
  variant?: 'cards' | 'list' | 'compact';
}

const planIcons = {
  starter: Zap,
  professional: Sparkles,
  enterprise: Building2,
};

const planColors = {
  starter: 'bg-blue-500',
  professional: 'bg-purple-500',
  enterprise: 'bg-gradient-to-r from-purple-600 to-blue-600',
};

export function PlanSelector({ 
  plans, 
  currentPlanId, 
  onSelectPlan,
  loading = false,
  variant = 'cards'
}: PlanSelectorProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(currentPlanId || null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    if (planId === currentPlanId) return;
    setSelectedPlanId(planId);
    setConfirmDialogOpen(true);
    setError(null);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlanId) return;

    setIsUpgrading(true);
    setError(null);

    try {
      await onSelectPlan(selectedPlanId);
      setConfirmDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プランの変更に失敗しました');
    } finally {
      setIsUpgrading(false);
    }
  };

  const getSelectedPlan = () => plans.find(p => p.id === selectedPlanId);
  const getCurrentPlan = () => plans.find(p => p.id === currentPlanId);

  const isDowngrade = () => {
    if (!selectedPlanId || !currentPlanId) return false;
    const currentIndex = plans.findIndex(p => p.id === currentPlanId);
    const selectedIndex = plans.findIndex(p => p.id === selectedPlanId);
    return selectedIndex < currentIndex;
  };

  const getTrialDays = (planId: string) => {
    switch (planId) {
      case 'starter': return 7;
      case 'professional': return 14;
      case 'enterprise': return 30;
      default: return 7;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <>
        <RadioGroup value={selectedPlanId || ''} onValueChange={handlePlanSelect}>
          <div className="space-y-4">
            {plans.map((plan) => {
              const Icon = planIcons[plan.id as keyof typeof planIcons] || Zap;
              const isCurrentPlan = plan.id === currentPlanId;
              
              return (
                <label
                  key={plan.id}
                  className={`block cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                    isCurrentPlan 
                      ? 'border-gray-300 bg-gray-50' 
                      : selectedPlanId === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={plan.id} 
                      disabled={isCurrentPlan}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg">{plan.name}</span>
                          {plan.isPopular && (
                            <Badge className="ml-2">人気</Badge>
                          )}
                          {isCurrentPlan && (
                            <Badge variant="secondary">現在のプラン</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${plan.price}</div>
                          <div className="text-sm text-gray-500">
                            /{plan.interval === 'monthly' ? '月' : '年'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            {feature}
                          </div>
                        ))}
                        {plan.features.length > 3 && (
                          <div className="text-sm text-primary">
                            他{plan.features.length - 3}個の機能
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </RadioGroup>

        <div className="mt-6">
          <Button 
            onClick={() => selectedPlanId && handlePlanSelect(selectedPlanId)}
            disabled={!selectedPlanId || selectedPlanId === currentPlanId}
            className="w-full"
          >
            プランを変更する
          </Button>
        </div>
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id as keyof typeof planIcons] || Zap;
          const isCurrentPlan = plan.id === currentPlanId;
          
          return (
            <button
              key={plan.id}
              onClick={() => handlePlanSelect(plan.id)}
              disabled={isCurrentPlan}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                isCurrentPlan 
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                  : 'border-gray-200 hover:border-primary'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5 text-primary" />
                {isCurrentPlan && (
                  <Badge variant="secondary" className="text-xs">利用中</Badge>
                )}
              </div>
              <div className="font-semibold">{plan.name}</div>
              <div className="text-2xl font-bold mt-1">
                ${plan.price}
                <span className="text-sm font-normal text-gray-500">
                  /{plan.interval === 'monthly' ? '月' : '年'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Default: cards variant
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id as keyof typeof planIcons] || Zap;
          const isCurrentPlan = plan.id === currentPlanId;
          const colorClass = planColors[plan.id as keyof typeof planColors] || 'bg-gray-500';
          
          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden ${
                plan.isPopular ? 'ring-2 ring-primary shadow-lg' : ''
              } ${isCurrentPlan ? 'bg-gray-50' : ''}`}
            >
              {/* Plan Header Banner */}
              <div className={`h-2 ${colorClass}`} />
              
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary">おすすめ</Badge>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary">利用中</Badge>
                </div>
              )}

              <CardHeader className="pt-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 rounded-full ${colorClass} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${colorClass.includes('gradient') ? 'text-purple-600' : colorClass.replace('bg-', 'text-')}`} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </div>
                <CardDescription>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="ml-2 text-gray-600">
                      /{plan.interval === 'monthly' ? '月' : '年'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-blue-600">
                    {getTrialDays(plan.id)}日間の無料トライアル
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Limits */}
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品数</span>
                      <span className="font-medium">
                        {plan.maxProducts ? plan.maxProducts.toLocaleString() : '無制限'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">月間注文数</span>
                      <span className="font-medium">
                        {plan.maxOrders ? plan.maxOrders.toLocaleString() : '無制限'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.isPopular ? 'default' : 'outline'}
                  disabled={isCurrentPlan}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {isCurrentPlan ? (
                    '現在利用中'
                  ) : (
                    <>
                      選択する
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isDowngrade() ? 'プランのダウングレード' : 'プランのアップグレード'}
            </DialogTitle>
            <DialogDescription>
              {getCurrentPlan()?.name} から {getSelectedPlan()?.name} への変更を確認してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Plan Comparison */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">現在のプラン</span>
                <div className="text-right">
                  <div className="font-semibold">{getCurrentPlan()?.name}</div>
                  <div className="text-sm text-gray-500">
                    ${getCurrentPlan()?.price}/月
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                <span className="text-sm text-gray-600">新しいプラン</span>
                <div className="text-right">
                  <div className="font-semibold">{getSelectedPlan()?.name}</div>
                  <div className="text-sm text-gray-500">
                    ${getSelectedPlan()?.price}/月
                  </div>
                </div>
              </div>
            </div>

            {/* Warning for downgrade */}
            {isDowngrade() && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  ダウングレードすると、一部の機能が制限される可能性があります。
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-gray-600">
              <p>変更は次の請求サイクルから適用されます。</p>
              <p className="mt-1">Shopifyの課金承認画面にリダイレクトされます。</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isUpgrading}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleConfirmUpgrade}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  処理中...
                </>
              ) : (
                '変更を確定'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}