# Shopify App Bridge 実装メモ

## 現在の状況

### エラー内容
```
Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined.
Check the render method of `AppBridgeProvider`.
```

### 原因
`@shopify/app-bridge-react` v4.2.1でのインポート方法の問題

### 一時的な対処
1. AppBridgeProviderを簡素化（App Bridgeを無効化）
2. ShopifyNavigationMenuをプレースホルダーに変更
3. エラーを回避して開発を継続

## 今後の対応

### 1. パッケージの確認
```bash
# インストール済みパッケージ
@shopify/app-bridge-react@4.2.1
@shopify/app-bridge@3.8.5
```

### 2. 正しい実装方法の調査
- v4系での正しいインポート方法
- Next.js 14との互換性
- App Routerでの使用方法

### 3. 段階的な実装
1. まずは埋め込みモード判定のみ実装（完了）
2. App Bridge基本機能の実装（保留中）
3. Navigation Menu実装（保留中）
4. Session Token認証（将来）

## 実装済み機能

### 埋め込みモード判定
- `useIsEmbedded` Hook
- URLパラメータ（embedded, host）での判定
- iframe判定

### レイアウト切り替え
- 通常モード: MainLayout
- 埋め込みモード: EmbeddedAppLayout（簡素版）

### テストツール
- `/dev/shopify-embedded-test`

## 参考リンク
- [Shopify App Bridge React Documentation](https://shopify.dev/docs/apps/tools/app-bridge/react)
- [Next.js Integration Guide](https://shopify.dev/docs/apps/tools/app-bridge/react/use-app-bridge-react)

## メモ
- CSPエラーはバックエンド側の対応が必要
- Session Token認証もバックエンドとの連携が必要
- 現時点では基本的な埋め込み判定のみが動作