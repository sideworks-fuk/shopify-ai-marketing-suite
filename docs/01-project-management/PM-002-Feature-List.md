# PM-002 Feature List - EC Ranger (Shopify AI Marketing Suite)

**Version**: v0.1
**作成日時**: 2025-10-06 12:48:00
**作成者**: AI Project Assistant
**ステータス**: Draft

## 1. 機能マップ

### 1.1 ドメイン別機能分類

```mermaid
graph TB
    subgraph 認証・権限
        A1[Shopify OAuth]
        A2[JWT/Cookie認証]
        A3[マルチテナント管理]
    end

    subgraph 顧客分析
        B1[休眠顧客分析]
        B2[顧客購買分析]
        B3[顧客セグメント]
    end

    subgraph 売上分析
        C1[前年同月比分析]
        C2[月別売上統計]
        C3[売上予測]
    end

    subgraph 商品分析
        D1[組み合わせ商品分析]
        D2[購入頻度分析]
        D3[在庫回転率]
    end

    subgraph 購買分析
        E1[購入回数分析]
        E2[F階層傾向分析]
        E3[RFM分析]
    end

    subgraph システム管理
        F1[課金管理]
        F2[GDPR対応]
        F3[Webhook処理]
    end
```

### 1.2 画面構成マップ

| 画面カテゴリ | 画面名 | パス | 状態 |
|------------|-------|------|------|
| **認証** | インストール | `/install` | 実装済 |
| | OAuthコールバック | `/api/auth/callback` | 実装済 |
| **ダッシュボード** | メインダッシュボード | `/dashboard` | 実装済 |
| **顧客分析** | 休眠顧客 | `/customers/dormant` | 実装済 |
| | 顧客購買分析 | `/customers/purchase` | モック実装 |
| **売上分析** | 前年同月比 | `/sales/year-over-year` | 実装済 |
| | 月別統計 | `/sales/monthly` | モック実装 |
| | 購入頻度 | `/sales/purchase-frequency` | モック実装 |
| **商品分析** | 組み合わせ分析 | `/products/basket` | モック実装 |
| **購買分析** | 購入回数 | `/purchases/count` | 実装済 |
| | F階層分析 | `/purchases/f-tier` | モック実装 |
| **課金** | プラン選択 | `/billing` | 実装済 |
| | アップグレード | `/billing/upgrade` | 実装済 |
| **開発** | 開発ツール | `/dev-bookmarks` | 開発環境のみ |

## 2. 機能詳細定義

### 2.1 認証・権限管理機能

#### FEAT-001: Shopify OAuth認証
- **目的**: Shopifyストアとの安全な連携
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/app/install/page.tsx`
  - バックエンド: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs:15-120`
- **実装状況**: ✅ 完了
- **関連要件**: FR-001
- **担当**: Takashi
- **出典**: 2025-08-12-oauth-authentication-breakthrough.md

#### FEAT-002: JWT/Cookie認証
- **目的**: セッション管理とAPI認証
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/middleware.ts`
  - バックエンド: `backend/ShopifyAnalyticsApi/Services/JwtService.cs`
- **実装状況**: ✅ 完了
- **関連要件**: NFR-004
- **担当**: Takashi
- **出典**: 2025-07-28-jwt-authentication-implementation.md

### 2.2 顧客分析機能

#### FEAT-003: 休眠顧客分析（CUST-01-DORMANT）
- **目的**: 一定期間購入がない顧客の特定と再活性化
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/DormantCustomers.tsx`
  - バックエンド: `backend/ShopifyAnalyticsApi/Services/DormantCustomerService.cs`
  - API: `GET /api/analytics/dormant-customers`
- **実装状況**: ✅ 完了
- **関連要件**: FR-002
- **特徴**:
  - 期間別フィルタリング（30/60/90/180日）
  - セグメント別分析
  - CSV/Excelエクスポート対応
- **担当**: Yuki/Takashi
- **出典**: 2025-07-24-comprehensive-dormant-customer-implementation.md

#### FEAT-004: 顧客購買分析（CUST-02-ANALYSIS）
- **目的**: 顧客の購買行動パターン詳細分析
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/CustomerPurchaseAnalysis.tsx`
  - バックエンド: モック実装
- **実装状況**: 🟡 モック実装
- **関連要件**: FR-012
- **担当**: Yuki
- **出典**: 2025-06-10-204500-customer-purchase-unification.md

### 2.3 売上分析機能

#### FEAT-005: 前年同月比分析（PROD-01-YOY）
- **目的**: 商品売上の前年同期比較による成長率分析
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/YearOverYearComparison.tsx`
  - バックエンド: `backend/ShopifyAnalyticsApi/Services/YearOverYearComparisonService.cs`
  - API: `GET /api/analytics/year-over-year`
