'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Page, Spinner, Banner } from '@shopify/polaris';
import { authApi } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const shop = searchParams.get('shop');
      const state = searchParams.get('state');

      if (!code || !shop || !state) {
        setError('Missing required parameters');
        return;
      }

      // Process OAuth callback
      const response = await authApi.callback(code, shop, state);

      // Store token and shop information
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('shop', JSON.stringify(response.shop));
      }

      // Redirect to dashboard
      router.push('/');
    } catch (error: any) {
      console.error('Auth callback error:', error);
      setError(error.message || 'Authentication failed');
    }
  };

  if (error) {
    return (
      <Page title="Authentication Error">
        <Card>
          <Banner tone="critical">
            <p>{error}</p>
          </Banner>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <a href="/">Return to home</a>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Authenticating...">
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem' }}>
          <Spinner accessibilityLabel="Authenticating" size="large" />
          <p style={{ marginTop: '1rem' }}>Please wait while we authenticate your shop...</p>
        </div>
      </Card>
    </Page>
  );
}