'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  FeatureType, 
  FeatureSelectionResponse,
  SelectFeatureResult,
  AvailableFeature,
  FeatureUsageResponse
} from '@/types/featureSelection';

const API_BASE = process.env.NEXT_PUBLIC_API_URL as string;

// エラータイプ定義
type ErrorType = 'network' | 'auth' | 'permission' | 'validation' | 'server' | 'unknown';

interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  retryable: boolean;
}

// API fetcher with retry logic
const fetcher = async (url: string, retryCount = 0): Promise<any> => {
  const maxRetries = 3;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      
      // 認証エラーの場合はリトライしない
      if (response.status === 401 || response.status === 403) {
        throw {
          type: 'auth' as ErrorType,
          message: error.message || '認証が必要です',
          retryable: false,
        };
      }
      
      // 429 (Too Many Requests) の場合はリトライ
      if (response.status === 429 && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetcher(url, retryCount + 1);
      }
      
      throw {
        type: 'server' as ErrorType,
        message: error.message || `HTTP error! status: ${response.status}`,
        retryable: response.status >= 500,
      };
    }

    return response.json();
  } catch (error) {
    // ネットワークエラーの場合はリトライ
    if (error instanceof TypeError && error.message === 'Failed to fetch' && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetcher(url, retryCount + 1);
    }
    
    // ApiError型の場合はそのままthrow
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    // その他のエラー
    throw {
      type: 'network' as ErrorType,
      message: 'ネットワークエラーが発生しました。接続を確認してください。',
      retryable: true,
    };
  }
};

// 冪等性トークン生成
const generateIdempotencyToken = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function useFeatureSelection() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // 現在の選択状態を取得
  const { 
    data: currentSelection, 
    error: fetchError, 
    isLoading,
    mutate: refreshSelection
  } = useSWR<FeatureSelectionResponse>(
    `${API_BASE}/api/feature-selection/current`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // 1分ごとに更新
      onError: (err) => {
        if (err && typeof err === 'object' && 'type' in err) {
          setError(err as ApiError);
        }
      },
      shouldRetryOnError: (error) => {
        return error?.retryable !== false;
      },
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // 利用可能な機能一覧を取得
  const { data: availableFeatures } = useSWR<AvailableFeature[]>(
    `${API_BASE}/api/feature-selection/available-features`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // 機能を選択
  const selectFeature = useCallback(async (feature: FeatureType): Promise<SelectFeatureResult> => {
    setIsSelecting(true);
    setError(null);

    const idempotencyToken = generateIdempotencyToken();

    try {
      const response = await fetch(`${API_BASE}/api/feature-selection/select`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Token': idempotencyToken,
        },
        body: JSON.stringify({ feature }),
      });

      const result = await response.json();

      if (response.status === 409) {
        // 変更不可エラー
        const daysRemaining = calculateDaysRemaining(result.nextChangeAvailableDate);
        const errorObj: ApiError = {
          type: 'permission',
          message: `次回変更可能まであと${daysRemaining}日です`,
          details: { nextChangeDate: result.nextChangeAvailableDate },
          retryable: false,
        };
        setError(errorObj);
        return {
          success: false,
          message: result.message || '機能の変更はできません',
          errorCode: 'change_not_allowed',
        };
      }

      if (!response.ok) {
        const errorObj: ApiError = {
          type: response.status >= 500 ? 'server' : 'validation',
          message: result.message || 'Selection failed',
          retryable: response.status >= 500,
        };
        throw errorObj;
      }

      // 成功時はキャッシュを更新
      await mutate(`${API_BASE}/api/feature-selection/current`);
      
      return {
        success: true,
        message: '機能が正常に選択されました',
        newSelection: result.newSelection,
      };
    } catch (err) {
      let apiError: ApiError;
      
      if (err && typeof err === 'object' && 'type' in err) {
        apiError = err as ApiError;
      } else if (err instanceof Error) {
        apiError = {
          type: 'unknown',
          message: err.message,
          retryable: false,
        };
      } else {
        apiError = {
          type: 'unknown',
          message: '予期しないエラーが発生しました',
          retryable: false,
        };
      }
      
      setError(apiError);
      return {
        success: false,
        message: apiError.message,
      };
    } finally {
      setIsSelecting(false);
    }
  }, []);

  // 機能の使用状況を取得
  const getFeatureUsage = useCallback(async (feature: FeatureType): Promise<FeatureUsageResponse | null> => {
    try {
      const response = await fetch(`${API_BASE}/api/feature-selection/usage/${feature}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch {
      return null;
    }
  }, []);

  // 残り日数を計算
  const calculateDaysRemaining = (nextChangeDate?: string | null): number => {
    if (!nextChangeDate) return 0;
    
    const now = new Date();
    const next = new Date(nextChangeDate);
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // 次回変更可能までの残り日数
  const daysUntilNextChange = currentSelection?.nextChangeAvailableDate
    ? calculateDaysRemaining(currentSelection.nextChangeAvailableDate)
    : null;

  // エラーリトライ機能
  const retryAction = useCallback(() => {
    if (error?.retryable) {
      setError(null);
      setRetryAttempt(prev => prev + 1);
      refreshSelection();
    }
  }, [error, refreshSelection]);

  // 自動リトライ設定
  useEffect(() => {
    if (error?.retryable && retryAttempt < 3) {
      retryTimeoutRef.current = setTimeout(() => {
        retryAction();
      }, 5000); // 5秒後に自動リトライ
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [error, retryAttempt, retryAction]);

  // エラーメッセージの取得
  const getErrorMessage = (): string | null => {
    if (!error) return null;
    
    switch (error.type) {
      case 'network':
        return `ネットワークエラー: ${error.message}`;
      case 'auth':
        return `認証エラー: ${error.message}`;
      case 'permission':
        return error.message;
      case 'validation':
        return `入力エラー: ${error.message}`;
      case 'server':
        return `サーバーエラー: ${error.message}${error.retryable ? ' (自動リトライ中...)' : ''}`;
      default:
        return error.message;
    }
  };

  return {
    // 状態
    currentSelection,
    availableFeatures: availableFeatures || [],
    isLoading,
    isSelecting,
    error: getErrorMessage(),
    errorDetails: error,
    
    // 計算値
    daysUntilNextChange,
    canChangeToday: currentSelection?.canChangeToday || false,
    hasFullAccess: currentSelection?.hasFullAccess || false,
    
    // アクション
    selectFeature,
    getFeatureUsage,
    clearError: () => {
      setError(null);
      setRetryAttempt(0);
    },
    retryAction: error?.retryable ? retryAction : undefined,
  };
}