- **実装状況**: ✅ 完了
- **関連要件**: FR-003
- **特徴**:
  - 複数期間比較
  - カテゴリ別分析
  - トレンドグラフ表示
- **担当**: Yuki/Takashi
- **出典**: 2025-06-10-225000-year-over-year-detailed-design.md

#### FEAT-006: 月別売上統計（PURCH-01-MONTHLY）
- **目的**: 月次売上トレンドの可視化と分析
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/MonthlyStats.tsx`
  - バックエンド: モック実装
- **実装状況**: 🟡 モック実装
- **関連要件**: FR-011
- **担当**: Yuki
- **出典**: 2025-06-10-204500-monthly-stats-unification.md

### 2.4 商品分析機能

#### FEAT-007: 組み合わせ商品分析（PROD-03-BASKET）
- **目的**: クロスセル機会の発見
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/MarketBasketAnalysis.tsx`
  - バックエンド: モック実装
- **実装状況**: 🟡 モック実装
- **関連要件**: FR-008
- **担当**: Yuki
- **出典**: 2025-06-03-195000-market-basket-menu-activation.md

#### FEAT-008: 購入頻度分析（PROD-02-FREQ）
- **目的**: 商品別購入パターンの把握
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/PurchaseFrequencyAnalysis.tsx`
  - バックエンド: モック実装
- **実装状況**: 🟡 モック実装
- **関連要件**: FR-010
- **担当**: Yuki
- **出典**: 2025-06-04-170000-purchase-frequency-improvements.md

### 2.5 購買分析機能

#### FEAT-009: 購入回数分析（PURCH-02-COUNT）
- **目的**: 顧客の購入回数パターン分析による優良顧客の特定
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/PurchaseCountAnalysis.tsx`
  - バックエンド: `backend/ShopifyAnalyticsApi/Services/PurchaseCountService.cs`
  - API: `GET /api/analytics/purchase-count`
- **実装状況**: ✅ 完了
- **関連要件**: FR-004
- **担当**: Yuki/Takashi
- **出典**: main-todo.md

