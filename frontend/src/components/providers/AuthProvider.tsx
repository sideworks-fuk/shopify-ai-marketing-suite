"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { AppBridgeProvider, useAppBridge } from '@/lib/shopify/app-bridge-provider'
import { ApiClient } from '@/lib/api-client'
import { migrateLocalStorageVariables } from '@/lib/localstorage-migration'
import { toast } from '@/components/ui/use-toast'

/**
 * 認証プロバイダー（App Bridge統合版）
 * 
 * @author YUKI  
 * @date 2025-07-28
 * @updated 2025-10-18
 * @description Shopify App Bridgeと統合した認証システム
 */

interface AuthContextType {
  isAuthenticated: boolean
  isInitializing: boolean
  isApiClientReady: boolean
  currentStoreId: number | null
  authError: string | null
  authMode: 'shopify' | 'demo' | 'developer' | null
  login: (storeId: number) => Promise<void>
  logout: () => void
  clearError: () => void
  refreshAuth: () => Promise<void>
  getApiClient: () => ApiClient
  markAuthenticated: (storeId: number) => void
  setCurrentStoreId: (storeId: number | null) => void // 🆕 currentStoreId を設定する関数
  resolveStoreId: () => Promise<number | null> // 🆕 ストアIDを解決する関数（APIから取得する処理も含む）
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// 内部のAuthProviderコンポーネント
function AuthProviderInner({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'shopify' | 'demo' | 'developer' | null>(null)
  const [apiClient, setApiClient] = useState<ApiClient | null>(null)
  const [isApiClientReady, setIsApiClientReady] = useState(false)
  
  const { getToken, isEmbedded } = useAppBridge()
  const pathname = usePathname() // 🆕 ページ遷移を検知するため
  const searchParams = useSearchParams() // 🆕 URLパラメータからshopを取得するため

  // 🆕 getCurrentStoreId の共通関数（常に localStorage/sessionStorage から直接取得）
  // 重要: クロージャの問題を避けるため、state依存を除去
  // ApiClientが初期化後に再利用されるため、常に最新の値を取得する必要がある
  const getCurrentStoreIdFn = useCallback((): number | null => {
    console.log('🔍 [AuthProvider.getCurrentStoreIdFn] 呼び出し開始');
    
    if (typeof window === 'undefined') {
      console.warn('⚠️ [AuthProvider.getCurrentStoreIdFn] window が undefined です（SSR）');
      return null;
    }
    
    // 1. まず localStorage から取得を試みる（最優先）
    const savedStoreId = localStorage.getItem('currentStoreId');
    console.log('🔍 [AuthProvider.getCurrentStoreIdFn] localStorage から取得', { savedStoreId });
    if (savedStoreId) {
      const parsedStoreId = parseInt(savedStoreId, 10);
      if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        console.log('✅ [AuthProvider.getCurrentStoreIdFn] localStorage から取得成功', { storeId: parsedStoreId });
        return parsedStoreId;
      }
    }
    
    // 2. localStorage になければ sessionStorage から取得を試みる
    const sessionStoreId = sessionStorage.getItem('currentStoreId');
    console.log('🔍 [AuthProvider.getCurrentStoreIdFn] sessionStorage から取得を試みる', { sessionStoreId });
    if (sessionStoreId) {
      const parsedStoreId = parseInt(sessionStoreId, 10);
      if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        // sessionStorage にあった場合は localStorage にも保存（次回以降のため）
        try {
          localStorage.setItem('currentStoreId', sessionStoreId);
          console.log('✅ [AuthProvider.getCurrentStoreIdFn] sessionStorage から取得し、localStorage にもコピーしました', { storeId: parsedStoreId });
        } catch (error) {
          console.warn('⚠️ [AuthProvider.getCurrentStoreIdFn] localStorage への保存に失敗しました', error);
        }
        return parsedStoreId;
      }
    }
    
    console.warn('⚠️ [AuthProvider.getCurrentStoreIdFn] currentStoreId が見つかりませんでした', {
      localStorageCurrentStoreId: localStorage.getItem('currentStoreId'),
      sessionStorageCurrentStoreId: sessionStorage.getItem('currentStoreId')
    });
    return null;
  }, []); // 依存配列を空にして、常に最新の localStorage/sessionStorage を参照

