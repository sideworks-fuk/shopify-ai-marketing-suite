# Shopify Navigation実装ドキュメント

作成日: 2025年8月5日  
作成者: Yuki（AI開発チーム）

## 実装概要

Shopify管理画面の左メニューにサブメニューを追加する機能を実装しました。

## 実装内容

### 1. 基本実装（ShopifyNavigationMenu.tsx）

**場所**: `/frontend/src/components/shopify/ShopifyNavigationMenu.tsx`

**特徴**:
- @shopify/app-bridge-react v4.2.1の`NavMenu`コンポーネントを使用
- シンプルで軽量な実装
- エラー時のフォールバック機能付き

**実装詳細**:
```typescript
<NavMenu>
  <a href="/" rel="home">EC Ranger</a>
  <a href="/setup/initial">データ同期</a>
  <a href="/sales/year-over-year">前年同月比分析</a>
  <a href="/purchase/count-analysis">購入回数分析</a>
  <a href="/customers/dormant">休眠顧客分析</a>
</NavMenu>
```

### 2. 高度な実装（ShopifyNavigationAdvanced.tsx）

**場所**: `/frontend/src/components/shopify/ShopifyNavigationAdvanced.tsx`

**特徴**:
- useAppBridgeフックを使用
- Next.jsルーターとの統合
- 埋め込み環境の検出
- クリックハンドラーによるSPA対応

## 技術的な詳細

### App Bridge v4.2.1の変更点

1. **NavigationMenu → NavMenu**
   - 旧: `<NavigationMenu navigationLinks={...} />`
   - 新: `<NavMenu><a>...</a></NavMenu>`

2. **標準的なHTMLアンカータグ使用**
   - より直感的でシンプルなAPI
   - 最初の要素には`rel="home"`が必須

3. **フックの変更**
   - 個別のフック（useNavigate等）は削除
   - `useAppBridge`で統一的なアクセス

### 実装時の考慮事項

1. **クライアントサイドレンダリング**
   - App Bridgeはクライアントサイドでのみ動作
   - `useState`と`useEffect`で制御

2. **エラーハンドリング**
   - try-catchでNavMenuの初期化エラーをキャッチ
   - フォールバックUIを提供

3. **環境判定**
   - Shopify埋め込み環境かどうかを判定
   - 非埋め込み環境では表示しない

## 使用方法

### 基本的な使用

```tsx
import { ShopifyNavigationMenu } from '@/components/shopify/ShopifyNavigationMenu'

// EmbeddedAppLayout内で使用
<ShopifyNavigationMenu />
```

### 高度な使用

```tsx
import { ShopifyNavigationAdvanced } from '@/components/shopify/ShopifyNavigationAdvanced'

// より高度な制御が必要な場合
<ShopifyNavigationAdvanced />
```

## 動作確認項目

1. **Shopify管理画面での表示**
   - アプリを開いた時に左メニューにサブメニューが表示される
   - 各メニュー項目をクリックして正しいページに遷移する

2. **エラーケース**
   - App Bridgeが利用できない環境でエラーにならない
   - フォールバックUIが表示される

3. **パフォーマンス**
   - ページ遷移がスムーズに行われる
   - 不要な再レンダリングが発生しない

## トラブルシューティング

### サブメニューが表示されない

1. **App Bridgeの初期化確認**
   ```bash
   # コンソールでエラーを確認
   console.log(window.shopify)
   ```

2. **環境変数の確認**
   - `NEXT_PUBLIC_SHOPIFY_API_KEY`が設定されているか

3. **埋め込みモードの確認**
   - Shopify管理画面内でアプリを開いているか

### ナビゲーションが機能しない

1. **URLパターンの確認**
   - アプリのURLが正しく設定されているか
   - Shopifyパートナーダッシュボードでの設定確認

2. **権限の確認**
   - Navigation権限が付与されているか

## 今後の改善案

1. **アクティブ状態の表示**
   - 現在のページをハイライト表示

2. **アイコンの追加**
   - 各メニュー項目にアイコンを追加

3. **権限ベースの表示制御**
   - ユーザーの権限に応じてメニュー項目を制御

4. **多言語対応**
   - メニューラベルの国際化

## 参考資料

- [Shopify App Bridge v4 Migration Guide](https://shopify.dev/docs/api/app-bridge/previous-versions/app-bridge-v4)
- [NavMenu Component Documentation](https://shopify.dev/docs/api/app-bridge-library/react-components/navmenu)
- [Next.js App Router Integration](https://nextjs.org/docs/app)