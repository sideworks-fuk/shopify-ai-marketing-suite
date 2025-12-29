'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppBridge } from '@/lib/shopify/app-bridge-provider';
import { Redirect } from '@shopify/app-bridge/actions';

/**
 * ExitIframeページ
 * 
 * Shopify公式ドキュメントに基づく埋め込みアプリのiframe脱出処理
 * 
 * @description
 * - embedded=1の場合、このページでApp BridgeのRedirect.toApp()を使用してiframeから脱出
 * - その後、バックエンドの/api/shopify/installにリダイレクト
 * 
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
 */
export default function ExitIframePage() {
  const searchParams = useSearchParams();
  const { app } = useAppBridge();
  const [error, setError] = useState<string | null>(null);
  const redirectUri = searchParams?.get('redirectUri');
  
  // 🆕 リダイレクト済みフラグ（重複実行を防ぐ）
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // 🆕 既にリダイレクト済みの場合は早期リターン
    if (hasRedirectedRef.current) {
      console.log('⏸️ [ExitIframe] 既にリダイレクト済みのため、スキップします');
      return;
    }
    // redirectUriが取得されるまで少し待機（URLパラメータの読み込みを待つ）
    if (!redirectUri) {
      // redirectUriがない場合、/installページに自動リダイレクト（エラー画面を表示しない）
      console.warn('⚠️ [ExitIframe] redirectUriパラメータがありません。/installページにリダイレクトします。');
      
      // 現在のURLパラメータ（shop, host等）を保持して/installページにリダイレクト
      const currentParams = new URLSearchParams(window.location.search);
      const shop = currentParams.get('shop');
      const host = currentParams.get('host');
      const embedded = currentParams.get('embedded');
      
      // /installページへのリダイレクトURLを構築
      const installUrl = new URL('/install', window.location.origin);
      if (shop) installUrl.searchParams.set('shop', shop);
      if (host) installUrl.searchParams.set('host', host);
      if (embedded) installUrl.searchParams.set('embedded', embedded);
      
      console.log('🔄 [ExitIframe] /installページにリダイレクト:', installUrl.toString());
      
      // トップフレームにリダイレクト（iframeから脱出）
      try {
        window.top!.location.href = installUrl.toString();
      } catch (e) {
        // window.topにアクセスできない場合（既にトップフレームの場合）
        window.location.href = installUrl.toString();
      }
      return;
    }

    console.log('🖼️ [ExitIframe] iframe脱出処理を開始');
    console.log('📍 [ExitIframe] リダイレクト先:', redirectUri);
    console.log('🔍 [ExitIframe] redirectUriの種類:', redirectUri?.startsWith('http') ? '外部URL' : '相対パス');

    // 🆕 リダイレクト実行前にフラグを設定（重複実行を防ぐ）
    hasRedirectedRef.current = true;

    try {
      // redirectUriが外部URL（http:// または https://）の場合
      // App BridgeのRedirect.toApp()はアプリ内のパス（相対パス）を想定しているため、
      // 外部URLの場合はwindow.top.location.hrefでトップフレーム全体をリダイレクトする
      // 注意: window.location.hrefではiframe内でしか動作しないため、Shopify OAuthが失敗する
      if (redirectUri && (redirectUri.startsWith('http://') || redirectUri.startsWith('https://'))) {
        console.log('🌐 [ExitIframe] 外部URLを検出: トップフレームにリダイレクト');
        console.log('🔄 [ExitIframe] window.top.location.hrefに設定:', redirectUri);
        
        // 外部URLの場合はトップフレーム全体をリダイレクト（iframeから脱出）
        // App Bridgeが利用できない場合でも、外部URLへのリダイレクトは可能
        window.top!.location.href = redirectUri;
        console.log('✅ [ExitIframe] トップフレームへのリダイレクトを実行しました');
      } else {
        // 相対パスの場合、App Bridgeを使用してiframeから脱出
        // Shopify公式ドキュメントに基づく実装:
        // App BridgeのRedirect.toApp()を使用してリダイレクト
        // これによりiframeから脱出できる
        if (!app) {
          console.warn('⚠️ [ExitIframe] App Bridgeが利用できません。外部URLとして扱い、トップフレームにリダイレクトします。');
          
          // App Bridgeが利用できない場合、相対パスを絶対URLに変換してトップフレームにリダイレクト
          const absoluteUrl = new URL(redirectUri, window.location.origin).toString();
          console.log('🔄 [ExitIframe] 絶対URLに変換:', absoluteUrl);
          
          try {
            window.top!.location.href = absoluteUrl;
            console.log('✅ [ExitIframe] トップフレームへのリダイレクトを実行しました（App Bridgeなし）');
          } catch (fallbackError) {
            console.error('❌ [ExitIframe] フォールバックリダイレクトも失敗:', fallbackError);
            // 最終的なフォールバック: /installページにリダイレクト
            const currentParams = new URLSearchParams(window.location.search);
            const shop = currentParams.get('shop');
            const installUrl = new URL('/install', window.location.origin);
            if (shop) installUrl.searchParams.set('shop', shop);
            window.top!.location.href = installUrl.toString();
          }
          return;
        }
        
        console.log('🔄 [ExitIframe] 相対パスを検出: App Bridgeを使用してリダイレクト');
        console.log('🔄 [ExitIframe] App Bridge Redirect.toApp()を実行...');
        
        app.dispatch(Redirect.toApp({ path: redirectUri }));
        console.log('✅ [ExitIframe] App Bridgeリダイレクトを実行しました（iframe脱出）');
      }
    } catch (error) {
      // 🆕 エラー時はフラグをリセット（リトライ可能に）
      hasRedirectedRef.current = false;
      
      console.error('❌ [ExitIframe] リダイレクトに失敗:', error);
      console.error('❌ [ExitIframe] エラー詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'N/A',
        redirectUri,
        isExternalUrl: redirectUri?.startsWith('http'),
      });
      
      // フォールバック: 外部URLの場合はトップフレームにリダイレクトを試行
      if (redirectUri && (redirectUri.startsWith('http://') || redirectUri.startsWith('https://'))) {
        console.warn('⚠️ [ExitIframe] フォールバック: トップフレームにリダイレクトを試行');
        try {
          hasRedirectedRef.current = true; // フォールバック実行前にフラグを再設定
          window.top!.location.href = redirectUri;
        } catch (fallbackError) {
          hasRedirectedRef.current = false; // フォールバックも失敗した場合はフラグをリセット
          console.error('❌ [ExitIframe] フォールバックリダイレクトも失敗:', fallbackError);
          setError('リダイレクトに失敗しました。ブラウザのコンソールを確認してください。');
        }
      } else {
        setError('リダイレクトに失敗しました。もう一度お試しください。');
      }
    }
  }, [app, redirectUri]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">認証画面へ移動中...</p>
        <p className="text-gray-400 text-sm mt-2">EC Ranger</p>
      </div>
    </div>
  );
}
