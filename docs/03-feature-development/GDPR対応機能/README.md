# GDPR対応機能

**作成日**: 2025-12-31
**作成者**: 福田 + AI Assistant
**目的**: Shopify公開アプリ申請に必須のGDPR対応を完了させる

## ドキュメント構成

| ファイル | 概要 |
|----------|------|
| [要件定義.md](./要件定義.md) | Shopify公開アプリのGDPR要件 |
| [実装状況レビュー.md](./実装状況レビュー.md) | 現状のソースコードレビュー結果 |
| [対応作業リスト.md](./対応作業リスト.md) | 残作業と優先度 |
| [テスト計画.md](./テスト計画.md) | E2E検証計画と証跡取得方法 |

## クイックサマリー

### 現在のステータス

🟡 **95%完了** - 基本実装は完了、本番環境対応とテストが残っている

| カテゴリ | 完了度 | 残作業 |
|---------|--------|--------|
| 必須Webhook実装 | ✅ 100% | なし |
| HMAC検証 | ⚠️ 90% | ミドルウェア二重検証問題 |
| 即時200応答 | ✅ 100% | なし |
| 冪等化処理 | ✅ 100% | なし |
| 本番削除スケジュール | 🔴 50% | Hangfireジョブ実装 |
| E2Eテスト | 🔴 0% | 全て未実施 |
| ドキュメント | 🟡 80% | 法的文書の英語版 |

### 最優先対応事項（申請ブロッカー）

1. **本番削除スケジューリング完了** - 0.5日
2. **HMAC検証の二重問題修正** - 0.25日
3. **E2E検証の実施** - 0.5日

## Shopify申請チェックリスト

### 必須Webhook（3種）

| Webhook | 目的 | 現状 |
|---------|------|------|
| `customers/data_request` | 顧客データのエクスポート要求 | ✅ 実装済み |
| `customers/redact` | 顧客データの削除要求 | ✅ 実装済み |
| `shop/redact` | ストアデータの削除要求（アンインストール後48時間） | ✅ 実装済み |

### 関連Webhook

| Webhook | 目的 | 現状 |
|---------|------|------|
| `app/uninstalled` | アプリアンインストール通知 | ⚠️ 401エラー（二重HMAC検証問題） |

### 確認ポイントチェックリスト

| # | 確認ポイント | 現状 | 対応 |
|---|-------------|------|------|
| 1 | Webhookエンドポイントの実装 | ✅ 完了 | - |
| 2 | HMAC署名検証の実装 | ⚠️ 二重検証問題 | ミドルウェア無効化 |
| 3 | データ削除ロジックの実装 | ✅ 完了 | - |
| 4 | **Shopify Partners DashboardでのWebhook URL設定** | ❓ 要確認 | 下記参照 |
| 5 | **プライバシーポリシーURLの設定** | ❓ 要確認 | 下記参照 |
| 6 | 本番削除スケジューリング | 🔴 未完了 | Hangfire実装 |

### Shopify Partners Dashboard設定

GDPR Webhookは**アプリ設定ではなくプログラム経由で登録**します。現在のプロジェクトでは、OAuth認証完了時に `RegisterWebhooks()` メソッドで自動登録しています。

**プライバシーポリシーURL設定手順**:
1. Shopify Partners Dashboard → アプリ選択
2. 「Configuration」または「App setup」
3. 「App URLs」セクションで以下を設定:
   - Privacy policy URL
   - Terms of service URL（任意）

## 関連リンク

- 実装ファイル:
  - `backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs`
  - `backend/ShopifyAnalyticsApi/Services/GDPRService.cs`
  - `backend/ShopifyAnalyticsApi/Jobs/GdprProcessingJob.cs`
  - `backend/ShopifyAnalyticsApi/Models/GDPRModels.cs`
- 既存ドキュメント:
  - `docs/00-production-release/03-gdpr-compliance/`
  - `docs/08-shopify/04-GDPR対応/`
