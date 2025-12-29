import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/config/validation';

/**
 * Shopify OAuthインストール開始API Route（ngrok対応版）
 * 
 * @description Shopify OAuth認証の開始処理（フロントエンドプロキシ方式）
 * 
 * 処理フロー:
 * 1. フロントエンドのngrok URL経由でリクエストが来る
 * 2. フロントエンドがすべてのクエリパラメータをバックエンド（localhost:7088）に転送
 * 3. バックエンドがOAuth URLを生成して302リダイレクトを返す
 * 4. フロントエンドがそのリダイレクトを処理
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
  console.log('📡 [InstallProxy] callBackendApi開始:', { url, isDevelopment });
  
  // 🆕 localhostの場合、最初からHTTPを使用（SSL証明書エラーを回避）
  // Next.jsのサーバーサイドからlocalhostへのアクセスでは、
  // SSL証明書エラーが発生する可能性が高いため、HTTPを優先
  if (url.includes('localhost')) {
    // HTTPSの場合はHTTPに変換
    if (url.startsWith('https://localhost')) {
      const httpUrl = url.replace('https://', 'http://');
      console.log('🔄 [InstallProxy] localhost検出: HTTPS → HTTPに変換', { 
        from: url, 
        to: httpUrl 
      });
      url = httpUrl;
    }
    
    try {
      console.log('📡 [InstallProxy] HTTPでfetch試行:', url);
      return await fetch(url, options);
    } catch (error: any) {
      console.error('❌ [InstallProxy] HTTP fetch失敗:', {
        error: error instanceof Error ? error.message : error,
        cause: error?.cause,
        code: error?.cause?.code,
        url
      });
      throw error;
    }
  }
  
  // ngrok URLまたは本番環境の場合
  try {
    console.log('📡 [InstallProxy] fetch試行:', url);
    return await fetch(url, options);
  } catch (error: any) {
    console.error('❌ [InstallProxy] fetch失敗:', {
      error: error instanceof Error ? error.message : error,
      cause: error?.cause,
      code: error?.cause?.code,
      url
    });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // デバッグ: リクエストが到達したことを確認
  console.log('🚀 [InstallProxy] ===== リクエスト受信 =====');
  console.log('📍 [InstallProxy] リクエストURL:', request.url);
  console.log('📍 [InstallProxy] リクエストメソッド:', request.method);
  console.log('📍 [InstallProxy] リクエスト時刻:', new Date().toISOString());
  
  try {
    const { searchParams } = new URL(request.url);
    
    // すべてのパラメータを取得
    const allParams = getAllQueryParams(searchParams);
    
    // 主要パラメータの抽出
    const shop = allParams.shop;
    const apiKey = allParams.apiKey;

    console.log('🔐 [InstallProxy] Shopify OAuthインストール開始:', {
      shop,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}***` : null,
      totalParams: Object.keys(allParams).length,
      allParamKeys: Object.keys(allParams)
    });

    // 必須パラメータの検証
    if (!shop) {
      console.error('❌ [InstallProxy] shopパラメータが不足');
      
      return NextResponse.json({
        error: 'Missing required parameter: shop',
        message: 'This endpoint requires shop parameter',
        receivedParams: Object.keys(allParams),
        url: request.url,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // ショップドメインの基本検証
    if (!shop.endsWith('.myshopify.com')) {
      console.error('❌ [InstallProxy] 無効なショップドメイン:', shop);
      
      return NextResponse.json({
        error: 'Invalid shop domain',
        message: 'Shop domain must end with .myshopify.com',
        shop,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // 環境設定からバックエンドAPIのURLを取得
    let backendUrl: string;
    try {
      backendUrl = getBackendApiUrl();
    } catch (error) {
      console.error('❌ [InstallProxy] バックエンドURL取得エラー:', error);
      
      return NextResponse.json({
        error: 'Backend configuration error',
        message: 'Failed to get backend URL',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.log('🔧 [InstallProxy] 環境設定:', {
      backendUrl,
      isDevelopment,
      nodeEnv: process.env.NODE_ENV
    });

    // バックエンドへの転送URLを構築
    const backendInstallUrl = `${backendUrl}/api/shopify/install`;
    const backendParams = new URLSearchParams(allParams);
    const fullBackendUrl = `${backendInstallUrl}?${backendParams.toString()}`;

    console.log('📤 [InstallProxy] バックエンドへ転送:', {
      url: backendInstallUrl,
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
        'User-Agent': request.headers.get('user-agent') || 'Shopify-OAuth-Install',
      },
      redirect: 'manual' // リダイレクトを手動で処理
    };

    let backendResponse: Response;
    try {
      console.log('📡 [InstallProxy] バックエンドへのfetch開始:', fullBackendUrl);
      backendResponse = await callBackendApi(
        fullBackendUrl, 
        fetchOptions, 
        isDevelopment
      );
      console.log('✅ [InstallProxy] バックエンドへのfetch成功');
    } catch (fetchError: any) {
      const errorTime = Date.now() - startTime;
      console.error('❌ [InstallProxy] バックエンドへのfetch失敗:', {
        error: fetchError instanceof Error ? fetchError.message : fetchError,
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        cause: fetchError?.cause,
        url: fullBackendUrl,
        responseTime: `${errorTime}ms`
      });
      
      // fetchエラーの詳細を返す
      return NextResponse.json({
        error: 'FETCH_ERROR',
        message: 'Failed to fetch from backend',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
        cause: fetchError?.cause ? String(fetchError.cause) : undefined,
        url: fullBackendUrl,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    console.log('📡 [InstallProxy] バックエンド応答:', {
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
        console.log('↪️ [InstallProxy] バックエンドからのリダイレクト:', location);
        
        // バックエンドからのリダイレクトをそのまま返す
        return NextResponse.redirect(location);
      }
    }

    // エラーレスポンスの処理
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('❌ [InstallProxy] バックエンドエラー:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        body: errorText
      });
      
      return NextResponse.json({
        error: 'Backend error',
        message: `Backend returned ${backendResponse.status}: ${backendResponse.statusText}`,
        details: errorText,
        timestamp: new Date().toISOString()
      }, { status: backendResponse.status });
    }

    // その他のレスポンス（通常は発生しない）
    const responseText = await backendResponse.text();
    console.warn('⚠️ [InstallProxy] 予期しないレスポンス:', {
      status: backendResponse.status,
      body: responseText
    });
    
    return NextResponse.json({
      error: 'Unexpected response',
      message: 'Backend returned an unexpected response',
      status: backendResponse.status,
      body: responseText,
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ [InstallProxy] インストール処理エラー:', {
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
    
    return NextResponse.json({
      error: errorCode,
      message: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
