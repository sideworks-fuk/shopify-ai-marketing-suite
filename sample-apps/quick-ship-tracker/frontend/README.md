# Quick Ship Tracker - Frontend

Quick Ship Trackerのフロントエンドアプリケーションです。Shopify Polarisを使用した、レスポンシブでモダンなUIを提供します。

## 技術スタック

- **Framework**: Next.js 14 (App Router)
- **UI Library**: Shopify Polaris v13
- **Language**: TypeScript
- **State Management**: React Hooks + SWR
- **API Client**: Axios
- **Styling**: Polaris Design System

## セットアップ

### 1. 環境変数の設定

`.env.local.example`をコピーして`.env.local`を作成し、必要な値を設定してください：

```bash
cp .env.local.example .env.local
```

### 2. 依存関係のインストール

```bash
npm install --legacy-peer-deps
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは[http://localhost:3000](http://localhost:3000)で起動します。

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # ダッシュボード
│   ├── orders/            # 注文管理
│   │   ├── page.tsx       # 注文一覧
│   │   └── [id]/
│   │       └── page.tsx   # 注文詳細
│   ├── billing/           # 課金管理
│   │   └── page.tsx       # プラン選択
│   ├── settings/          # 設定
│   │   └── page.tsx       # アプリ設定
│   └── auth/              # 認証
│       └── callback/
│           └── page.tsx   # OAuth callback
├── components/            # 再利用可能なコンポーネント
│   ├── layout/            # レイアウトコンポーネント
│   │   └── Navigation.tsx # ナビゲーション
│   └── providers/         # Provider components
│       ├── ShopifyProvider.tsx    # Polaris Provider
│       └── AppBridgeProvider.tsx  # App Bridge Provider
└── lib/                   # ユーティリティ
    └── api.ts            # API client

```

## 主な機能

### ダッシュボード（/）
- 注文統計の表示
- 最近の注文一覧
- 月間使用量の表示
- プラン制限のアラート

### 注文管理（/orders）
- 注文一覧の表示
- フィルタリング（ステータス、検索）
- 注文詳細の表示
- トラッキング番号の登録・編集・削除

### 課金管理（/billing）
- 現在のプランと使用状況
- プラン一覧と比較
- プランのアップグレード・ダウングレード
- 使用量の可視化

### 設定（/settings）
- 通知設定
- デフォルトキャリア設定
- API設定（Webhook、APIキー）
- プライバシー設定

## API統合

すべてのAPI通信は`/src/lib/api.ts`で管理されています：

- **認証API**: OAuth、ログイン/ログアウト
- **注文API**: 注文の取得、検索
- **トラッキングAPI**: トラッキング情報のCRUD操作
- **課金API**: プラン管理、使用状況取得

## Shopify App Bridge統合

App Bridgeは条件付きで初期化されます：
- Shopifyの管理画面内で実行される場合：App Bridgeを使用
- スタンドアロンで実行される場合：通常のReactアプリとして動作

## 開発のヒント

### Polarisコンポーネントの使用

```typescript
import { Page, Card, Text } from '@shopify/polaris';

export default function MyComponent() {
  return (
    <Page title="Page Title">
      <Card>
        <Text as="h2" variant="headingMd">
          Card Title
        </Text>
      </Card>
    </Page>
  );
}
```

### API呼び出しの例

```typescript
import { ordersApi } from '@/lib/api';

// 注文一覧の取得
const orders = await ordersApi.getOrders({
  page: 1,
  limit: 50,
  status: 'pending'
});
```

## ビルドとデプロイ

### プロダクションビルド

```bash
npm run build
```

### プロダクション実行

```bash
npm start
```

## トラブルシューティング

### React 19とPolarisの互換性

Polaris v13はReact 18を要求しますが、Next.js 15はReact 19を使用します。
`--legacy-peer-deps`フラグを使用してインストールしてください。

### CORS エラー

開発環境でCORSエラーが発生する場合は、バックエンドAPIのCORS設定を確認してください。

## ライセンス

このプロジェクトはプライベートライセンスです。