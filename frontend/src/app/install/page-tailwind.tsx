'use client';

import { useState } from 'react';
import { AlertCircle, Store } from 'lucide-react';

/**
 * Shopifyアプリインストールページ
 * 
 * @author YUKI
 * @date 2025-07-29
 * @description Shopify OAuth認証フローの開始ページ
 */
export default function InstallPage() {
  const [shopDomain, setShopDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateShopDomain = (domain: string): boolean => {
    // 基本的なドメイン検証
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    return pattern.test(domain);
  };

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 入力検証
    if (!shopDomain.trim()) {
      setError('ストアドメインを入力してください');
      return;
    }

    if (!validateShopDomain(shopDomain)) {
      setError('有効なストアドメインを入力してください（例: my-store）');
      return;
    }

    setLoading(true);

    try {
      // .myshopify.comを自動補完
      const fullDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      console.log('🚀 Shopifyインストール開始:', fullDomain);

      // バックエンドの認証エンドポイントへリダイレクト
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5137';
      const installUrl = `${apiUrl}/api/shopify/install?shop=${encodeURIComponent(fullDomain)}`;
      
      console.log('📍 リダイレクト先:', installUrl);
      
      // Shopify OAuth フローへリダイレクト
      window.location.href = installUrl;
    } catch (error) {
      console.error('❌ インストールエラー:', error);
      setError('インストール処理中にエラーが発生しました。もう一度お試しください。');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Store className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Shopify AI Marketing Suite
            </h1>
            <p className="text-gray-600">
              ストアと連携してAI分析を開始しましょう
            </p>
          </div>

          <form onSubmit={handleInstall} className="space-y-6">
            <div>
              <label htmlFor="shop-domain" className="block text-sm font-medium text-gray-700 mb-2">
                ストアドメイン
              </label>
              <div className="relative">
                <div className="flex">
                  <input
                    id="shop-domain"
                    name="shop-domain"
                    type="text"
                    required
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value.toLowerCase())}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="your-store"
                    disabled={loading}
                    autoFocus
                  />
                  <span className="inline-flex items-center px-4 py-3 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm">
                    .myshopify.com
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                例: your-store-name（.myshopify.comは自動で追加されます）
              </p>
            </div>

            {error && (
              <div className="flex items-start space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !shopDomain.trim()}
              className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  インストール中...
                </span>
              ) : (
                'アプリをインストール'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">このアプリでできること：</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>売上データのAI分析</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>顧客行動の詳細な分析</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>商品パフォーマンスの可視化</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>マーケティング施策の最適化提案</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>インストールすることで、</p>
            <p>
              <a href="/terms" className="underline hover:text-gray-700">利用規約</a>
              {' '}と{' '}
              <a href="/privacy" className="underline hover:text-gray-700">プライバシーポリシー</a>
              {' '}に同意したものとみなされます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}