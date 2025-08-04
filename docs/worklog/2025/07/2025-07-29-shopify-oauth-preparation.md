# 2025年7月29日 作業ログ - Shopify OAuth実装準備

## 概要
Shopify App Store申請（8月8日期限）に向けて、OAuth認証とGDPR対応の設計ドキュメントを作成。

## 完了タスク

### 1. Shopifyドキュメント整理 ✅
- `/docs/07_shopify/draft` の内容を整理
- 重要要件の抽出と優先順位付け

### 2. OAuth実装設計書作成 ✅
**ファイル**: `/docs/07_shopify/oauth-implementation-design.md`

主な内容：
- 認証フロー詳細（シーケンス図付き）
- API設計（install/callback/webhooks）
- セキュリティ実装要件
- 日別実装スケジュール（7/29-8/7）
- テスト計画

### 3. プライバシーポリシー草案作成 ✅
**ファイル**: `/docs/07_shopify/privacy-policy-draft.md`

主な内容：
- 日本語・英語版の両方を作成
- GDPR準拠の項目を網羅
- データ削除期限の明記
- 実装チェックリスト付き

### 4. GDPR必須Webhook仕様書作成 ✅
**ファイル**: `/docs/07_shopify/gdpr-webhooks-specification.md`

4つの必須Webhook：
1. `app/uninstalled` - 48時間以内にデータ削除
2. `customers/redact` - 30日以内に顧客データ削除
3. `shop/redact` - 90日以内にショップデータ削除
4. `customers/data_request` - 10日以内にデータ提供

各Webhookに対して：
- リクエスト/レスポンス形式
- 実装コード例
- HMAC検証実装
- 5秒タイムアウト対策

## 技術的発見事項

### 1. Webhook処理の重要ポイント
- 5秒以内に200 OKを返す必要がある
- 実際の処理は非同期で行う（Azure Service Bus推奨）
- エラー時でも200を返す（Shopifyの仕様）

### 2. セキュリティ要件
- 全エンドポイントでHTTPS必須
- CSPヘッダーの設定が必要
- HMAC署名検証は全Webhookで必須

### 3. レート制限対策
- REST API: 2リクエスト/秒
- リトライ機構の実装必須
- Pollyライブラリの使用を推奨

## 明日（7/30）の実装計画

### 午前（9:00-12:00）
1. **ShopifyAuthController実装**
   - install/callbackエンドポイント
   - State管理機構
   - トークン暗号化

2. **フロントエンドインストールページ**
   - `/install` ルート作成
   - ストアドメイン入力フォーム

### 午後（13:00-17:00）
1. **WebhookController実装**
   - 基本構造とHMAC検証
   - 4つのGDPR Webhook

2. **非同期処理基盤**
   - Azure Service Bus設定
   - キューイングサービス

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 開発環境のHTTPS | 高 | ngrokで解決済み |
| 5秒タイムアウト | 高 | 非同期処理設計済み |
| HMAC検証エラー | 中 | 詳細なログ実装予定 |

## チーム連携事項

### TAKASHIさんへの依頼事項
- ShopifyAuthController実装（明日午前）
- WebhookController実装（明日午後）
- Azure Service Bus設定

### YUKIさんへの依頼事項
- フロントエンドインストールページ作成
- 認証成功ページ実装
- Polarisデザインシステムの適用

## 次のマイルストーン
- 7/31: OAuth基本実装完了
- 8/2: GDPR Webhook完全実装
- 8/5: 全機能テスト完了
- 8/7: 申請準備完了
- 8/8: Shopify App Store申請

## メモ
- 早稲田メーヤウ様の特殊要件（激辛レベル分析）は、基本機能実装後に対応
- プライバシーポリシーは法的レビューが必要
- スクリーンショットは実装完了後に作成

---

**作成者**: ケンジ  
**レビュー**: 未実施