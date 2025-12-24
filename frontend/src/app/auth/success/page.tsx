'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/components/providers/AuthProvider';
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
  const { markAuthenticated } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('認証情報を確認しています...');

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const handleAuthCallback = async () => {
      const shop = searchParams?.get('shop');
      const hostFromQuery = searchParams?.get('host');
      const embeddedFromQuery = searchParams?.get('embedded');
      const success = searchParams?.get('success');
      const error = searchParams?.get('error');

      // host/shop は埋め込み復帰の要。クエリに無い場合は sessionStorage から復元する（AppBridgeProvider と同じキー）
      const persistedHost =
        typeof window !== 'undefined' ? sessionStorage.getItem('shopify_host') : null;
      const persistedShop =
        typeof window !== 'undefined' ? sessionStorage.getItem('shopify_shop') : null;

      const host = hostFromQuery || persistedHost;
      const resolvedShop = shop || persistedShop;

      if (typeof window !== 'undefined') {
        if (hostFromQuery) sessionStorage.setItem('shopify_host', hostFromQuery);
        if (shop) sessionStorage.setItem('shopify_shop', shop);
      }

      console.log('🔐 認証コールバック受信:', {
        shop: resolvedShop,
        host,
        embedded: embeddedFromQuery,
        success,
        error,
      });

      // エラーチェック
      if (error) {
        if (isMounted) {
          setStatus('error');
          setMessage(decodeURIComponent(error));
        }
        return;
      }

      if (!resolvedShop) {
        if (isMounted) {
          setStatus('error');
          setMessage('ストア情報が見つかりません');
        }
        return;
      }

      try {
        if (isMounted) {
          setMessage('ストア情報を更新しています...');
        }
        
        // ストア一覧を更新（タイムアウト付き、失敗しても続行）
        let resolvedStoreId: number | null = null;
        try {
          const refreshPromise = refreshStores();
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('タイムアウト')), 5000); // タイムアウトを5秒に短縮
          });
          
          await Promise.race([refreshPromise, timeoutPromise]);
          
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          console.log('✅ ストア一覧の更新に成功');
          
          // クエリパラメータからstoreIdを取得（優先）
          const storeIdParam = searchParams?.get('storeId');
          if (storeIdParam) {
            resolvedStoreId = parseInt(storeIdParam);
            console.log('📋 クエリパラメータからStoreIdを取得:', resolvedStoreId);
          } else if (resolvedShop) {
            // storeIdがクエリパラメータにない場合、shopドメインからストアを検索
            // 注意: refreshStores()が完了した後、StoreContextからストア一覧を取得する必要がある
            // ここでは、APIから直接ストア一覧を取得して検索する
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7088';
              const storesResponse = await fetch(`${apiUrl}/api/store`);
              if (storesResponse.ok) {
                const storesData = await storesResponse.json();
                const stores = storesData.stores || storesData || [];
                const matchedStore = stores.find((s: any) => 
                  s.domain === resolvedShop || s.shopDomain === resolvedShop || s.shopifyShopId === resolvedShop
                );
                if (matchedStore) {
                  resolvedStoreId = matchedStore.id;
                  console.log('🔍 shopドメインからStoreIdを検索:', { shop, storeId: resolvedStoreId });
                } else {
                  console.warn('⚠️ shopドメインに一致するストアが見つかりませんでした:', resolvedShop);
                }
              }
            } catch (searchError) {
              console.warn('⚠️ ストア検索に失敗しました:', searchError);
            }
          }
        } catch (refreshError: any) {
          console.warn('⚠️ ストア一覧の更新に失敗しましたが、続行します:', refreshError);
          // ストア一覧の更新に失敗しても続行（認証は完了しているため）
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // フォールバック: クエリパラメータからstoreIdを取得
          const storeIdParam = searchParams?.get('storeId');
          if (storeIdParam) {
            resolvedStoreId = parseInt(storeIdParam);
          }
        }
        
        if (!isMounted) return;
        
        // 現在のストアを設定（storeIdが見つからない場合はデフォルト1を使用）
        const finalStoreId = resolvedStoreId || parseInt(searchParams?.get('storeId') || '1');
        
        // StoreContextにストアを設定
        setCurrentStore(finalStoreId);
        
        // AuthProviderに認証状態を明示的に設定
        markAuthenticated(finalStoreId);
        
        // shopドメインも保存（後でストアを検索する際に使用）
        if (resolvedShop) {
          localStorage.setItem('shopDomain', resolvedShop);
        }
        
        console.log('✅ 認証状態を設定しました:', { storeId: finalStoreId, shop: resolvedShop, host });
        
        if (isMounted) {
          setStatus('success');
          setMessage('認証が完了しました！ダッシュボードへ移動します...');
          
          // 1秒後にダッシュボードへリダイレクト（2秒から短縮）
          setTimeout(() => {
            if (isMounted) {
              // OAuthはトップウィンドウで完了するため、埋め込みアプリの場合は管理画面側へ戻す必要がある
              // host があれば Shopify 管理画面の /admin/apps/{apiKey} を開くことで iframe 埋め込みに復帰できる
              const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
              if (typeof window !== 'undefined' && host && resolvedShop && apiKey) {
                const isTopWindow = window.top === window.self;
                if (isTopWindow) {
                  const adminAppUrl = `https://${resolvedShop}/admin/apps/${apiKey}?host=${encodeURIComponent(host)}`;
                  window.location.href = adminAppUrl;
                  return;
                }
              }

              // それ以外は認証済みページ（/customers/dormant）にリダイレクト
              // / は認証が必要なため、認証状態が反映される前にリダイレクトするとinstall画面に戻ってしまう
              if (host && resolvedShop) {
                router.push(`/customers/dormant?shop=${encodeURIComponent(resolvedShop)}&host=${encodeURIComponent(host)}&embedded=${encodeURIComponent(embeddedFromQuery || '1')}`);
              } else if (resolvedShop) {
                router.push(`/customers/dormant?shop=${encodeURIComponent(resolvedShop)}`);
              } else {
                router.push('/customers/dormant');
              }
            }
          }, 1000);
        }
        
      } catch (error: any) {
        console.error('❌ 予期しないエラー:', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (isMounted) {
          setStatus('error');
          const errorMessage = error?.message || '予期しないエラーが発生しました。もう一度お試しください。';
          setMessage(errorMessage);
        }
      }
    };

    handleAuthCallback();

    // クリーンアップ
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [searchParams, router]); // refreshStores と setCurrentStore を依存配列から削除

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