'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

interface FeatureLockedScreenProps {
  featureName: string;
  featureDescription?: string;
  featureType: 'dormant_analysis' | 'year_over_year' | 'frequency_detail';
}

const featureInfo = {
  dormant_analysis: {
    title: '休眠顧客分析',
    description: '一定期間購入がない顧客を特定し、再活性化のための施策を立案できます。',
    benefits: [
      '休眠顧客の自動検出',
      '休眠理由の分析',
      '再活性化キャンペーンの提案',
      'メール配信リストの自動生成',
    ],
  },
  year_over_year: {
    title: '前年同月比分析',
    description: '前年同期と比較して売上傾向を把握し、成長戦略を立案できます。',
    benefits: [
      '売上成長率の可視化',
      '商品カテゴリ別の成長分析',
      '季節変動の把握',
      '成長要因の特定',
    ],
  },
  frequency_detail: {
    title: '購入回数詳細分析',
    description: '顧客の購入頻度を詳細に分析し、リピート率向上施策を立案できます。',
    benefits: [
      '購入頻度別顧客セグメント',
      'RFM分析',
      'リピート率の推移',
      '優良顧客の特定',
    ],
  },
};

export default function FeatureLockedScreen({
  featureName,
  featureDescription,
  featureType,
}: FeatureLockedScreenProps) {
  const router = useRouter();
  const info = featureInfo[featureType];

  const handleSelectFeature = () => {
    router.push('/settings/billing/feature-selection');
  };

  const handleUpgrade = () => {
    router.push('/settings/billing?upgrade=true');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <Lock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">
          この機能は現在ロックされています
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          無料プランでは、3つの分析機能から1つを選択してご利用いただけます。
          30日ごとに選択を変更できます。
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-gray-400" />
          </div>
          <CardTitle className="text-2xl">{featureName || info.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {featureDescription || info.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              この機能でできること
            </h3>
            <ul className="space-y-2">
              {info.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">✓</span>
                  <span className="text-sm text-gray-600">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">アクセス方法</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="font-medium mr-2">オプション1:</span>
                <div>
                  <p>現在選択中の機能を変更する</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ※前回の変更から30日経過後に変更可能
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="font-medium mr-2">オプション2:</span>
                <div>
                  <p>有料プランにアップグレードして全機能を利用する</p>
                  <p className="text-xs text-gray-500 mt-1">
                    月額9.99ドルで全ての分析機能が利用可能
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSelectFeature}
            variant="outline"
            className="flex-1"
          >
            機能を選択・変更する
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={handleUpgrade}
            className="flex-1 bg-gradient-to-r from-primary to-primary/80"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            有料プランで全機能を利用
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          前のページに戻る
        </button>
      </div>
    </div>
  );
}