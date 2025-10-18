# Shopify App Registration Checklist

## 申請日目標: 2025年9月12日（金）

## 1. Shopify Partner Dashboard設定 ✅

### アプリ基本情報
- ✅ **App API Key**: `3d9cba27a2b95f822caab6d907635538`
- ✅ **App Secret Key**: 設定済み（appsettings.Production.json）
- ⬜ **App URL**: https://ec-ranger.azurewebsites.net （要確認）
- ⬜ **Redirect URLs**: 
  - https://ec-ranger.azurewebsites.net/api/auth/callback
  - https://ec-ranger.azurewebsites.net/auth/callback

### 必須Webhooks
- ✅ GDPR Webhooks実装済み:
  - `/api/webhook/customers-redact`
  - `/api/webhook/shop-redact`
  - `/api/webhook/customers-data-request`
- ✅ App Uninstalled Webhook:
  - `/api/webhook/app-uninstalled`

## 2. アプリ提出素材準備

### アイコン
- ⬜ **アプリアイコン** (1024x1024px PNG)
  - 現在: EC Rangerロゴ画像あり（要トリミング）
  - 場所: `/frontend/public/branding/logo.png`

### スクリーンショット
必要枚数: 最低3枚、推奨5枚（各1280x800px以上）

- ⬜ **ダッシュボード画面**
- ⬜ **顧客分析画面**
- ⬜ **購入回数分析画面**
- ⬜ **休眠顧客分析画面**
- ⬜ **設定・課金画面**

### アプリ説明文
- ✅ **日本語版**: `/docs/00-production-release/app-description/app-description-ja.md`
- ✅ **英語版**: `/docs/00-production-release/app-description/app-description-en.md`

### 法的文書
- ✅ **利用規約**: `/docs/00-production-release/legal/terms-of-service.md`
- ✅ **プライバシーポリシー**: `/docs/00-production-release/legal/privacy-policy.md`

## 3. 技術要件チェック

### OAuth認証
- ✅ Shopify OAuth 2.0実装
- ✅ セッション管理
- ✅ トークン更新処理

### 課金システム
- ✅ Billing API統合
- ✅ プラン選択UI
- ✅ 無料プラン制限機能
- ✅ アンインストール時の自動キャンセル

### セキュリティ
- ✅ HTTPS対応
- ✅ HMAC検証
- ✅ CSP設定
- ⬜ SSL証明書確認（Azure環境）

## 4. テスト環境準備

### 開発ストア
- ⬜ テスト用開発ストア作成
- ⬜ テストデータ準備
- ⬜ 全機能動作確認

### エンドツーエンドテスト
- ⬜ インストールフロー
- ⬜ OAuth認証フロー
- ⬜ 課金フロー
- ⬜ 主要機能テスト
- ⬜ アンインストールフロー

## 5. Azure環境デプロイ

### バックエンド
- ⬜ Azure App Service設定
- ⬜ SQL Database接続確認
- ⬜ 環境変数設定
- ⬜ Application Insights設定

### フロントエンド
- ✅ Azure Static Web Apps設定済み
- ⬜ 本番ビルドデプロイ
- ⬜ カスタムドメイン設定（必要に応じて）

## 6. 申請前最終チェック

### 必須項目
- ⬜ アプリが正常に動作することを確認
- ⬜ GDPR Webhooksが正しく応答することを確認
- ⬜ 課金システムが正しく動作することを確認
- ⬜ エラーハンドリングが適切に実装されていることを確認

### 推奨項目
- ⬜ パフォーマンステスト実施
- ⬜ セキュリティスキャン実施
- ⬜ アクセシビリティチェック

## 7. 申請プロセス

### 申請フォーム記入
- ⬜ アプリ名: EC Ranger
- ⬜ カテゴリ選択: Analytics/Marketing
- ⬜ 価格設定情報入力
- ⬜ サポート連絡先設定

### 提出
- ⬜ 全必須項目の確認
- ⬜ 申請フォーム送信
- ⬜ 確認メール受信

## 8. 申請後フォローアップ

### レビュー対応
- ⬜ Shopifyからのフィードバック確認体制
- ⬜ 修正要求への迅速な対応準備
- ⬜ 再提出プロセス理解

## 現在のステータス

### 完了率
- **技術実装**: 95%
- **素材準備**: 20%
- **テスト**: 30%
- **総合**: 60%

### 優先対応事項（9/8-9/11）
1. アプリアイコン作成・最適化
2. スクリーンショット5枚撮影
3. 開発ストアでの総合テスト
4. Azure本番環境デプロイ
5. エンドツーエンドテスト実施

---
*最終更新: 2025-09-08 10:00*