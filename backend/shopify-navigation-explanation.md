# Shopify管理画面サブメニュー設定について

作成日: 2025年8月5日  
作成者: Takashi

## 現在の実装状況

### フロントエンドでの実装
Shopify管理画面のサブメニューは、フロントエンド側で既に実装されています。

**実装ファイル**: `/frontend/src/components/shopify/ShopifyNavigationMenu.tsx`

```tsx
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
```

### バックエンドでの対応
現在のアーキテクチャでは、Shopifyのナビゲーションメニューはフロントエンド（Shopify App Bridge）で管理されており、バックエンド側での設定は不要です。

## なぜバックエンド設定が不要か

1. **Shopify App Bridge**: フロントエンドがShopify App Bridge ReactのNavigationMenuコンポーネントを使用
2. **Embedded App**: アプリはShopify管理画面に埋め込まれ、フロントエンドが直接App Bridgeと通信
3. **動的更新**: メニュー項目の変更はフロントエンドコンポーネントの更新で対応可能

## メニュー設定の構造

**メニュー設定ファイル**: `/frontend/src/lib/menuConfig.ts`
- カテゴリ別にメニュー項目を定義
- 各項目にアイコン、説明、実装状態を含む

## 今後の拡張について

もしバックエンドからメニュー項目を動的に制御したい場合：

1. **API エンドポイント作成**
```csharp
[HttpGet("api/navigation/menu")]
public async Task<IActionResult> GetNavigationMenu()
{
    var menuItems = new[]
    {
        new { label = "データ同期", destination = "/setup/initial" },
        new { label = "前年同月比分析", destination = "/sales/year-over-year" },
        // ...
    };
    return Ok(menuItems);
}
```

2. **フロントエンドでAPIを呼び出し**
```tsx
useEffect(() => {
  fetch('/api/navigation/menu')
    .then(res => res.json())
    .then(data => setMenuItems(data));
}, []);
```

## 結論
現在のところ、Shopifyナビゲーションメニューはフロントエンドで完全に管理されており、バックエンド側での追加設定は不要です。