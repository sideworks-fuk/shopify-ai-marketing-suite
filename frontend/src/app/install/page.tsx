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

/**
 * Shopifyアプリインストールページ（Polaris版）
 * 
 * @author YUKI
 * @date 2025-07-29
 * @updated 2025-08-01
 * @description Shopify OAuth認証フローの開始ページ（エラーハンドリング強化版）
 */
export default function InstallPolarisPage() {
  const [shopDomain, setShopDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{title: string, message: string}>({title: '', message: ''});

  // URLパラメータからエラー情報を取得
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (errorParam) {
      let title = 'インストールエラー';
      let message = 'インストール中に問題が発生しました。';
      
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

      console.log('🚀 Shopifyインストール開始:', fullDomain);

      // 環境設定からAPI URLを取得
      const config = getCurrentEnvironmentConfig();
      // フロントエンドのコールバックAPIを使用（ハイブリッド方式）
      const installUrl = `${config.apiBaseUrl}/api/shopify/install?shop=${encodeURIComponent(fullDomain)}&redirect_uri=${encodeURIComponent(`${window.location.origin}/api/shopify/callback`)}`;
      
      console.log('📍 リダイレクト先:', installUrl);
      console.log('🌍 現在の環境:', config.name);
      console.log('🔄 コールバックURL:', `${window.location.origin}/api/shopify/callback`);
      
      // 少し遅延を入れてUXを向上
      setTimeout(() => {
        window.location.href = installUrl;
      }, 500);
    } catch (error) {
      console.error('❌ インストールエラー:', error);
      setError('インストール処理中にエラーが発生しました。もう一度お試しください。');
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
                      disabled={loading}
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
                    disabled={!shopDomain.trim()}
                  >
                    {loading ? 'インストール中...' : 'アプリをインストール'}
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
                  インストールすることで、
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