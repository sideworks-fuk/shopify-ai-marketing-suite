'use client';

import React, { useState, useEffect } from 'react';
import { FeatureType, FEATURE_DETAILS } from '@/types/featureSelection';
import { useFeatureSelection } from '@/hooks/useFeatureSelection';

interface FeatureSelectorProps {
  onSelect?: (feature: FeatureType) => void;
  onSkip?: () => void;
}

export function FeatureSelector({ onSelect, onSkip }: FeatureSelectorProps) {
  const {
    currentSelection,
    canChangeToday,
    daysUntilNextChange,
    selectFeature,
    isSelecting,
    error,
    clearError,
  } = useFeatureSelection();

  const [selectedFeature, setSelectedFeature] = useState<FeatureType | null>(
    currentSelection?.selectedFeature || null
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreview, setShowPreview] = useState<FeatureType | null>(null);

  // カウントダウンの計算
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    if (!canChangeToday && currentSelection?.nextChangeAvailableDate) {
      const updateCountdown = () => {
        const now = new Date();
        const nextChange = new Date(currentSelection.nextChangeAvailableDate!);
        const diff = nextChange.getTime() - now.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setCountdown({ days, hours, minutes });
        } else {
          setCountdown(null);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // 1分ごとに更新

      return () => clearInterval(interval);
    }
  }, [canChangeToday, currentSelection]);

  const handleFeatureClick = (feature: FeatureType) => {
    if (!canChangeToday && currentSelection?.selectedFeature !== feature) {
      // 未選択機能のプレビューを表示
      setShowPreview(feature);
      return;
    }
    if (canChangeToday) {
      setSelectedFeature(feature);
      setShowConfirmDialog(true);
    }
  };

  const handleConfirm = async () => {
    if (!selectedFeature) return;

    const result = await selectFeature(selectedFeature);
    
    if (result.success) {
      setShowConfirmDialog(false);
      onSelect?.(selectedFeature);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setSelectedFeature(null);
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const getProgressPercentage = () => {
    if (!daysUntilNextChange) return 100;
    const totalDays = 30;
    const daysElapsed = totalDays - daysUntilNextChange;
    return (daysElapsed / totalDays) * 100;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-3">無料プランで利用する機能を選択</h2>
        <p className="text-gray-600 text-lg">
          以下の3つの分析機能から1つを選んでご利用いただけます
        </p>
        
        {/* 変更制限の通知とプログレスバー */}
        {currentSelection?.selectedFeature && !canChangeToday && countdown && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
            <div className="mb-4">
              <p className="text-lg font-semibold text-gray-800 mb-2">次回変更可能まで</p>
              <div className="flex justify-center space-x-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{countdown.days}</div>
                  <div className="text-sm text-gray-600">日</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{countdown.hours}</div>
                  <div className="text-sm text-gray-600">時間</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{countdown.minutes}</div>
                  <div className="text-sm text-gray-600">分</div>
                </div>
              </div>
            </div>
            
            {/* プログレスバー */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              利用期間: {Math.floor(getProgressPercentage() * 30 / 100)}日目 / 30日
            </p>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 flex items-start">
              <span className="text-red-500 mr-2 mt-0.5">⚠️</span>
              <div>
                <p className="text-red-800 mb-2">{error}</p>
                <a
                  href="/billing"
                  className="inline-flex items-center text-sm text-red-700 hover:text-red-900 underline"
                >
                  有料プランを確認して制限を解除する →
                </a>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-xl"
              aria-label="エラーを閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 機能カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(Object.keys(FEATURE_DETAILS) as FeatureType[]).map((feature) => {
          const details = FEATURE_DETAILS[feature];
          const isSelected = currentSelection?.selectedFeature === feature;
          const isDisabled = !canChangeToday && !isSelected;
          const isClickable = canChangeToday || (!canChangeToday && !isSelected);

          return (
            <div
              key={feature}
              className={`
                relative border-2 rounded-lg p-6 transition-all
                ${isSelected ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105' : 'border-gray-200'}
                ${isClickable && !isSelected ? 'cursor-pointer hover:border-gray-400 hover:shadow-md' : ''}
                ${isDisabled && !isSelected ? 'opacity-75' : ''}
              `}
              onClick={() => handleFeatureClick(feature)}
              role="button"
              tabIndex={isClickable ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleFeatureClick(feature);
                }
              }}
              aria-label={`${details.name}を選択`}
            >
              {/* 選択中バッジ */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    利用中
                  </div>
                </div>
              )}

              {/* ロック表示 */}
              {isDisabled && !isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="bg-gray-400 text-white p-2 rounded-full">
                    🔒
                  </div>
                </div>
              )}

              {/* アイコン */}
              <div className="text-4xl mb-4">{details.icon}</div>

              {/* タイトル */}
              <h3 className="text-xl font-bold mb-3">{details.name}</h3>

              {/* 説明 */}
              <p className="text-gray-600 mb-4">{details.description}</p>

              {/* メリット */}
              <ul className="space-y-2">
                {details.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* 選択ボタン */}
              {!isSelected && canChangeToday && (
                <button
                  className="mt-6 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  disabled={isSelecting}
                >
                  この機能を選択
                </button>
              )}

              {/* 未選択機能のプレビューボタン */}
              {!isSelected && !canChangeToday && (
                <button
                  className="mt-6 w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  プレビューを見る
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 後で決めるボタン */}
      {!currentSelection?.selectedFeature && (
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 underline"
          >
            後で決める
          </button>
        </div>
      )}

      {/* 確認ダイアログ */}
      {showConfirmDialog && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">機能選択の確認</h3>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-3">
                <span className="text-3xl mr-3">{FEATURE_DETAILS[selectedFeature].icon}</span>
                <span className="font-bold text-lg">{FEATURE_DETAILS[selectedFeature].name}</span>
              </div>
              <p className="text-sm text-gray-600">
                {FEATURE_DETAILS[selectedFeature].description}
              </p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-amber-500 mr-2 text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">重要な制限事項</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• 選択後30日間は変更できません</li>
                    <li>• 他の2つの機能は利用できません</li>
                    <li>• データエクスポートは月10回まで</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                disabled={isSelecting}
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                disabled={isSelecting}
              >
                {isSelecting ? '処理中...' : '確定する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未選択機能のプレビューダイアログ */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">機能プレビュー</h3>
              <button
                onClick={() => setShowPreview(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-4">{FEATURE_DETAILS[showPreview].icon}</span>
                <div>
                  <h4 className="text-2xl font-bold">{FEATURE_DETAILS[showPreview].name}</h4>
                  <p className="text-gray-600">{FEATURE_DETAILS[showPreview].description}</p>
                </div>
              </div>

              {/* デモ画像プレースホルダー */}
              <div className="bg-gray-100 rounded-lg p-8 mb-6">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg font-semibold mb-2">デモデータ表示エリア</p>
                  <p className="text-sm">実際の分析画面のサンプルがここに表示されます</p>
                </div>
              </div>

              {/* 機能の詳細 */}
              <div className="space-y-4">
                <div>
                  <h5 className="font-bold mb-2">主な機能</h5>
                  <ul className="space-y-2">
                    {FEATURE_DETAILS[showPreview].benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* アップグレード誘導 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
              <h5 className="font-bold mb-2">この機能を使うには</h5>
              <p className="text-sm text-gray-600 mb-4">
                現在選択中の機能を変更するか、有料プランにアップグレードしてください。
              </p>
              <div className="flex space-x-4">
                {countdown && (
                  <div className="flex-1 text-center bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">次回変更可能まで</p>
                    <p className="text-lg font-bold text-blue-600">{countdown.days}日</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowPreview(null);
                    window.location.href = '/billing';
                  }}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                >
                  有料プランを見る
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}