'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  List,
  BlockStack,
  Box,
  InlineStack,
  ProgressBar,
  Modal,
} from '@shopify/polaris';
import { getCurrentEnvironmentConfig } from '@/lib/config/environments';
import { useIsEmbedded } from '@/hooks/useIsEmbedded';

/**
 * Shopifyアプリ接続ページ（Polaris版）
 * 
 * @author YUKI
 * @date 2025-07-29
 * @updated 2025-08-01
 * @description Shopify OAuth認証フローの開始ページ（エラーハンドリング強化版）
 * - A案: Shopify Admin(embedded) から起動された場合は shop を自動入力し、登録済みなら通常画面へ遷移
 */
export default function InstallPolarisPage() {
  const [shopDomain, setShopDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{title: string, message: string}>({title: '', message: ''});
  const [shopDomainLocked, setShopDomainLocked] = useState(false);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const isEmbedded = useIsEmbedded();

  const normalizeShopDomain = useCallback((value: string): string => {
    const v = value.trim().toLowerCase();
    if (!v) return '';
    if (v.endsWith('.myshopify.com')) return v;
    // 既存UIはサブドメイン入力想定のため
    return `${v}.myshopify.com`;
  }, []);

  const toSubdomainInput = useCallback((fullDomain: string): string => {
    const v = fullDomain.trim().toLowerCase();
    return v.endsWith('.myshopify.com') ? v.replace('.myshopify.com', '') : v;
  }, []);

  // Shopify Admin からの起動時、shop を自動入力し、登録済みなら通常画面へ遷移
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get('shop');
    if (!shopFromUrl) return;

    const normalizedShop = normalizeShopDomain(shopFromUrl);
    setShopDomain(toSubdomainInput(normalizedShop));
    setShopDomainLocked(true);

    // 登録済みか判定して通常画面へ
    const checkAndRedirect = async () => {
      try {
        const config = getCurrentEnvironmentConfig();
        const response = await fetch(`${config.apiBaseUrl}/api/store`);
        if (!response.ok) return;

        const result: unknown = await response.json();
        const stores = (result as any)?.data?.stores as any[] | undefined;
        if (!Array.isArray(stores)) return;

        const matched = stores.find((s) => {
          const candidate = (s?.shopDomain || s?.domain || s?.ShopDomain || s?.Domain || '').toString().toLowerCase();
          if (!candidate) return false;
          const candNorm = normalizeShopDomain(candidate);
          return candNorm === normalizedShop;
        });

        if (!matched?.id) return;

        // StoreId を保存（既存ロジックは currentStoreId を参照）
        localStorage.setItem('currentStoreId', String(matched.id));
        localStorage.setItem('shopDomain', normalizedShop);

        setAutoRedirecting(true);

        // host / embedded / shop 等のクエリを維持して通常画面へ
        const targetPath = '/customers/dormant';
        window.location.replace(`${targetPath}?${params.toString()}`);
      } catch {
        // 失敗時は接続画面を表示（ユーザーが手動で進められるように）
      }
    };

    void checkAndRedirect();
  }, [normalizeShopDomain, toSubdomainInput]);

  // URLパラメータからエラー情報を取得
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (errorParam) {
      let title = '接続エラー';
      let message = '接続中に問題が発生しました。';
      
      // エラータイプに応じたメッセージ設定
      switch (errorParam) {
        case 'access_denied':
          title = 'アクセス拒否';
          message = 'アプリへのアクセスが拒否されました。アプリをインストールするには、必要な権限を承認してください。';
          break;
        case 'invalid_shop':
          title = '無効なストア';
          message = '指定されたストアが見つかりません。正しいストアドメインを入力してください。';
          break;
        case 'invalid_request':
          title = '無効なリクエスト';
          message = 'リクエストに問題があります。もう一度お試しください。';
          break;
        default:
          if (errorDescription) {
            message = errorDescription;
          }
      }
      
      setErrorDetails({ title, message });
      setShowErrorModal(true);
    }
  }, []);

  const handleShopDomainChange = useCallback((value: string) => {
    setShopDomain(value.toLowerCase());
    setError('');
  }, []);

  const validateShopDomain = (domain: string): boolean => {
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    return pattern.test(domain);
  };

  const simulateProgress = () => {
    setInstallProgress(0);
    const interval = setInterval(() => {
      setInstallProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleInstall = useCallback(async () => {
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
    simulateProgress();

    try {
      // .myshopify.comを自動補完
      const fullDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      console.log('🚀 Shopify接続開始:', fullDomain);

      // 環境設定からAPI URLを取得
      const config = getCurrentEnvironmentConfig();
      
      // API Keyを環境変数から取得（マルチアプリ対応）
      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
      
      // フロントエンドのコールバックAPIを使用（ハイブリッド方式）
      // apiKeyパラメータを追加（バックエンドでShopifyAppsテーブルから対応するアプリを検索するため）
      const installUrlParams = new URLSearchParams({
        shop: fullDomain,
        redirect_uri: `${window.location.origin}/api/shopify/callback`,
      });
      
      // API Keyが設定されている場合は追加
      if (apiKey) {
        installUrlParams.append('apiKey', apiKey);
      }
      
      const installUrl = `${config.apiBaseUrl}/api/shopify/install?${installUrlParams.toString()}`;
      
      // デバッグ情報をログ出力（リダイレクト前に必ず表示されるように）
      const debugInfo = {
        apiKey: apiKey || '未設定',
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : '未設定',
        origin: window.location.origin,
        installUrl,
        callbackUrl: `${window.location.origin}/api/shopify/callback`,
        environment: config.name,
        isEmbedded,
      };
      
      console.log('🔍 ===== OAuth開始デバッグ情報 =====');
      console.log('🔑 API Key (完全):', debugInfo.apiKey);
      console.log('🔑 API Key (プレビュー):', debugInfo.apiKeyPreview);
      console.log('🌐 現在のオリジン:', debugInfo.origin);
      console.log('📍 リダイレクト先:', debugInfo.installUrl);
      console.log('🔄 コールバックURL:', debugInfo.callbackUrl);
      console.log('🌍 現在の環境:', debugInfo.environment);
      console.log('🖼️ 埋め込みモード:', debugInfo.isEmbedded);
      console.log('🔍 ================================');
      
      // localStorageにも保存（エラー画面から戻ってきた時に確認できる）
      try {
        localStorage.setItem('oauth_debug_info', JSON.stringify(debugInfo));
      } catch (e) {
        console.warn('⚠️ localStorageへの保存に失敗:', e);
      }
      
      // 埋め込みアプリ内かどうかを判定
      const isInIframe = typeof window !== 'undefined' && window.top !== window.self;
      
      // リダイレクト前に少し待つ（Consoleログが表示される時間を確保）
      setTimeout(() => {
        if (isEmbedded || isInIframe) {
          // 埋め込みアプリ内の場合、トップレベルウィンドウでリダイレクト
          // OAuth認証はトップレベルで実行する必要があるため
          console.log('🖼️ 埋め込みアプリ内でリダイレクト: トップレベルウィンドウを使用');
          if (window.top) {
            window.top.location.href = installUrl;
          } else {
            // フォールバック: 通常のリダイレクト
            console.warn('⚠️ window.topが利用できないため、通常のリダイレクトを使用');
            window.location.href = installUrl;
          }
        } else {
          // 通常のリダイレクト（埋め込みアプリ外）
          console.log('🌐 通常モードでリダイレクト');
          window.location.href = installUrl;
        }
      }, 500); // 500ms待ってからリダイレクト
    } catch (error) {
      console.error('❌ 接続エラー:', error);
      setError('接続処理中にエラーが発生しました。もう一度お試しください。');
      setLoading(false);
      setInstallProgress(0);
    }
  }, [shopDomain]);

  return (
    <div style={{ backgroundColor: '#F6F6F7', minHeight: '100vh' }}>
      <Box padding="800">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Page narrowWidth>
            <BlockStack gap="800">
              <div style={{ textAlign: 'center' }}>
                <Box padding="400">
                  <InlineStack align="center" blockAlign="center" gap="400">
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      backgroundColor: '#008060',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                      <path d="M21 4H7a2 2 0 0 0-2 2v2.5h0v6h0V20l6-1.5 6 1.5v-5.5h0v-6h0V6a2 2 0 0 0-2-2m-1 11.5c0 .5-.5 1-1 1s-1-.5-1-1V15h-2v.5c0 .5-.5 1-1 1s-1-.5-1-1V15h-2v.5c0 .5-.5 1-1 1s-1-.5-1-1V15H8v.5c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v6.5M4 6H3v14h1c.6 0 1-.4 1-1V7c0-.6-.4-1-1-1z"/>
                    </svg>
                    </div>
                  </InlineStack>
                </Box>
                <Text as="h1" variant="heading2xl">
                  EC Ranger
                </Text>
                <Box paddingBlockStart="200">
                  <Text as="p" variant="bodyLg" tone="subdued">
                    Shopifyストアの売上を最大化する分析ツール
                  </Text>
                </Box>
              </div>

              <Card>
                <BlockStack gap="400">
                  <FormLayout>
                    <TextField
                      label="ストアドメイン"
                      type="text"
                      value={shopDomain}
                      onChange={handleShopDomainChange}
                      placeholder="your-store"
                      suffix=".myshopify.com"
                      autoComplete="off"
                      disabled={loading || shopDomainLocked || autoRedirecting}
                      error={error}
                      helpText="例: your-store-name（.myshopify.comは自動で追加されます）"
                    />
                  </FormLayout>

                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleInstall}
                    loading={loading}
                    disabled={!shopDomain.trim() || autoRedirecting}
                  >
                    {loading ? '接続中...' : 'Shopifyに接続'}
                  </Button>

                  {loading && (
                    <Box paddingBlockStart="400">
                      <ProgressBar progress={installProgress} size="small" />
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                          Shopifyストアに接続中...
                        </Text>
                      </Box>
                    </Box>
                  )}

                  {autoRedirecting && (
                    <Box paddingBlockStart="400">
                      <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                        登録済みストアを検出しました。通常画面へ移動しています...
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    このアプリでできること
                  </Text>
                  <List type="bullet">
                    <List.Item>売上データのAI分析</List.Item>
                    <List.Item>顧客行動の詳細な分析</List.Item>
                    <List.Item>商品パフォーマンスの可視化</List.Item>
                    <List.Item>マーケティング施策の最適化提案</List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <Banner
                  title="必要な権限"
                  tone="info"
                >
                  <p>
                    このアプリは以下のデータへのアクセス権限を必要とします：
                  </p>
                  <List type="bullet">
                    <List.Item>注文情報の読み取り</List.Item>
                    <List.Item>商品情報の読み取り</List.Item>
                    <List.Item>顧客情報の読み取り</List.Item>
                  </List>
                </Banner>
              </Card>

              <div style={{ textAlign: 'center' }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  接続することで、
                  <a 
                    href="https://www.access-net.co.jp/shopify/terms.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#006BE5', textDecoration: 'underline' }}
                  > 利用規約 </a>
                  と
                  <a 
                    href="https://www.access-net.co.jp/shopify/data-processing-agreement.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#006BE5', textDecoration: 'underline' }}
                  > データ処理契約 </a>
                  に同意したものとみなされます。
                </Text>
              </div>

              {/* 開発環境でのデバッグ情報 */}
              {process.env.NODE_ENV === 'development' && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      デバッグ情報（開発環境のみ）
                    </Text>
                    <div style={{ 
                      backgroundColor: '#f6f6f7', 
                      padding: '12px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      <div>環境: {getCurrentEnvironmentConfig().name}</div>
                      <div>API URL: {getCurrentEnvironmentConfig().apiBaseUrl}</div>
                      <div>入力値: {shopDomain || '(未入力)'}</div>
                      <div>検証結果: {shopDomain ? (validateShopDomain(shopDomain) ? '✅ 有効' : '❌ 無効') : '未検証'}</div>
                    </div>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Page>
        </div>
      </Box>

      {/* エラーモーダル */}
      <Modal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorDetails.title}
        primaryAction={{
          content: 'もう一度試す',
          onAction: () => {
            setShowErrorModal(false);
            // URLパラメータをクリア
            window.history.replaceState({}, document.title, window.location.pathname);
          },
        }}
        secondaryActions={[
          {
            content: 'ヘルプを見る',
            onAction: () => {
              window.open('https://help.shopify.com/ja/manual/apps/installing-apps', '_blank');
            },
          },
        ]}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            {errorDetails.message}
          </Text>
        </Modal.Section>
      </Modal>
    </div>
  );
}