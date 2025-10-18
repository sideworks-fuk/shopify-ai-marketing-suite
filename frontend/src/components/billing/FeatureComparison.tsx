'use client';

import React, { useState } from 'react';
import { FeatureType, FEATURE_DETAILS } from '@/types/featureSelection';
import { useFeatureSelection } from '@/hooks/useFeatureSelection';

interface FeatureComparisonProps {
  showUpgradePrompt?: boolean;
  onUpgrade?: () => void;
}

export function FeatureComparison({ showUpgradePrompt = true, onUpgrade }: FeatureComparisonProps) {
  const { currentSelection, hasFullAccess } = useFeatureSelection();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'pros-cons'>('overview');

  const features = Object.keys(FEATURE_DETAILS) as FeatureType[];

  // 機能比較データ
  const comparisonData = {
    dormant_analysis: {
      maxCustomers: '1,000件',
      exportLimit: '月10回',
      dataRetention: '3ヶ月',
      emailList: '✓',
      segmentation: '基本',
      automation: '✗',
      pros: [
        '長期間購入のない顧客を自動抽出',
        'メールマーケティング用リストの自動生成',
        '顧客の復帰確率を予測',
        'セグメント別の休眠期間分析',
        '再購入を促すアクションの提案',
      ],
      cons: [
        '自動化機能は利用不可',
        '分析可能な顧客数に上限（1,000件）',
        'カスタムセグメントの作成不可',
        'APIアクセス不可',
      ],
      bestFor: '定期的に休眠顧客へのアプローチを行いたい店舗',
    },
    yoy_comparison: {
      maxPeriod: '12ヶ月',
      exportLimit: '月10回',
      dataRetention: '3ヶ月',
      customPeriod: '✗',
      multiStore: '✗',
      advancedFilters: '✗',
      pros: [
        '前年同月との売上比較が一目瞭然',
        '季節変動を考慮した分析',
        '成長率の自動計算',
        '商品カテゴリ別の比較分析',
        'グラフによる視覚的な表示',
      ],
      cons: [
        'カスタム期間の設定不可',
        '複数店舗の統合分析不可',
        '高度なフィルタリング機能なし',
        '予測分析機能なし',
      ],
      bestFor: '年間を通じた成長を追跡したい店舗',
    },
    purchase_frequency: {
      maxCustomers: '1,000件',
      exportLimit: '月10回',
      dataRetention: '3ヶ月',
      cohortAnalysis: '✗',
      predictiveAnalysis: '✗',
      customSegments: '✗',
      pros: [
        '顧客の購入パターンを詳細分析',
        'リピート率の自動計算',
        '優良顧客の特定',
        '購入間隔の分布表示',
        'LTV（顧客生涯価値）の簡易計算',
      ],
      cons: [
        'コホート分析は利用不可',
        '予測分析機能なし',
        'カスタムセグメント作成不可',
        '大規模データ処理に制限',
      ],
      bestFor: 'リピーター育成に注力したい店舗',
    },
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-3">機能比較表</h2>
        <p className="text-gray-600">
          各機能の詳細な仕様と制限事項をご確認いただけます
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6 border-b">
        <div className="flex flex-wrap space-x-4 md:space-x-8">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
              selectedTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            概要比較
          </button>
          <button
            onClick={() => setSelectedTab('details')}
            className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
              selectedTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            詳細仕様
          </button>
          <button
            onClick={() => setSelectedTab('pros-cons')}
            className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
              selectedTab === 'pros-cons'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            メリット・デメリット
          </button>
        </div>
      </div>

      {/* アップグレード促進バナー */}
      {showUpgradePrompt && !hasFullAccess && (
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold mb-2">すべての機能を利用可能に</h3>
              <p className="text-blue-100">
                有料プランにアップグレードすると、すべての分析機能を制限なくご利用いただけます
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              プランを見る
            </button>
          </div>
        </div>
      )}

      {/* 概要比較 */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {features.map((feature) => {
            const isSelected = currentSelection?.selectedFeature === feature;
            const data = comparisonData[feature];
            return (
              <div
                key={feature}
                className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isSelected && (
                  <div className="mb-4 bg-blue-500 text-white text-sm px-3 py-1 rounded-full inline-block">
                    現在利用中
                  </div>
                )}
                <div className="text-3xl mb-3">{FEATURE_DETAILS[feature].icon}</div>
                <h3 className="text-xl font-bold mb-2">{FEATURE_DETAILS[feature].name}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {FEATURE_DETAILS[feature].description}
                </p>
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">最適な店舗：</p>
                  <p className="text-sm text-gray-600">{data.bestFor}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 詳細仕様表 */}
      {selectedTab === 'details' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold border-b">機能</th>
                {features.map((feature) => {
                  const isSelected = currentSelection?.selectedFeature === feature;
                  return (
                    <th
                      key={feature}
                      className={`p-4 font-semibold border-b text-center ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="mb-2 text-2xl">{FEATURE_DETAILS[feature].icon}</div>
                      <div>{FEATURE_DETAILS[feature].name}</div>
                      {isSelected && (
                        <div className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full inline-block">
                          利用中
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* 休眠顧客分析の項目 */}
              <tr>
                <td className="p-4 border-b font-medium">最大顧客数</td>
                <td className="p-4 border-b text-center">
                  {comparisonData.dormant_analysis.maxCustomers}
                </td>
                <td className="p-4 border-b text-center">-</td>
                <td className="p-4 border-b text-center">
                  {comparisonData.purchase_frequency.maxCustomers}
                </td>
              </tr>
              
              <tr className="bg-gray-50">
                <td className="p-4 border-b font-medium">エクスポート制限</td>
                {features.map((feature) => (
                  <td key={feature} className="p-4 border-b text-center">
                    {comparisonData[feature].exportLimit}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 border-b font-medium">データ保持期間</td>
                {features.map((feature) => (
                  <td key={feature} className="p-4 border-b text-center">
                    {comparisonData[feature].dataRetention}
                  </td>
                ))}
              </tr>

              {/* 休眠顧客分析特有 */}
              <tr className="bg-gray-50">
                <td className="p-4 border-b font-medium">メールリスト生成</td>
                <td className="p-4 border-b text-center text-green-500 font-bold">
                  {comparisonData.dormant_analysis.emailList}
                </td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
              </tr>

              <tr>
                <td className="p-4 border-b font-medium">セグメント機能</td>
                <td className="p-4 border-b text-center">
                  {comparisonData.dormant_analysis.segmentation}
                </td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
              </tr>

              {/* 前年同月比分析特有 */}
              <tr className="bg-gray-50">
                <td className="p-4 border-b font-medium">分析期間</td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
                <td className="p-4 border-b text-center">
                  {comparisonData.yoy_comparison.maxPeriod}
                </td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
              </tr>

              <tr>
                <td className="p-4 border-b font-medium">カスタム期間</td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
                <td className="p-4 border-b text-center text-red-500">
                  {comparisonData.yoy_comparison.customPeriod}
                </td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
              </tr>

              {/* 購入回数分析特有 */}
              <tr className="bg-gray-50">
                <td className="p-4 border-b font-medium">コホート分析</td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
                <td className="p-4 border-b text-center text-gray-400">-</td>
                <td className="p-4 border-b text-center text-red-500">
                  {comparisonData.purchase_frequency.cohortAnalysis}
                </td>
              </tr>

              <tr>
                <td className="p-4 font-medium">予測分析</td>
                <td className="p-4 text-center text-gray-400">-</td>
                <td className="p-4 text-center text-gray-400">-</td>
                <td className="p-4 text-center text-red-500">
                  {comparisonData.purchase_frequency.predictiveAnalysis}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* メリット・デメリット */}
      {selectedTab === 'pros-cons' && (
        <div className="space-y-8">
          {features.map((feature) => {
            const isSelected = currentSelection?.selectedFeature === feature;
            const data = comparisonData[feature];
            return (
              <div
                key={feature}
                className={`bg-white rounded-lg p-6 border-2 ${
                  isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center mb-6">
                  <span className="text-3xl mr-4">{FEATURE_DETAILS[feature].icon}</span>
                  <div>
                    <h3 className="text-xl font-bold">{FEATURE_DETAILS[feature].name}</h3>
                    {isSelected && (
                      <span className="text-sm text-blue-600 font-medium">現在利用中</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* メリット */}
                  <div>
                    <h4 className="font-bold text-green-600 mb-3 flex items-center">
                      <span className="mr-2">✓</span>
                      メリット
                    </h4>
                    <ul className="space-y-2">
                      {data.pros.map((pro, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="text-green-500 mr-2 mt-0.5">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* デメリット */}
                  <div>
                    <h4 className="font-bold text-red-600 mb-3 flex items-center">
                      <span className="mr-2">✗</span>
                      デメリット
                    </h4>
                    <ul className="space-y-2">
                      {data.cons.map((con, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="text-red-500 mr-2 mt-0.5">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-1">おすすめ：</p>
                  <p className="text-sm text-gray-600">{data.bestFor}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 凡例 */}
      <div className="mt-6 flex flex-wrap items-center gap-4 md:gap-6 text-sm text-gray-600">
        <div className="flex items-center">
          <span className="text-green-500 font-bold mr-2">✓</span>
          <span>利用可能</span>
        </div>
        <div className="flex items-center">
          <span className="text-red-500 font-bold mr-2">✗</span>
          <span>利用不可</span>
        </div>
        <div className="flex items-center">
          <span className="text-gray-400 mr-2">-</span>
          <span>該当なし</span>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-bold mb-3">ご利用にあたっての注意事項</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 無料プランでは、選択した1つの機能のみご利用いただけます</li>
          <li>• 機能の変更は30日に1回まで可能です</li>
          <li>• データのエクスポート回数には月間制限があります</li>
          <li>• 有料プランへのアップグレードで、すべての機能が利用可能になります</li>
        </ul>
      </div>
    </div>
  );
}