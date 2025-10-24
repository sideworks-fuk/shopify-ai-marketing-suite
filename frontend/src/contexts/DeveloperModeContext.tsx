'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  getSessionExpiresAt: () => number | null; // 🆕 セッション有効期限を取得
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function useDeveloperMode() {
  const context = useContext(DeveloperModeContext);
  if (context === undefined) {
    throw new Error('useDeveloperMode must be used within a DeveloperModeProvider');
  }
  return context;
}

const DEV_MODE_STORAGE_KEY = 'dev_mode_auth';
const DEV_MODE_TIMESTAMP_KEY = 'dev_mode_timestamp';
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8時間

export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // セッションチェック
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const auth = localStorage.getItem(DEV_MODE_STORAGE_KEY);
    const timestamp = localStorage.getItem(DEV_MODE_TIMESTAMP_KEY);

    if (auth === 'true' && timestamp) {
      const elapsed = Date.now() - parseInt(timestamp, 10);
      if (elapsed < SESSION_TIMEOUT) {
        setIsDeveloperMode(true);
        setIsAuthenticated(true);
        console.log('✅ 開発者モード: セッション復元');
      } else {
        logout();
        console.log('⏱️ 開発者モード: セッションタイムアウト');
      }
    }
  }, []);

  const login = async (password: string): Promise<boolean> => {
    const correctPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD || 'dev2025';

    if (password === correctPassword) {
      setIsDeveloperMode(true);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
        localStorage.setItem(DEV_MODE_TIMESTAMP_KEY, Date.now().toString());
      }
      console.log('✅ 開発者モード: ログイン成功');
      return true;
    } else {
      console.error('❌ 開発者モード: パスワードが正しくありません');
      return false;
    }
  };

  const logout = () => {
    setIsDeveloperMode(false);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEV_MODE_STORAGE_KEY);
      localStorage.removeItem(DEV_MODE_TIMESTAMP_KEY);
    }
    console.log('🚪 開発者モード: ログアウト');
  };

  // 🆕 セッション有効期限を取得
  const getSessionExpiresAt = (): number | null => {
    if (typeof window === 'undefined') return null;
    const timestamp = localStorage.getItem(DEV_MODE_TIMESTAMP_KEY);
    if (!timestamp) return null;
    return parseInt(timestamp, 10) + SESSION_TIMEOUT;
  };

  return (
    <DeveloperModeContext.Provider value={{ isDeveloperMode, isAuthenticated, login, logout, getSessionExpiresAt }}>
      {children}
    </DeveloperModeContext.Provider>
  );
}

