/**
 * JWT認証クライアント
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description バックエンドJWT認証に対応したフロントエンド認証クライアント
 */

import { handleApiError } from './error-handler'
import { buildApiUrl, API_CONFIG } from './api-config'

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

    } catch (error: any) {
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
        
        // 再認証を促す
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
          } catch (reAuthError) {
            console.error('❌ 自動再認証に失敗:', reAuthError)
          }
        }
      }
    }

    return response
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('リフレッシュトークンがありません')
    }

    console.log('🔄 アクセストークンを更新中...')

    try {
      const refreshUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH_REFRESH)
      console.log('🌐 リフレッシュURL:', refreshUrl)
      
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`)
      }

      const tokens: AuthTokens = await response.json()
      this.setTokens(tokens)
      
      console.log('✅ アクセストークンの更新が完了しました')
      
    } catch (error) {
      console.error('❌ トークン更新エラー:', error)
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

  // デバッグ用: 現在の認証状態を表示
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      isInitialized: this.isInitialized
    }
  }
}

// シングルトンインスタンス
export const authClient = new AuthClient()

// デバッグ用のグローバル公開（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).authClient = authClient
}