'use client';

import React, { useEffect, useState } from 'react';
import { useDeveloperMode } from '@/contexts/DeveloperModeContext';
import { LogOut } from 'lucide-react';

export function DeveloperModeBanner() {
  const { logout, getSessionExpiresAt } = useDeveloperMode();
  const [remainingTime, setRemainingTime] = useState<string>('計算中...');

  // セッション有効期限を計算
  const calculateRemainingTime = (): string => {
    const expiresAt = getSessionExpiresAt();
    if (!expiresAt) return '不明';

    const remaining = expiresAt - Date.now();

    // 期限切れ
    if (remaining <= 0) {
      return '期限切れ';
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}時間${minutes}分`;
  };

  // 初回計算
  useEffect(() => {
    setRemainingTime(calculateRemainingTime());
  }, []);

  // 1分ごとに更新
  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = calculateRemainingTime();
      setRemainingTime(newTime);

      // 期限切れの場合は自動ログアウト
      if (newTime === '期限切れ') {
        console.log('⏱️ セッションタイムアウト: 自動ログアウト');
        logout();
        window.location.reload();
      }
    }, 60000); // 1分ごと

    return () => clearInterval(interval);
  }, [logout]);

  const handleLogout = () => {
    if (confirm('デモモードをログアウトしますか？')) {
      logout();
      window.location.reload();
    }
  };

  return (
    <div className="bg-yellow-500 text-black py-2 text-sm font-semibold sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 max-w-7xl mx-auto">
        {/* 左側: 警告メッセージ */}
        <span className="flex items-center gap-2">
          ⚠️ デモモード有効
          <span className="hidden sm:inline">
            （Shopify認証スキップ中） | セッション有効期限: 残り {remainingTime}
          </span>
        </span>

        {/* 右側: ログアウトボタン */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 underline hover:no-underline text-xs sm:text-sm transition-opacity hover:opacity-80"
          aria-label="デモモードをログアウト"
        >
          <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>ログアウト</span>
        </button>
      </div>
    </div>
  );
}

