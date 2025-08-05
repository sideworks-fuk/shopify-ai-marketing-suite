# Shopifyアプリのナビゲーション実装ガイド

作成日: 2025年8月5日  
作成者: Kenji（AI開発チーム）

## 概要

Shopifyアプリでナビゲーションメニューを実装する際の技術仕様と実装方法について説明します。EC Rangerでの実装例を基に解説します。

## アーキテクチャ

### 1. アプリ内ナビゲーション（現在の実装）

EC Rangerでは、アプリ独自のナビゲーションシステムを実装しています。

```
frontend/
├── config/
│   └── menuConfig.ts          # メニュー構成の定義
├── components/
│   └── layout/
│       └── MainLayout.tsx     # メニューのレンダリング
└── app/
    ├── sales/                 # 商品分析
    ├── purchase/              # 購買分析
    ├── customers/             # 顧客分析
    └── setup/                 # 設定
```

### 2. Shopify管理画面との統合（App Bridge）

Shopify App Bridgeを使用することで、Shopifyの管理画面に直接メニューを追加できます。

## 実装詳細

### 1. 現在の実装方法（アプリ内ナビゲーション）

#### menuConfig.ts
```typescript
export const menuCategories = [
  {
    id: 'settings',
    label: '設定',
    icon: '⚙️',
    items: [
      {
        id: 'data-sync',
        href: '/setup/initial',
        label: 'データ同期',
        icon: '🔄',
      }
    ]
  },
  {
    id: 'product-analysis',
    label: '商品分析',
    icon: '📦',
    items: [
      {
        id: 'year-over-year',
        href: '/sales/year-over-year',
        label: '前年同月比分析【商品】',
        icon: '📈',
      }
    ]
  },
  // ... その他のカテゴリ
];
```

#### MainLayout.tsx
```tsx
import { menuCategories } from '@/config/menuConfig';

export default function MainLayout({ children }) {
  return (
    <div className="flex">
      <aside className="w-64 bg-gray-100">
        <nav>
          {menuCategories.map(category => (
            <div key={category.id}>
              <h3>{category.icon} {category.label}</h3>
              <ul>
                {category.items.map(item => (
                  <li key={item.id}>
                    <Link href={item.href}>
                      {item.icon} {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### 2. Shopify App Bridgeを使用した実装（将来的な拡張）

#### App Bridge Navigation API
```typescript
import { NavigationMenu } from '@shopify/app-bridge-react';

function ShopifyNavigation() {
  return (
    <NavigationMenu
      navigationLinks={[
        {
          label: 'データ同期',
          destination: '/setup/initial',
        },
        {
          label: '前年同月比分析',
          destination: '/sales/year-over-year',
        },
        {
          label: '購入回数分析',
          destination: '/purchase/count-analysis',
        },
        {
          label: '休眠顧客分析',
          destination: '/customers/dormant',
        },
      ]}
    />
  );
}
```

#### Shopify管理画面への統合
```typescript
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';

function useShopifyNavigation() {
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  const navigateTo = (path: string) => {
    redirect.dispatch(Redirect.Action.APP, path);
  };

  return { navigateTo };
}
```

## メニュー追加の仕組み

### 1. データ駆動型アプローチ

EC Rangerでは、メニュー構成を`menuConfig.ts`で一元管理しています。

**メリット**:
- メニューの追加・変更が容易
- 一箇所の修正で全体に反映
- TypeScriptによる型安全性

### 2. カテゴリ分け

メニューは機能別にカテゴリ分けされています：

```
⚙️ 設定
  └── 🔄 データ同期
📦 商品分析
  └── 📈 前年同月比分析【商品】
🛍️ 購買分析
  └── 🛒 購入回数分析【購買】
👥 顧客分析
  └── 👤 休眠顧客分析【顧客】
```

### 3. ルーティング構造

ルーティングは機能別に整理されています：

- `/sales/*` - 商品・売上関連
- `/purchase/*` - 購買・注文関連
- `/customers/*` - 顧客関連
- `/setup/*` - 設定・初期設定関連

## ベストプラクティス

### 1. アイコンの使用
- 視覚的な識別を容易にする
- カテゴリごとに統一感のあるアイコンを使用

### 2. ラベルの命名規則
- 機能を明確に表現する
- 【】でカテゴリを明示（例：【商品】【購買】【顧客】）

### 3. パスの設計
- RESTfulな命名規則に従う
- 機能別にグループ化
- 深すぎない階層構造

### 4. アクセシビリティ
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 適切なaria-label設定

## トラブルシューティング

### よくある問題

1. **メニューが表示されない**
   - menuConfig.tsの構文エラーをチェック
   - MainLayout.tsxがページで使用されているか確認

2. **リンクが機能しない**
   - ルーティングパスが正しいか確認
   - 対象ページが存在するか確認

3. **App Bridgeエラー**
   - Shopify環境でのみ動作することを確認
   - 適切な権限が設定されているか確認

## 今後の拡張予定

### 1. 動的メニュー
- ユーザーの権限に基づくメニュー表示
- 利用可能な機能に応じた動的生成

### 2. Shopify管理画面への完全統合
- App Bridge Navigation APIの活用
- Shopifyネイティブな操作感の実現

### 3. モバイル対応
- レスポンシブなメニューデザイン
- タッチ操作に最適化されたUI

## 参考資料

- [Shopify App Bridge Documentation](https://shopify.dev/docs/apps/tools/app-bridge)
- [Shopify Navigation Guidelines](https://shopify.dev/docs/apps/design-guidelines/navigation)
- [Next.js Routing Documentation](https://nextjs.org/docs/app/building-your-application/routing)

---

最終更新: 2025年8月5日  
管理者: Kenji（AI開発チーム）