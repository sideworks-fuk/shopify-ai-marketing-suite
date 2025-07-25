import { useState, useEffect } from 'react';
import { getAvailableEnvironments } from '@/lib/config/environments';
import { getEnvironmentInfo } from '@/lib/api-config';

export interface EnvironmentState {
  currentEnvironment: string;
  environmentName: string;
  apiBaseUrl: string;
  isProduction: boolean;
  description: string;
  availableEnvironments: any[];
  isLoading: boolean;
}

export const useEnvironment = () => {
  const [state, setState] = useState<EnvironmentState>({
    currentEnvironment: '',
    environmentName: '',
    apiBaseUrl: '',
    isProduction: false,
    description: '',
    availableEnvironments: [],
    isLoading: true,
  });

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      try {
        const info = getEnvironmentInfo();
        const environments = getAvailableEnvironments();
        
        setState({
          ...info,
          availableEnvironments: environments,
          isLoading: false,
        });
      } catch (error) {
        console.error('環境情報の取得に失敗しました:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, []);

  const changeEnvironment = (environmentKey: string) => {
    if (typeof window !== 'undefined') {
      // ローカルストレージに保存
      localStorage.setItem('selectedEnvironment', environmentKey);
      
      // ページをリロードして環境を反映
      window.location.reload();
    }
  };

  const getEnvironmentByKey = (key: string) => {
    return state.availableEnvironments.find(env => env.name === key);
  };

  return {
    ...state,
    changeEnvironment,
    getEnvironmentByKey,
  };
}; 