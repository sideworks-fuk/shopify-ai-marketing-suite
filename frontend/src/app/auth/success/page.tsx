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

  useEffect(() => {
    // 🆕 デバッグ: useEffect の開始を確認
    console.log('🚀 [AuthSuccess] useEffect 開始');
    console.log('🔍 [AuthSuccess] hasProcessedRef.current:', hasProcessedRef.current);
    console.log('🔍 [AuthSuccess] sessionStorage auth_success_processed:', 
      typeof window !== 'undefined' ? sessionStorage.getItem('auth_success_processed') : 'N/A');
    console.log('🔍 [AuthSuccess] sessionStorage auth_success_redirect_executed:', 
      typeof window !== 'undefined' ? sessionStorage.getItem('auth_success_redirect_executed') : 'N/A');
    console.log('🔍 [AuthSuccess] sessionStorage auth_success_redirect_timestamp:', 
      typeof window !== 'undefined' ? sessionStorage.getItem('auth_success_redirect_timestamp') : 'N/A');
    console.log('📍 [AuthSuccess] 現在のURL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    
    // 🆕 OAuth処理中フラグをクリア（localStorageに変更 - iframe再読み込み後もフラグが保持される）
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oauth_in_progress');
      localStorage.removeItem('oauth_started_at');
      console.log('✅ [AuthSuccess] OAuth処理中フラグをクリアしました（localStorage）');
    }
    
    // 既に処理済みの場合はスキップ（マウント時の重複実行を防ぐ）
    // 🆕 変更: useRefのみでチェック（sessionStorageのチェックは削除）
    if (hasProcessedRef.current) {
      console.log('⏸️ [AuthSuccess] 既に処理済みのため、スキップ（useRef）');
      return;
    }
    
    // 🆕 削除: sessionStorageのチェックを削除
    // 理由: 処理完了前にコンポーネントが再マウントされた場合、処理が実行されない問題を回避するため
    // sessionStorageのフラグは処理完了時（リダイレクト直前）に設定する
    const processedKey = 'auth_success_processed'; // エラー処理で使用するため定義
    
    // URLパラメータを取得
    const shop = searchParams?.get('shop');
    const storeId = searchParams?.get('storeId');
    const success = searchParams?.get('success');
    
    // 処理開始をマーク（useRefのみ）
    // 🆕 変更: sessionStorageへの保存は処理完了時に移動
    // 注意: エラーが発生した場合は後でリセットされる
    hasProcessedRef.current = true;
    
    console.log('🚀 [AuthSuccess] 処理開始:', { shop, storeId, success });
    console.log('📍 [AuthSuccess] 現在のURL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    
    // shopがない場合はエラー（必須パラメータ）
    // storeIdやsuccessがない場合は処理を続行し、APIから取得を試みる
    if (!shop) {
      console.error('❌ [AuthSuccess] shopパラメータがありません');
      setStatus('error');
      setMessage('ストア情報が見つかりません');
      // エラー時は処理フラグをリセット（再試行可能にする）
      hasProcessedRef.current = false;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(processedKey);
      }
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let redirectTimeoutId: NodeJS.Timeout | null = null;

    /**
     * リダイレクト処理を実行する共通関数
     * @param shop - ストアドメイン
     * @param host - Shopify hostパラメータ
     * @param embedded - 埋め込みフラグ
     * @param useRouterNavigation - routerオブジェクトを使用するか（isMountedの場合のみtrue）
     */
    const performRedirect = (
      shop: string | null,
      host: string | null,
      embedded: string | null,
      useRouterNavigation: boolean
    ) => {
      // リダイレクト処理を一度だけ実行するためのチェック
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth/success') {
          console.log('⏸️ [AuthSuccess] 既に別のページに遷移しているため、リダイレクトをスキップ:', currentPath);
          return;
        }
        
        // 🆕 リダイレクト実行フラグを設定（重複実行を防ぐ）
        const redirectKey = 'auth_success_redirect_executed';
        const redirectTimestamp = sessionStorage.getItem('auth_success_redirect_timestamp');
        const now = Date.now();
        
        // 既にリダイレクトが実行されている場合、かつ10秒以内の場合はスキップ
        // ネットワーク遅延やShopifyサーバーの応答時間を考慮して10秒に設定
        if (sessionStorage.getItem(redirectKey) === 'true') {
          if (redirectTimestamp && (now - parseInt(redirectTimestamp, 10)) < 10000) {
            console.log('⏸️ [AuthSuccess] 既にリダイレクト処理を実行済みのため、スキップします（10秒以内）');
            return;
          } else {
            // 10秒以上経過している場合は、フラグをリセットして再実行を許可
            console.log('🔄 [AuthSuccess] リダイレクトフラグが古いため、リセットして再実行します');
            sessionStorage.removeItem(redirectKey);
            sessionStorage.removeItem('auth_success_redirect_timestamp');
          }
        }
        
        sessionStorage.setItem(redirectKey, 'true');
        sessionStorage.setItem('auth_success_redirect_timestamp', now.toString());
      }

      // 🆕 修正: Shopify管理画面へのリダイレクトを削除
      // 理由: Shopify管理画面へのリダイレクトは、URLパラメータ（storeId, success）を失う原因となる
      // 代わりに、直接/setup/initialにリダイレクトし、App Bridgeが自動的に埋め込みに復帰する

      // OAuth認証成功後のリダイレクト先を決定
      // 初回インストール時（OAuth認証直後）は常にデータ同期設定画面（/setup/initial）にリダイレクト
      // 理由: OAuth認証直後は InitialSetupCompleted = false がデフォルト値のため
      // 既に初期設定が完了している場合は、/setup/initial ページ内で /customers/dormant にリダイレクトされる
      console.log('🆕 [AuthSuccess] OAuth認証完了: データ同期設定画面にリダイレクト');

      // 🆕 storeId を URL パラメータに追加
      // 理由: サードパーティストレージの制限により、localStorage の値が iframe 再読み込み後に消える可能性があるため
      const storeIdFromStorage = typeof window !== 'undefined' 
        ? localStorage.getItem('currentStoreId') 
        : null;

      // URL パラメータを構築
      const params = new URLSearchParams();
      if (shop) params.set('shop', shop);
      if (host) params.set('host', host);
      params.set('embedded', embedded || '1');
      if (storeIdFromStorage) params.set('storeId', storeIdFromStorage);

      const redirectPath = `/setup/initial?${params.toString()}`;
      console.log('🔄 [AuthSuccess] リダイレクト先:', redirectPath);
      console.log('🔍 [AuthSuccess] storeIdFromStorage:', storeIdFromStorage);

      // アンマウント後はrouter.replace()が効果がない可能性があるため、window.location.hrefを使用
      if (useRouterNavigation) {
        console.log('🔄 [AuthSuccess] router.replace()を使用してリダイレクト:', redirectPath);
        router.replace(redirectPath); // pushではなくreplaceを使用（ブラウザ履歴に残さない）
      } else {
        // 相対パスの場合は絶対URLに変換
        const absoluteUrl = redirectPath.startsWith('http')
          ? redirectPath
          : new URL(redirectPath, window.location.origin).href;
        console.log('🔄 [AuthSuccess] window.location.hrefを使用してリダイレクト:', absoluteUrl);
        window.location.href = absoluteUrl;
      }
    };

    const handleAuthCallback = async () => {
      console.log('🔄 [AuthSuccess] handleAuthCallback開始');
      // shop, storeId, successは既にuseEffectの最初で取得済み
      const hostFromQuery = searchParams?.get('host');
      const embeddedFromQuery = searchParams?.get('embedded');
      const error = searchParams?.get('error');

      // host/shop は埋め込み復帰の要。クエリに無い場合は sessionStorage から復元する（AppBridgeProvider と同じキー）
      const persistedHost =
        typeof window !== 'undefined' ? sessionStorage.getItem('shopify_host') : null;
      const persistedShop =
        typeof window !== 'undefined' ? sessionStorage.getItem('shopify_shop') : null;

      const host = hostFromQuery || persistedHost;
      const resolvedShop = shop || persistedShop; // useEffectのスコープで取得したshopを使用

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

      // shopは既にuseEffectでチェック済みだが、念のため再チェック
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
        
        // storeIdを取得（クエリパラメータから優先）
        let resolvedStoreId: number | null = null;
        const storeIdParam = searchParams?.get('storeId');
        if (storeIdParam) {
          resolvedStoreId = parseInt(storeIdParam);
          console.log('📋 クエリパラメータからStoreIdを取得:', resolvedStoreId);
        }
        
        // ストア一覧を更新（タイムアウト付き、失敗しても続行）
        // 注意: refreshStores()はavailableStoresを更新するため、setCurrentStore()を呼び出す前に完了させる必要がある
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
        
        // storeIdがクエリパラメータにない場合、shopドメインからストアを検索
        if (!resolvedStoreId && resolvedShop) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7088';
            const storesResponse = await fetch(`${apiUrl}/api/store`, {
              credentials: 'include', // JWTトークンを送信
            });
            if (storesResponse.ok) {
              const storesData = await storesResponse.json();
              const stores = storesData?.data?.stores || storesData?.stores || storesData || [];
              const matchedStore = stores.find((s: any) => {
                const candidate = (s?.shopDomain || s?.domain || s?.ShopDomain || s?.Domain || '').toString().toLowerCase();
                if (!candidate) return false;
                const shopLower = resolvedShop.toLowerCase();
                return candidate === shopLower || candidate.includes(shopLower) || shopLower.includes(candidate);
              });
              if (matchedStore) {
                resolvedStoreId = matchedStore.id || matchedStore.Id;
                console.log('🔍 shopドメインからStoreIdを検索:', { shop: resolvedShop, storeId: resolvedStoreId });
              } else {
                console.warn('⚠️ shopドメインに一致するストアが見つかりませんでした:', resolvedShop);
              }
            } else {
              console.warn('⚠️ ストア検索API呼び出しに失敗:', storesResponse.status, storesResponse.statusText);
            }
          } catch (searchError) {
            console.warn('⚠️ ストア検索に失敗しました:', searchError);
          }
        }
        
        // 🆕 デバッグログを追加
        console.log('🔍 [AuthSuccess] isMounted確認:', isMounted);
        
        // 現在のストアを設定（storeIdが見つからない場合はエラー）
        // 注意: 認証状態の設定は、コンポーネントがアンマウントされても実行する必要がある
        // （localStorage/sessionStorageへの保存は副作用として必要）
        if (!resolvedStoreId && !searchParams?.get('storeId')) {
          console.error('❌ Store ID not found in response or query parameters')
          // エラー時のみisMountedチェック後にUIを更新
          if (isMounted) {
            setStatus('error')
            setMessage('ストアIDの取得に失敗しました')
          }
          return
        }
        // クエリパラメータから取得を試みる（フォールバック）
        const fallbackStoreId = searchParams?.get('storeId');
        const parsedFallback = fallbackStoreId ? parseInt(fallbackStoreId, 10) : null;
        const finalStoreId = resolvedStoreId || (parsedFallback && !isNaN(parsedFallback) ? parsedFallback : null);
        
        if (!finalStoreId || finalStoreId <= 0 || isNaN(finalStoreId)) {
          console.error('❌ Invalid store ID:', finalStoreId)
          // エラー時のみisMountedチェック後にUIを更新
          if (isMounted) {
            setStatus('error')
            setMessage('無効なストアIDです')
          }
          return
        }
        
        // 🆕 最優先: localStorageにstoreIdを保存（setCurrentStore()の前に実行）
        // 理由: setCurrentStore()はavailableStoresにストアが見つからない場合、何も実行されないため
        // /installページでcurrentStoreIdを参照できるようにするため
        console.log('💾 [AuthSuccess] localStorageにstoreIdを保存:', finalStoreId);
        localStorage.setItem('currentStoreId', finalStoreId.toString());
        localStorage.setItem('oauth_authenticated', 'true');
        
        // shopドメインも保存（後でストアを検索する際に使用）
        if (resolvedShop) {
          localStorage.setItem('shopDomain', resolvedShop);
        }
        
        // StoreContextにストアを設定
        // 注意: setCurrentStore()はavailableStoresにストアが見つからない場合、何も実行されない
        // そのため、localStorageにstoreIdを保存してからsetCurrentStore()を呼び出す
        // 🆕 isMountedチェックの前で実行（認証状態の設定は必要）
        console.log('🔍 [AuthSuccess] setCurrentStoreを呼び出します:', finalStoreId);
        setCurrentStore(finalStoreId);
        
        // AuthProviderに認証状態を明示的に設定
        // 🆕 isMountedチェックの前で実行（認証状態の設定は必要）
        console.log('🔍 [AuthSuccess] markAuthenticatedを呼び出します:', finalStoreId);
        markAuthenticated(finalStoreId);
        
        console.log('✅ 認証状態を設定しました:', { storeId: finalStoreId, shop: resolvedShop, host });
        
        // 🆕 UIの更新はisMountedチェック後に行う
        if (isMounted) {
          setStatus('success');
          setMessage('認証が完了しました！ダッシュボードへ移動します...');
          
          // 🆕 処理完了時にsessionStorageにフラグを設定（リダイレクト直前）
          // 理由: 処理完了前にコンポーネントが再マウントされた場合でも、処理が実行されるようにするため
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('auth_success_processed', 'true');
            console.log('✅ [AuthSuccess] 処理完了フラグをsessionStorageに設定しました');
          }
          
          // 1秒後にダッシュボードへリダイレクト（2秒から短縮）
          redirectTimeoutId = setTimeout(() => {
            if (!isMounted) return;
            performRedirect(resolvedShop, host, embeddedFromQuery, true); // routerを使用
          }, 1000);
        } else {
          // 🆕 コンポーネントがアンマウントされている場合でも、リダイレクトを実行
          // 認証状態は既に設定されているため、次回のマウント時に正しい状態で開始できる
          console.warn('⚠️ [AuthSuccess] コンポーネントがアンマウントされていますが、認証状態は設定済みです。リダイレクトを実行します。');
          
          // アンマウント後はwindow.location.hrefを使用（router.replace()は効果がない可能性があるため）
          performRedirect(resolvedShop, host, embeddedFromQuery, false); // window.locationを使用
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
          // sessionStorageもクリア（再試行可能にする）
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('auth_success_processed');
            // 🆕 エラー時はリダイレクトフラグもクリア（再試行可能にする）
            sessionStorage.removeItem('auth_success_redirect_executed');
          }
          console.log('🔄 [AuthSuccess] エラー発生のため、処理フラグとリダイレクトフラグをリセットしました');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして、マウント時のみ実行（無限ループを防ぐ）

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