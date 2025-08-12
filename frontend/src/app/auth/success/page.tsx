'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import { CheckCircle, Loader2 } from 'lucide-react';

/**
 * OAuth認証成功ページ
 * 
 * @author YUKI
 * @date 2025-07-29
 * @description Shopify OAuth認証後のコールバックページ
 */
export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshStores, setCurrentStore } = useStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('認証情報を確認しています...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const shop = searchParams?.get('shop');
      const success = searchParams?.get('success');
      const error = searchParams?.get('error');

      console.log('🔐 認証コールバック受信:', { shop, success, error });

      // エラーチェック
      if (error) {
        setStatus('error');
        setMessage(decodeURIComponent(error));
        return;
      }

      if (!shop) {
        setStatus('error');
        setMessage('ストア情報が見つかりません');
        return;
      }

      try {
        setMessage('ストア情報を更新しています...');
        
        // ストア一覧を更新
        await refreshStores();
        
        // 現在のストアを設定
        const storeId = parseInt(searchParams?.get('storeId') || '1');
        setCurrentStore(storeId);
        
        // LocalStorageに保存
        localStorage.setItem('currentStoreId', storeId.toString());
        localStorage.setItem('currentShopDomain', shop);
        
        setStatus('success');
        setMessage('認証が完了しました！ダッシュボードへ移動します...');
        
        // 2秒後にダッシュボードへリダイレクト
        setTimeout(() => {
          router.push('/');
        }, 2000);
        
      } catch (error) {
        console.error('❌ ストア情報の更新エラー:', error);
        setStatus('error');
        setMessage('ストア情報の更新に失敗しました。もう一度お試しください。');
      }
    };

    handleAuthCallback();
  }, [searchParams, router, refreshStores, setCurrentStore]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">処理中...</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">認証成功！</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  ショップ: {searchParams?.get('shop')}
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/install')}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  インストールページに戻る
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  ホームに戻る
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}