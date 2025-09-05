'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Lock, 
  Sparkles, 
  Zap,
  Building2,
  ChevronRight,
  X,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Brain
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeatureAccess, useComprehensiveFeatureAccess, FEATURES, type FeatureId } from '@/hooks/useFeatureAccess';

interface UpgradePromptProps {
  feature: string | FeatureId;
  variant?: 'inline' | 'modal' | 'banner' | 'card';
  onClose?: () => void;
  onUpgrade?: () => void;
  customMessage?: string;
  showComparison?: boolean;
}

const planIcons = {
  starter: Zap,
  professional: Sparkles,
  enterprise: Building2,
};

const featureIcons: Record<string, React.FC<any>> = {
  ai_predictions: Brain,
  advanced_ai: Brain,
  custom_reports: BarChart3,
  year_over_year: TrendingUp,
  purchase_frequency: TrendingUp,
  dormant_analysis: AlertCircle,
  market_basket: BarChart3,
};

export function UpgradePrompt({ 
  feature, 
  variant = 'card',
  onClose,
  onUpgrade,
  customMessage,
  showComparison = false
}: UpgradePromptProps) {
  const router = useRouter();
  const comprehensiveAccess = useComprehensiveFeatureAccess();
  const checkFeatureAccess = comprehensiveAccess.checkFeatureAccess;
  const getRequiredPlan = comprehensiveAccess.getRequiredPlan;
  const currentPlan = comprehensiveAccess.currentPlan;
  const [showModal, setShowModal] = useState(variant === 'modal');

  const accessResult = checkFeatureAccess(feature);
  const requiredPlan = getRequiredPlan(feature);
  const featureInfo = Object.values(FEATURES).find(f => f.id === feature);

  // If user has access, don't show the prompt
  if (accessResult.hasAccess) {
    return null;
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/billing');
    }
  };

  const handleClose = () => {
    setShowModal(false);
    if (onClose) {
      onClose();
    }
  };

  const FeatureIcon = featureIcons[feature] || Lock;
  const PlanIcon = requiredPlan ? planIcons[requiredPlan as keyof typeof planIcons] : Sparkles;

  const getPlanDisplayName = (planId: string) => {
    switch (planId) {
      case 'starter': return 'Starter';
      case 'professional': return 'Professional';
      case 'enterprise': return 'Enterprise';
      default: return planId;
    }
  };

  const getPlanPrice = (planId: string) => {
    switch (planId) {
      case 'starter': return 50;
      case 'professional': return 80;
      case 'enterprise': return 100;
      default: return 0;
    }
  };

  // Inline variant - minimal disruption
  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
        <Lock className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {customMessage || `${getPlanDisplayName(requiredPlan || '')}プラン以上で利用可能`}
        </span>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleUpgrade}
          className="h-auto py-0.5 px-2 text-primary hover:text-primary"
        >
          アップグレード
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  // Banner variant - top of page notification
  if (variant === 'banner') {
    return (
      <Alert className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <FeatureIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {featureInfo?.name || feature}を利用するには
              </p>
              <p className="text-sm text-gray-600">
                {customMessage || accessResult.upgradeMessage || 
                `${getPlanDisplayName(requiredPlan || '')}プラン以上へのアップグレードが必要です`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              後で
            </Button>
            <Button size="sm" onClick={handleUpgrade}>
              プランを確認
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // Modal variant
  if (variant === 'modal') {
    return (
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <FeatureIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle>機能のアップグレードが必要です</DialogTitle>
                <DialogDescription>
                  {featureInfo?.name || feature}を利用するには上位プランへのアップグレードが必要です
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current vs Required Plan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Badge variant="secondary" className="mb-2">現在のプラン</Badge>
                <p className="font-semibold text-lg">
                  {currentPlan ? getPlanDisplayName(currentPlan) : '未選択'}
                </p>
                {currentPlan && (
                  <p className="text-sm text-gray-500 mt-1">
                    ${getPlanPrice(currentPlan)}/月
                  </p>
                )}
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                <Badge className="mb-2">必要なプラン</Badge>
                <p className="font-semibold text-lg">
                  {getPlanDisplayName(requiredPlan || '')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ${getPlanPrice(requiredPlan || '')}/月
                </p>
              </div>
            </div>

            {/* Feature Description */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                {featureInfo?.name}で実現できること
              </h4>
              <p className="text-sm text-blue-700">
                {featureInfo?.description || 'この機能により、より詳細な分析と洞察が可能になります。'}
              </p>
            </div>

            {/* Additional Features */}
            {showComparison && requiredPlan && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {getPlanDisplayName(requiredPlan)}プランには以下も含まれます：
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center">
                    <Sparkles className="h-4 w-4 text-primary mr-2" />
                    AI予測分析
                  </li>
                  <li className="flex items-center">
                    <Sparkles className="h-4 w-4 text-primary mr-2" />
                    カスタムレポート
                  </li>
                  <li className="flex items-center">
                    <Sparkles className="h-4 w-4 text-primary mr-2" />
                    優先サポート
                  </li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button onClick={handleUpgrade}>
              プランを確認する
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Default: Card variant
  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-full">
              <Lock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg">アップグレードが必要です</CardTitle>
              <CardDescription className="mt-1">
                {featureInfo?.name || feature}を利用するには
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Feature Info */}
        <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
          <FeatureIcon className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{featureInfo?.name || feature}</p>
            <p className="text-sm text-gray-600">
              {featureInfo?.description || 'この機能を利用して、ビジネスを成長させましょう'}
            </p>
          </div>
        </div>

        {/* Required Plan */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-primary/20">
          <div className="flex items-center space-x-3">
            <PlanIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-gray-600">必要なプラン</p>
              <p className="font-semibold text-lg">
                {getPlanDisplayName(requiredPlan || '')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              ${getPlanPrice(requiredPlan || '')}
            </p>
            <p className="text-sm text-gray-500">/月</p>
          </div>
        </div>

        {customMessage && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{customMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button 
          className="flex-1" 
          onClick={handleUpgrade}
        >
          アップグレードする
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        {onClose && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleClose}
          >
            後で検討
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Simplified inline prompt for feature gates
export function FeatureGate({ 
  feature,
  children,
  fallback
}: {
  feature: string | FeatureId;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const comprehensiveAccess = useComprehensiveFeatureAccess();
  const canAccess = comprehensiveAccess.canAccess;

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  return (
    <>
      {fallback || (
        <UpgradePrompt 
          feature={feature} 
          variant="inline"
        />
      )}
    </>
  );
}