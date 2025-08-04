/**
 * JWT認証クライアント
 * 
 * @author YUKI
 * @date 2025-07-28
 * @updated 2025-08-02
 * @description バックエンドJWT認証に対応したフロントエンド認証クライアント（JWTデコード機能追加）
 */

import { handleApiError } from './error-handler'
import { buildApiUrl, API_CONFIG } from './api-config'
import { decodeToken, isTokenValid, type JWTPayload } from './auth/jwt-decoder'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface AuthRequest {
  storeId: number
  shopDomain: string
}

export class AuthClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private isInitialized = false

  constructor() {
    // サーバーサイドレンダリング対応
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage()
    }
  }

  private loadTokensFromStorage() {
    try {
      this.accessToken = localStorage.getItem('accessToken')
      this.refreshToken = localStorage.getItem('refreshToken')
      this.isInitialized = true
    } catch (error) {
      console.warn('Failed to load tokens from localStorage:', error)
      this.isInitialized = true
    }
  }

  async authenticate(storeId: number): Promise<AuthTokens> {
    console.log('🔐 JWT認証を開始します...', { storeId })
    
    // クライアント側でのみ実行
    if (typeof window === 'undefined') {
      throw new Error('Authentication is only available on client side')
    }

    try {
      const authRequest: AuthRequest = {
        storeId,
        shopDomain: `store-${storeId}.myshopify.com`
      }

      console.log('📤 認証リクエスト:', authRequest)
      
      const authUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH_TOKEN)
      console.log('🌐 認証URL:', authUrl)

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(authRequest)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ 認証失敗:', response.status, errorText)
        throw new Error(`Authentication failed: ${response.status} ${errorText}`)
      }

      const tokens: AuthTokens = await response.json()
      console.log('✅ JWT認証成功')
      
      this.setTokens(tokens)
      return tokens

    } catch (error: unknown) {
      console.error('❌ JWT認証エラー:', error)
      
      // 統一エラーハンドラーで処理
      await handleApiError(error, buildApiUrl(API_CONFIG.ENDPOINTS.AUTH_TOKEN), 'POST', {
        context: 'AuthClient.authenticate',
        severity: 'error',
        userMessage: 'ログインに失敗しました。しばらく時間をおいて再度お試しください。',
        showToUser: true,
        notifyType: 'toast'
      })

      throw error
    }
  }

  private setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
    
    // JWTトークンの検証
    if (!isTokenValid(tokens.accessToken)) {
      console.warn('⚠️ 受信したアクセストークンが無効です')
    } else {
      const payload = decodeToken(tokens.accessToken)
      if (payload) {
        console.log('✅ JWTトークン情報:', {
          tenant_id: payload.tenant_id,
          store_id: payload.store_id,
          expiresAt: new Date(payload.exp * 1000)
        })
      }
    }
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('accessToken', tokens.accessToken)
        localStorage.setItem('refreshToken', tokens.refreshToken)
        console.log('💾 トークンをLocalStorageに保存しました')
      } catch (error) {
        console.warn('⚠️ LocalStorageへの保存に失敗:', error)
      }
    }
  }

  getAuthHeaders(): HeadersInit {
    if (!this.accessToken) {
      console.warn('⚠️ アクセストークンが設定されていません')
      return {}
    }

    return {
      'Authorization': `Bearer ${this.accessToken}`
    }
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // 初期化を待つ
    if (!this.isInitialized && typeof window !== 'undefined') {
      this.loadTokensFromStorage()
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
      ...this.getAuthHeaders()
    }

    console.log('📤 認証付きリクエスト:', endpoint, { 
      method: options.method || 'GET',
      hasAuthHeader: !!this.accessToken 
    })

    let response = await fetch(endpoint, { 
      ...options, 
      headers 
    })

    // 401エラー（認証失敗）の場合、トークン更新を試行
    if (response.status === 401 && this.refreshToken) {
      console.log('🔄 トークン期限切れを検出、更新を試行します...')
      
      try {
        await this.refreshAccessToken()
        
        // 更新されたトークンでリトライ
        const retryHeaders = {
          ...headers,
          ...this.getAuthHeaders()
        }
        
        console.log('🔄 更新されたトークンでリトライします')
        response = await fetch(endpoint, {
          ...options,
          headers: retryHeaders
        })
        
        if (response.ok) {
          console.log('✅ トークン更新後のリトライが成功しました')
        }
        
      } catch (refreshError) {
        console.error('❌ トークン更新に失敗:', refreshError)
        this.clearTokens()
        
        // 開発環境での特別処理
        if (process.env.NODE_ENV === 'development') {
          console.warn('🔧 開発環境: 再認証が必要です')
          
          // オプション1: 自動で再認証を試行
          const currentStoreId = this.getCurrentStoreId()
          if (currentStoreId) {
            console.log('🔄 自動再認証を試行します...')
            try {
              await this.authenticate(currentStoreId)
              
              // 再認証後にリトライ
              const finalHeaders = {
                ...headers,
                ...this.getAuthHeaders()
              }
              
              response = await fetch(endpoint, {
                ...options,
                headers: finalHeaders
              })
              
              if (response.ok) {
                console.log('✅ 再認証後のリクエストが成功しました')
              }
            } catch (reAuthError) {
              console.error('❌ 自動再認証に失敗:', reAuthError)
              // インストールページへのリダイレクトを検討
              console.warn('💡 /install ページで再度認証してください')
            }
          } else {
            // StoreIdが取得できない場合
            console.error('❌ StoreIdが取得できません。/install ページで認証してください')
          }
        } else {
          // 本番環境では再認証画面へリダイレクト
          console.error('❌ 認証エラー: 再ログインが必要です')
        }
      }
    }

    return response
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      console.error('❌ リフレッシュトークンが存在しません')
      throw new Error('リフレッシュトークンがありません')
    }

    console.log('🔄 アクセストークンを更新中...')
    console.log('📝 リフレッシュトークン:', this.refreshToken.substring(0, 20) + '...')

    try {
      const refreshUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH_REFRESH)
      console.log('🌐 リフレッシュURL:', refreshUrl)
      
      const requestBody = {
        refreshToken: this.refreshToken
      }
      console.log('📤 リクエストボディ:', { ...requestBody, refreshToken: requestBody.refreshToken.substring(0, 20) + '...' })
      
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 レスポンスステータス:', response.status)
      
      if (!response.ok) {
        // エラーレスポンスの詳細を取得
        let errorMessage = `Token refresh failed: ${response.status}`
        try {
          const errorData = await response.text()
          console.error('❌ エラーレスポンス:', errorData)
          errorMessage += ` - ${errorData}`
        } catch (e) {
          console.error('❌ エラーレスポンスの読み取りに失敗:', e)
        }
        
        // 401エラーの場合は特別な処理
        if (response.status === 401) {
          console.warn('⚠️ リフレッシュトークンが無効または期限切れです')
          
          // 開発環境では一時的な回避策を提供
          if (process.env.NODE_ENV === 'development') {
            console.warn('🔄 開発環境: 再認証を促します')
            // トークンをクリアして再認証を促す
            this.clearTokens()
            
            // オプション: インストールページへリダイレクト
            // window.location.href = '/install'
          }
        }
        
        throw new Error(errorMessage)
      }

      const tokens: AuthTokens = await response.json()
      console.log('✅ 新しいトークンを受信しました')
      
      this.setTokens(tokens)
      
      console.log('✅ アクセストークンの更新が完了しました')
      
    } catch (error) {
      console.error('❌ トークン更新エラー:', error)
      console.error('❌ エラー詳細:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  private getCurrentStoreId(): number | null {
    if (typeof window === 'undefined') return null
    
    try {
      const storeId = localStorage.getItem('currentStoreId')
      return storeId ? parseInt(storeId, 10) : 1 // デフォルトは1
    } catch {
      return 1
    }
  }

  clearTokens(): void {
    console.log('🗑️ トークンをクリアします')
    
    this.accessToken = null
    this.refreshToken = null
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      } catch (error) {
        console.warn('⚠️ LocalStorageのクリアに失敗:', error)
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * JWTトークンからtenant_idを取得
   * @returns tenant_id または null
   */
  getTenantId(): string | null {
    if (!this.accessToken) return null
    const payload = decodeToken(this.accessToken)
    return payload?.tenant_id || null
  }

  /**
   * JWTトークンからstore_idを取得
   * @returns store_id または null
   */
  getStoreId(): string | null {
    if (!this.accessToken) return null
    const payload = decodeToken(this.accessToken)
    return payload?.store_id || null
  }

  /**
   * JWTトークンの詳細情報を取得
   * @returns JWTペイロード または null
   */
  getTokenPayload(): JWTPayload | null {
    if (!this.accessToken) return null
    return decodeToken(this.accessToken)
  }

  // デバッグ用: 現在の認証状態を表示
  getAuthStatus() {
    const tokenPayload = this.getTokenPayload()
    return {
      isAuthenticated: this.isAuthenticated(),
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      isInitialized: this.isInitialized,
      tokenInfo: tokenPayload ? {
        tenant_id: tokenPayload.tenant_id,
        store_id: tokenPayload.store_id,
        expiresAt: new Date(tokenPayload.exp * 1000),
        isValid: isTokenValid(this.accessToken!)
      } : null
    }
  }

  // 開発環境用: 強制的に再認証
  async forceReauthenticate(storeId?: number): Promise<void> {
    console.log('🔄 強制再認証を開始します...')
    
    // トークンをクリア
    this.clearTokens()
    
    // StoreIdを取得
    const targetStoreId = storeId || this.getCurrentStoreId() || 1
    
    try {
      // 新規認証
      await this.authenticate(targetStoreId)
      console.log('✅ 強制再認証が完了しました')
    } catch (error) {
      console.error('❌ 強制再認証に失敗しました:', error)
      throw error
    }
  }
}

// シングルトンインスタンス
export const authClient = new AuthClient()

// デバッグ用のグローバル公開（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).authClient = authClient
}