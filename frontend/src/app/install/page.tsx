'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  List,
  BlockStack,
  Box,
  InlineStack,
  ProgressBar,
  Modal,
} from '@shopify/polaris';
import { getCurrentEnvironmentConfig } from '@/lib/config/environments';
import { useIsEmbedded } from '@/hooks/useIsEmbedded';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * Shopifyアプリ接続ページ（Polaris版）
 * 
 * @author YUKI
 * @date 2025-07-29
 * @updated 2025-08-01
 * @description Shopify OAuth認証フローの開始ページ（エラーハンドリング強化版）
 * - A案: Shopify Admin(embedded) から起動された場合は shop を自動入力し、登録済みなら通常画面へ遷移
 */
export default function InstallPolarisPage() {
  const [shopDomain, setShopDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{title: string, message: string}>({title: '', message: ''});
  const [shopDomainLocked, setShopDomainLocked] = useState(false);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const [isDirectAccess, setIsDirectAccess] = useState(false); // ブラウザで直接アクセスした場合
  const isInstallingRef = useRef(false); // インストール処理中フラグ（useRefで確実に保持）
  const hasCheckedStoreRef = useRef(false); // ストアチェック済みフラグ（重複実行を防ぐ）
  const isEmbedded = useIsEmbedded();
  const { isAuthenticated, isInitializing } = useAuth(); // 認証状態を取得

  const normalizeShopDomain = useCallback((value: string): string => {
    const v = value.trim().toLowerCase();
    if (!v) return '';
    if (v.endsWith('.myshopify.com')) return v;
    // 既存UIはサブドメイン入力想定のため
    return `${v}.myshopify.com`;
  }, []);

  const toSubdomainInput = useCallback((fullDomain: string): string => {
    const v = fullDomain.trim().toLowerCase();
    return v.endsWith('.myshopify.com') ? v.replace('.myshopify.com', '') : v;
  }, []);

  // Shopify Admin からの起動時、shop を自動入力し、登録済みなら通常画面へ遷移
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get('shop');
    const hostFromUrl = params.get('host');
    
    // hostパラメータをsessionStorageに保存（OAuth認証フローで引き継ぐため）
    if (hostFromUrl) {
      sessionStorage.setItem('shopify_host', hostFromUrl);
      console.log('💾 hostパラメータを保存:', hostFromUrl);
    }
    
    // shopパラメータがない場合（ブラウザで直接アクセス）を検出
    if (!shopFromUrl) {
      setIsDirectAccess(true);
      console.log('🌐 ブラウザで直接アクセスを検出');
      return;
    }
    
    // shopパラメータがある場合（Shopify Adminから起動）は直接アクセスではない
    setIsDirectAccess(false);

    const normalizedShop = normalizeShopDomain(shopFromUrl);
    setShopDomain(toSubdomainInput(normalizedShop));
    setShopDomainLocked(true);

    // 登録済みか判定して通常画面へ
    // 重要: 認証状態を確認し、未認証の場合は登録済みストアチェックをスキップ
    const checkAndRedirect = async () => {
      // 既にチェック済みの場合はスキップ（重複実行を防ぐ）
      if (hasCheckedStoreRef.current) {
        console.log('⏸️ 既にストアチェック済みのため、スキップします');
        return;
      }
      
      // インストール処理中（loading状態またはisInstallingRefフラグ）の場合は、自動リダイレクトをスキップ
      // OAuth認証フロー中にダッシュボードが一瞬表示されるのを防ぐため
      if (loading || isInstallingRef.current) {
        console.log('⏳ インストール処理中のため、自動リダイレクトをスキップします。', { loading, isInstalling: isInstallingRef.current });
        return;
      }

      // 認証状態の初期化を待つ
      if (isInitializing) {
        console.log('⏳ 認証状態の初期化を待機中...');
        return;
      }

      // 未認証の場合は、登録済みストアチェックをスキップしてインストール画面を表示
      // アンインストール後でもデータベースにストア情報が残っている可能性があるため
      if (!isAuthenticated) {
        console.log('⚠️ 未認証のため、登録済みストアチェックをスキップしてインストール画面を表示します。');
        hasCheckedStoreRef.current = true; // チェック済みフラグを設定
        return;
      }

      // 認証済みの場合のみ、登録済みストアチェックを実行
      try {
        console.log('🔍 登録済みストアをチェック中...', { shop: normalizedShop, isAuthenticated });
        const config = getCurrentEnvironmentConfig();
        const response = await fetch(`${config.apiBaseUrl}/api/store`, {
          credentials: 'include', // JWTトークンを送信
        });
        
        if (!response.ok) {
          console.warn('⚠️ ストア一覧の取得に失敗:', response.status, response.statusText);
          return;
        }

        const result: unknown = await response.json();
        const stores = (result as any)?.data?.stores as any[] | undefined;
        
        if (!Array.isArray(stores)) {
          console.warn('⚠️ ストア一覧の形式が不正:', result);
          return;
        }

        console.log('📋 取得したストア数:', stores.length);

        const matched = stores.find((s) => {
          const candidate = (s?.shopDomain || s?.domain || s?.ShopDomain || s?.Domain || '').toString().toLowerCase();
          if (!candidate) return false;
          const candNorm = normalizeShopDomain(candidate);
          return candNorm === normalizedShop;
        });

        if (!matched?.id) {
          console.log('ℹ️ 登録済みストアが見つかりませんでした。インストール画面を表示します。');
          hasCheckedStoreRef.current = true; // チェック済みフラグを設定
          return;
        }

        console.log('✅ 登録済みストアを検出:', { storeId: matched.id, shop: normalizedShop });
        
        // チェック済みフラグを設定（リダイレクト前に設定することで、リダイレクト中の再実行を防ぐ）
        hasCheckedStoreRef.current = true;

        // StoreId を保存（既存ロジックは currentStoreId を参照）
        localStorage.setItem('currentStoreId', String(matched.id));
        localStorage.setItem('shopDomain', normalizedShop);

        setAutoRedirecting(true);

        // host / embedded / shop 等のクエリを維持して通常画面へ
        const targetPath = '/customers/dormant';
        const redirectUrl = `${targetPath}?${params.toString()}`;
        console.log('↪️ 登録済みストアを検出したため、通常画面にリダイレクト:', redirectUrl);
        window.location.replace(redirectUrl);
      } catch (error) {
        // 失敗時は接続画面を表示（ユーザーが手動で進められるように）
        console.error('❌ 登録済みストアのチェック中にエラーが発生:', error);
      }
    };

    void checkAndRedirect();
  }, [normalizeShopDomain, toSubdomainInput, isAuthenticated, isInitializing, loading]);

  // URLパラメータからエラー情報を取得
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (errorParam) {
      let title = '接続エラー';
      let message = '接続中に問題が発生しました。';
      
      // エラータイプに応じたメッセージ設定
      switch (errorParam) {
        case 'access_denied':
          title = 'アクセス拒否';
          message = 'アプリへのアクセスが拒否されました。アプリをインストールするには、必要な権限を承認してください。';
          break;
        case 'invalid_shop':
          title = '無効なストア';
          message = '指定されたストアが見つかりません。正しいストアドメインを入力してください。';
          break;
        case 'invalid_request':
          title = '無効なリクエスト';
          message = 'リクエストに問題があります。もう一度お試しください。';
          break;
        default:
          if (errorDescription) {
            message = errorDescription;
          }
      }
      
      setErrorDetails({ title, message });
      setShowErrorModal(true);
    }
  }, []);

  const handleShopDomainChange = useCallback((value: string) => {
    setShopDomain(value.toLowerCase());
    setError('');
  }, []);

  const validateShopDomain = (domain: string): boolean => {
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    return pattern.test(domain);
  };

  const simulateProgress = () => {
    setInstallProgress(0);
    const interval = setInterval(() => {
      setInstallProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleInstall = useCallback(async () => {
    console.log('🚀 ===== インストール処理開始 =====');
    console.log('📍 現在のURL:', window.location.href);
    console.log('📍 現在のパス:', window.location.pathname);
    console.log('🏪 入力されたshopDomain:', shopDomain);
    console.log('⏰ 開始時刻:', new Date().toISOString());
    console.log('====================================');
    
    setError('');

    // 入力検証
    if (!shopDomain.trim()) {
      console.warn('⚠️ ストアドメインが入力されていません');
      setError('ストアドメインを入力してください');
      return;
    }

    if (!validateShopDomain(shopDomain)) {
      console.warn('⚠️ ストアドメインの形式が不正:', shopDomain);
      setError('有効なストアドメインを入力してください（例: my-store）');
      return;
    }
    
    console.log('✅ 入力検証完了');

    setLoading(true);
    isInstallingRef.current = true; // インストール処理開始をマーク（useRefで確実に保持）
    hasCheckedStoreRef.current = false; // ストアチェックフラグをリセット（再インストール時に対応）
    simulateProgress();

    try {
      // .myshopify.comを自動補完
      const fullDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      console.log('🚀 Shopify接続開始:', fullDomain);

      // 環境設定からAPI URLを取得
      const config = getCurrentEnvironmentConfig();
      
      // API Keyを環境変数から取得（マルチアプリ対応）
      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
      
      // hostパラメータを取得（OAuth認証フローで引き継ぐため）
      const hostParam = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('host') 
          || sessionStorage.getItem('shopify_host')
        : null;
      
      // バックエンドからOAuth URLを取得（JSON形式）
      // apiKeyパラメータを追加（バックエンドでShopifyAppsテーブルから対応するアプリを検索するため）
      const installUrlParams = new URLSearchParams({
        shop: fullDomain,
      });
      
      // API Keyが設定されている場合は追加
      if (apiKey) {
        installUrlParams.append('apiKey', apiKey);
      }
      
      const installUrlApi = `${config.apiBaseUrl}/api/shopify/install-url?${installUrlParams.toString()}`;
      
      console.log('🔍 OAuth URL取得開始:', installUrlApi);
      
      // バックエンドからOAuth URLを取得（タイムアウト付き）
      const fetchPromise = fetch(installUrlApi, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('OAuth URL取得がタイムアウトしました（10秒）')), 10000);
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON解析に失敗した場合は、デフォルトのエラーメッセージを使用
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      const authUrl = data?.authUrl;
      
      if (!authUrl || typeof authUrl !== 'string') {
        console.error('❌ OAuth URL取得失敗: レスポンスデータ:', data);
        throw new Error('OAuth URLが取得できませんでした。レスポンスにauthUrlが含まれていません。');
      }
      
      console.log('✅ OAuth URL取得成功:', authUrl.substring(0, 100) + '...');
      
      // デバッグ情報をログ出力（APIレスポンスも含める）
      const debugInfo = {
        apiKey: apiKey || '未設定',
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : '未設定',
        origin: window.location.origin,
        authUrl,
        callbackUrl: `${window.location.origin}/api/shopify/callback`,
        environment: config.name,
        isEmbedded,
        apiResponse: {
          status: response.status,
          statusText: response.statusText,
          url: installUrlApi,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.log('🔍 ===== OAuth開始デバッグ情報 =====');
      console.log('🔑 API Key (完全):', debugInfo.apiKey);
      console.log('🔑 API Key (プレビュー):', debugInfo.apiKeyPreview);
      console.log('🌐 現在のオリジン:', debugInfo.origin);
      console.log('📍 Shopify OAuth URL:', debugInfo.authUrl);
      console.log('🔄 コールバックURL:', debugInfo.callbackUrl);
      console.log('🌍 現在の環境:', debugInfo.environment);
      console.log('🖼️ 埋め込みモード:', debugInfo.isEmbedded);
      console.log('🔍 ================================');
      
      // localStorageにも保存（エラー画面から戻ってきた時に確認できる）
      try {
        localStorage.setItem('oauth_debug_info', JSON.stringify(debugInfo));
        localStorage.setItem('oauth_debug_timestamp', new Date().toISOString());
        console.log('💾 デバッグ情報をlocalStorageに保存しました');
        console.log('💾 確認方法: localStorage.getItem("oauth_debug_info")');
      } catch (e) {
        console.warn('⚠️ localStorageへの保存に失敗:', e);
      }
      
      // 埋め込みアプリ内かどうかを判定
      const isInIframe = typeof window !== 'undefined' && window.top !== window.self;
      
      // 開発環境では確認用に短い遅延（本番では即座にリダイレクト）
      const isDev = process.env.NODE_ENV === 'development';
      const redirectDelay = isDev ? 300 : 0; // 開発環境: 300ms、本番環境: 即座
      
      if (isDev) {
        console.log(`⏸️ 開発環境: ${redirectDelay}ms後にリダイレクトします（Consoleログを確認してください）`);
      }
      
      // リダイレクト処理（開発環境では短い遅延、本番環境では即座）
      const performRedirect = () => {
        // リダイレクト前にインストール処理中フラグを確認
        if (!isInstallingRef.current) {
          console.warn('⚠️ インストール処理中フラグがfalseです。リダイレクトをスキップします。');
          setError('インストール処理が中断されました。もう一度お試しください。');
          setLoading(false);
          return;
        }
        
        try {
          // デバッグ用: リダイレクト前の状態を詳細にログ出力
          console.log('🔄 ===== リダイレクト実行開始 =====');
          console.log('📍 現在のURL:', window.location.href);
          console.log('📍 現在のパス:', window.location.pathname);
          console.log('🔗 OAuth URL:', authUrl);
          console.log('🖼️ 埋め込みモード:', { isEmbedded, isInIframe, canAccessTopWindow: window.top !== null });
          console.log('⏰ リダイレクト時刻:', new Date().toISOString());
          console.log('🔄 ================================');
          
          // リダイレクト前にローディング状態を維持（画面が切り替わらないようにする）
          // 注意: setLoading(false)を呼ばないことで、ローディング画面を表示し続ける
          
          if (isEmbedded || isInIframe) {
            // 埋め込みアプリ内の場合、トップレベルウィンドウでリダイレクト
            // OAuth認証はトップレベルで実行する必要があるため
            console.log('🖼️ 埋め込みアプリ内でリダイレクト: トップレベルウィンドウを使用');
            if (window.top && window.top !== window.self) {
              console.log('✅ 埋め込みアプリ内: window.top.location.replace()を実行');
              console.log('🔗 リダイレクト先:', authUrl);
              try {
                // リダイレクト実行前に現在のURLを保存（確認用）
                const beforeRedirect = window.top.location.href;
                window.top.location.replace(authUrl); // replaceを使用して履歴に残さない
                console.log('✅ window.top.location.replace()実行完了', { beforeRedirect, targetUrl: authUrl });
                
                // リダイレクトが即座に実行されない場合のフォールバック（0.5秒後）
                setTimeout(() => {
                  if (window.top && window.top.location.href === beforeRedirect) {
                    console.warn('⚠️ リダイレクトが実行されていないようです。強制的にリダイレクトします。');
                    window.top.location.href = authUrl;
                  }
                }, 500);
              } catch (topError) {
                console.error('❌ window.top.location.replace()実行エラー:', topError);
                // フォールバック: 通常のリダイレクト
                console.warn('⚠️ フォールバック: window.location.replace()を使用');
                try {
                  window.location.replace(authUrl);
                } catch (fallbackError) {
                  console.error('❌ フォールバックリダイレクトも失敗:', fallbackError);
                  setError(`リダイレクトに失敗しました: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
                  setLoading(false);
                  isInstallingRef.current = false;
                }
              }
            } else {
              // フォールバック: 通常のリダイレクト
              console.warn('⚠️ window.topが利用できないため、通常のリダイレクトを使用');
              console.log('✅ window.location.replace()に設定:', authUrl);
              try {
                const beforeRedirect = window.location.href;
                window.location.replace(authUrl);
                console.log('✅ window.location.replace()実行完了', { beforeRedirect, targetUrl: authUrl });
                
                // リダイレクトが即座に実行されない場合のフォールバック（0.5秒後）
                setTimeout(() => {
                  if (window.location.href === beforeRedirect) {
                    console.warn('⚠️ リダイレクトが実行されていないようです。強制的にリダイレクトします。');
                    window.location.href = authUrl;
                  }
                }, 500);
              } catch (redirectError) {
                console.error('❌ window.location.replace()実行エラー:', redirectError);
                // 最後の手段: hrefを使用
                console.warn('⚠️ フォールバック: window.location.hrefを使用');
                try {
                  window.location.href = authUrl;
                } catch (hrefError) {
                  console.error('❌ window.location.hrefも失敗:', hrefError);
                  setError(`リダイレクトに失敗しました: ${hrefError instanceof Error ? hrefError.message : 'Unknown error'}`);
                  setLoading(false);
                  isInstallingRef.current = false;
                }
              }
            }
          } else {
            // 通常のリダイレクト（埋め込みアプリ外）
            console.log('🌐 通常モードでリダイレクト');
            console.log('✅ window.location.replace()に設定:', authUrl);
            try {
              const beforeRedirect = window.location.href;
              window.location.replace(authUrl); // replaceを使用して履歴に残さない
              console.log('✅ window.location.replace()実行完了', { beforeRedirect, targetUrl: authUrl });
              
              // リダイレクトが即座に実行されない場合のフォールバック（0.5秒後）
              setTimeout(() => {
                if (window.location.href === beforeRedirect) {
                  console.warn('⚠️ リダイレクトが実行されていないようです。強制的にリダイレクトします。');
                  window.location.href = authUrl;
                }
              }, 500);
            } catch (redirectError) {
              console.error('❌ window.location.replace()実行エラー:', redirectError);
              // 最後の手段: hrefを使用
              console.warn('⚠️ フォールバック: window.location.hrefを使用');
              try {
                window.location.href = authUrl;
              } catch (hrefError) {
                console.error('❌ window.location.hrefも失敗:', hrefError);
                setError(`リダイレクトに失敗しました: ${hrefError instanceof Error ? hrefError.message : 'Unknown error'}`);
                setLoading(false);
                isInstallingRef.current = false;
              }
            }
          }
          
          // リダイレクトが実行されなかった場合のフォールバック（1秒後）
          setTimeout(() => {
            const currentUrl = window.location.href;
            const currentPath = window.location.pathname;
            const authUrlBase = authUrl.split('?')[0];
            const shouldRedirect = !currentUrl.includes(authUrlBase) && 
                                   currentPath !== '/auth/success' && 
                                   currentPath !== '/setup/initial' &&
                                   currentPath !== '/customers/dormant';
            
            if (shouldRedirect) {
              console.error('❌ ===== リダイレクトが実行されませんでした =====');
              console.error('📍 現在のURL:', currentUrl);
              console.error('📍 現在のパス:', currentPath);
              console.error('🔗 期待されるOAuth URL:', authUrl);
              console.error('⏰ チェック時刻:', new Date().toISOString());
              console.error('🔄 強制的にリダイレクトします');
              console.error('❌ ===========================================');
              try {
                window.location.replace(authUrl);
              } catch (forceError) {
                console.error('❌ 強制リダイレクトも失敗:', forceError);
                setError(`リダイレクトに失敗しました: ${forceError instanceof Error ? forceError.message : 'Unknown error'}`);
                setLoading(false);
                isInstallingRef.current = false; // インストール処理終了をマーク
              }
            } else {
              console.log('✅ リダイレクト確認: 正常に遷移しています', { currentPath });
            }
          }, 1000);
        } catch (redirectError) {
          console.error('❌ リダイレクト実行中にエラーが発生:', redirectError);
          // エラーが発生した場合でも、強制的にリダイレクトを試みる
          try {
            window.location.replace(authUrl);
          } catch (fallbackError) {
            console.error('❌ フォールバックリダイレクトも失敗:', fallbackError);
            setError(`リダイレクトに失敗しました: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
            setLoading(false);
            isInstallingRef.current = false; // インストール処理終了をマーク
          }
        }
      };
      
      if (redirectDelay > 0) {
        console.log(`⏳ ${redirectDelay}ms後にリダイレクトを実行します`);
        setTimeout(performRedirect, redirectDelay);
      } else {
        // 本番環境では即座にリダイレクト（ダッシュボードが一瞬表示されるのを防ぐ）
        console.log('🚀 即座にリダイレクトを実行します');
        performRedirect();
      }
    } catch (error) {
      console.error('❌ ===== 接続エラー発生 =====');
      console.error('エラーオブジェクト:', error);
      console.error('エラーメッセージ:', error instanceof Error ? error.message : 'Unknown error');
      console.error('エラースタック:', error instanceof Error ? error.stack : 'N/A');
      console.error('発生時刻:', new Date().toISOString());
      console.error('現在の状態:', {
        loading,
        isInstalling: isInstallingRef.current,
        shopDomain,
        isEmbedded
      });
      console.error('============================');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`接続処理中にエラーが発生しました: ${errorMessage}`);
      setLoading(false);
      isInstallingRef.current = false; // インストール処理終了をマーク
      setInstallProgress(0);
      console.log('✅ エラー処理完了: ローディング状態を解除');
    }
  }, [shopDomain, isEmbedded]);

  return (
    <div style={{ backgroundColor: '#F6F6F7', minHeight: '100vh' }}>
      <Box padding="800">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Page narrowWidth>
            <BlockStack gap="800">
              <div style={{ textAlign: 'center' }}>
                <Box padding="400">
                  <InlineStack align="center" blockAlign="center" gap="400">
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      backgroundColor: '#008060',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                      <path d="M21 4H7a2 2 0 0 0-2 2v2.5h0v6h0V20l6-1.5 6 1.5v-5.5h0v-6h0V6a2 2 0 0 0-2-2m-1 11.5c0 .5-.5 1-1 1s-1-.5-1-1V15h-2v.5c0 .5-.5 1-1 1s-1-.5-1-1V15h-2v.5c0 .5-.5 1-1 1s-1-.5-1-1V15H8v.5c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v6.5M4 6H3v14h1c.6 0 1-.4 1-1V7c0-.6-.4-1-1-1z"/>
                    </svg>
                    </div>
                  </InlineStack>
                </Box>
                <Text as="h1" variant="heading2xl">
                  EC Ranger
                </Text>
                <Box paddingBlockStart="200">
                  <Text as="p" variant="bodyLg" tone="subdued">
                    Shopifyストアの売上を最大化する分析ツール
                  </Text>
                </Box>
              </div>

              {/* ブラウザで直接アクセスした場合の説明文 */}
              {isDirectAccess && (
                <Card>
                  <Banner
                    title="推奨されるアクセス方法"
                    tone="info"
                  >
                    <p>
                      このアプリは<strong>Shopify管理画面</strong>からアクセスすることを推奨します。
                      ブラウザで直接アクセスした場合でも接続は可能ですが、Shopify管理画面からアクセスすることで、より安全にアプリを利用できます。
                    </p>
                    <p style={{ marginTop: '8px' }}>
                      既にアプリをインストール済みの場合は、Shopify管理画面の左メニューから「EC Ranger」を選択してください。
                    </p>
                  </Banner>
                </Card>
              )}

              <Card>
                <BlockStack gap="400">
                  <FormLayout>
                    <TextField
                      label="ストアドメイン"
                      type="text"
                      value={shopDomain}
                      onChange={handleShopDomainChange}
                      placeholder="your-store"
                      suffix=".myshopify.com"
                      autoComplete="off"
                      disabled={loading || shopDomainLocked || autoRedirecting}
                      error={error}
                      helpText="例: your-store-name（.myshopify.comは自動で追加されます）"
                    />
                  </FormLayout>

                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleInstall}
                    loading={loading}
                    disabled={!shopDomain.trim() || autoRedirecting}
                  >
                    {loading ? '接続中...' : '接続を開始'}
                  </Button>

                  {loading && (
                    <Box paddingBlockStart="400">
                      <ProgressBar progress={installProgress} size="small" />
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                          Shopifyストアに接続中...
                        </Text>
                      </Box>
                    </Box>
                  )}

                  {autoRedirecting && (
                    <Box paddingBlockStart="400">
                      <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                        登録済みストアを検出しました。通常画面へ移動しています...
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    このアプリでできること
                  </Text>
                  <List type="bullet">
                    <List.Item>売上データのAI分析</List.Item>
                    <List.Item>顧客行動の詳細な分析</List.Item>
                    <List.Item>商品パフォーマンスの可視化</List.Item>
                    <List.Item>マーケティング施策の最適化提案</List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <Banner
                  title="必要な権限"
                  tone="info"
                >
                  <p>
                    このアプリは以下のデータへのアクセス権限を必要とします：
                  </p>
                  <List type="bullet">
                    <List.Item>注文情報の読み取り</List.Item>
                    <List.Item>商品情報の読み取り</List.Item>
                    <List.Item>顧客情報の読み取り</List.Item>
                  </List>
                </Banner>
              </Card>

              <div style={{ textAlign: 'center' }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  接続することで、
                  <a 
                    href="https://www.access-net.co.jp/shopify/terms.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#006BE5', textDecoration: 'underline' }}
                  > 利用規約 </a>
                  と
                  <a 
                    href="https://www.access-net.co.jp/shopify/data-processing-agreement.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#006BE5', textDecoration: 'underline' }}
                  > データ処理契約 </a>
                  に同意したものとみなされます。
                </Text>
              </div>

              {/* 開発環境でのデバッグ情報 */}
              {process.env.NODE_ENV === 'development' && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      デバッグ情報（開発環境のみ）
                    </Text>
                    <div style={{ 
                      backgroundColor: '#f6f6f7', 
                      padding: '12px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      <div>環境: {getCurrentEnvironmentConfig().name}</div>
                      <div>API URL: {getCurrentEnvironmentConfig().apiBaseUrl}</div>
                      <div>入力値: {shopDomain || '(未入力)'}</div>
                      <div>検証結果: {shopDomain ? (validateShopDomain(shopDomain) ? '✅ 有効' : '❌ 無効') : '未検証'}</div>
                    </div>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Page>
        </div>
      </Box>

      {/* エラーモーダル */}
      <Modal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorDetails.title}
        primaryAction={{
          content: 'もう一度試す',
          onAction: () => {
            setShowErrorModal(false);
            // URLパラメータをクリア
            window.history.replaceState({}, document.title, window.location.pathname);
          },
        }}
        secondaryActions={[
          {
            content: 'ヘルプを見る',
            onAction: () => {
              window.open('https://help.shopify.com/ja/manual/apps/installing-apps', '_blank');
            },
          },
        ]}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            {errorDetails.message}
          </Text>
        </Modal.Section>
      </Modal>
    </div>
  );
}