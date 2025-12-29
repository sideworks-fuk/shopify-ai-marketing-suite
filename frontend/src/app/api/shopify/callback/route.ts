import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/config/validation';

/**
 * Shopify OAuthコールバックAPI Route（ngrok対応版）
 * 
 * @description Shopify OAuth認証後のコールバック処理（フロントエンドプロキシ方式）
 * 
 * 処理フロー:
 * 1. Shopifyからフロントエンドのngrok URLにコールバックが来る
 * 2. フロントエンドがすべてのクエリパラメータをバックエンド（localhost:7088）に転送
 * 3. バックエンドがOAuth処理を実行
 * 4. バックエンドからのリダイレクトをフロントエンドが処理
 * 
 * 改善内容:
 * - すべてのクエリパラメータを確実に転送
 * - hostパラメータの対応
 * - ローカル開発環境でのSSL証明書問題の回避
 * - 詳細なエラーハンドリング
 */

/**
 * すべてのクエリパラメータを取得
 */
function getAllQueryParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * バックエンドAPIを呼び出す（開発環境でのSSL証明書問題を回避）
 */
async function callBackendApi(
  url: string, 
  options: RequestInit,
  isDevelopment: boolean
): Promise<Response> {
  // 開発環境でのSSL証明書問題を回避
  if (isDevelopment && url.includes('localhost')) {
    try {
      return await fetch(url, options);
    } catch (error: any) {
      if (error.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
          error.message.includes('self-signed certificate')) {
        console.warn('⚠️ SSL証明書エラーをスキップ（開発環境）');
        
        // 開発環境では、HTTPで再試行
        const httpUrl = url.replace('https://', 'http://');
        console.log('📡 HTTPで再試行:', httpUrl);
        return await fetch(httpUrl, options);
      }
      throw error;
    }
  }
  
  return await fetch(url, options);
}

/**
 * フロントエンドURLを取得（フォールバック付き）
 */
