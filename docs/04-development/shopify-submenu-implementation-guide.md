# Shopify管理画面サブメニュー実装ガイド

作成日: 2025年8月5日  
作成者: Kenji（AI開発チーム）

## 概要

Shopifyの管理画面左メニューに直接サブメニューを表示する方法について説明します。

## 現在の実装状況

### 実装済み ✅
- **アプリ内ナビゲーション**: EC Rangerアプリを開いた後の左側サイドバー
- **実装場所**: `frontend/src/components/layout/MainLayout.tsx`
- **メニュー設定**: `frontend/config/menuConfig.ts`

### 未実装 ❌
- **Shopify管理画面のサブメニュー**: Shopifyの左メニューに直接表示されるサブメニュー

## Shopify管理画面サブメニューの実装方法

### 方法1: App Bridge Navigation（推奨）

#### 必要な実装
```typescript
// frontend/src/components/ShopifyNavigation.tsx
import { NavigationMenu } from '@shopify/app-bridge-react';

export function ShopifyNavigation() {
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
      matcher={(link, location) => link.destination === location.pathname}
    />
  );
}
```

#### App.tsx での統合
```typescript
import { ShopifyNavigation } from './components/ShopifyNavigation';

function App() {
  return (
    <AppProvider>
      <ShopifyNavigation />
      {/* 既存のコンポーネント */}
    </AppProvider>
  );
}
```

### 方法2: Shopify Admin API Extensions

#### shopify.app.toml 設定
```toml
[app]
name = "EC Ranger"

[[extensions]]
type = "admin_link"
name = "データ同期"
link = "/setup/initial"

[[extensions]]
type = "admin_link"
name = "前年同月比分析"
link = "/sales/year-over-year"
```

### 方法3: Web API設定（バックエンド）

#### Program.cs での設定
```csharp
services.AddShopifyApp(options =>
{
    options.AppNavigation = new[]
    {
        new NavigationLink
        {
            Label = "データ同期",
            Destination = "/setup/initial"
        },
        new NavigationLink
        {
            Label = "前年同月比分析",
            Destination = "/sales/year-over-year"
        }
    };
});
```

## 実装に必要な作業

### フロントエンド（Yuki担当）
1. `@shopify/app-bridge-react`のNavigationMenuコンポーネント実装
2. App.tsxへの統合
3. 既存のメニュー設定との連携

### バックエンド（Takashi担当）
1. Shopify App設定の更新
2. Navigation APIの有効化
3. 権限設定の確認

### パートナーダッシュボード設定
1. App Extensionsの有効化
2. Navigation権限の追加
3. URLパターンの設定

## 実装時の注意点

### パフォーマンス
- サブメニューは常に表示されるため、軽量化が重要
- 不要なAPIコールを避ける

### セキュリティ
- 各メニュー項目へのアクセス権限を適切に設定
- storeIdの検証を忘れない

### UX考慮事項
- Shopifyの標準的なナビゲーションパターンに従う
- アイコンは控えめに（テキストベースが推奨）
- 階層は深くしすぎない

## トラブルシューティング

### よくある問題

1. **サブメニューが表示されない**
   - App Bridge が正しく初期化されているか確認
   - NavigationMenu権限が有効か確認
   - URLパターンが正しいか確認

2. **リンクが機能しない**
   - App内のルーティングと一致しているか確認
   - Redirect.Actionが適切に設定されているか確認

3. **権限エラー**
   - パートナーダッシュボードで必要な権限を追加
   - OAuth scopeに navigation_menu を追加

## 推奨される実装タイミング

### 即時実装が必要な場合
- ユーザビリティが大幅に向上する
- 競合アプリとの差別化要因

### 後回しでも良い場合
- MVPとして申請を優先
- ユーザーフィードバック後に最適化
- 技術的な検証が必要

## 参考資料

- [Shopify App Bridge Navigation](https://shopify.dev/docs/api/app-bridge/actions/navigation)
- [Admin Link Extensions](https://shopify.dev/docs/apps/app-extensions/admin-link)
- [Navigation Best Practices](https://shopify.dev/docs/apps/design-guidelines/navigation)

---

最終更新: 2025年8月5日  
管理者: Kenji（AI開発チーム）