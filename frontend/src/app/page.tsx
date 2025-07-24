"use client"

export default function HomePage() {
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0;url=/dev-bookmarks/" />
        <title>リダイレクト中...</title>
      </head>
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `
            // 即座にリダイレクト
            window.location.replace("/dev-bookmarks/");
          `
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: '16px', color: '#6b7280' }}>リダイレクト中...</p>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </body>
    </html>
  )
}
