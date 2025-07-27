'use client';

import React from 'react';
import { getCurrentEnvironment, getCurrentEnvironmentConfig, getEnvironmentDebugInfo } from '@/lib/config/environments';

export default function DebugEnvPage() {
  const [info, setInfo] = React.useState<any>({});
  
  React.useEffect(() => {
    const env = getCurrentEnvironment();
    const config = getCurrentEnvironmentConfig();
    const debug = getEnvironmentDebugInfo();
    
    setInfo({
      environment: env,
      config: config,
      debug: debug,
      urls: {
        currentUrl: window.location.href,
        expectedDevApi: 'https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net',
        actualApi: config.apiBaseUrl,
        isCorrect: config.apiBaseUrl === 'https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net'
      },
      buildInfo: {
        buildId: (window as any).__NEXT_DATA__?.buildId || 'unknown',
        query: (window as any).__NEXT_DATA__?.query || {},
      }
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Debug Information</h1>
      
      <h2>Quick Status</h2>
      <div style={{ 
        padding: '10px', 
        background: info.urls?.isCorrect ? '#d4edda' : '#f8d7da',
        border: '1px solid',
        borderColor: info.urls?.isCorrect ? '#c3e6cb' : '#f5c6cb',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <strong>API Connection: </strong>
        {info.urls?.isCorrect ? '✅ Correct (Development)' : '❌ Incorrect (Production)'}
      </div>

      <h2>Current Environment</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(info.environment, null, 2)}
      </pre>

      <h2>Environment Config</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(info.config, null, 2)}
      </pre>

      <h2>Debug Info</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(info.debug, null, 2)}
      </pre>

      <h2>URLs</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(info.urls, null, 2)}
      </pre>

      <h2>Build Info</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(info.buildInfo, null, 2)}
      </pre>
    </div>
  );
}