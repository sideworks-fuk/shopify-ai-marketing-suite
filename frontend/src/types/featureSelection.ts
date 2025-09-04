// types/featureSelection.ts

export type FeatureType =
  | 'dormant_analysis'
  | 'yoy_comparison'
  | 'purchase_frequency';

export type ChangeErrorCode =
  | 'change_not_allowed'
  | 'invalid_feature_id'
  | 'concurrent_modification';

export interface FeatureSelectionResponse {
  selectedFeature: FeatureType | null;
  lastChangeDate?: string | null;
  nextChangeAvailableDate?: string | null;
  canChangeToday: boolean;
  changeCount: number;
  reason?: string | null; // 例: 'remaining_days:12'
  currentPlan?: 'free' | 'basic' | 'premium' | 'enterprise';
  hasFullAccess?: boolean;
}

export interface SelectFeatureRequest {
  feature: FeatureType;
  rowVersion?: string; // 楽観ロック用（任意）
}

export interface FeatureInfo {
  feature: FeatureType;
  activatedAt: string; // ISO8601
  nextChangeableDate?: string;
}

export interface SelectFeatureResult {
  success: boolean;
  message: string;
  newSelection?: FeatureInfo;
  errorCode?: ChangeErrorCode;
}

export interface AvailableFeature {
  id: FeatureType;
  name: string;
  description: string;
  limits: Record<string, number | string>;
  currentUsage?: Record<string, number>;
}

export interface FeatureUsageResponse {
  current: Record<string, number>;
  limits: Record<string, number>;
}

// 機能の詳細情報
export const FEATURE_DETAILS: Record<FeatureType, {
  name: string;
  description: string;
  benefits: string[];
  icon: string;
}> = {
  dormant_analysis: {
    name: '休眠顧客分析',
    description: '長期間購入がない顧客を特定し、再活性化の施策を提案',
    benefits: [
      '休眠顧客の自動検出',
      '休眠期間別の顧客セグメント分析',
      '再活性化キャンペーンの効果測定',
      'メール配信リストの自動生成'
    ],
    icon: '😴'
  },
  yoy_comparison: {
    name: '前年同月比分析',
    description: '売上・顧客数・注文数を前年同月と比較し、成長率を可視化',
    benefits: [
      '月次・四半期・年次比較',
      '成長率の自動計算',
      'トレンドグラフの表示',
      '季節要因の分析'
    ],
    icon: '📊'
  },
  purchase_frequency: {
    name: '購入回数詳細分析',
    description: '顧客の購入頻度を分析し、リピート率向上の施策を提案',
    benefits: [
      '購入回数別の顧客分布',
      'リピート率の可視化',
      'VIP顧客の特定',
      '購入サイクル分析'
    ],
    icon: '🔄'
  }
};