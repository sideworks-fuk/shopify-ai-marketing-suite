'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TrialBannerProps {
  trialDaysRemaining: number;
  onUpgrade?: () => void;
  variant?: 'default' | 'compact' | 'alert';
}

export function TrialBanner({ 
  trialDaysRemaining, 
  onUpgrade,
  variant = 'default' 
}: TrialBannerProps) {
  const router = useRouter();
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/billing');
    }
  };

  // Don't show if trial has expired
  if (trialDaysRemaining <= 0) {
    return null;
  }

  // Alert variant for urgent cases (less than 3 days)
  if (variant === 'alert' || trialDaysRemaining <= 3) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-orange-900 font-medium">
              無料トライアルは残り{trialDaysRemaining}日で終了します
            </span>
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              トライアル期間
            </Badge>
          </div>
          <Button 
            size="sm" 
            className="ml-4"
            onClick={handleUpgrade}
          >
            今すぐアップグレード
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Compact variant for smaller spaces
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-900">
            トライアル残り{trialDaysRemaining}日
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-blue-600 hover:text-blue-700"
          onClick={handleUpgrade}
        >
          プランを見る
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  // Default variant
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                無料トライアル期間中
              </p>
              <p className="text-gray-600">
                あと{trialDaysRemaining}日で無料期間が終了します。
                今すぐアップグレードして、すべての機能をご利用ください。
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-blue-600">
              {trialDaysRemaining}日残り
            </Badge>
            <Button onClick={handleUpgrade}>
              プランを選択
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TrialStatusProps {
  status: 'active' | 'trialing' | 'expired';
  trialEndDate?: Date;
  planName?: string;
}

export function TrialStatus({ status, trialEndDate, planName }: TrialStatusProps) {
  if (status !== 'trialing' || !trialEndDate) {
    return null;
  }

  const now = new Date();
  const daysRemaining = Math.ceil(
    (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining <= 0) {
    return (
      <Badge variant="secondary" className="bg-gray-100">
        トライアル終了
      </Badge>
    );
  }

  const urgency = daysRemaining <= 3 ? 'destructive' : 
                  daysRemaining <= 7 ? 'secondary' : 
                  'default';

  return (
    <Badge variant={urgency as any}>
      トライアル残り{daysRemaining}日
    </Badge>
  );
}

interface TrialProgressBarProps {
  trialStartDate: Date;
  trialEndDate: Date;
  showDaysRemaining?: boolean;
}

export function TrialProgressBar({ 
  trialStartDate, 
  trialEndDate,
  showDaysRemaining = true 
}: TrialProgressBarProps) {
  const now = new Date();
  const totalDays = Math.ceil(
    (trialEndDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const elapsedDays = Math.ceil(
    (now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  const progress = Math.min(100, (elapsedDays / totalDays) * 100);

  return (
    <div className="space-y-2">
      {showDaysRemaining && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">トライアル期間</span>
          <span className="font-medium">
            {daysRemaining}日 / {totalDays}日
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all ${
            daysRemaining <= 3 ? 'bg-red-500' :
            daysRemaining <= 7 ? 'bg-orange-500' :
            'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{trialStartDate.toLocaleDateString('ja-JP')}</span>
        <span>{trialEndDate.toLocaleDateString('ja-JP')}</span>
      </div>
    </div>
  );
}