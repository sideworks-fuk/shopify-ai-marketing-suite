import { NextRequest, NextResponse } from 'next/server';
import { Agent } from 'https';

/**
 * Shopify OAuthコールバックAPI Route
 * 
 * @author YUKI
 * @date 2025-07-31
 * @description Shopify OAuth認証後のコールバック処理（ハイブリッド方式）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // パラメータの取得
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');
    const timestamp = searchParams.get('timestamp');

    console.log('🔐 Shopify OAuthコールバック受信:', {
      code: code ? '***' : null,
      shop,
      state,
      hmac: hmac ? '***' : null,
      timestamp
    });

    // 必須パラメータの検証
    if (!code || !shop || !state) {
      console.error('❌ 必須パラメータが不足:', { code: !!code, shop: !!shop, state: !!state });
      return NextResponse.redirect(new URL('/auth/error?message=Missing%20required%20parameters', request.url));
    }

    // バックエンドAPIのURLを取得（開発環境ではHTTP接続を推奨）
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:5000';
    const callbackUrl = `${backendUrl}/api/shopify/callback`;

    // バックエンドに処理を委譲（クエリパラメータを追加）
    const params = new URLSearchParams({
      code,
      shop,
      state,
      ...(hmac && { hmac }),
      ...(timestamp && { timestamp })
    });
    
    // 開発環境用のfetch設定（自己署名証明書を無視）
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      }
    };

    // 開発環境では自己署名証明書を無視
    if (process.env.NODE_ENV === 'development' || backendUrl.includes('localhost')) {
      console.warn('⚠️ SSL証明書検証を無効化 (開発環境)');
      
      // 環境変数でSSL証明書検証を無効化（グローバル設定）
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      const httpsAgent = new Agent({
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined // サーバー証明書の検証を完全にスキップ
      });
      
      // TypeScriptの型エラーを回避
      (fetchOptions as any).agent = httpsAgent;
    }

    const backendResponse = await fetch(`${callbackUrl}?${params}`, fetchOptions);

    console.log('📡 バックエンド応答:', {
      status: backendResponse.status,
      statusText: backendResponse.statusText
    });

    // バックエンドの応答を確認
    if (backendResponse.ok) {
      // 成功時: 認証成功ページにリダイレクト
      const successUrl = new URL('/auth/success', request.url);
      successUrl.searchParams.set('shop', shop);
      successUrl.searchParams.set('state', state);
      
      console.log('✅ 認証成功、リダイレクト:', successUrl.toString());
      return NextResponse.redirect(successUrl);
    } else {
      // エラー時: エラーページにリダイレクト
      const errorMessage = await backendResponse.text();
      console.error('❌ バックエンドエラー:', errorMessage);
      
      const errorUrl = new URL('/auth/error', request.url);
      errorUrl.searchParams.set('message', encodeURIComponent('Authentication failed'));
      errorUrl.searchParams.set('shop', shop);
      
      return NextResponse.redirect(errorUrl);
    }

  } catch (error) {
    console.error('❌ コールバック処理エラー:', error);
    
    // SSL証明書エラーの詳細ログ
    if (error instanceof Error && error.message.includes('self-signed certificate')) {
      console.error('🔒 SSL証明書エラー詳細:', {
        error: error.message,
        code: (error as any).code,
        nodeEnv: process.env.NODE_ENV
      });
    }
    
    // 予期しないエラー時
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('message', encodeURIComponent('Unexpected error occurred'));
    
    return NextResponse.redirect(errorUrl);
  }
} 