function getFrontendUrl(request: NextRequest): string {
  // 優先順位:
  // 1. 環境変数 NEXT_PUBLIC_SHOPIFY_APP_URL
  // 2. 環境変数 NEXT_PUBLIC_FRONTEND_URL
  // 3. リクエストヘッダーから取得
  const appUrl = process.env.NEXT_PUBLIC_SHOPIFY_APP_URL || 
                 process.env.NEXT_PUBLIC_FRONTEND_URL;
  
  if (appUrl) {
    return appUrl;
  }
  
  // リクエストヘッダーから取得
  const xForwardedHost = request.headers.get('x-forwarded-host');
  const xForwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = xForwardedHost || request.headers.get('host');
  
  if (host) {
    return `${xForwardedProto}://${host}`;
  }
  
  // 最終フォールバック
  return 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // すべてのパラメータを取得
    const allParams = getAllQueryParams(searchParams);
    
    // 主要パラメータの抽出
    const code = allParams.code;
    const shop = allParams.shop;
    const state = allParams.state;
    const hmac = allParams.hmac;
    const timestamp = allParams.timestamp;
    const host = allParams.host; // Shopify 2021年4月以降追加

    console.log('🔐 [CallbackProxy] Shopify OAuthコールバック受信:', {
      code: code ? `${code.substring(0, 8)}***` : null,
      shop,
      state: state ? `${state.substring(0, 8)}***` : null,
      hmac: hmac ? `${hmac.substring(0, 8)}***` : null,
      timestamp,
      host: host ? 'present' : 'missing',
      totalParams: Object.keys(allParams).length,
      allParamKeys: Object.keys(allParams)
    });

    // 必須パラメータの検証
    if (!code || !shop || !state) {
      console.error('❌ [CallbackProxy] 必須パラメータが不足:', { 
        code: !!code, 
        shop: !!shop, 
        state: !!state 
      });
      
      const frontendUrl = getFrontendUrl(request);
      const errorUrl = new URL('/auth/error', frontendUrl);
      errorUrl.searchParams.set('message', 'Missing required parameters');
      errorUrl.searchParams.set('shop', shop || 'unknown');
      errorUrl.searchParams.set('error_code', 'MISSING_PARAMS');
      
      return NextResponse.redirect(errorUrl);
    }

    // ショップドメインの基本検証
    if (!shop.endsWith('.myshopify.com')) {
      console.error('❌ [CallbackProxy] 無効なショップドメイン:', shop);
      
      const frontendUrl = getFrontendUrl(request);
      const errorUrl = new URL('/auth/error', frontendUrl);
      errorUrl.searchParams.set('message', 'Invalid shop domain');
      errorUrl.searchParams.set('shop', shop);
      errorUrl.searchParams.set('error_code', 'INVALID_SHOP');
      
      return NextResponse.redirect(errorUrl);
    }

    // 環境設定からバックエンドAPIのURLを取得
    let backendUrl: string;
    try {
      backendUrl = getBackendApiUrl();
    } catch (error) {
      console.error('❌ [CallbackProxy] バックエンドURL取得エラー:', error);
      
      const frontendUrl = getFrontendUrl(request);
      const errorUrl = new URL('/auth/error', frontendUrl);
      errorUrl.searchParams.set('message', 'Backend configuration error');
      errorUrl.searchParams.set('shop', shop);
      errorUrl.searchParams.set('error_code', 'CONFIG_ERROR');
      
      return NextResponse.redirect(errorUrl);
    }
    
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.log('🔧 [CallbackProxy] 環境設定:', {
      backendUrl,
      isDevelopment,
      nodeEnv: process.env.NODE_ENV
    });

    // バックエンドへの転送URLを構築
    const backendCallbackUrl = `${backendUrl}/api/shopify/callback`;
    const backendParams = new URLSearchParams(allParams);
    const fullBackendUrl = `${backendCallbackUrl}?${backendParams.toString()}`;

    console.log('📤 [CallbackProxy] バックエンドへ転送:', {
      url: backendCallbackUrl,
      paramCount: Object.keys(allParams).length,
      method: 'GET'
    });

    // バックエンドAPIを呼び出し
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || '',
        'X-Forwarded-Host': request.headers.get('host') || '',
        'X-Original-URL': request.url,
        'User-Agent': request.headers.get('user-agent') || 'Shopify-OAuth-Callback',
      },
      redirect: 'manual' // リダイレクトを手動で処理
    };

    const backendResponse = await callBackendApi(
      fullBackendUrl, 
      fetchOptions, 
      isDevelopment
    );

    const responseTime = Date.now() - startTime;
    console.log('📡 [CallbackProxy] バックエンド応答:', {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      responseTime: `${responseTime}ms`,
      headers: {
        contentType: backendResponse.headers.get('content-type'),
        location: backendResponse.headers.get('location')
      }
    });

    // リダイレクトレスポンスの処理
    if (backendResponse.status >= 300 && backendResponse.status < 400) {
      const location = backendResponse.headers.get('location');
      if (location) {
        console.log('↪️ [CallbackProxy] バックエンドからのリダイレクト:', location);
        return NextResponse.redirect(location);
      }
    }

    // 成功レスポンスの処理
    if (backendResponse.ok) {
      const frontendUrl = getFrontendUrl(request);
      const successUrl = new URL('/auth/success', frontendUrl);
      successUrl.searchParams.set('shop', shop);
      successUrl.searchParams.set('state', state);
      
      // バックエンドからの追加情報があれば含める
      try {
        const responseData = await backendResponse.json();
        if (responseData.success) {
          console.log('✅ [CallbackProxy] 認証成功:', {
            shop,
            redirectTo: successUrl.toString()
          });
        }
      } catch {
        // JSONパースエラーは無視（レスポンスがJSONでない場合）
      }
      
      return NextResponse.redirect(successUrl);
    }

    // エラーレスポンスの処理
    let errorMessage = 'Authentication failed';
    let errorDetails = {};
    
    try {
      const errorData = await backendResponse.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorDetails = errorData;
    } catch {
      try {
        errorMessage = await backendResponse.text();
      } catch {
        // レスポンスボディの読み取りに失敗
      }
    }

    console.error('❌ [CallbackProxy] バックエンドエラー:', {
      status: backendResponse.status,
      message: errorMessage,
      details: errorDetails
    });
    
    const frontendUrl = getFrontendUrl(request);
    const errorUrl = new URL('/auth/error', frontendUrl);
    errorUrl.searchParams.set('message', errorMessage);
    errorUrl.searchParams.set('shop', shop);
    errorUrl.searchParams.set('error_code', `BACKEND_${backendResponse.status}`);
    
    return NextResponse.redirect(errorUrl);

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ [CallbackProxy] コールバック処理エラー:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${errorTime}ms`
    });
    
    // エラーの種類に応じた処理
    let errorMessage = 'Unexpected error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Backend service unavailable';
        errorCode = 'BACKEND_UNAVAILABLE';
      } else if (error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Request timeout';
        errorCode = 'TIMEOUT';
      } else if (error.message.includes('certificate')) {
        errorMessage = 'SSL certificate error';
        errorCode = 'SSL_ERROR';
      } else if (error.name === 'ConfigurationError') {
        errorMessage = error.message;
        errorCode = 'CONFIG_ERROR';
      }
    }
    
    // エラーページへリダイレクト
    try {
      const frontendUrl = getFrontendUrl(request);
      const errorUrl = new URL('/auth/error', frontendUrl);
      errorUrl.searchParams.set('message', errorMessage);
      errorUrl.searchParams.set('error_code', errorCode);
      
      // shopパラメータがあれば含める
      const { searchParams } = new URL(request.url);
      const shop = searchParams.get('shop');
      if (shop) {
        errorUrl.searchParams.set('shop', shop);
      }
      
      return NextResponse.redirect(errorUrl);
    } catch (hostError) {
      // 最終的なフォールバック: JSONエラーレスポンス
      console.error('❌ [CallbackProxy] 最終エラーハンドリング中のホスト取得エラー:', hostError);
      
      const { searchParams } = new URL(request.url);
      return NextResponse.json({
        error: 'Critical configuration error',
        message: 'Application is not properly configured',
        details: {
          originalError: errorMessage,
          originalErrorCode: errorCode,
          hostError: hostError instanceof Error ? hostError.message : 'Unknown error',
          shop: searchParams.get('shop'),
          recommendation: 'Please check environment configuration and ensure NEXT_PUBLIC_API_URL is set'
        }
      }, { status: 500 });
    }
  }
}
