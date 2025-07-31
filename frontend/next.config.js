/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // パスエイリアスの明示的な設定
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src')
    }

    // ChunkLoadErrorを防ぐ設定
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          default: {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20
          }
        }
      }

      // チャンク読み込みのリトライ機能
      config.output.chunkLoadTimeout = 30000
    }
    
    return config
  },
  // 実験的機能の設定
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },
  // Azure Static Web Apps 対応（API機能を使用）
  // output: 'export', // 静的エクスポートを無効化（API Route対応のため）
  trailingSlash: true,
  // 静的エクスポート用の設定を削除
  // skipTrailingSlashRedirect: true,
  // skipMiddlewareUrlNormalize: true
}

module.exports = nextConfig
