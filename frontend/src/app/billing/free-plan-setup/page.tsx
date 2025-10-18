'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeatureSelector } from '@/components/billing/FeatureSelector';
import { FeatureComparison } from '@/components/billing/FeatureComparison';
import { FeatureType } from '@/types/featureSelection';
import { useFeatureSelection } from '@/hooks/useFeatureSelection';

export default function FreePlanSetupPage() {
  const router = useRouter();
  const { currentSelection, hasFullAccess } = useFeatureSelection();
  const [activeTab, setActiveTab] = useState<'select' | 'compare'>('select');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // すでに有料プランの場合はリダイレクト
  React.useEffect(() => {
    if (hasFullAccess) {
      router.push('/dashboard');
    }
  }, [hasFullAccess, router]);

  const handleFeatureSelect = (feature: FeatureType) => {
    setShowSuccessMessage(true);
    
    // 3秒後にダッシュボードへリダイレクト
    setTimeout(() => {
      router.push('/dashboard');
    }, 3000);
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const handleUpgrade = () => {
    router.push('/settings/billing');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">無料プラン機能設定</h1>
            {currentSelection?.selectedFeature && (
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ダッシュボードに戻る
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 成功メッセージ */}
      {showSuccessMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <p className="font-bold">機能の選択が完了しました</p>
                <p className="text-sm">ダッシュボードへ移動します...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('select')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'select'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              機能を選択
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'compare'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              機能を比較
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="py-8">
        {activeTab === 'select' ? (
          <FeatureSelector 
            onSelect={handleFeatureSelect}
            onSkip={handleSkip}
          />
        ) : (
          <FeatureComparison 
            showUpgradePrompt={true}
            onUpgrade={handleUpgrade}
          />
        )}
      </div>

      {/* フッター情報 */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* よくある質問 */}
            <div>
              <h3 className="font-bold mb-3">よくある質問</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    機能を変更するには？
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    有料プランとの違いは？
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    データの引き継ぎについて
                  </a>
                </li>
              </ul>
            </div>

            {/* サポート */}
            <div>
              <h3 className="font-bold mb-3">サポート</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    ヘルプセンター
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    お問い合わせ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    利用ガイド
                  </a>
                </li>
              </ul>
            </div>

            {/* アップグレード */}
            <div>
              <h3 className="font-bold mb-3">プランをアップグレード</h3>
              <p className="text-sm text-gray-600 mb-4">
                すべての機能を制限なく利用できる有料プランをご検討ください
              </p>
              <button
                onClick={handleUpgrade}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                有料プランを見る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}