#### FEAT-010: F階層傾向分析（PURCH-03-FTIER）
- **目的**: RFM分析のFrequency軸での顧客セグメント化
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/components/dashboards/FTierTrendAnalysis.tsx`
  - バックエンド: モック実装
- **実装状況**: 🟡 モック実装
- **関連要件**: FR-009
- **担当**: Yuki
- **出典**: 2025-06-04-180000-f-tier-trend-implementation.md

### 2.6 システム管理機能

#### FEAT-011: 課金管理
- **目的**: Shopify Billing APIを使用した課金処理
- **主要コンポーネント**:
  - フロントエンド: `frontend/src/app/billing/page.tsx`
  - バックエンド: `backend/ShopifyAnalyticsApi/Controllers/BillingController.cs`
  - API: `POST /api/billing/create-charge`
- **実装状況**: 🟡 90%完了
- **関連要件**: FR-005, FR-006
- **特徴**:
  - 無料プラン（3機能制限）
  - 有料プラン（全機能開放）
  - 使用量ベース課金対応
- **担当**: Takashi
- **出典**: 2025-08-24-billing-implementation-plan.md

#### FEAT-012: GDPR Webhook処理
- **目的**: 個人データ削除要求への対応
- **主要コンポーネント**:
  - バックエンド: `backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs:45-89`
  - ジョブ: `backend/ShopifyAnalyticsApi/Jobs/GdprProcessingJob.cs`
- **実装状況**: 🔴 未着手（最優先）
- **関連要件**: FR-007, NFR-006
- **担当**: Takashi
- **出典**: @todo.md

#### FEAT-013: Webhook処理基盤
- **目的**: Shopifyからのリアルタイム通知処理
- **主要コンポーネント**:
  - バックエンド: `backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs`
  - 署名検証: `backend/ShopifyAnalyticsApi/Services/WebhookVerificationService.cs`
- **実装状況**: ✅ 完了
- **関連要件**: 外部API依存
- **担当**: Takashi
- **出典**: backend/ShopifyAnalyticsApi/Tests/Webhook-Idempotency.http

## 3. 技術実装マトリクス

### 3.1 フロントエンド実装状況

| 機能ID | コンポーネント | 状態管理 | API連携 | テスト |
|-------|-------------|---------|---------|--------|
| FEAT-001 | ✅ 実装済 | Context API | ✅ 実装済 | ⚠️ 未実装 |
| FEAT-003 | ✅ 実装済 | Zustand | ✅ 実装済 | ⚠️ 未実装 |
| FEAT-004 | ✅ モック | Zustand | ⚠️ モック | ⚠️ 未実装 |
| FEAT-005 | ✅ 実装済 | Zustand | ✅ 実装済 | ⚠️ 未実装 |
| FEAT-006 | ✅ モック | Zustand | ⚠️ モック | ⚠️ 未実装 |
| FEAT-007 | ✅ モック | Zustand | ⚠️ モック | ⚠️ 未実装 |
| FEAT-008 | ✅ モック | Zustand | ⚠️ モック | ⚠️ 未実装 |
| FEAT-009 | ✅ 実装済 | Zustand | ✅ 実装済 | ⚠️ 未実装 |
| FEAT-010 | ✅ モック | Zustand | ⚠️ モック | ⚠️ 未実装 |
| FEAT-011 | ✅ 実装済 | Context API | ✅ 実装済 | ⚠️ 未実装 |

### 3.2 バックエンド実装状況

| 機能ID | Controller | Service | Repository | テスト |
|-------|-----------|---------|------------|--------|
| FEAT-001 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 |
| FEAT-002 | ✅ 実装済 | ✅ 実装済 | N/A | ⚠️ 部分実装 |
| FEAT-003 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 | ⚠️ 部分実装 |
| FEAT-005 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 | ⚠️ 部分実装 |
| FEAT-009 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 | ⚠️ 部分実装 |
| FEAT-011 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 | ⚠️ 部分実装 |
| FEAT-012 | 🔴 未実装 | 🔴 未実装 | 🔴 未実装 | 🔴 未実装 |
| FEAT-013 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 | ✅ 実装済 |

## 4. インフラ・デプロイ構成

### 4.1 Azure リソース構成

| リソース | 用途 | 機能ID | 設定 |
|---------|------|--------|------|
| App Service | バックエンドAPI | 全機能 | P1v3プラン |
| Static Web Apps | フロントエンド | 全機能 | Free Plan |
| SQL Database | データストア | 全機能 | Basic Tier |
| Application Insights | 監視・ログ | 全機能 | 標準 |
| Key Vault | シークレット管理 | FEAT-001,002,011 | Standard |

### 4.2 環境別設定

| 環境 | フロントエンドURL | バックエンドURL | データベース |
|------|-----------------|----------------|-------------|
| Development | http://localhost:3000 | http://localhost:5000 | Local SQLite |
| Staging | https://ec-ranger-staging.azurestaticapps.net | https://ec-ranger-api-staging.azurewebsites.net | Azure SQL (Dev) |
| Production | https://ec-ranger.azurestaticapps.net | https://ec-ranger-api.azurewebsites.net | Azure SQL (Prod) |

## 5. 開発優先順位

### 5.1 Phase 1（必須機能）- 完了済
- [x] FEAT-001: Shopify OAuth認証
- [x] FEAT-002: JWT/Cookie認証
- [x] FEAT-003: 休眠顧客分析
- [x] FEAT-005: 前年同月比分析
- [x] FEAT-009: 購入回数分析

### 5.2 Phase 2（申請必須）- 進行中
- [x] FEAT-011: 課金管理（90%）
- [ ] FEAT-012: GDPR Webhook処理（最優先）
- [x] FEAT-013: Webhook処理基盤

### 5.3 Phase 3（価値向上）- 計画中
- [ ] FEAT-004: 顧客購買分析（実装待ち）
- [ ] FEAT-006: 月別売上統計（実装待ち）
- [ ] FEAT-007: 組み合わせ商品分析（実装待ち）
- [ ] FEAT-008: 購入頻度分析（実装待ち）
- [ ] FEAT-010: F階層傾向分析（実装待ち）

## 6. 関連ドキュメント

- [要件定義書](PM-001-Requirements.md)
- [進捗管理表](PM-003-Progress-Tracker.md)
- [課題・リスク一覧](PM-004-Issues-Risks.md)
- [アーキテクチャ設計](../02-architecture/)
- [開発ガイド](../04-development/)

## 7. 更新履歴

| 日付 | バージョン | 更新者 | 変更内容 |
|------|-----------|--------|---------|
| 2025-10-06 | v0.1 | AI Project Assistant | 初版作成 |

---
*このドキュメントはプロジェクトの進行に応じて定期的に更新されます。*