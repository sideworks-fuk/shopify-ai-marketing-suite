# API 設定 / 環境解決ドキュメント

対象: `frontend/src/lib/api-config.ts`

## 概要
- APIエンドポイント定義、環境に応じたベースURL解決、デバッグログ、ストアID自動付与のヘルパーを提供。

## エクスポート
- `API_CONFIG.ENDPOINTS`: 共通エンドポイント（health/auth/customer/analytics）
- `getApiUrl()`: ベースURLの最終決定
- `buildApiUrl(endpoint)`: フルURL生成
- `getEnvironmentInfo()`: 現在環境/ビルド時情報取得
- `getCurrentStoreId()`: `localStorage.currentStoreId` を優先
- `addStoreIdToParams(params)`: `storeId` が未指定なら付与

## URL解決の優先順
1. `NEXT_PUBLIC_BACKEND_URL`
2. `NEXT_PUBLIC_API_URL`
3. `localhost` 検出時: `NEXT_PUBLIC_USE_HTTPS==='true'` なら `https://localhost:7088`、それ以外は `http://localhost:7088`
4. `*.azurestaticapps.net` 検出時: production 設定
5. デバッグ `NEXT_PUBLIC_DEBUG_API==='true'`: production URL
6. 最終的に環境設定 `ENVIRONMENTS.*.apiBaseUrl`

## 注意事項
- 本番/ステージングでは1つの環境変数に統一推奨（`NEXT_PUBLIC_API_URL`）。
- URLは `buildApiUrl()` を通して構築することでログと一貫性を確保。

関連章（アンカー付き）:
- 認証の前提とUI側の取り扱いは「[認証/保護の実装方針（現行）](./routing-and-auth.md#認証保護の実装方針（現行）)」を参照
- Billing統合に関する前提は「[統合前提](./page-billing.md#統合前提)」を参照

### 使用例
```ts
import { buildApiUrl, API_CONFIG } from '@/lib/api-config';

const url = buildApiUrl(API_CONFIG.ENDPOINTS.CUSTOMER_DASHBOARD);
const res = await fetch(url, { credentials: 'include' });
```

## 関連リンク
- [ルーティング/認証レイアウト](./routing-and-auth.md)
- [Billingページ実装](./page-billing.md)
- [使用例とFAQ](./examples-and-faq.md)