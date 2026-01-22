'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import Image from 'next/image';
import { getCurrentEnvironmentConfig, getCurrentEnvironment } from '@/lib/config/environments';
import { useIsEmbedded } from '@/hooks/useIsEmbedded';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppBridge } from '@/lib/shopify/app-bridge-provider';
import { Redirect } from '@shopify/app-bridge/actions';
import { SHOPIFY_APP_STORE_URL, SHOPIFY_APP_TYPE } from '@/constants/shopify';

/**
 * Shopifyアプリ接続・認証ページ
 * 
 * 役割:
 * - 初回インストール（新規ストアの接続）
 * - 再認証（既存ストアの再認証）
 * - 自動リダイレクト（認証済み・登録済みストアの場合）
 * 
 * アクセス方法:
 * - /install（直接アクセス）
 * - /connect（エイリアス）
 * - /auth/connect（エイリアス）
 * 
 * @author YUKI
 * @date 2025-07-29
 * @updated 2025-01-27
 * @description Shopify OAuth認証フローの開始ページ（エラーハンドリング強化版）
 * - Shopify Admin(embedded) から起動された場合は shop を自動入力し、登録済みなら通常画面へ遷移
 */
function InstallPolarisPageContent() {
  const [shopDomain, setShopDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{title: string, message: string}>({title: '', message: ''});
  const [shopDomainLocked, setShopDomainLocked] = useState(false);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const [isDirectAccess, setIsDirectAccess] = useState<boolean>(false); // ブラウザで直接アクセスした場合（false: 未決定/Shopify経由、true: 直接アクセス）
  const [isMounted, setIsMounted] = useState(false); // クライアントサイドマウント状態（Hydrationエラー対策）
  const [isOAuthCallbackProcessing, setIsOAuthCallbackProcessing] = useState(false); // OAuthコールバック処理中フラグ
  const [isOAuthInProgress, setIsOAuthInProgress] = useState(false); // OAuth処理中フラグ（sessionStorageベース）
  const isInstallingRef = useRef(false); // インストール処理中フラグ（useRefで確実に保持）
  const hasCheckedStoreRef = useRef(false); // ストアチェック済みフラグ（重複実行を防ぐ）
  const isEmbedded = useIsEmbedded();
  const { isAuthenticated, isInitializing } = useAuth(); // 認証状態を取得
  const { app } = useAppBridge(); // App Bridgeインスタンスを取得
  const searchParams = useSearchParams(); // URLパラメータを取得

  // ======================================
  // アクセス制御: 直接アクセスのブロック
  // ======================================
  const hasShopParam = searchParams.get('shop') !== null;
  const hasAuthSuccess = searchParams.get('auth_success') === 'true';
  const hasStoreId = searchParams.get('storeId') !== null;
  const isDevelopment = getCurrentEnvironment() === 'development';

  // 正規のアクセス経路かどうか
  const isLegitimateAccess = 
    isEmbedded ||           // 埋め込みモード
    hasShopParam ||         // App Store経由
    hasAuthSuccess ||       // OAuth成功後
    hasStoreId ||           // ストアID付き（認証済み）
    isDevelopment;          // 開発環境

  // 手動入力をブロックすべきかどうか
  const shouldBlockManualInput = !isLegitimateAccess && SHOPIFY_APP_TYPE === 'Public';

  // クライアントサイドマウント状態を設定（Hydrationエラー対策）
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 🆕 早期自動リダイレクト: 認証済みかつストアIDが存在する場合、即座にリダイレクト
  // 理由: インストール済みでOAuth認証も完了している場合、接続ボタンを押さずに自動で進む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInitializing) return; // 認証状態の初期化中は待機
    
    // OAuth処理中フラグがある場合はスキップ
    const oauthInProgress = localStorage.getItem('oauth_in_progress') === 'true';
    if (oauthInProgress) {
      console.log('⏳ [Install] OAuth処理中のため、早期自動リダイレクトをスキップ');
      return;
    }
    
    // URLパラメータを取得
    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get('shop');
    const hostFromUrl = params.get('host');
    
    // shopパラメータがない場合はスキップ（ブラウザで直接アクセスした場合）
    if (!shopFromUrl) {
      console.log('🔍 [Install] shopパラメータがないため、早期自動リダイレクトをスキップ');
      return;
    }
    
    // 認証状態をチェック
    const oauthAuthenticated = localStorage.getItem('oauth_authenticated') === 'true';
    const currentStoreId = localStorage.getItem('currentStoreId');
    
    // 認証済みかつストアIDが存在する場合、即座にリダイレクト
    if ((isAuthenticated || oauthAuthenticated) && currentStoreId) {
      console.log('✅ [Install] 早期自動リダイレクト: 認証済みかつストアIDが存在', {
        isAuthenticated,
        oauthAuthenticated,
        storeId: currentStoreId,
        shop: shopFromUrl
      });
      
      setAutoRedirecting(true);
      
      // リダイレクト先を構築
      const redirectParams = new URLSearchParams();
      redirectParams.set('shop', shopFromUrl);
      if (hostFromUrl) redirectParams.set('host', hostFromUrl);
      redirectParams.set('embedded', '1');
      
      // メインダッシュボードにリダイレクト
      const redirectUrl = `/customers/dormant?${redirectParams.toString()}`;
      console.log('🚀 [Install] 早期自動リダイレクト実行:', redirectUrl);
      window.location.replace(redirectUrl);
      return;
    }
    
    console.log('🔍 [Install] 早期自動リダイレクト条件を満たさない', {
      isAuthenticated,
      oauthAuthenticated,
      hasStoreId: !!currentStoreId,
      hasShop: !!shopFromUrl
    });
  }, [isAuthenticated, isInitializing]);

  // 🆕 マウント時のみ実行: auth_success=true パラメータの検出とOAuth処理中フラグの確認
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 🆕 最優先: auth_success=true パラメータを検出
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const storeIdFromUrl = params.get('storeId');
    const shopFromUrl = params.get('shop');
    const hostFromUrl = params.get('host');
    
    if (authSuccess === 'true' && storeIdFromUrl) {
      console.log('✅ [Install] OAuth成功を検出（最優先）:', { 
        storeId: storeIdFromUrl, 
        shop: shopFromUrl,
        host: hostFromUrl,
        url: window.location.href
      });
      
      // localStorageに認証情報を保存
      localStorage.setItem('oauth_authenticated', 'true');
      localStorage.setItem('currentStoreId', storeIdFromUrl);
      if (shopFromUrl) {
        localStorage.setItem('shopDomain', shopFromUrl);
      }
      
      // OAuth処理中フラグをクリア
      localStorage.removeItem('oauth_in_progress');
      localStorage.removeItem('oauth_started_at');
      setIsOAuthInProgress(false);
      setLoading(false);
      
      // /setup/initialにリダイレクト
      const redirectParams = new URLSearchParams();
      if (shopFromUrl) redirectParams.set('shop', shopFromUrl);
      if (hostFromUrl) redirectParams.set('host', hostFromUrl);
      redirectParams.set('embedded', '1');
      
      const redirectUrl = `/setup/initial?${redirectParams.toString()}`;
      console.log('🔄 [Install] OAuth成功: /setup/initialにリダイレクト:', redirectUrl);
      window.location.replace(redirectUrl);
      return; // 🆕 早期リターン（以降の処理をスキップ）
    }
    
    // 🆕 auth_success がない場合のみ、OAuth処理中フラグを確認
    const oauthInProgress = localStorage.getItem('oauth_in_progress') === 'true';
    const oauthStartedAt = localStorage.getItem('oauth_started_at');
    
    if (oauthInProgress && oauthStartedAt) {
      const startedAt = parseInt(oauthStartedAt, 10);
      const elapsed = Date.now() - startedAt;
      
      // 60秒以内の場合はOAuth処理中と判断（OAuth認証フローは通常30秒〜1分かかるため）
      if (elapsed < 60 * 1000) {
        console.log('⏳ [Install] OAuth処理中を検出。ローディング画面を表示します。', {
          elapsed: `${Math.round(elapsed / 1000)}秒`
        });
        setIsOAuthInProgress(true);
        setLoading(true);
        
        // 🆕 タイムアウト処理を追加（60秒経過後にフラグをクリアして通常処理に進む）
        // 理由: OAuth認証フローは通常30秒〜1分かかるため、60秒に延長
        const timeoutId = setTimeout(() => {
          console.log('⏰ [Install] OAuth処理が60秒経過しました。フラグをクリアして通常処理に進みます。');
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_started_at');
          setIsOAuthInProgress(false);
          setLoading(false);
        }, 60 * 1000); // 60秒でタイムアウト
        
        // クリーンアップ（useEffectのクリーンアップ関数として返す）
        return () => {
          clearTimeout(timeoutId);
        };
      } else {
        // タイムアウト: フラグをクリア
        console.log('⏰ [Install] OAuth処理がタイムアウトしました。フラグをクリアします。');
        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_started_at');
      }
    }
  }, []) // マウント時のみ実行

  // 非正規アクセス検出時のログ記録
  useEffect(() => {
    if (shouldBlockManualInput) {
      console.warn('⚠️ [Install] Non-standard access detected:', {
        isEmbedded,
        hasShopParam,
        hasAuthSuccess,
        hasStoreId,
        environment: getCurrentEnvironment(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString()
      });
    }
  }, [shouldBlockManualInput, isEmbedded, hasShopParam, hasAuthSuccess, hasStoreId]);

  // 🆕 認証状態の変化を監視: 認証済みでstoreIdがある場合、/setup/initialにリダイレクト
  // 理由: OAuth認証が成功したが、/auth/successに到達できなかった場合のフォールバック
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInitializing) return; // 認証初期化中はスキップ
    
    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get('shop');
    const hostFromUrl = params.get('host');
    
    // 🆕 認証済みでstoreIdがある場合、/setup/initialにリダイレクト
    if (isAuthenticated && !isInitializing) {
      const currentStoreId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentStoreId')
        : null;
      const oauthAuthenticated = typeof window !== 'undefined' 
        ? localStorage.getItem('oauth_authenticated') === 'true'
        : false;
      
      if (currentStoreId && oauthAuthenticated && shopFromUrl) {
        console.log('✅ [Install] 認証済みでstoreIdがあります。/setup/initialにリダイレクトします。', {
          storeId: currentStoreId,
          shop: shopFromUrl,
          isAuthenticated,
          isInitializing
        });
        
        // OAuth処理中フラグをクリア
        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_started_at');
        
        // /setup/initialにリダイレクト
        const redirectParams = new URLSearchParams();
        redirectParams.set('shop', shopFromUrl);
        if (hostFromUrl) redirectParams.set('host', hostFromUrl);
        redirectParams.set('embedded', '1');
        
        const redirectUrl = `/setup/initial?${redirectParams.toString()}`;
        console.log('🔄 [Install] /setup/initialにリダイレクト:', redirectUrl);
        window.location.replace(redirectUrl);
        return; // 早期リターン
      }
    }
  }, [isAuthenticated, isInitializing]) // 🆕 認証状態の変化を監視

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
    
    // 🆕 OAuth処理中フラグがある場合は、インストール処理中と判断してスキップ
    // 理由: handleInstallでOAuth処理中フラグを設定した直後にuseEffectが再実行されるが、
    // リダイレクトが実行される前にフラグをクリアしてしまうのを防ぐ
    // isInstallingRef.currentの代わりに、oauth_in_progressフラグをチェック
    const oauthInProgressCheck = localStorage.getItem('oauth_in_progress') === 'true';
    if (oauthInProgressCheck && isInstallingRef.current) {
      console.log('⏳ [Install] OAuth処理中フラグがあるため、URLパラメータ確認をスキップします。', {
        isInstalling: isInstallingRef.current,
        oauthInProgress: oauthInProgressCheck
      });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get('shop');
    const hostFromUrl = params.get('host');
    const codeParam = params.get('code');
    const stateParam = params.get('state');
    const authSuccess = params.get('auth_success'); // 🆕 OAuth成功パラメータ
    const storeIdFromUrl = params.get('storeId'); // 🆕 ストアID
    
    // 🆕 デバッグ: URLパラメータをログ出力
    console.log('🔍 [Install] URLパラメータ確認（2回目のuseEffect）:', {
      url: window.location.href,
      search: window.location.search,
      authSuccess,
      storeIdFromUrl,
      shop: shopFromUrl,
      host: hostFromUrl,
      code: codeParam ? 'present' : 'missing',
      state: stateParam ? 'present' : 'missing',
      allParams: Object.fromEntries(params.entries())
    });
    
    // 🆕 注意: auth_success=trueの検出は、最初のuseEffectで最優先で実行されるため、
    // ここに到達した場合は、auth_success=trueが含まれていないか、既に処理済み
    // 念のため、再度チェック（ただし、通常はここには到達しない）
    if (authSuccess === 'true' && storeIdFromUrl) {
      console.warn('⚠️ [Install] auth_success=trueが検出されましたが、最初のuseEffectで処理済みのはずです。念のため処理をスキップします。');
      return; // 早期リターン（以降の処理をスキップ）
    }
    
    // 🆕 OAuthコールバック処理中かどうかをチェック
    const isOAuthCallback = !!(codeParam || stateParam);
    setIsOAuthCallbackProcessing(isOAuthCallback);
    
    if (isOAuthCallback) {
      console.log('🔄 [Install] OAuthコールバック処理中を検出しました。バックエンドの処理完了を待機します...', {
        hasCode: !!codeParam,
        hasState: !!stateParam
      });
      // OAuthコールバック処理中は、ローディング状態を維持
      setLoading(true);
    }
    
    // 🆕 次回のOAuthフロー開始時に、前回のリダイレクトフラグをクリア
    const redirectKey = 'auth_success_redirect_executed'
    if (sessionStorage.getItem(redirectKey) === 'true') {
      console.log('🔄 [Install] 次回のOAuthフロー開始時に、前回のリダイレクトフラグをクリアします。')
      sessionStorage.removeItem(redirectKey)
    }
    
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
      // 🆕 最初にフラグをチェックして即座にreturn（重複実行を防ぐ）
      if (hasCheckedStoreRef.current) {
        console.log('⏸️ 既にストアチェック済みのため、スキップします');
        return;
      }
      
      // 🆕 OAuthコールバック処理中かどうかをチェック
      // URLパラメータにcodeやstateがある場合、OAuthコールバック処理中と判断
      const codeParam = params.get('code');
      const stateParam = params.get('state');
      const isOAuthCallbackProcessing = !!(codeParam || stateParam);
      
      if (isOAuthCallbackProcessing) {
        console.log('⏳ OAuthコールバック処理中です。バックエンドの処理完了を待機します...', {
          hasCode: !!codeParam,
          hasState: !!stateParam
        });
        // OAuthコールバック処理中は、checkAndRedirectをスキップ
        // バックエンドの処理が完了し、/auth/successにリダイレクトされるまで待機
        hasCheckedStoreRef.current = false; // リセットして再チェック可能に
        return;
      }
      
      // 🆕 チェック開始時にフラグを設定（非同期処理の前に設定）
      hasCheckedStoreRef.current = true;
      
      // インストール処理中（loading状態またはisInstallingRefフラグ）の場合は、自動リダイレクトをスキップ
      // OAuth認証フロー中にダッシュボードが一瞬表示されるのを防ぐため
      if (loading || isInstallingRef.current) {
        console.log('⏳ インストール処理中のため、自動リダイレクトをスキップします。', { loading, isInstalling: isInstallingRef.current });
        hasCheckedStoreRef.current = false; // リセットして再チェック可能に
        return;
      }

      // 認証状態の初期化を待つ
      if (isInitializing) {
        console.log('⏳ 認証状態の初期化を待機中...');
        hasCheckedStoreRef.current = false; // リセットして再チェック可能に
        return;
      }

      // 未認証の場合は、登録済みストアチェックをスキップしてインストール画面を表示
      // アンインストール後でもデータベースにストア情報が残っている可能性があるため
      // 🆕 OAuth認証成功フラグもチェック（markAuthenticated()が呼ばれた直後でも検出可能）
      const oauthAuthenticated = typeof window !== 'undefined' 
        ? localStorage.getItem('oauth_authenticated') === 'true'
        : false;
      const currentStoreId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentStoreId')
        : null;
      
      if (!isAuthenticated && !oauthAuthenticated) {
        console.log('⚠️ 未認証のため、登録済みストアチェックをスキップしてインストール画面を表示します。', {
          isAuthenticated,
          oauthAuthenticated
        });
        // hasCheckedStoreRef.current = true; ← 既に設定済みなので不要
        return;
      }
      
      // 🆕 OAuth認証成功フラグがあるが、isAuthenticatedがfalseの場合
      // （markAuthenticated()が呼ばれた直後で、React stateがまだ更新されていない場合）
      if (oauthAuthenticated && !isAuthenticated) {
        console.log('🔄 OAuth認証成功フラグを検出しましたが、isAuthenticatedがfalseです。認証状態を再確認します...');
        
        // 🆕 storeIdがある場合は、/setup/initialにリダイレクト（OAuth認証成功後のフォールバック）
        if (currentStoreId && shopFromUrl) {
          console.log('✅ [Install] OAuth認証成功フラグとstoreIdを検出。/setup/initialにリダイレクトします。', {
            storeId: currentStoreId,
            shop: shopFromUrl
          });
          
          // OAuth処理中フラグをクリア
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_started_at');
          
          // /setup/initialにリダイレクト
          const redirectParams = new URLSearchParams();
          redirectParams.set('shop', shopFromUrl);
          if (hostFromUrl) redirectParams.set('host', hostFromUrl);
          redirectParams.set('embedded', '1');
          
          const redirectUrl = `/setup/initial?${redirectParams.toString()}`;
          console.log('🔄 [Install] /setup/initialにリダイレクト:', redirectUrl);
          window.location.replace(redirectUrl);
          return; // 早期リターン
        }
        
        // 少し待ってから再チェック（React stateの更新を待つ）
        setTimeout(() => {
          // 再チェック（フラグをリセットして再実行可能にする）
          hasCheckedStoreRef.current = false;
          checkAndRedirect();
        }, 500);
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
          // 🆕 401エラーの場合は、認証が完了していない可能性があるため、エラーをスキップ
          if (response.status === 401) {
            console.warn('⚠️ [Install] 401エラー: 認証が完了していない可能性があります。インストール画面を表示します。');
            // エラー時もフラグはtrueのままにする（無限ループ防止）
            return;
          }
          console.warn('⚠️ ストア一覧の取得に失敗:', response.status, response.statusText);
          // エラー時もフラグはtrueのままにする（無限ループ防止）
          return;
        }

        const result: unknown = await response.json();
        const stores = (result as any)?.data?.stores as any[] | undefined;
        
        if (!Array.isArray(stores)) {
          console.warn('⚠️ ストア一覧の形式が不正:', result);
          // エラー時もフラグはtrueのままにする（無限ループ防止）
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
          // hasCheckedStoreRef.current = true; ← 既に設定済みなので不要
          return;
        }

        console.log('✅ 登録済みストアを検出:', { storeId: matched.id, shop: normalizedShop });
        
        // hasCheckedStoreRef.current = true; ← 既に設定済みなので不要

        // StoreId を保存（既存ロジックは currentStoreId を参照）
        localStorage.setItem('currentStoreId', String(matched.id));
        localStorage.setItem('shopDomain', normalizedShop);

        setAutoRedirecting(true);

        // 🆕 OAuth認証直後の場合は、/setup/initialにリダイレクト
        // 理由: OAuth認証直後は InitialSetupCompleted = false がデフォルト値のため
        // 既に初期設定が完了している場合は、/setup/initial ページ内で /customers/dormant にリダイレクトされる
        const isOAuthJustCompleted = typeof window !== 'undefined' 
          ? localStorage.getItem('oauth_authenticated') === 'true' && 
            sessionStorage.getItem('auth_success_processed') === 'true'
          : false;
        
        let targetPath: string;
        if (isOAuthJustCompleted) {
          // OAuth認証直後の場合は、/setup/initialにリダイレクト
          targetPath = '/setup/initial';
          console.log('🆕 OAuth認証直後を検出: データ同期設定画面にリダイレクト');
        } else {
          // 通常の場合は、/customers/dormantにリダイレクト
          targetPath = '/customers/dormant';
          console.log('↪️ 登録済みストアを検出したため、通常画面にリダイレクト');
        }
        
        // host / embedded / shop 等のクエリを維持してリダイレクト
        const redirectUrl = `${targetPath}?${params.toString()}`;
        console.log('🔄 リダイレクト先:', redirectUrl);
        window.location.replace(redirectUrl);
      } catch (error) {
        // 失敗時は接続画面を表示（ユーザーが手動で進められるように）
        console.error('❌ 登録済みストアのチェック中にエラーが発生:', error);
        // エラー時もフラグはtrueのままにする（無限ループ防止）
      }
    };

    // 🆕 OAuth処理中フラグがある場合でも、認証が成功している場合は通常処理に進む
    // 理由: OAuth処理が完了しているが、/auth/successページに到達していない可能性がある
    const oauthInProgress = typeof window !== 'undefined' 
      ? localStorage.getItem('oauth_in_progress') === 'true'
      : false;
    
    if (isOAuthCallbackProcessing) {
      // OAuthコールバック処理中（code/stateパラメータがある）場合は、checkAndRedirectをスキップ
      console.log('⏳ OAuthコールバック処理中です。バックエンドの処理完了を待機します...');
      return;
    }
    
    // 🆕 OAuth処理中フラグがある場合は、認証成功の判定をスキップ
    // 理由: handleInstallでフラグを設定した直後にuseEffectが再実行されるが、
    // リダイレクトが実行される前にフラグをクリアしてしまうのを防ぐ
    // OAuth認証フローは通常30秒〜1分かかるため、タイムアウトを60秒に延長
    if (oauthInProgress) {
      const oauthStartedAt = localStorage.getItem('oauth_started_at');
      if (oauthStartedAt) {
        const elapsed = Date.now() - parseInt(oauthStartedAt, 10);
        if (elapsed < 60000) { // 60秒以内
          console.log('⏳ [Install] OAuth処理中（60秒以内）のため、認証成功の判定をスキップします。', {
            elapsed: `${Math.round(elapsed / 1000)}秒`,
            isInstalling: isInstallingRef.current,
            isAuthenticated,
            isInitializing
          });
          return; // 早期リターン（リダイレクトが実行されるまで待機）
        } else {
          // 60秒以上経過している場合は、タイムアウトとしてフラグをクリア
          console.log('⏰ [Install] OAuth処理が60秒経過しました。タイムアウトとしてフラグをクリアします。', {
            elapsed: `${Math.round(elapsed / 1000)}秒`
          });
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_started_at');
          setIsOAuthInProgress(false);
          setLoading(false);
          // タイムアウト後は通常処理に進む
        }
      } else {
        // oauth_started_atがない場合は、フラグをクリア
        console.log('⚠️ [Install] OAuth処理中フラグがありますが、oauth_started_atがありません。フラグをクリアします。');
        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_started_at');
        setIsOAuthInProgress(false);
        setLoading(false);
      }
      return; // OAuth処理中フラグがある場合は、認証成功の判定をスキップ
    }
    
    // 🆕 OAuth処理中フラグがない場合のみ、認証成功の判定を実行
    if (isAuthenticated && !isInitializing) {
      // OAuth処理が完了している場合
      // → /auth/successページに到達した可能性がある
      const currentUrlParams = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
      const currentShop = currentUrlParams.get('shop');
      const currentHost = currentUrlParams.get('host');
      
      const currentStoreId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentStoreId')
        : null;
      
      if (currentStoreId) {
        console.log('✅ [Install] 認証成功を検出（フラグベース）:', { 
          storeId: currentStoreId,
          shop: currentShop,
          host: currentHost
        });
        
        // localStorageに認証情報を保存（既に保存されている可能性があるが、念のため）
        localStorage.setItem('oauth_authenticated', 'true');
        
        // /setup/initialにリダイレクト
        const redirectParams = new URLSearchParams();
        if (currentShop) redirectParams.set('shop', currentShop);
        if (currentHost) redirectParams.set('host', currentHost);
        redirectParams.set('embedded', '1');
        
        const redirectUrl = `/setup/initial?${redirectParams.toString()}`;
        console.log('🔄 [Install] OAuth成功（フラグベース）: /setup/initialにリダイレクト:', redirectUrl);
        window.location.replace(redirectUrl);
        return; // 早期リターン（以降の処理をスキップ）
      }
    }
    
    // OAuthコールバック処理中でない場合、checkAndRedirectを実行
    void checkAndRedirect();
  }, [normalizeShopDomain, toSubdomainInput, isAuthenticated, isInitializing, isOAuthCallbackProcessing]); // 🆕 loadingを削除（無限ループ防止）

  // 🆕 認証成功だがstoreIdがない場合、APIでストア情報を取得
  // 理由: Shopify管理画面がiframeでアプリを読み込む際、カスタムパラメータ（auth_success, storeId）を破棄するため
  // /auth/successページで認証状態は設定されるが、iframe再読み込み時にstoreIdが失われる可能性がある
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInitializing) return; // 認証初期化中はスキップ
    
    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get('shop');
    const hostFromUrl = params.get('host');
    
    // 🆕 修正: oauth_authenticatedフラグも確認
    // 理由: isAuthenticatedがtrueでも、OAuth認証が完了していない可能性がある
    const oauthAuthenticated = localStorage.getItem('oauth_authenticated') === 'true';
    
    if (!isAuthenticated || !oauthAuthenticated || !shopFromUrl) {
      // 🆕 デバッグ: 条件を満たさない場合はスキップ
      if (isAuthenticated && !oauthAuthenticated) {
        console.log('⏸️ [Install] isAuthenticated=trueだが、oauth_authenticated=falseのため、ストア情報取得をスキップします');
      }
      return;
    }
    
    const currentStoreId = localStorage.getItem('currentStoreId');
    
    // storeIdがない場合、APIでストア情報を取得
    // 🆕 修正: oauthAuthenticatedを既に確認済みなので、ここではcurrentStoreIdのみをチェック
    if (!currentStoreId) {
      console.log('🔍 [Install] 認証成功ですが、storeIdがありません。APIでストア情報を取得します...', {
        isAuthenticated,
        shop: shopFromUrl,
        oauthAuthenticated
      });
      
      const fetchStoreInfo = async () => {
        try {
          const config = getCurrentEnvironmentConfig();
          const normalizedShop = normalizeShopDomain(shopFromUrl);
          
          console.log('📡 [Install] ストア情報を取得中...', { apiUrl: config.apiBaseUrl, shop: normalizedShop });
          
          const response = await fetch(`${config.apiBaseUrl}/api/store`, {
            credentials: 'include', // JWTトークンを送信
          });
          
          if (!response.ok) {
            // 🆕 401エラーの場合は、認証が完了していない可能性があるため、エラーをスキップ
            if (response.status === 401) {
              console.warn('⚠️ [Install] 401エラー: 認証が完了していない可能性があります。通常処理に進みます。');
              return;
            }
            throw new Error(`API呼び出しに失敗: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          const stores = result?.data?.stores || result?.stores || [];
          
          console.log('📋 [Install] 取得したストア一覧:', stores);
          
          if (Array.isArray(stores) && stores.length > 0) {
            // shopDomainで一致するストアを検索
            const matchedStore = stores.find((s: any) => {
              const candidate = (s?.shopDomain || s?.domain || s?.ShopDomain || s?.Domain || '').toString().toLowerCase();
              const candidateNormalized = normalizeShopDomain(candidate);
              return candidateNormalized === normalizedShop || candidate === normalizedShop.toLowerCase();
            });
            
            if (matchedStore?.id) {
              console.log('✅ [Install] ストア情報を取得:', { storeId: matchedStore.id, shop: normalizedShop });
              
              // localStorageに保存
              localStorage.setItem('currentStoreId', matchedStore.id.toString());
              localStorage.setItem('oauth_authenticated', 'true');
              localStorage.setItem('shopDomain', normalizedShop);
              
              // OAuth処理中フラグをクリア
              localStorage.removeItem('oauth_in_progress');
              localStorage.removeItem('oauth_started_at');
              setIsOAuthInProgress(false);
              setLoading(false);
              
              // /setup/initialにリダイレクト
              const redirectParams = new URLSearchParams();
              redirectParams.set('shop', normalizedShop);
              if (hostFromUrl) redirectParams.set('host', hostFromUrl);
              redirectParams.set('embedded', '1');
              
              const redirectUrl = `/setup/initial?${redirectParams.toString()}`;
              console.log('🔄 [Install] /setup/initialにリダイレクト:', redirectUrl);
              window.location.replace(redirectUrl);
              return;
            } else {
              console.warn('⚠️ [Install] shopDomainに一致するストアが見つかりませんでした:', {
                shop: normalizedShop,
                availableStores: stores.map((s: any) => s?.shopDomain || s?.domain)
              });
            }
          } else {
            console.warn('⚠️ [Install] ストア一覧が空です');
          }
        } catch (error) {
          console.error('❌ [Install] ストア情報の取得に失敗:', error);
          // エラー時は通常処理に進む（ユーザーが手動で進められるように）
        }
      };
      
      void fetchStoreInfo();
    }
  }, [isAuthenticated, isInitializing, normalizeShopDomain]);

  // 🆕 削除: 4つ目のuseEffectは、2回目と3回目のuseEffectと役割が重複しており、
  // かつ60秒のチェックがないため、以前の認証情報で即座にフラグをクリアしてしまう問題がある
  // フラグのクリアは、2回目（60秒以上経過時）と3回目（ストア情報取得後）のuseEffectで行う

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

    // 🆕 既存の認証情報をクリア（新しいOAuth認証フローを開始するため）
    // 理由: 既存の認証情報があると、useEffectが「認証成功」と誤判断して
    // OAuth処理中フラグをクリアしてしまう
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oauth_authenticated');
      localStorage.removeItem('currentStoreId');
      console.log('🧹 [Install] 既存の認証情報をクリアしました');
    }

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
    
    // 🆕 OAuth処理中フラグを設定（localStorageに変更 - iframe再読み込み後もフラグが保持される）
    if (typeof window !== 'undefined') {
      localStorage.setItem('oauth_in_progress', 'true');
      localStorage.setItem('oauth_started_at', Date.now().toString());
      console.log('🔄 [Install] OAuth処理中フラグを設定しました（localStorage）');
    }
    
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
      
      // ==========================================================
      // 重要: HTTPリダイレクト方式を使用（iframeセキュリティ対応）
      // ==========================================================
      // 埋め込みアプリ（iframe内）からwindow.top.locationにアクセスすると
      // クロスオリジンポリシーでブロックされるため、
      // バックエンドの/api/shopify/installエンドポイントに直接リダイレクトし、
      // HTTPレベルの302リダイレクトでOAuth URLに遷移させる
      // ==========================================================
      
      const installParams = new URLSearchParams({
        shop: fullDomain,
      });
      
      // API Keyが設定されている場合は追加
      if (apiKey) {
        installParams.append('apiKey', apiKey);
      }
      
      // 🆕 フロントエンドのAPI Routeを使用（バックエンドにプロキシ転送）
      // 埋め込みアプリの場合、localhostは使用できないため、
      // フロントエンドのngrok URL経由でバックエンドにアクセスする
      const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const installUrl = `${frontendOrigin}/api/shopify/install?${installParams.toString()}`;
      
      // 🆕 デバッグ: 環境変数の状態を確認
      console.log('🔍 [Install] 環境変数チェック:', {
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ? '設定済み' : '未設定',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ? '設定済み' : '未設定',
        windowOrigin: frontendOrigin,
        configApiBaseUrl: config.apiBaseUrl
      });
      
      console.log('🔍 [Install] フロントエンドAPI Routeを使用:', {
        frontendOrigin,
        installUrl,
        isEmbedded,
        note: 'フロントエンドのAPI Routeがバックエンドにプロキシ転送します'
      });
      
      // 🆕 デバッグ: installUrlの値を確認
      console.log('🔍 [Install] installUrl生成完了:', installUrl);
      
      // デバッグ情報をログ出力
      const debugInfo = {
        apiKey: apiKey || '未設定',
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : '未設定',
        origin: window.location.origin,
        installUrl,
        callbackUrl: `${config.apiBaseUrl}/api/shopify/callback`,
        environment: config.name,
        isEmbedded,
        timestamp: new Date().toISOString(),
      };
      
      console.log('🔍 ===== OAuth開始デバッグ情報 =====');
      console.log('🔑 API Key (プレビュー):', debugInfo.apiKeyPreview);
      console.log('🌐 現在のオリジン:', debugInfo.origin);
      console.log('📍 バックエンド Install URL:', debugInfo.installUrl);
      console.log('🔄 コールバックURL:', debugInfo.callbackUrl);
      console.log('🌍 現在の環境:', debugInfo.environment);
      console.log('🖼️ 埋め込みモード:', debugInfo.isEmbedded);
      console.log('🔍 ================================');
      
      // localStorageにも保存（エラー画面から戻ってきた時に確認できる）
      try {
        localStorage.setItem('oauth_debug_info', JSON.stringify(debugInfo));
        localStorage.setItem('oauth_debug_timestamp', new Date().toISOString());
        console.log('💾 デバッグ情報をlocalStorageに保存しました');
      } catch (e) {
        console.warn('⚠️ localStorageへの保存に失敗:', e);
      }
      
      // ==========================================================
      // Shopify公式ドキュメントに基づく埋め込みアプリ対応
      // https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
      // ==========================================================
      // Step 2: Request authorization code
      // - embedded=1の場合: App Bridgeを使用してiframeから脱出してからリダイレクト
      // - embedded=0または非埋め込みの場合: 直接リダイレクト
      // ==========================================================
      
      const embeddedParam = searchParams?.get('embedded');
      const isEmbeddedMode = embeddedParam === '1' || isEmbedded;
      
      // 🆕 デバッグ: モード判定の値を確認
      console.log('🔍 [Install] モード判定:', {
        embeddedParam,
        isEmbedded,
        isEmbeddedMode,
        hasApp: !!app,
        app: app ? '存在' : '未存在',
        searchParams: searchParams ? '存在' : '未存在'
      });
      
      // embedded=1かつApp Bridgeが利用可能な場合
      if (isEmbeddedMode && app) {
        console.log('🖼️ [Install] 埋め込みアプリモード: OAuth URLを取得してRedirect.toRemote()を使用');
        console.log('📍 [Install] リクエスト先 (installUrl):', installUrl);
        console.log('🔍 [Install] App Bridge状態:', { app: !!app, isEmbedded, embeddedParam });
        
        try {
          // 🆕 UseFrontendProxy=trueの場合、OAuth URLを取得してRedirect.toRemote()を使用
          // 理由: iframe内でOAuth認証を行うと、Shopifyがブロックするため
          // Redirect.toRemote()を使用してトップレベルのウィンドウでOAuth認証を行う
          console.log('📡 [Install] OAuth URLを取得中...');
          
          const response = await fetch(installUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to get OAuth URL: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          const authUrl = data.authUrl;
          
          if (!authUrl) {
            throw new Error('OAuth URL not found in response');
          }
          
          console.log('✅ [Install] OAuth URL取得成功:', authUrl);
          console.log('🔄 [Install] App Bridge Redirect.toRemote()を実行します...');
          
          // App BridgeのRedirect.toRemote()を使用してトップレベルのウィンドウでOAuth認証を行う
          // これにより、iframe内でのOAuth認証がブロックされる問題を回避できる
          app.dispatch(Redirect.toRemote({ url: authUrl }));
          
          console.log('✅ [Install] Redirect.toRemote()を実行しました');
          console.log('ℹ️ [Install] OAuth認証はトップレベルのウィンドウで実行されます');
          
          // OAuth処理中フラグを設定
          localStorage.setItem('oauth_in_progress', 'true');
          localStorage.setItem('oauth_started_at', Date.now().toString());
          console.log('🔄 [Install] OAuth処理中フラグを設定しました（localStorage）');
          
        } catch (error) {
          console.error('❌ OAuth URL取得またはリダイレクトに失敗:', error);
          console.error('❌ エラー詳細:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'N/A',
            error
          });
          
          setError('OAuth認証の開始に失敗しました。ブラウザのコンソールを確認してください。');
          setLoading(false);
          isInstallingRef.current = false;
        }
      } else {
        // embedded=0または非埋め込みの場合、直接バックエンドにリダイレクト
        console.log('🚀 [Install] 通常モード: 直接リダイレクトでOAuth認証を開始');
        console.log('📝 [Install] バックエンドがHTTP 302リダイレクトでOAuth URLに遷移します');
        console.log('🔍 [Install] モード情報:', { isEmbeddedMode, isEmbedded, embeddedParam, hasApp: !!app });
        console.log('📍 [Install] リダイレクト先URL:', installUrl);
        
        // バックエンドURLの接続確認（オプション）
        try {
          const testResponse = await fetch(`${config.apiBaseUrl}/api/shopify/test-config`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
          }).catch((err) => {
            console.warn('⚠️ バックエンド接続確認に失敗（リダイレクトは続行）:', err.message);
            return null;
          });
          
          if (testResponse && testResponse.ok) {
            console.log('✅ バックエンドへの接続確認成功');
          } else if (testResponse) {
            console.warn('⚠️ バックエンド接続確認: ステータス', testResponse.status);
          }
        } catch (testError) {
          console.warn('⚠️ バックエンド接続確認中にエラー（リダイレクトは続行）:', testError);
        }
        
        // 現在のURLを保存（リダイレクト確認用）
        const beforeRedirect = window.location.href;
        
        console.log('🔄 リダイレクト実行前のURL:', beforeRedirect);
        console.log('🔄 リダイレクト先URL:', installUrl);
        
        // バックエンドにリダイレクト（HTTP 302リダイレクトでOAuth URLに遷移）
        try {
          console.log('🔄 [Install] リダイレクトを実行します:', installUrl);
          console.log('🔄 [Install] isInstallingRef.current:', isInstallingRef.current);
          
          // 🆕 リダイレクト実行前にisInstallingRefを確認（デバッグ用）
          // 注意: window.location.hrefを設定すると、このページはアンマウントされるため、
          // setTimeout内の処理は実行されない可能性がある
          // そのため、isInstallingRef.currentはリセットしない（リダイレクトが実行されるため）
          window.location.href = installUrl;
          
          // 🆕 リダイレクトが実行された場合、このコードは実行されない
          // リダイレクトが失敗した場合のみ、以下のタイムアウト処理が実行される
          // 注意: リダイレクトが成功した場合、このページはアンマウントされるため、
          // setTimeout内の処理は実行されない
          setTimeout(() => {
            // まだ同じページにいる場合（リダイレクトが実行されなかった）
            if (window.location.href === beforeRedirect) {
              console.error('❌ リダイレクトが実行されませんでした');
              console.error('❌ 現在のURL:', window.location.href);
              console.error('❌ リダイレクト先URL:', installUrl);
              console.error('❌ 考えられる原因:');
              console.error('   1. バックエンドが起動していない');
              console.error('   2. CORSエラーが発生している');
              console.error('   3. バックエンドURLが正しく設定されていない');
              console.error('   4. ネットワークエラーが発生している');
              
              setError('リダイレクトに失敗しました。バックエンドが起動しているか、ブラウザのコンソールを確認してください。');
              setLoading(false);
              isInstallingRef.current = false; // リダイレクトが失敗した場合のみリセット
            } else {
              console.log('✅ リダイレクトが実行されました');
              console.log('✅ 新しいURL:', window.location.href);
              // リダイレクトが成功した場合、isInstallingRef.currentはリセットしない
              // （このページはアンマウントされるため）
            }
          }, 2000); // タイムアウトを2秒に延長
        } catch (redirectError) {
          console.error('❌ リダイレクト実行中にエラー:', redirectError);
          setError('リダイレクトに失敗しました。ブラウザのコンソールを確認してください。');
          setLoading(false);
          isInstallingRef.current = false; // エラー時のみリセット
        }
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

  // クライアントサイドでのみレンダリング（Hydrationエラー対策）
  // サーバーサイドとクライアントサイドで同じ構造を返すため、最小限のHTML構造を使用
  if (!isMounted) {
    return (
      <div style={{ backgroundColor: '#F6F6F7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    )
  }
  
  // 🆕 OAuth処理中の場合はローディング画面を表示
  // ただし、認証が成功している場合は通常処理に進む
  if (isOAuthInProgress && !isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#F6F6F7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">認証処理中...</p>
          <p className="text-gray-400 text-sm mt-2">しばらくお待ちください</p>
        </div>
      </div>
    )
  }

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
                      width: '64px', 
                      height: '64px', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Image 
                        src="/icon.png" 
                        alt="EC Ranger" 
                        width={64} 
                        height={64}
                        priority
                      />
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
              {/* isMountedがtrueの場合のみ表示（Hydrationエラー対策） */}
              {isMounted && isDirectAccess && (
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
                  {/* アクセス制御: 直接アクセス時の警告バナー */}
                  {shouldBlockManualInput && (
                    <Box paddingBlockEnd="400">
                      <Banner
                        title="Shopify App Storeからインストールしてください"
                        tone="warning"
                      >
                        <Text as="p">
                          このアプリは直接アクセスからのインストールには対応していません。
                          Shopify App Storeからインストールしてください。
                        </Text>
                        {SHOPIFY_APP_STORE_URL && (
                          <Box paddingBlockStart="400">
                            <Button url={SHOPIFY_APP_STORE_URL} external>
                              App Storeでインストール
                            </Button>
                          </Box>
                        )}
                      </Banner>
                    </Box>
                  )}

                  <FormLayout>
                    <TextField
                      label="ストアドメイン"
                      type="text"
                      value={shopDomain}
                      onChange={handleShopDomainChange}
                      placeholder="your-store"
                      suffix=".myshopify.com"
                      autoComplete="off"
                      disabled={shouldBlockManualInput || loading || shopDomainLocked || autoRedirecting}
                      error={error}
                      helpText={shouldBlockManualInput 
                        ? "直接アクセスからのインストールは無効化されています" 
                        : "例: your-store-name（.myshopify.comは自動で追加されます）"}
                    />
                  </FormLayout>

                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleInstall}
                    loading={loading}
                    disabled={!shopDomain.trim() || autoRedirecting || shouldBlockManualInput}
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
              {/* isMountedがtrueの場合のみ表示（Hydrationエラー対策：getCurrentEnvironmentConfig()がサーバー/クライアントで異なる値を返す可能性があるため） */}
              {isMounted && process.env.NODE_ENV === 'development' && (
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

export default function InstallPolarisPage() {
  return (
    <Suspense fallback={
      <div style={{ backgroundColor: '#F6F6F7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    }>
      <InstallPolarisPageContent />
    </Suspense>
  );
}