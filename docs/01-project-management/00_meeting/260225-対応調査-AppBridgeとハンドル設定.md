# 定例打合せ対応調査：App Bridge CDN と プランハンドル設定

**作成日**: 2026-02-25  
**議事録参照**: [260225-定例打合せ議事録](./260225-定例打合せ議事録.md)

## 調査概要

議事録で挙がった2項目について、Shopify公式ドキュメントを調査した結果をまとめる。

| # | 項目 | 状態 |
|---|------|------|
| ① | ハンドル設定の調査 | 調査完了 |
| ② | ShopifyのCDNからロードされた最新のApp Bridgeスクリプトを使用する | 調査完了 |

---

## ① ハンドル設定の調査

### 1.1 ハンドルとは

- **planHandle** は、アプリの料金プランを識別するための**35文字以内のコード**（英数字・アンダースコア等）
- **Managed Pricing**（管理型料金）を使用する場合、Partner Dashboardでプラン作成時に**自分で定義**する
- **一度設定すると変更不可**のため、慎重に決定する必要がある

### 1.2 公式ドキュメントの情報

出典: [New planHandle field for managed pricing app subscription plans](https://shopify.dev/changelog/new-planhandle-field-managed-pricing)（2025年4月）

- App subscription plans created with **managed pricing** now include plan handle data
- `planHandle` は **AppRecurringPricing** オブジェクトで利用可能
- **app_subscriptions/update** webhook の topic に `plan_handle` が含まれる
- 新しいプラン作成時に Partner Dashboard からハンドルを定義するよう求められる
- 既存プランには、プラン名に基づいた `planHandle` が自動付与されている

### 1.3 GraphQLスキーマでの planHandle

```
AppRecurringPricing
  - planHandle: String  # The app store pricing plan handle.
```

### 1.4 Managed Pricing の設定場所

出典: [Managed App Pricing](https://shopify.dev/docs/apps/launch/billing/managed-pricing)

1. Partner Dashboard → **Apps** → **All Apps** → 対象アプリ
2. **Distribution** → **Manage listing** → 対象ロケールの **Edit**
3. **Pricing content** → **Manage** → Pricing index page
4. **Public plans** または **Private plans** で **Add** してプラン作成
5. プラン作成時に**ハンドルを定義**（新規プランの場合）

### 1.5 現在のプロジェクトとの整合性

| プロジェクト内の識別子 | 用途 | 推奨ハンドル例 |
|------------------------|------|----------------|
| `SubscriptionPlan.Name` | DBのプラン名（Free, Professional等） | - |
| `FeatureSelectionService.GetPlanType()` | "free", "basic", "professional" で判定 | - |
| Partner Dashboard プラン | マーチャントに表示・課金 | **実装と揃える** |

**推奨方針**:
- DB既存プラン名（Free, Professional, Basic 等）と**一貫したルール**でハンドルを設定
- 例: `free`, `professional`, `basic`, `enterprise`（小文字・スネークケース推奨）
- ハンドルは **35文字以内**・英数字・アンダースコア・ハイフンが一般的
- Webhook `app_subscriptions/update` の `plan_handle` を受けて、内部プラン判定に利用可能

### 1.6 対応アクション

1. **小野さんと連携**: Partner Dashboardで設定したプラン名・価格の一覧を共有いただく
2. **ハンドル案の決定**: DB既存の `SubscriptionPlan` および `GetPlanType()` ロジックと整合するハンドルを決定
3. **Partner Dashboardでの設定**: プラン作成/編集時にハンドルを設定（**変更不可のため最終確認してから**）
4. **バックエンド対応（将来）**: Webhook受信時に `plan_handle` を参照し、プラン識別に利用

---

## ② ShopifyのCDNからロードされた最新のApp Bridgeスクリプトを使用する

### 2.1 問題の背景

- 埋め込み式アプリのチェック項目で「ShopifyのCDNからロードされた最新のApp Bridgeスクリプトを使用する」が**×**になっている
- **2025年10月15日**から、App Store掲載アプリは**最新版App Bridgeの使用が必須**
- Built for Shopify 認定には、2025年7月以降この要件を満たす必要がある

出典:
- [Shopify App Store apps require the latest App Bridge](https://shopify.dev/changelog/shopify-app-store-apps-require-the-latest-app-bridge) (2024年10月)
- [Latest version of App Bridge required for Built for Shopify](https://shopify.dev/changelog/latest-version-of-app-bridge-required-for-built-for-shopify) (2024年12月)

### 2.2 必要な対応

**必須**: アプリの**全ドキュメントの `<head>`** に以下を追加する

```html
<meta name="shopify-api-key" content="%SHOPIFY_API_KEY%" />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

- `%SHOPIFY_API_KEY%` はアプリの Client ID（例: `NEXT_PUBLIC_SHOPIFY_API_KEY`）に置換
- このCDNスクリプトは**自動で最新版に更新**され、常に最新のApp Bridgeを利用できる

出典: [App Bridge Migration Guide](https://shopify.dev/docs/api/app-bridge/migration-guide)

### 2.3 現在のプロジェクトの状態

| 項目 | 現状 |
|------|------|
| App Bridge | `@shopify/app-bridge` v3.7.10（npm パッケージ）を使用 |
| 初期化 | `createApp()` で手動初期化（`app-bridge-provider.tsx`） |
| CDNスクリプト | **未追加** |
| layout | Next.js App Router の `layout.tsx`（`frontend/src/app/layout.tsx`） |

**判定**: CDN経由の最新App Bridgeスクリプトを読み込んでいないため、チェックが×になっていると考えられる。

### 2.4 対応方針

**最小限の対応**（マイグレーションガイドより）:
> The App Bridge script can exist **alongside** App Bridge installed as a packaged dependency and does not require a full migration.

- **Step 1**: `<head>` に CDN の `app-bridge.js` スクリプトタグを追加するだけで、チェック通過の可能性が高い
- 既存の `@shopify/app-bridge`（npm）は、当面そのまま利用可能
- CDNスクリプトとnpmパッケージを併用する構成で、Web Vitals計測などShopify側の検知が可能になる

**推奨実装**（Next.js App Router）:

`frontend/src/app/layout.tsx` の `<html>` 内に `<head>` を追加:

```tsx
<html lang="ja">
  <head>
    <meta name="shopify-api-key" content={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ?? ''} />
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
  </head>
  <body className={inter.className}>
    {/* 既存のbody内容 */}
  </body>
</html>
```

- `NEXT_PUBLIC_SHOPIFY_API_KEY` はビルド時に埋め込まれるため、環境変数で設定する

### 2.5 将来の完全移行（オプション）

マイグレーションガイドに従い、以下を行うと最新App Bridgeをフルに利用できる:

1. CDNスクリプトの追加（上記の通り）
2. `createApp()` 等の手動初期化コードの削除
3. `shopify` グローバル変数および Polaris Web Components の利用へ移行
4. `Redirect.toApp()` → `shopify.navigation.navigate()` など、API差し替え

現時点では、**チェック項目を解消する目的では Step 1 のCDN追加が最優先**。

### 2.6 対応アクション

1. **即時対応**: `layout.tsx` に CDN の `app-bridge.js` スクリプトと `shopify-api-key` メタタグを追加
2. **動作確認**: 埋め込みアプリとして起動し、認証・リダイレクトが問題なく動作することを確認
3. **申請前確認**: 埋め込み式アプリのチェック項目で、該当項目が✓になるか確認

---

## 参考文献

| ドキュメント | URL |
|-------------|-----|
| App Bridge Migration Guide | https://shopify.dev/docs/api/app-bridge/migration-guide |
| App Bridge Library (CDN setup) | https://shopify.dev/docs/api/app-bridge-library |
| Managed App Pricing | https://shopify.dev/docs/apps/launch/billing/managed-pricing |
| planHandle Changelog | https://shopify.dev/changelog/new-planhandle-field-managed-pricing |
| App Store apps require latest App Bridge | https://shopify.dev/changelog/shopify-app-store-apps-require-the-latest-app-bridge |

---

## 次のステップ

1. **①ハンドル**: 小野さんとプラン一覧を共有し、ハンドル案を決定
2. **②App Bridge**: `layout.tsx` にCDNスクリプトを追加し、動作確認
3. 両方完了後にアプリリスティング申請を再実行
