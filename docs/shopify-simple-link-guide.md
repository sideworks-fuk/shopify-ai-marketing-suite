# Shopify管理画面リンク - シンプル実装ガイド

## 概要
福田さんの指示に従い、まずはアプリトップメニューへのリンク1つのシンプルな実装から始めます。

## 実装方針

### フェーズ1：最小実装（今回）
- Shopify管理画面にアプリへのリンクを1つ追加
- CSPヘッダーでiframe埋め込みを許可
- 既存の認証システムを活用

### フェーズ2：将来の拡張（後日）
- NavigationMenuで複数画面へのリンク
- App Bridge完全統合
- セッショントークン実装

## バックエンド実装（TAKASHI担当）

### 1. CSPヘッダー追加のみ
```csharp
// Program.cs に追加
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("Content-Security-Policy", 
        "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
    await next();
});
```

### 実装ポイント
- 新しいコントローラーは不要
- 既存のJWT認証をそのまま使用
- 最小限の変更で対応

## フロントエンド実装（YUKI担当）

### 1. 埋め込み判定の追加
```typescript
// ホームページで埋め込みモードを検出
const isEmbedded = searchParams.has('embedded') || searchParams.has('host');
```

### 2. スタイル調整
- iframe内ではヘッダーを非表示
- パディング調整

### 実装ポイント
- App Bridgeの完全統合は後回し
- 既存のレイアウトを活かす
- 最小限の変更で対応

## テスト方法

### 1. ローカルテスト
```
# 通常モード
http://localhost:3000

# 埋め込みモード（Shopifyからのアクセスをシミュレート）
http://localhost:3000?embedded=1
```

### 2. ngrokでのテスト
```bash
ngrok http 3000
# Shopify管理画面からngrok URLにアクセス
```

## 期待される成果

1. **即座に動作確認可能**
   - 最小限の実装で素早く検証

2. **リスクの最小化**
   - 既存機能への影響なし
   - 段階的な実装が可能

3. **月曜日のデモ**
   - 「Shopify管理画面から直接アクセス可能」をアピール

## 次のステップ（将来）

1. NavigationMenuで複数画面へのリンク追加
2. App Bridge完全統合
3. セッショントークン実装
4. アンインストールWebhook実装

## まとめ

「まずは動くものを」の精神で、シンプルな実装から始めます。
これにより、月曜日のデモで確実に動作するものを見せることができます。