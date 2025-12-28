'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const hasProcessedRef = useRef(false); // 処理完了フラグ（useRefで保持）
  const processedParamsRef = useRef<string | null>(null); // 処理済みパラメータを保持（パラメータが変わったらリセット）

  useEffect(() => {
    const currentUrl = window.location.href;
    const currentSearchParams = searchParams?.toString() || '';
    const shop = searchParams?.get('shop');
    const storeId = searchParams?.get('storeId');
    const success = searchParams?.get('success');
    
    console.log('🚀 [AuthSuccess] useEffect実行開始');
    console.log('🔍 [AuthSuccess] hasProcessedRef.current:', hasProcessedRef.current);
    console.log('🔍 [AuthSuccess] processedParamsRef.current:', processedParamsRef.current);
    console.log('🔍 [AuthSuccess] currentSearchParams:', currentSearchParams);
    console.log('🔍 [AuthSuccess] shop:', shop, 'storeId:', storeId, 'success:', success);
    
    // 重要なパラメータ（shop, storeId, success）が変わった場合はリセット
    const keyParams = `${shop}-${storeId}-${success}`;
    const paramsChanged = processedParamsRef.current !== keyParams;
    
    // パラメータが変わった場合のみリセット（無限ループを防ぐ）
    if (paramsChanged || !processedParamsRef.current) {
      console.log('🔄 [AuthSuccess] パラメータが変更されたため、処理フラグをリセットします', {
        paramsChanged,
        hasProcessedParams: !!processedParamsRef.current,
        oldParams: processedParamsRef.current,
        newParams: keyParams
      });
      hasProcessedRef.current = false;
      processedParamsRef.current = keyParams;
    }
    
    // 既に処理済みの場合はスキップ（重複実行を防ぐ）
    // 注意: storeIdがnullでも、パラメータが変わっていない場合は処理をスキップ（無限ループを防ぐ）
    if (hasProcessedRef.current) {
      console.log('⏸️ [AuthSuccess] 既に処理済みのため、重複実行をスキップします', {
        processedParams: processedParamsRef.current,
        currentParams: keyParams
      });
      return;
    }

    // 処理開始をマーク
    hasProcessedRef.current = true;
    processedParamsRef.current = keyParams;
    console.log('✅ [AuthSuccess] 処理開始をマークしました', { keyParams });

    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let redirectTimeoutId: NodeJS.Timeout | null = null;

    const handleAuthCallback = async () => {
      console.log('🔄 [AuthSuccess] handleAuthCallback開始');
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

      // localStorageからデバッグ情報を取得
      try {
        const savedDebugInfo = typeof window !== 'undefined' 
          ? localStorage.getItem('oauth_debug_info')
          : null;
        if (savedDebugInfo) {
          const parsed = JSON.parse(savedDebugInfo);
          setDebugInfo(parsed);
          console.log('💾 保存されたデバッグ情報:', parsed);
        }
      } catch (e) {
        console.warn('⚠️ デバッグ情報の読み取りに失敗:', e);
      }

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
        } catch (refreshError: any) {
          console.warn('⚠️ ストア一覧の更新に失敗しましたが、続行します:', refreshError);
          // ストア一覧の更新に失敗しても続行（認証は完了しているため）
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
        
        // storeIdを取得（refreshStores()の成功/失敗に関わらず実行）
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
        
        if (!isMounted) return;
        
        // 現在のストアを設定（storeIdが見つからない場合はエラー）
        if (!resolvedStoreId && !searchParams?.get('storeId')) {
          console.error('❌ Store ID not found in response or query parameters')
          setStatus('error')
          setMessage('ストアIDの取得に失敗しました')
          return
        }
        // クエリパラメータから取得を試みる（フォールバック）
        const fallbackStoreId = searchParams?.get('storeId');
        const parsedFallback = fallbackStoreId ? parseInt(fallbackStoreId, 10) : null;
        const finalStoreId = resolvedStoreId || (parsedFallback && !isNaN(parsedFallback) ? parsedFallback : null);
        
        if (!finalStoreId || finalStoreId <= 0 || isNaN(finalStoreId)) {
          console.error('❌ Invalid store ID:', finalStoreId)
          setStatus('error')
          setMessage('無効なストアIDです')
          return
        }
        
        // StoreContextにストアを設定
        // 注意: setCurrentStore()はavailableStoresにストアが見つからない場合、何も実行されない
        // そのため、localStorageにstoreIdを保存してからsetCurrentStore()を呼び出す
        console.log('🔍 [AuthSuccess] setCurrentStoreを呼び出します:', finalStoreId);
        setCurrentStore(finalStoreId);
        
        // AuthProviderに認証状態を明示的に設定
        console.log('🔍 [AuthSuccess] markAuthenticatedを呼び出します:', finalStoreId);
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
          redirectTimeoutId = setTimeout(() => {
            if (!isMounted) return;
            
            // リダイレクト処理を一度だけ実行するためのチェック
            const currentPath = window.location.pathname;
            if (currentPath !== '/auth/success') {
              console.log('⏸️ 既に別のページに遷移しているため、リダイレクトをスキップ:', currentPath);
              return;
            }
            
            // OAuthはトップウィンドウで完了するため、埋め込みアプリの場合は管理画面側へ戻す必要がある
            // host があれば Shopify 管理画面の /admin/apps/{apiKey} を開くことで iframe 埋め込みに復帰できる
            const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
            if (typeof window !== 'undefined' && host && resolvedShop && apiKey) {
              const isTopWindow = window.top === window.self;
              if (isTopWindow) {
                const adminAppUrl = `https://${resolvedShop}/admin/apps/${apiKey}?host=${encodeURIComponent(host)}`;
                console.log('🔄 Shopify管理画面にリダイレクト:', adminAppUrl);
                window.location.href = adminAppUrl;
                return;
              }
            }

            // OAuth認証成功後のリダイレクト先を決定
            // 初回インストール時（OAuth認証直後）は常にデータ同期設定画面（/setup/initial）にリダイレクト
            // 理由: OAuth認証直後は InitialSetupCompleted = false がデフォルト値のため
            // 既に初期設定が完了している場合は、/setup/initial ページ内で /customers/dormant にリダイレクトされる
            console.log('🆕 OAuth認証完了: データ同期設定画面にリダイレクト');
            const redirectPath = host && resolvedShop
              ? `/setup/initial?shop=${encodeURIComponent(resolvedShop)}&host=${encodeURIComponent(host)}&embedded=${encodeURIComponent(embeddedFromQuery || '1')}`
              : resolvedShop
              ? `/setup/initial?shop=${encodeURIComponent(resolvedShop)}`
              : '/setup/initial';
            console.log('🔄 リダイレクト先:', redirectPath);
            router.replace(redirectPath); // pushではなくreplaceを使用（ブラウザ履歴に残さない）
          }, 1000);
        }
        
      } catch (error: any) {
        console.error('❌ [AuthSuccess] 予期しないエラー:', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (redirectTimeoutId) {
          clearTimeout(redirectTimeoutId);
        }
        if (isMounted) {
          setStatus('error');
          const errorMessage = error?.message || '予期しないエラーが発生しました。もう一度お試しください。';
          setMessage(errorMessage);
          hasProcessedRef.current = false; // エラー時は処理フラグをリセット（再試行可能にする）
          processedParamsRef.current = null; // パラメータもリセット
          console.log('🔄 [AuthSuccess] エラー発生のため、処理フラグをリセットしました');
        }
      }
    };

    console.log('📞 [AuthSuccess] handleAuthCallbackを呼び出します');
    handleAuthCallback();

    // クリーンアップ
    return () => {
      console.log('🧹 [AuthSuccess] useEffectクリーンアップ');
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (redirectTimeoutId) {
        clearTimeout(redirectTimeoutId);
      }
      // 注意: hasProcessedRefはリセットしない（処理完了まで保持）
    };
  }, [searchParams, router, refreshStores, setCurrentStore, markAuthenticated]); // 必要な依存関係を追加

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
                {debugInfo && process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-left">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      🔍 デバッグ情報を表示
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-60">
                      <div className="mb-2">
                        <strong>OAuth URL:</strong>
                        <div className="break-all text-blue-600">{debugInfo.authUrl}</div>
                      </div>
                      <div className="mb-2">
                        <strong>API Key:</strong> {debugInfo.apiKeyPreview}
                      </div>
                      <div className="mb-2">
                        <strong>環境:</strong> {debugInfo.environment}
                      </div>
                      <div className="mb-2">
                        <strong>埋め込みモード:</strong> {debugInfo.isEmbedded ? 'Yes' : 'No'}
                      </div>
                      <div className="mb-2">
                        <strong>タイムスタンプ:</strong>{' '}
                        {typeof window !== 'undefined' 
                          ? localStorage.getItem('oauth_debug_timestamp') 
                          : 'N/A'}
                      </div>
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            const info = localStorage.getItem('oauth_debug_info');
                            if (info) {
                              navigator.clipboard.writeText(info);
                              alert('デバッグ情報をクリップボードにコピーしました');
                            }
                          }
                        }}
                        className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        クリップボードにコピー
                      </button>
                    </div>
                  </details>
                )}
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