  // 🆕 ストアIDを解決する関数（APIからストア情報を取得する処理も含む）
  const resolveStoreId = useCallback(async (): Promise<number | null> => {
    // 最優先: 既にstateに保持されているcurrentStoreIdを使用
    // （iframe内ではlocalStorage/sessionStorageがブロックされるため、stateが唯一の情報源になる場合がある）
    if (currentStoreId !== null && currentStoreId > 0) {
      console.log('✅ [AuthProvider.resolveStoreId] state の currentStoreId から取得:', currentStoreId);
      return currentStoreId;
    }

    // localStorage/sessionStorage から直接取得
    let storeId = getCurrentStoreIdFn();
    if (storeId !== null && storeId > 0) {
      console.log('✅ [AuthProvider.resolveStoreId] getCurrentStoreIdFn から取得:', storeId);
      return storeId;
    }
    
    // 🆕 authMode を state からと localStorage の両方から確認
    // タイミングの問題で state が更新されていない場合があるため
    const effectiveAuthMode = authMode || (typeof window !== 'undefined' ? localStorage.getItem('authMode') : null);
    console.log('🔍 [AuthProvider.resolveStoreId] authMode 確認:', { stateAuthMode: authMode, storageAuthMode: typeof window !== 'undefined' ? localStorage.getItem('authMode') : null, effectiveAuthMode });
    
    // デモモードまたは開発者モードの場合
    if (effectiveAuthMode === 'demo' || effectiveAuthMode === 'developer') {
      // getCurrentStoreIdFn()で取得できなかった場合、localStorageから直接再取得を試みる
      if (storeId === null && typeof window !== 'undefined') {
        console.log('⚠️ [AuthProvider.resolveStoreId] getCurrentStoreIdFn で取得できなかったため、localStorageから直接再取得を試みます', { effectiveAuthMode });
        
        const savedStoreId = localStorage.getItem('currentStoreId');
        if (savedStoreId) {
          const parsedStoreId = parseInt(savedStoreId, 10);
          if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
            console.log('✅ [AuthProvider.resolveStoreId] localStorageから直接取得成功:', parsedStoreId);
            // AuthProviderのstateも更新
            setCurrentStoreId(parsedStoreId);
            return parsedStoreId;
          }
        }
        
        // sessionStorageからも試みる
        const sessionStoreId = sessionStorage.getItem('currentStoreId');
        if (sessionStoreId) {
          const parsedSessionStoreId = parseInt(sessionStoreId, 10);
          if (!isNaN(parsedSessionStoreId) && parsedSessionStoreId > 0) {
            console.log('✅ [AuthProvider.resolveStoreId] sessionStorageから直接取得成功:', parsedSessionStoreId);
            // localStorageにも保存
            try {
              localStorage.setItem('currentStoreId', sessionStoreId);
            } catch (error) {
              console.warn('⚠️ [AuthProvider.resolveStoreId] localStorageへの保存に失敗:', error);
            }
            // AuthProviderのstateも更新
            setCurrentStoreId(parsedSessionStoreId);
            return parsedSessionStoreId;
          }
        }
        
        console.warn('❌ [AuthProvider.resolveStoreId] デモモード/開発者モードでstoreIdが見つかりませんでした', {
          effectiveAuthMode,
          localStorageCurrentStoreId: localStorage.getItem('currentStoreId'),
          sessionStorageCurrentStoreId: sessionStorage.getItem('currentStoreId'),
          allLocalStorageKeys: Object.keys(localStorage)
        });
      }
      
      console.log('ℹ️ [AuthProvider.resolveStoreId] デモモード/開発者モードのため、API呼び出しをスキップ', { effectiveAuthMode, storeId });
      return storeId; // null または取得できた値
    }
    
    // ストアIDが取得できない場合、APIからストア情報を取得（Shopify OAuth認証の場合のみ）
    if (isAuthenticated && isApiClientReady && apiClient && effectiveAuthMode === 'shopify') {
      const shopFromUrl = searchParams?.get('shop');
      if (shopFromUrl) {
        try {
          console.log('📡 [AuthProvider.resolveStoreId] ストア情報をAPIから取得中...', { shop: shopFromUrl });
          const result = await apiClient.request<{ success: boolean; data?: { stores?: any[] }; stores?: any[] }>('/api/store', {
            method: 'GET',
          });
          
          if (result.success) {
            const stores = result.data?.stores || result.stores || [];
            if (Array.isArray(stores) && stores.length > 0) {
              // shopパラメータで一致するストアを検索
              const normalizedShop = shopFromUrl.toLowerCase().endsWith('.myshopify.com') 
                ? shopFromUrl.toLowerCase() 
                : `${shopFromUrl.toLowerCase()}.myshopify.com`;
              
              const matchedStore = stores.find((s: any) => {
                const candidate = (s?.shopDomain || s?.domain || s?.ShopDomain || s?.Domain || '').toString().toLowerCase();
                return candidate === normalizedShop || candidate === shopFromUrl.toLowerCase();
              });
              
              if (matchedStore?.id) {
                const resolvedStoreId = matchedStore.id;
                console.log('✅ [AuthProvider.resolveStoreId] ストア情報をAPIから取得:', { storeId: resolvedStoreId, shop: normalizedShop });
                
                // localStorageに保存
                if (typeof window !== 'undefined') {
                  localStorage.setItem('currentStoreId', resolvedStoreId.toString());
                  localStorage.setItem('oauth_authenticated', 'true');
                  localStorage.setItem('shopDomain', normalizedShop);
                }
                
                // AuthProviderにも設定
                setCurrentStoreId(resolvedStoreId);
                
                return resolvedStoreId;
              }
            }
          }
        } catch (error) {
          console.error('❌ [AuthProvider.resolveStoreId] ストア情報の取得に失敗:', error);
        }
      }
    }
    
    return null;
  }, [currentStoreId, getCurrentStoreIdFn, isAuthenticated, isApiClientReady, apiClient, searchParams, setCurrentStoreId, authMode]);

  // APIクライアントの初期化
  useEffect(() => {
    console.log('🔧 [AuthProvider] APIクライアント初期化開始', {
      isEmbedded,
      timestamp: new Date().toISOString()
    });
    
    let client: ApiClient;
    
    if (isEmbedded) {
      // Shopify埋め込みアプリの場合
      console.log('🔗 [AuthProvider] Shopify埋め込みアプリモードでAPIクライアントを初期化');
      client = new ApiClient(undefined, {
        getShopifyToken: async () => {
          console.log('🔐 [AuthProvider] Shopifyセッショントークンを取得中...');
          try {
            const token = await getToken();
            if (!token) {
              console.error('❌ [AuthProvider] Shopifyセッショントークンが取得できませんでした');
              throw new Error('Shopify session token not available');
            }
            console.log('✅ [AuthProvider] Shopifyセッショントークン取得成功', {
              tokenLength: token.length,
              tokenPrefix: token.substring(0, 20) + '...'
            });
            return token;
          } catch (error) {
            console.error('❌ [AuthProvider] Shopifyセッショントークン取得エラー:', error);
            throw error;
          }
        },
        getCurrentStoreId: getCurrentStoreIdFn
      });
      setAuthMode('shopify')
      console.log('✅ [AuthProvider] Shopify埋め込みアプリモードでAPIクライアントを初期化完了')
    } else {
      // スタンドアロンアプリの場合
      // OAuth認証成功後は、バックエンドがCookieベースの認証を使用する想定
      // デモトークンがある場合は使用、ない場合はOAuth認証成功フラグを確認
      const oauthAuthenticated = localStorage.getItem('oauth_authenticated')
      const demoToken = localStorage.getItem('demoToken')
      const developerToken = localStorage.getItem('developerToken')
      const savedAuthMode = localStorage.getItem('authMode') // localStorageからauthModeを取得
      
      // 🆕 開発者モード: ローカルバックエンドを直接使用する場合
      const isDeveloperMode = process.env.NEXT_PUBLIC_DEVELOPER_MODE === 'true'
      const developerBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      
      console.log('🔍 [AuthProvider] 認証情報の確認', {
        oauthAuthenticated,
        hasDemoToken: !!demoToken,
        hasDeveloperToken: !!developerToken,
        savedAuthMode,
        isEmbedded,
        isDeveloperMode,
        developerBackendUrl
      });
      
      // 🆕 開発者モードの場合、ローカルバックエンドに直接接続
      if (isDeveloperMode && developerBackendUrl) {
        console.log('🔧 [AuthProvider] 開発者モード: ローカルバックエンドに直接接続');
        
        if (developerToken) {
          // 開発者トークンを使用
          console.log('🔐 [AuthProvider] 開発者トークンを使用');
          client = new ApiClient(developerBackendUrl, {
            getDemoToken: () => developerToken, // デモトークンとして扱う（バックエンドで開発者トークンとして検証される）
            getCurrentStoreId: getCurrentStoreIdFn
          });
          setAuthMode('developer') // 開発者モードとして設定
          console.log('✅ [AuthProvider] 開発者モードAPIクライアントを初期化完了（開発者トークン使用）')
          console.log('🔧 [AuthProvider] authMode を "developer" に設定しました')
        } else if (demoToken) {
          // デモトークンを使用
          console.log('🔐 [AuthProvider] デモトークンを使用（開発者モード）');
          client = new ApiClient(developerBackendUrl, {
            getDemoToken: () => demoToken,
            getCurrentStoreId: getCurrentStoreIdFn
          });
          setAuthMode('demo')
          console.log('✅ [AuthProvider] 開発者モードAPIクライアントを初期化完了（デモトークン使用）')
        } else {
          // トークンなし（バックエンドで401エラーになる可能性がある）
          console.warn('⚠️ [AuthProvider] 開発者モード: トークンが見つかりません');
          console.warn('⚠️ [AuthProvider] 認証なしでAPIクライアントを初期化します（401エラーの可能性あり）');
          client = new ApiClient(developerBackendUrl, {
            getCurrentStoreId: getCurrentStoreIdFn
          });
          setAuthMode(null)
          console.log('✅ [AuthProvider] 開発者モードAPIクライアントを初期化完了（認証なし）')
        }
      } else if (savedAuthMode === 'developer' && developerToken) {
        // localStorageに開発者モードが保存されている場合（ページ遷移後の再初期化時）
        // NEXT_PUBLIC_DEVELOPER_MODEが設定されていなくても、savedAuthModeとdeveloperTokenがあれば開発者モードとして扱う
        console.log('🔧 [AuthProvider] localStorageから開発者モードを復元');
        console.log('🔧 [AuthProvider] 注意: NEXT_PUBLIC_DEVELOPER_MODEが設定されていませんが、savedAuthModeとdeveloperTokenから開発者モードを復元します');
        const developerBackendUrlForRestore = process.env.NEXT_PUBLIC_BACKEND_URL
        if (developerBackendUrlForRestore) {
          client = new ApiClient(developerBackendUrlForRestore, {
            getDemoToken: () => developerToken,
            getCurrentStoreId: getCurrentStoreIdFn
          });
        } else {
          // developerBackendUrlが設定されていない場合は通常のApiClientを使用
          client = new ApiClient(undefined, {
            getDemoToken: () => developerToken,
            getCurrentStoreId: getCurrentStoreIdFn
          });
        }
        setAuthMode('developer')
        console.log('✅ [AuthProvider] 開発者モードAPIクライアントを復元完了')
        console.log('🔧 [AuthProvider] authMode を "developer" に復元しました')
      } else if (demoToken) {
        // 🔧 デモモード: デモトークンがある場合は優先的にデモモードで初期化
        // （oauthAuthenticatedチェックより先に処理することで、デモモードとOAuthモードの競合を防ぐ）
        console.log('🔗 [AuthProvider] デモモードでAPIクライアントを初期化');
        client = new ApiClient(undefined, {
          getDemoToken: () => demoToken,
          getCurrentStoreId: getCurrentStoreIdFn
        });
        setAuthMode('demo')
        console.log('✅ [AuthProvider] デモモードAPIクライアントを初期化完了')
      } else if (savedAuthMode === 'demo') {
        // 🆕 authModeが'demo'だがdemoTokenがない場合の処理
        // sessionStorageからdemoTokenを取得を試みる
        const sessionDemoToken = sessionStorage.getItem('demoToken')
        if (sessionDemoToken) {
          console.log('🔧 [AuthProvider] sessionStorageからdemoTokenを復元');
          // localStorageにも保存
          try {
            localStorage.setItem('demoToken', sessionDemoToken)
            console.log('✅ [AuthProvider] demoTokenをlocalStorageに復元しました')
          } catch (e) {
            console.warn('⚠️ [AuthProvider] localStorageへのdemoToken保存に失敗:', e)
          }
          client = new ApiClient(undefined, {
            getDemoToken: () => sessionDemoToken,
            getCurrentStoreId: getCurrentStoreIdFn
          });
          setAuthMode('demo')
          console.log('✅ [AuthProvider] デモモードAPIクライアントを初期化完了（sessionStorageから復元）')
        } else {
          // demoTokenが完全に失われた場合
          console.error('❌ [AuthProvider] authModeがdemoですが、demoTokenが見つかりません');
          console.error('❌ [AuthProvider] デモモードの再ログインが必要です');
          // authModeをクリアして、再ログインを促す
          localStorage.removeItem('authMode')
          sessionStorage.removeItem('authMode')
          client = new ApiClient(undefined, {
            getCurrentStoreId: getCurrentStoreIdFn
          });
          setAuthMode(null)
          // エラー状態を設定（UIでユーザーに通知するため）
          setAuthError('デモセッションが無効です。再度ログインしてください。')
        }
      } else if (oauthAuthenticated === 'true') {
        // OAuth認証成功後: Cookieベースの認証を使用（Authorizationヘッダーは不要）
        console.log('🔗 [AuthProvider] OAuth認証済み: Cookieベース認証を使用');
        client = new ApiClient(undefined, {
          getCurrentStoreId: getCurrentStoreIdFn
        }); // getShopifyTokenなし = Cookieベース認証
        setAuthMode('shopify')
        console.log('✅ [AuthProvider] OAuth認証済みAPIクライアントを初期化完了')
      } else {
        // 認証なし
        console.warn('⚠️ [AuthProvider] 認証情報が見つかりません');
        console.warn('⚠️ [AuthProvider] 認証なしでAPIクライアントを初期化します');
        client = new ApiClient(undefined, {
          getCurrentStoreId: getCurrentStoreIdFn
        });
        setAuthMode(null)
        console.log('✅ [AuthProvider] 認証なしAPIクライアントを初期化完了')
      }
    }
    
    setApiClient(client)
    setIsApiClientReady(true)
    
    // authModeの最終確認ログ
    console.log('✅ [AuthProvider] APIクライアントの初期化が完了しました', {
      authMode,
      isApiClientReady: true,
      timestamp: new Date().toISOString()
    });
    
    // デバッグ: authModeの状態を確認
    setTimeout(() => {
      console.log('🔍 [AuthProvider] デバッグ: authMode状態確認', {
        currentAuthMode: authMode,
        savedAuthMode: localStorage.getItem('authMode'),
        hasDeveloperToken: !!localStorage.getItem('developerToken'),
        isDeveloperMode: process.env.NEXT_PUBLIC_DEVELOPER_MODE === 'true',
        developerBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL
      });
    }, 100);
  }, [getToken, isEmbedded, getCurrentStoreIdFn]) // getCurrentStoreIdFn を依存配列に追加

  // アプリ起動時の自動認証
  useEffect(() => {
    // デバッグログを追加
    console.log('🔍 [AuthProvider] useEffect実行:', { 
      apiClient: !!apiClient, 
      isApiClientReady, 
      authMode, 
      isEmbedded 
    })
    
    // APIクライアントが準備完了していない場合は実行しない
    if (!apiClient || !isApiClientReady) {
      console.log('⏳ APIクライアントの準備を待機中...', { apiClient: !!apiClient, isApiClientReady })
      return
    }

    const initializeAuth = async () => {
      console.log('🚀 認証の初期化を開始...', { authMode, isEmbedded })
      try {
        setIsInitializing(true)
        setAuthError(null)
        migrateLocalStorageVariables()
        
        const savedStoreId = localStorage.getItem('currentStoreId')
        const storeId = savedStoreId ? parseInt(savedStoreId, 10) : null
        if (storeId && !isNaN(storeId) && storeId > 0) {
          console.log('🏪 Store ID:', storeId)
          setCurrentStoreId(storeId)
        } else {
          // 🆕 sessionStorage からも確認
          const sessionStoreId = sessionStorage.getItem('currentStoreId')
          if (sessionStoreId) {
            const parsedSessionStoreId = parseInt(sessionStoreId, 10)
            if (!isNaN(parsedSessionStoreId) && parsedSessionStoreId > 0) {
              console.log('🏪 Store ID (sessionStorage):', parsedSessionStoreId)
              setCurrentStoreId(parsedSessionStoreId)
              // localStorage にも保存（次回以降のため）
              try {
                localStorage.setItem('currentStoreId', sessionStoreId)
              } catch (error) {
                console.warn('⚠️ localStorage への保存に失敗しました', error)
              }
            } else {
              console.warn('⚠️ Store ID not found or invalid in localStorage and sessionStorage:', { savedStoreId, sessionStoreId })
              setCurrentStoreId(null)
            }
          } else {
            console.warn('⚠️ Store ID not found or invalid in localStorage:', savedStoreId)
            setCurrentStoreId(null)
          }
        }
        
        if (authMode === 'shopify' && isEmbedded) {
          // Shopify埋め込みアプリの場合、App Bridgeからトークンを取得
          // Shopify公式ドキュメントによると、getSessionToken()はPromiseを返し、
          // セッショントークンがundefinedの場合はAPP::ERROR::FAILED_AUTHENTICATIONエラーを投げる
          // OAuth未完了の場合はトークンが取得できないため、タイムアウト処理を追加
          console.log('🔍 [AuthProvider] getToken()を呼び出します...', { authMode, isEmbedded })
          try {
            // タイムアウト処理を追加（5秒）
            const tokenPromise = getToken()
            const timeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => resolve(null), 5000)
            })
            
            const token = await Promise.race([tokenPromise, timeoutPromise])
            console.log('🔍 [AuthProvider] getToken()の結果:', { token: token ? `取得済み(${token.length}文字)` : 'null' })
            if (token) {
              console.log('✅ Shopifyセッショントークンを取得しました')
              setIsAuthenticated(true)
            } else {
              console.log('⚠️ Shopifyセッショントークンが取得できませんでした（タイムアウトまたはOAuth未完了）')
              setIsAuthenticated(false)
            }
          } catch (error) {
            console.error('❌ Shopifyトークン取得エラー:', error)
            setIsAuthenticated(false)
          }
        } else if (authMode === 'shopify' && !isEmbedded) {
          // OAuth認証済み（スタンドアロンアプリ）の場合、oauth_authenticatedフラグを確認
          const oauthAuthenticated = localStorage.getItem('oauth_authenticated')
          if (oauthAuthenticated === 'true') {
            console.log('✅ OAuth認証済みフラグを確認しました')
            setIsAuthenticated(true)
          } else {
            console.log('⚠️ OAuth認証フラグが見つかりませんでした')
            setIsAuthenticated(false)
          }
        } else if (authMode === 'demo') {
          // デモモードの場合、ローカルストレージからデモトークンを確認
          const demoToken = localStorage.getItem('demoToken')
          if (demoToken) {
            console.log('✅ デモトークンが見つかりました')
            setIsAuthenticated(true)
            
            // 🆕 デモモードの場合、currentStoreIdも復元
            const savedStoreId = localStorage.getItem('currentStoreId')
            if (savedStoreId) {
              const storeId = parseInt(savedStoreId, 10)
              if (!isNaN(storeId) && storeId > 0) {
                console.log('✅ [AuthProvider] デモモード: currentStoreIdを復元:', storeId)
                setCurrentStoreId(storeId)
              }
            }
          } else {
            console.log('⚠️ デモトークンが見つかりませんでした')
            setIsAuthenticated(false)
          }
        } else if (authMode === null) {
          // authModeがnullの場合、localStorageから認証情報を確認（初期化タイミングの問題を回避）
          console.log('🔍 [AuthProvider] authMode=null のため、localStorageから認証情報を確認')
          
          // 1. まずデモトークンを確認（デモモードを優先）
          const demoToken = localStorage.getItem('demoToken')
          const savedAuthMode = localStorage.getItem('authMode')
          
          if (demoToken && savedAuthMode === 'demo') {
            console.log('✅ [AuthProvider] デモトークンが見つかりました（authMode=null）')
            setAuthMode('demo')
            setIsAuthenticated(true)
            
            // currentStoreIdも復元
            const savedStoreId = localStorage.getItem('currentStoreId')
            if (savedStoreId) {
              const storeId = parseInt(savedStoreId, 10)
              if (!isNaN(storeId) && storeId > 0) {
                console.log('✅ [AuthProvider] currentStoreIdを復元（authMode=null→demo）:', storeId)
                setCurrentStoreId(storeId)
              }
            }
          } else if (demoToken) {
            // authModeが'demo'でなくてもdemoTokenがある場合
            console.log('✅ [AuthProvider] デモトークンが見つかりました（authMode設定なし）', { savedAuthMode })
            setAuthMode('demo')
            setIsAuthenticated(true)
            localStorage.setItem('authMode', 'demo') // authModeも設定
            
            const savedStoreId = localStorage.getItem('currentStoreId')
            if (savedStoreId) {
              const storeId = parseInt(savedStoreId, 10)
              if (!isNaN(storeId) && storeId > 0) {
                console.log('✅ [AuthProvider] currentStoreIdを復元:', storeId)
                setCurrentStoreId(storeId)
              }
            }
          } else {
            // 2. OAuth認証フラグを確認
            const oauthAuthenticated = localStorage.getItem('oauth_authenticated')
            if (oauthAuthenticated === 'true') {
              console.log('✅ OAuth認証済みフラグを確認しました（authMode=null）')
              setIsAuthenticated(true)
              setAuthMode('shopify')
            } else {
              console.log('⚠️ 認証情報が見つかりません（authMode=null）')
              setIsAuthenticated(false)
            }
          }
        } else {
          // authModeが設定されているが、上記の条件に該当しない場合
          console.log('⚠️ 未対応のauthMode:', authMode)
          setIsAuthenticated(false)
        }
      } catch (error: any) {
        console.error('❌ 認証の初期化に失敗:', error)
        setAuthError(error.message || '認証に失敗しました')
        setIsAuthenticated(false)
        console.log('⚠️ 認証なしでアプリケーションを継続します')
      } finally {
        // 認証状態をログ出力（finallyブロック内なので、この時点での状態を確認）
        const finalAuthState = localStorage.getItem('oauth_authenticated') === 'true' || 
                               localStorage.getItem('demoToken') !== null
        console.log('✅ 認証の初期化が完了しました', { 
          authMode, 
          isEmbedded, 
          oauthAuthenticated: localStorage.getItem('oauth_authenticated'),
          finalAuthState 
        })
        setIsInitializing(false)
      }
    }
    
    initializeAuth()
  }, [apiClient, isApiClientReady, authMode, isEmbedded, getToken])
  
  // デバッグ用: isInitializingが長時間trueのままの場合の警告とタイムアウト処理
  useEffect(() => {
    if (isInitializing) {
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ [AuthProvider] isInitializingが10秒以上trueのままです。初期化が完了していない可能性があります。', {
          apiClient: !!apiClient,
          isApiClientReady,
          authMode,
          isEmbedded,
        })
        
        // タイムアウト時は強制的に初期化を完了させる（無限ループ防止）
        // OAuth未完了の場合は認証なしで継続
        console.warn('⚠️ [AuthProvider] タイムアウト: 強制的に初期化を完了します')
        setIsInitializing(false)
        setIsAuthenticated(false)
      }, 10000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isInitializing, apiClient, isApiClientReady, authMode, isEmbedded])

  const login = async (storeId: number) => {
    try {
      setAuthError(null)
      console.log('🔐 ログイン開始:', storeId)
      
      if (authMode === 'demo') {
        // デモモードのログインは別ページで処理
        window.location.href = '/demo/login'
        return
      }
      
      // Shopify埋め込みアプリの場合、App Bridgeからトークンを取得
      if (authMode === 'shopify' && isEmbedded) {
        const token = await getToken()
        if (token) {
          setIsAuthenticated(true)
          setCurrentStoreId(storeId)
          localStorage.setItem('currentStoreId', storeId.toString())
          console.log('✅ Shopifyログイン成功')
        } else {
          throw new Error('Shopifyセッショントークンが取得できませんでした')
        }
      } else {
        throw new Error('サポートされていない認証モードです')
      }
    } catch (error: any) {
      console.error('❌ ログインエラー:', error)
      setAuthError(error.message || 'ログインに失敗しました')
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 ログアウト実行', { authMode })
    
    // 🆕 リダイレクト先を決定（状態をクリアする前に）
    const redirectTo = authMode === 'demo' ? '/demo/login' : '/auth/select'
    
    if (authMode === 'demo') {
      // デモモードの場合、すべてのデモ関連のlocalStorageアイテムを削除
      localStorage.removeItem('demoToken')
      localStorage.removeItem('demo_token') // 別のキー名にも対応
      localStorage.removeItem('authMode')
      localStorage.removeItem('readOnly')
      localStorage.removeItem('currentStoreId')
      // sessionStorageもクリア
      sessionStorage.removeItem('demoToken')
      sessionStorage.removeItem('authMode')
      sessionStorage.removeItem('currentStoreId')
      console.log('🗑️ デモモード関連のlocalStorage/sessionStorageをクリアしました')
    } else if (authMode === 'developer') {
      // 開発者モードの場合
      localStorage.removeItem('developerToken')
      localStorage.removeItem('oauth_authenticated')
      localStorage.removeItem('currentStoreId')
      console.log('🗑️ 開発者モード関連のlocalStorageをクリアしました')
    } else {
      // OAuth認証の場合
      localStorage.removeItem('oauth_authenticated')
      localStorage.removeItem('currentStoreId')
    }
    
    setIsAuthenticated(false)
    setCurrentStoreId(null)
    setAuthError(null)
    setAuthMode(null)
    console.log('✅ ログアウト完了')
    
    // 🆕 ログアウト後にリダイレクト
    if (typeof window !== 'undefined') {
      console.log('🔄 リダイレクト先:', redirectTo)
      window.location.href = redirectTo
    }
  }

  const clearError = () => {
    setAuthError(null)
  }

  const refreshAuth = async () => {
    try {
      setAuthError(null)
      
      if (authMode === 'shopify' && isEmbedded) {
        const token = await getToken()
        if (token) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          setAuthError('Shopifyセッショントークンが取得できませんでした')
        }
      } else if (authMode === 'demo') {
        const demoToken = localStorage.getItem('demoToken')
        if (demoToken) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          setAuthError('デモトークンが見つかりませんでした')
        }
      }
    } catch (error: any) {
      setIsAuthenticated(false)
      setAuthError(error.message || '認証の更新に失敗しました')
    }
  }

  const getApiClient = (): ApiClient => {
    if (!apiClient) {
      throw new Error('APIクライアントが初期化されていません')
    }
    return apiClient
  }

  // OAuth認証成功時に認証状態を明示的に設定するメソッド
  const markAuthenticated = (storeId: number) => {
    console.log('✅ OAuth認証成功をマーク:', { storeId })
    setIsAuthenticated(true)
    setCurrentStoreId(storeId)
    setAuthError(null)
    localStorage.setItem('currentStoreId', storeId.toString())
    localStorage.setItem('oauth_authenticated', 'true') // OAuth認証成功フラグ
  }

  // グローバルな認証エラーを監視
  useEffect(() => {
    const handler = (event: Event) => {
      console.error('🔴 [AuthProvider] グローバル認証エラー発火')
      
      // 🆕 認証情報をlocalStorageからクリア（401エラーが発生した場合、認証が無効になった可能性があるため）
      // 注意: デモモードの場合は、currentStoreIdとauthModeは保持する（デモモードではこれらは重要）
      const effectiveAuthMode = authMode || (typeof window !== 'undefined' ? localStorage.getItem('authMode') : null);
      console.log('🔍 [AuthProvider] 認証エラー処理: authMode確認', { stateAuthMode: authMode, storageAuthMode: typeof window !== 'undefined' ? localStorage.getItem('authMode') : null, effectiveAuthMode });
      
      if (effectiveAuthMode === 'demo' || effectiveAuthMode === 'developer') {
        // 🔧 デモモード/開発者モードの場合、トークンをクリアしない
        // トークンをクリアすると無限ループに陥るため、認証情報を保持する
        // 代わりに、ユーザーに再ログインを促すメッセージを表示する
        console.warn('⚠️ [AuthProvider] デモモード/開発者モード: 認証エラーが発生しましたが、トークンは保持します', {
          currentStoreId: localStorage.getItem('currentStoreId'),
          authMode: localStorage.getItem('authMode'),
          hasDemoToken: !!localStorage.getItem('demoToken'),
          hasDemoTokenSession: !!sessionStorage.getItem('demoToken')
        })
        
        // sessionStorageにdemoTokenがあれば、localStorageに復元を試みる
        const sessionDemoToken = sessionStorage.getItem('demoToken')
        if (sessionDemoToken && !localStorage.getItem('demoToken')) {
          try {
            localStorage.setItem('demoToken', sessionDemoToken)
            console.log('🔧 [AuthProvider] sessionStorageからdemoTokenを復元しました')
          } catch (e) {
            console.warn('⚠️ [AuthProvider] demoTokenの復元に失敗:', e)
          }
        }
        
        // 認証エラーを設定（UIで表示するため）
        // ただし、isAuthenticatedはfalseにしない（無限ループ防止）
        setAuthError('認証エラーが発生しました。ページを再読み込みしてください。')
        return; // 早期リターン（isAuthenticatedをfalseにしない）
      } else {
        // OAuth認証の場合
        console.log('🗑️ [AuthProvider] OAuth認証情報をクリアします')
        setAuthError('認証が必要です')
        setIsAuthenticated(false)
        localStorage.removeItem('oauth_authenticated')
        localStorage.removeItem('currentStoreId')
        console.log('🗑️ [AuthProvider] OAuth認証情報をクリアしました')
      }
      
      // 🆕 Shopify埋め込みアプリの場合、/install にリダイレクト
      if (isEmbedded && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const shop = urlParams.get('shop')
        const host = urlParams.get('host')
        const embedded = urlParams.get('embedded')
        const hmac = urlParams.get('hmac')
        const timestamp = urlParams.get('timestamp')
        
        // /install ページ以外にいる場合のみリダイレクト（無限ループ防止）
        const currentPath = window.location.pathname
        
        // 🆕 /install ページにリダイレクトするべきでないパスの判定を変更
        // 以前: skipRedirectPaths に含まれるパスのみスキップ
        // 変更後: /install と /auth/callback 以外のすべてのアプリページでスキップ
        // 
        // 理由: OAuth認証完了後のアプリページでは、サードパーティストレージの制限により
        // localStorage への書き込みが無視される可能性がある。
        // この場合、auth:error イベントが発火しても /install にリダイレクトせず、
        // 現在のページにとどまって処理を続行する。
        //
        // サードパーティストレージの制限について:
        // - Shopifyアプリは admin.shopify.com のiframe内で動作する
        // - アプリのドメインは「サードパーティ」として扱われる
        // - Safari (ITP), Firefox, Chrome はサードパーティストレージを制限/ブロック
        // - localStorage/sessionStorage への書き込みが無視されることがある
        // - この制限は ngrok 開発環境だけでなく、本番環境でも発生する
        
        // リダイレクトが必要なパス（これら以外はスキップ）
        const redirectRequiredPaths = ['/install', '/auth/callback'];
        const shouldRedirect = redirectRequiredPaths.some(path => currentPath.startsWith(path));
        
        if (!shouldRedirect) {
          console.log('⏸️ [AuthProvider] アプリページのため、/install へのリダイレクトをスキップします:', {
            currentPath,
            shop,
            host
          });
          return; // 早期リターン（リダイレクトしない）
        }
        
        if (shop && host && !currentPath.startsWith('/install')) {
          console.log('⚠️ [AuthProvider] OAuth未完了: /install へリダイレクト', { shop, host, currentPath })
          
          // クエリパラメータを保持してリダイレクト
          const params = new URLSearchParams()
          params.set('shop', shop)
          params.set('host', host)
          if (embedded) params.set('embedded', embedded)
          if (hmac) params.set('hmac', hmac)
          if (timestamp) params.set('timestamp', timestamp)
          
          window.location.href = `/install?${params.toString()}`
        } else if (!shop || !host) {
          console.warn('⚠️ [AuthProvider] shop または host パラメータが見つかりません。リダイレクトをスキップします。', { shop, host, currentPath })
        } else {
          console.log('⏸️ [AuthProvider] 既に /install ページにいます。リダイレクトをスキップします。', { currentPath })
        }
      }
    }
    window.addEventListener('auth:error', handler)
    return () => window.removeEventListener('auth:error', handler)
  }, [authMode, isEmbedded]) // 🆕 isEmbedded を依存配列に追加

  // Shopify APIレート制限エラーのUI通知
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ endpoint?: string; retryAfter?: number }>
      const retryAfter = customEvent.detail?.retryAfter ?? 60
      toast({
        variant: 'destructive',
        title: 'APIリクエスト制限',
        description: `Shopify APIのレート制限に達しました。約${retryAfter}秒後に自動で回復します。`,
      })
    }
    window.addEventListener('rate-limit-error', handler)
    return () => window.removeEventListener('rate-limit-error', handler)
  }, [])

  // 🆕 ページ遷移時に currentStoreId を再取得（開発者モード・デモモード対応）
  // 重要: ページ遷移時に localStorage/sessionStorage から currentStoreId を再取得し、
  // AuthProvider の状態を更新することで、認証が通らなくなる問題を防ぐ
  useEffect(() => {
    // 初期化中は実行しない
    if (isInitializing) {
      return
    }

    console.log('🔄 [AuthProvider] ページ遷移検知:', { pathname, authMode, currentStoreId })

    // 開発者モードまたはデモモードの場合、currentStoreId を再取得
    const isDeveloperMode = authMode === 'developer'
    const isDemoMode = authMode === 'demo'
    const developerToken = typeof window !== 'undefined' ? localStorage.getItem('developerToken') : null
    const demoToken = typeof window !== 'undefined' ? localStorage.getItem('demoToken') : null
    
    if (isDeveloperMode || isDemoMode || developerToken || demoToken) {
      // localStorage から取得を試みる
      let savedStoreId = typeof window !== 'undefined' ? localStorage.getItem('currentStoreId') : null
      
      // localStorage になければ sessionStorage から取得を試みる
      if (!savedStoreId && typeof window !== 'undefined') {
        savedStoreId = sessionStorage.getItem('currentStoreId')
        // sessionStorage にあった場合は localStorage にも保存（次回以降のため）
        if (savedStoreId) {
          try {
            localStorage.setItem('currentStoreId', savedStoreId)
            console.log('✅ [AuthProvider] sessionStorage から取得し、localStorage にも保存しました', { storeId: savedStoreId, pathname })
          } catch (error) {
            console.warn('⚠️ [AuthProvider] localStorage への保存に失敗しました', error)
          }
        }
      }
      
      if (savedStoreId) {
        const storeId = parseInt(savedStoreId, 10)
        if (!isNaN(storeId) && storeId > 0) {
          // AuthProvider の currentStoreId が設定されていない、または異なる場合のみ更新
          if (!currentStoreId || currentStoreId !== storeId) {
            console.log('🔄 [AuthProvider] ページ遷移時に currentStoreId を再取得:', { 
              storeId, 
              previousStoreId: currentStoreId,
              pathname,
              authMode
            })
            setCurrentStoreId(storeId)
            setAuthError(null)
          } else {
            console.log('✅ [AuthProvider] currentStoreId は既に正しく設定されています:', { storeId, pathname })
          }
        } else {
          console.warn('⚠️ [AuthProvider] Invalid store ID:', savedStoreId, { pathname })
        }
      } else {
        console.warn('⚠️ [AuthProvider] currentStoreId が localStorage にも sessionStorage にも見つかりません（開発者モード/デモモード）', { pathname })
      }
    }

    // OAuth認証成功フラグを確認（Shopify OAuth モード）
    const oauthAuthenticated = typeof window !== 'undefined' ? localStorage.getItem('oauth_authenticated') : null
    if (oauthAuthenticated === 'true' && !isAuthenticated && authMode === 'shopify') {
      const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem('currentStoreId') : null
      if (savedStoreId) {
        const storeId = parseInt(savedStoreId, 10)
        if (!isNaN(storeId) && storeId > 0) {
          console.log('🔄 OAuth認証フラグを確認、認証状態を復元:', { storeId, pathname })
          setIsAuthenticated(true)
          setCurrentStoreId(storeId)
          setAuthError(null)
        } else {
          console.warn('⚠️ Invalid store ID in localStorage:', savedStoreId, { pathname })
        }
      }
    }
  }, [isAuthenticated, isInitializing, authMode, currentStoreId, pathname]) // 🆕 pathname を依存配列に追加してページ遷移を検知

  const value: AuthContextType = {
    isAuthenticated,
    isInitializing,
    isApiClientReady,
    currentStoreId,
    authError,
    authMode,
    login,
    logout,
    clearError,
    refreshAuth,
    getApiClient,
    markAuthenticated,
    setCurrentStoreId, // 🆕 setCurrentStoreId を公開
    resolveStoreId, // 🆕 resolveStoreId を公開
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// 外部から使用するAuthProvider（AppBridgeProviderでラップ）
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AppBridgeProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </AppBridgeProvider>
  )
}

// 開発環境でのデバッグヘルパー
export function AuthDebugInfo() {
  const auth = useAuth()
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
      <div className="font-bold mb-1">認証状態</div>
      <div>認証済み: {auth.isAuthenticated ? '✅' : '❌'}</div>
      <div>初期化中: {auth.isInitializing ? '⏳' : '✅'}</div>
      <div>認証モード: {auth.authMode || 'N/A'}</div>
      <div>Store ID: {auth.currentStoreId || 'N/A'}</div>
      {auth.authError && (
        <div className="text-red-300 mt-1">エラー: {auth.authError}</div>
      )}
      <div className="mt-1">
        <button onClick={() => auth.clearError()} className="text-blue-300 hover:text-blue-100 mr-2">エラークリア</button>
        <button onClick={() => auth.logout()} className="text-red-300 hover:text-red-100">ログアウト</button>
      </div>
    </div>
  )
}