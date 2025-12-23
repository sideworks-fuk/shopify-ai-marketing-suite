import { NextRequest, NextResponse } from 'next/server';
import { getFrontendUrl, getBackendApiUrl, parseUrl } from '@/lib/config/validation';
import https from 'https';

/**
 * Shopify OAuthコールバックAPI Route（SSL問題修正版）
 * 
 * @author YUKI & Kenji
 * @date 2025-08-12
 * @description Shopify OAuth認証後のコールバック処理（開発環境SSL対応）
 */

// Azure Static Web Apps / Next.js ビルド時に静的最適化されないよう明示（request.url / request.headers を使用するため）
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 開発環境用のHTTPSエージェント（SSL証明書検証を無効化）
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * リクエストから正しいホスト名を取得
 */
function getCorrectHost(request: NextRequest): { host: string; protocol: string } {
  const xForwardedHost = request.headers.get('x-forwarded-host');
  const xForwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  
  const host = xForwardedHost || request.headers.get('host');
  
  if (host) {
    console.log('🌐 ホスト情報 (ヘッダーから取得):', {
      xForwardedHost,
      hostHeader: request.headers.get('host'),
      selectedHost: host,
      protocol: xForwardedProto,
      source: xForwardedHost ? 'x-forwarded-host' : 'host-header'
    });
    
    return { host, protocol: xForwardedProto };
  }
  
  try {
    const frontendUrl = getFrontendUrl();
    const { host: configHost, protocol: configProtocol } = parseUrl(frontendUrl);
    
    console.log('🌐 ホスト情報 (環境設定から取得):', {
      frontendUrl,
      host: configHost,
      protocol: configProtocol,
      source: 'env-config'
    });
    
    return { host: configHost, protocol: configProtocol };
  } catch (error) {
    const errorDetails = {
      xForwardedHost,
      hostHeader: request.headers.get('host'),
      nodeEnv: process.env.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    console.error('❌ ホスト名の取得に失敗:', errorDetails);
    
    throw new Error(
      'Failed to determine host. Please check environment configuration. ' +
      `Details: ${JSON.stringify(errorDetails)}`
    );
  }
}

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
 * バックエンドAPIを呼び出す（SSL証明書問題を修正）
 */
async function callBackendApi(
  url: string, 
  options: RequestInit,
  isDevelopment: boolean
): Promise<Response> {
  console.log('📡 バックエンドAPI呼び出し:', {
    url,
    isDevelopment,
    method: options.method
  });

  // 開発環境でlocalhostのHTTPSの場合、SSL証明書検証を無効化
  if (isDevelopment && url.includes('https://localhost')) {
    console.warn('⚠️ 開発環境: SSL証明書検証を無効化');
    
    // Node.js環境変数でSSL証明書検証を無効化
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    try {
      const response = await fetch(url, {
        ...options,
        // @ts-ignore - Node.js環境でのみ有効
        agent: httpsAgent
      });
      
      // 環境変数を元に戻す
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      
      return response;
    } catch (error: any) {
      // 環境変数を元に戻す
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      
      console.error('❌ HTTPS接続エラー:', error.message);
      
      // HTTPへのフォールバック
      if (error.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' || 
          error.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          error.message.includes('certificate') ||
          error.message.includes('fetch failed')) {
        
        console.warn('⚠️ HTTPへフォールバック');
        const httpUrl = url.replace('https://', 'http://').replace(':7088', ':5000');
        console.log('📡 HTTP URL:', httpUrl);
        
        try {
          return await fetch(httpUrl, options);
        } catch (httpError) {
          console.error('❌ HTTPフォールバックも失敗:', httpError);
          throw error; // 元のエラーを投げる
        }
      }
      
      throw error;
    }
  }
  
  // 本番環境または非localhost URLの場合は通常のfetch
  return await fetch(url, options);
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
    const host = allParams.host;

    console.log('🔐 Shopify OAuthコールバック受信:', {
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
      console.error('❌ 必須パラメータが不足:', { 
        code: !!code, 
        shop: !!shop, 
        state: !!state 
      });
      
      try {
        const { host: appHost, protocol } = getCorrectHost(request);
        const errorUrl = new URL('/auth/error', `${protocol}://${appHost}`);
        errorUrl.searchParams.set('message', 'Missing required parameters');
        errorUrl.searchParams.set('shop', shop || 'unknown');
        errorUrl.searchParams.set('error_code', 'MISSING_PARAMS');
        
        return NextResponse.redirect(errorUrl);
      } catch (hostError) {
        console.error('❌ ホスト取得エラー:', hostError);
        return NextResponse.json({
          error: 'Configuration error',
          message: 'Failed to determine application host',
          details: {
            originalError: 'Missing required OAuth parameters',
            hostError: hostError instanceof Error ? hostError.message : 'Unknown error',
            params: { code: !!code, shop: !!shop, state: !!state }
          }
        }, { status: 500 });
      }
    }

    // ショップドメインの基本検証
    if (!shop.endsWith('.myshopify.com')) {
      console.error('❌ 無効なショップドメイン:', shop);
      
      try {
        const { host: appHost, protocol } = getCorrectHost(request);
        const errorUrl = new URL('/auth/error', `${protocol}://${appHost}`);
        errorUrl.searchParams.set('message', 'Invalid shop domain');
        errorUrl.searchParams.set('shop', shop);
        errorUrl.searchParams.set('error_code', 'INVALID_SHOP');
        
        return NextResponse.redirect(errorUrl);
      } catch (hostError) {
        console.error('❌ ホスト取得エラー:', hostError);
        return NextResponse.json({
          error: 'Configuration error',
          message: 'Failed to determine application host',
          details: {
            originalError: 'Invalid shop domain',
            shop,
            hostError: hostError instanceof Error ? hostError.message : 'Unknown error'
          }
        }, { status: 500 });
      }
    }

    // 環境設定からバックエンドAPIのURLを取得
    let backendUrl: string;
    try {
      backendUrl = getBackendApiUrl();
    } catch (error) {
      console.error('❌ バックエンドURL取得エラー:', error);
      
      // デフォルトのバックエンドURLを使用
      backendUrl = process.env.NODE_ENV === 'development' 
        ? 'https://localhost:7088'
        : 'https://your-api.azurewebsites.net';
      
      console.warn('⚠️ デフォルトのバックエンドURLを使用:', backendUrl);
    }
    
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.log('🔧 環境設定:', {
      backendUrl,
      isDevelopment,
      nodeEnv: process.env.NODE_ENV
    });

    // バックエンドへの転送URLを構築
    const backendCallbackUrl = `${backendUrl}/api/shopify/callback`;
    const backendParams = new URLSearchParams(allParams);
    const fullBackendUrl = `${backendCallbackUrl}?${backendParams}`;

    console.log('📤 バックエンドへ転送:', {
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
      redirect: 'manual'
    };

    const backendResponse = await callBackendApi(
      fullBackendUrl, 
      fetchOptions, 
      isDevelopment
    );

    const responseTime = Date.now() - startTime;
    console.log('📡 バックエンド応答:', {
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
        console.log('↪️ バックエンドからのリダイレクト:', location);
        return NextResponse.redirect(location);
      }
    }

    // 成功レスポンスの処理
    if (backendResponse.ok) {
      try {
        const { host: appHost, protocol } = getCorrectHost(request);
        const successUrl = new URL('/auth/success', `${protocol}://${appHost}`);
        successUrl.searchParams.set('shop', shop);
        successUrl.searchParams.set('state', state);
        
        // バックエンドからの追加情報があれば含める
        try {
          const responseData = await backendResponse.json();
          if (responseData.success) {
            console.log('✅ 認証成功:', {
              shop,
              redirectTo: successUrl.toString()
            });
          }
        } catch {
          // JSONパースエラーは無視（レスポンスがJSONでない場合）
        }
        
        return NextResponse.redirect(successUrl);
      } catch (hostError) {
        console.error('❌ 成功処理中のホスト取得エラー:', hostError);
        return NextResponse.json({
          success: true,
          message: 'Authentication successful, but redirect failed',
          shop,
          error: hostError instanceof Error ? hostError.message : 'Unknown error',
          nextStep: 'Please configure frontend URL in environment settings'
        }, { status: 200 });
      }
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

    console.error('❌ バックエンドエラー:', {
      status: backendResponse.status,
      message: errorMessage,
      details: errorDetails
    });
    
    try {
      const { host: appHost, protocol } = getCorrectHost(request);
      const errorUrl = new URL('/auth/error', `${protocol}://${appHost}`);
      errorUrl.searchParams.set('message', errorMessage);
      errorUrl.searchParams.set('shop', shop);
      errorUrl.searchParams.set('error_code', `BACKEND_${backendResponse.status}`);
      
      return NextResponse.redirect(errorUrl);
    } catch (hostError) {
      console.error('❌ エラー処理中のホスト取得エラー:', hostError);
      return NextResponse.json({
        error: 'Multiple errors occurred',
        backendError: {
          status: backendResponse.status,
          message: errorMessage,
          details: errorDetails
        },
        hostError: hostError instanceof Error ? hostError.message : 'Unknown error',
        shop
      }, { status: 500 });
    }

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ コールバック処理エラー:', {
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
      } else if (error.message.includes('certificate') || error.message.includes('fetch failed')) {
        errorMessage = 'SSL certificate error in development';
        errorCode = 'SSL_ERROR';
      } else if (error.name === 'ConfigurationError') {
        errorMessage = error.message;
        errorCode = 'CONFIG_ERROR';
      }
    }
    
    // エラーページへリダイレクト
    try {
      const { host: appHost, protocol } = getCorrectHost(request);
      const errorUrl = new URL('/auth/error', `${protocol}://${appHost}`);
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
      console.error('❌ 最終エラーハンドリング中のホスト取得エラー:', hostError);
      
      const { searchParams } = new URL(request.url);
      return NextResponse.json({
        error: 'Critical configuration error',
        message: 'Application is not properly configured',
        details: {
          originalError: errorMessage,
          originalErrorCode: errorCode,
          hostError: hostError instanceof Error ? hostError.message : 'Unknown error',
          shop: searchParams.get('shop'),
          recommendation: 'Please check environment configuration and ensure FRONTEND_URL is set'
        }
      }, { status: 500 });
    }
  }
}