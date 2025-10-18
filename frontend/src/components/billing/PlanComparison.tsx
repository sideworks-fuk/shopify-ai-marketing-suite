'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import type { BillingPlan } from '@/types/billing';

interface PlanComparisonProps {
  plans: BillingPlan[];
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
}

const allFeatures = [
  { key: 'basic_analytics', label: '基本的な分析機能', plans: ['starter', 'professional', 'enterprise'] },
  { key: 'customer_analysis', label: '顧客分析', plans: ['starter', 'professional', 'enterprise'] },
  { key: 'product_analysis', label: '商品分析', plans: ['starter', 'professional', 'enterprise'] },
  { key: 'email_support', label: 'メールサポート', plans: ['starter', 'professional', 'enterprise'] },
  { key: 'ai_predictions', label: 'AI予測分析', plans: ['professional', 'enterprise'] },
  { key: 'custom_reports', label: 'カスタムレポート', plans: ['professional', 'enterprise'] },
  { key: 'api_access', label: 'APIアクセス', plans: ['professional', 'enterprise'] },
  { key: 'priority_support', label: '優先サポート', plans: ['professional', 'enterprise'] },
  { key: 'advanced_ai', label: '高度なAI分析', plans: ['enterprise'] },
  { key: 'custom_dashboard', label: 'カスタマイズ可能なダッシュボード', plans: ['enterprise'] },
  { key: 'white_label', label: 'ホワイトラベル対応', plans: ['enterprise'] },
  { key: 'dedicated_support', label: '専任サポート', plans: ['enterprise'] },
  { key: 'sla', label: 'SLA保証', plans: ['enterprise'] },
];

export function PlanComparison({ plans, currentPlanId, onSelectPlan }: PlanComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>プラン比較表</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4 font-medium text-gray-900">機能</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="text-center py-4 px-4 min-w-[150px]">
                    <div className="space-y-2">
                      {plan.isPopular && (
                        <Badge className="mb-2">人気</Badge>
                      )}
                      {currentPlanId === plan.id && (
                        <Badge variant="secondary" className="mb-2">現在のプラン</Badge>
                      )}
                      <div className="font-semibold text-lg">{plan.name}</div>
                      <div className="text-2xl font-bold">
                        ${plan.price}
                        <span className="text-sm font-normal text-gray-600">
                          /{plan.interval === 'monthly' ? '月' : '年'}
                        </span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Limits */}
              <tr className="border-b bg-gray-50">
                <td className="py-3 px-4 font-medium" colSpan={plans.length + 1}>
                  利用制限
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">商品数</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="text-center py-3 px-4">
                    {plan.maxProducts ? plan.maxProducts.toLocaleString() : '無制限'}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">月間注文数</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="text-center py-3 px-4">
                    {plan.maxOrders ? plan.maxOrders.toLocaleString() : '無制限'}
                  </td>
                ))}
              </tr>

              {/* Features */}
              <tr className="border-b bg-gray-50">
                <td className="py-3 px-4 font-medium" colSpan={plans.length + 1}>
                  機能
                </td>
              </tr>
              {allFeatures.map((feature) => (
                <tr key={feature.key} className="border-b">
                  <td className="py-3 px-4 text-gray-600">{feature.label}</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center py-3 px-4">
                      {feature.plans.includes(plan.id) ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Trial Period */}
              <tr className="border-b bg-gray-50">
                <td className="py-3 px-4 font-medium" colSpan={plans.length + 1}>
                  無料トライアル
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">トライアル期間</td>
                {plans.map((plan) => {
                  const trialDays = plan.id === 'starter' ? 7 : 
                                   plan.id === 'professional' ? 14 : 30;
                  return (
                    <td key={plan.id} className="text-center py-3 px-4">
                      {trialDays}日間
                    </td>
                  );
                })}
              </tr>

              {/* Actions */}
              <tr>
                <td className="py-6 px-4"></td>
                {plans.map((plan) => (
                  <td key={plan.id} className="text-center py-6 px-4">
                    {currentPlanId === plan.id ? (
                      <Button variant="secondary" disabled className="w-full max-w-[150px]">
                        利用中
                      </Button>
                    ) : (
                      <Button
                        variant={plan.isPopular ? 'default' : 'outline'}
                        onClick={() => onSelectPlan(plan.id)}
                        className="w-full max-w-[150px]"
                      >
                        選択する
                      </Button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface PlanFeatureListProps {
  features: string[];
  highlightedFeatures?: string[];
}

export function PlanFeatureList({ features, highlightedFeatures = [] }: PlanFeatureListProps) {
  return (
    <ul className="space-y-3">
      {features.map((feature, index) => {
        const isHighlighted = highlightedFeatures.includes(feature);
        return (
          <li 
            key={index} 
            className={`flex items-start ${isHighlighted ? 'font-medium' : ''}`}
          >
            <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${
              isHighlighted ? 'text-primary' : 'text-green-500'
            }`} />
            <span className={isHighlighted ? 'text-primary' : 'text-gray-700'}>
              {feature}
            </span>
          </li>
        );
      })}
    </ul>
  );
}