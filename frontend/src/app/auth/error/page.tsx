'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

/**
 * 認証エラーページ
 * 
 * @author YUKI
 * @date 2025-07-31
 * @description Shopify OAuth認証エラー時の表示ページ
 */
export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('認証エラーが発生しました');

  useEffect(() => {
    const message = searchParams.get('message');
    const shop = searchParams.get('shop');

    if (message) {
      setErrorMessage(decodeURIComponent(message));
    }

    console.log('❌ 認証エラーページ表示:', { message, shop });
  }, [searchParams]);

  const handleRetry = () => {
    const shop = searchParams.get('shop');
    if (shop) {
      // 同じストアで再インストール
      router.push(`/install?shop=${encodeURIComponent(shop)}`);
    } else {
      // インストールページに戻る
      router.push('/install');
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {/* エラーアイコン */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>

          {/* エラータイトル */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            認証エラー
          </h2>

          {/* エラーメッセージ */}
          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>

          {/* デバッグ情報（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md text-left">
              <h3 className="text-sm font-medium text-gray-700 mb-2">デバッグ情報:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>ショップ: {searchParams.get('shop') || '不明'}</div>
                <div>エラー: {searchParams.get('message') || '不明'}</div>
                <div>タイムスタンプ: {new Date().toISOString()}</div>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              再試行
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full py-3 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ホームに戻る
            </button>
          </div>

          {/* ヘルプ情報 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              よくある問題と解決方法:
            </h3>
            <ul className="text-xs text-gray-600 space-y-1 text-left">
              <li>• ブラウザのキャッシュをクリアしてください</li>
              <li>• 別のブラウザで試してください</li>
              <li>• ネットワーク接続を確認してください</li>
              <li>• 問題が続く場合は管理者にお問い合わせください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 