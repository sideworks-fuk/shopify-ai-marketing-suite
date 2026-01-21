"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { AppBridgeProvider, useAppBridge } from '@/lib/shopify/app-bridge-provider'
import { ApiClient } from '@/lib/api-client'
import { migrateLocalStorageVariables } from '@/lib/localstorage-migration'

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

  // 🆕 getCurrentStoreId の共通関数（AuthProvider の currentStoreId を優先し、なければ localStorage/sessionStorage から取得）
  // useCallback を使用して currentStoreId の最新値を参照できるようにする
  const getCurrentStoreIdFn = useCallback((): number | null => {
    console.log('🔍 [AuthProvider.getCurrentStoreIdFn] 呼び出し', { 
      currentStoreId,
      timestamp: new Date().toISOString()
    });
    
    // AuthProvider の currentStoreId を優先
    if (currentStoreId !== null && currentStoreId > 0) {
      console.log('✅ [AuthProvider.getCurrentStoreIdFn] AuthProvider の currentStoreId を使用', { storeId: currentStoreId });
      return currentStoreId;
    }
    
    if (typeof window !== 'undefined') {
      // localStorage から取得を試みる
      const savedStoreId = localStorage.getItem('currentStoreId');
      console.log('🔍 [AuthProvider.getCurrentStoreIdFn] localStorage から取得を試みる', { savedStoreId });
      if (savedStoreId) {
        const parsedStoreId = parseInt(savedStoreId, 10);
        if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
          console.log('✅ [AuthProvider.getCurrentStoreIdFn] localStorage から取得成功', { storeId: parsedStoreId });
          return parsedStoreId;
        }
      }
      // localStorage になければ sessionStorage から取得を試みる
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
    }
    
    console.warn('⚠️ [AuthProvider.getCurrentStoreIdFn] currentStoreId が見つかりませんでした', {
      currentStoreId,
      localStorageCurrentStoreId: typeof window !== 'undefined' ? localStorage.getItem('currentStoreId') : null,
      sessionStorageCurrentStoreId: typeof window !== 'undefined' ? sessionStorage.getItem('currentStoreId') : null
    });
    return null;
  }, [currentStoreId]); // currentStoreId を依存配列に追加

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
          } else {
            console.log('⚠️ デモトークンが見つかりませんでした')
            setIsAuthenticated(false)
          }
        } else if (authMode === null) {
          // authModeがnullの場合でも、oauth_authenticatedフラグを確認（初期化タイミングの問題を回避）
          const oauthAuthenticated = localStorage.getItem('oauth_authenticated')
          if (oauthAuthenticated === 'true') {
            console.log('✅ OAuth認証済みフラグを確認しました（authMode=null）')
            setIsAuthenticated(true)
            // authModeも設定（次回の初期化で正しく動作するように）
            setAuthMode('shopify')
          } else {
            console.log('⚠️ 認証情報が見つかりません（authMode=null）')
            setIsAuthenticated(false)
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
    
    if (authMode === 'demo') {
      // デモモードの場合、すべてのデモ関連のlocalStorageアイテムを削除
      localStorage.removeItem('demoToken')
      localStorage.removeItem('demo_token') // 別のキー名にも対応
      localStorage.removeItem('authMode')
      localStorage.removeItem('readOnly')
      localStorage.removeItem('currentStoreId')
      console.log('🗑️ デモモード関連のlocalStorageをクリアしました')
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
      console.error('🔴 [AuthProvider] グローバル認証エラー発火: 認証情報をクリアします')
      setAuthError('認証が必要です')
      setIsAuthenticated(false)
      
      // 🆕 認証情報をlocalStorageからクリア（401エラーが発生した場合、認証が無効になった可能性があるため）
      // 注意: デモモードの場合はデモトークンもクリアする
      if (authMode === 'demo') {
        localStorage.removeItem('demoToken')
        localStorage.removeItem('demo_token')
        localStorage.removeItem('authMode')
        console.log('🗑️ [AuthProvider] デモモード関連の認証情報をクリアしました')
      } else {
        // OAuth認証の場合
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