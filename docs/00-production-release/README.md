# 🚀 Production Release Documentation

このフォルダには、本番リリースとShopifyアプリストア申請に必要な最重要文書を集約しています。

## 📂 フォルダ構成

### 📱 shopify-submission/
Shopifyアプリストア申請に関する文書
- アプリストア申請ガイド
- 申請チェックリスト
- 申請準備状況レポート
- 審査対策完全ガイド

### 🔒 gdpr-compliance/
GDPR対応に関する文書
- GDPR Webhook仕様
- 実装計画書
- プライバシーポリシー（作成中）

### 💳 billing-system/
課金システムに関する文書
- 課金システムREADME
- 実装チェックリスト
- 無料プラン要件定義書

## ⚡ クイックアクセス

### 最優先タスク
1. [ ] GDPR Webhook実装完了（参照: `./gdpr-compliance/GDPR_Webhook仕様.md` / `./gdpr-compliance/実装計画書.md`）
2. [ ] 無料プラン機能制限の実装完了（参照: `./billing-system/free-plan-requirements.md` / `./billing-system/実装チェックリスト.md`）
3. [ ] Shopify申請素材準備（参照: `./shopify-submission/アプリストア申請ガイド.md` / `./shopify-submission/申請チェックリスト.md`）
4. [ ] 統合テスト実施（参照: `./RELEASE-CHECKLIST.md`）

### フォルダ共有の使い方（必読）
- まず開く: `./公開準備サマリー.md`（意思決定・進捗の最新）
- 提出物の全体像: `./関係者向けドキュメント案内.md`
- テスト詳細: `./本番環境テスト計画.md`
- スケジュール・期限はサマリーを正とします（本READMEには固定日付を記載しません）

## 🧭 代表ドキュメントへのリンク
- 公開準備サマリー: `./公開準備サマリー.md`
- 関係者向けドキュメント案内: `./関係者向けドキュメント案内.md`
- 本番環境テスト計画: `./本番環境テスト計画.md`
- リリース全体チェック: `./RELEASE-CHECKLIST.md`
- 課金システム概要: `./billing-system/README.md`
- 無料プラン要件: `./billing-system/free-plan-requirements.md`
- 課金 実装チェック: `./billing-system/実装チェックリスト.md`
- GDPR 仕様: `./gdpr-compliance/GDPR_Webhook仕様.md`
- GDPR 実装計画: `./gdpr-compliance/実装計画書.md`
- 申請ガイド: `./shopify-submission/アプリストア申請ガイド.md`
- 申請チェックリスト: `./shopify-submission/申請チェックリスト.md`
- 審査対策ガイド: `./shopify-submission/shopify-審査対策完全ガイド.md`
- 準備状況レポート: `./shopify-submission/申請準備状況レポート.md`

## 📝 更新履歴
- 2025-09-05: フォルダ作成、重要文書を移動
- 2025-08-25: 申請計画策定

## 🔗 関連リンク
- [Shopify Partner Dashboard](https://partners.shopify.com)
- [Shopify App Review Guidelines](https://shopify.dev/docs/apps/store/review)
- [GDPR Requirements](https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks)