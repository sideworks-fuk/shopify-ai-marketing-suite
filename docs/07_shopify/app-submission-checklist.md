# Shopify App Store 申請チェックリスト

**作成日**: 2025年7月29日  
**作成者**: YUKI(Claude)  
**申請期限**: 2025年8月8日（残り9日）

## 📋 申請前最終確認チェックリスト

### 1. 技術要件 ✅

#### OAuth 2.0 認証
- [ ] OAuth認証フローが正常に動作する
- [ ] アクセストークンが暗号化されて保存される
- [ ] State検証によるCSRF対策が実装されている
- [ ] リダイレクトURLがHTTPSで提供されている

#### GDPR必須Webhook
- [ ] `app/uninstalled` - アプリアンインストール時の処理
- [ ] `customers/redact` - 顧客データ削除要求の処理
- [ ] `shop/redact` - ショップデータ削除要求の処理
- [ ] `customers/data_request` - 顧客データ開示要求の処理
- [ ] 全てのWebhookが5秒以内に200を返す
- [ ] HMAC署名検証が全てのWebhookで実装されている

#### セキュリティ要件
- [ ] HTTPS強制が有効になっている
- [ ] Content-Security-Policyヘッダーが適切に設定されている
  ```
  frame-ancestors https://*.myshopify.com https://admin.shopify.com
  ```
- [ ] レート制限が実装されている（2リクエスト/秒）
- [ ] SQLインジェクション対策が実装されている
- [ ] XSS対策が実装されている

#### API要件
- [ ] Shopify APIバージョン2024-01以降を使用
- [ ] GraphQL APIを使用（推奨）またはREST API
- [ ] APIレート制限への対応（リトライ機構）
- [ ] エラーハンドリングが適切に実装されている

### 2. アプリ情報 📝

#### 基本情報
- [ ] アプリ名（日本語・英語）
  - 日本語: Shopify AIマーケティング分析スイート
  - 英語: Shopify AI Marketing Analytics Suite
- [ ] アプリの説明文（100文字以上）
- [ ] 詳細な説明（機能一覧、使い方など）
- [ ] カテゴリー選択（Analytics/Reportingなど）

#### スクリーンショット
- [ ] アプリダッシュボードのスクリーンショット（最低3枚）
- [ ] 主要機能のスクリーンショット
- [ ] モバイル対応のスクリーンショット（任意）
- [ ] 解像度: 1280x800px以上（推奨）

#### アイコン・ロゴ
- [ ] アプリアイコン（512x512px、PNG形式）
- [ ] 背景透過処理済み
- [ ] Shopifyブランドガイドラインに準拠

### 3. 必須ドキュメント 📄

#### 利用規約
- [ ] 利用規約ページが作成されている（/terms）
- [ ] 日本語版が用意されている
- [ ] 英語版が用意されている
- [ ] アプリ内からアクセス可能

#### プライバシーポリシー
- [ ] プライバシーポリシーページが作成されている（/privacy）
- [ ] 収集するデータの明記
- [ ] データの使用目的の明記
- [ ] データ保存期間の明記
- [ ] GDPR準拠の記載

#### サポート情報
- [ ] サポートメールアドレス
- [ ] サポートページURL
- [ ] FAQ/ヘルプドキュメント（推奨）

### 4. アプリ機能要件 🔧

#### ユーザーエクスペリエンス
- [ ] インストールが3クリック以内で完了
- [ ] エラー時の適切なメッセージ表示
- [ ] ローディング状態の表示
- [ ] レスポンシブデザイン対応

#### 言語対応
- [ ] 日本語対応
- [ ] 英語対応
- [ ] 言語切り替え機能（推奨）

#### パフォーマンス
- [ ] 初回読み込みが3秒以内
- [ ] APIレスポンスが2秒以内
- [ ] 大量データ処理時のページネーション

### 5. テスト完了項目 ✓

#### 機能テスト
- [ ] OAuth認証フローの完全テスト
- [ ] 全ての分析機能の動作確認
- [ ] データ同期機能の確認
- [ ] エラーケースのテスト

#### 互換性テスト
- [ ] Chrome最新版での動作確認
- [ ] Safari最新版での動作確認
- [ ] モバイルブラウザでの確認
- [ ] Shopify管理画面内での動作確認

#### セキュリティテスト
- [ ] ペネトレーションテスト（推奨）
- [ ] OWASP Top 10の確認
- [ ] 脆弱性スキャン

### 6. 本番環境準備 🚀

#### インフラストラクチャ
- [ ] Azure本番環境のセットアップ完了
- [ ] SSL証明書の設定完了
- [ ] カスタムドメインの設定（任意）
- [ ] バックアップ体制の確立

#### 監視・ログ
- [ ] Application Insightsの設定
- [ ] エラー監視の設定
- [ ] パフォーマンス監視の設定
- [ ] アラート設定

#### スケーラビリティ
- [ ] 自動スケーリングの設定
- [ ] 負荷テストの実施
- [ ] データベース最適化

### 7. Shopify Partners設定 🏪

#### アプリ登録
- [ ] Shopify Partnersアカウント作成
- [ ] アプリ作成・基本情報入力
- [ ] OAuth設定（Redirect URLs）
- [ ] Webhook設定

#### 料金プラン（該当する場合）
- [ ] 料金プランの設定
- [ ] 無料トライアル期間の設定
- [ ] 請求APIの実装

### 8. 申請プロセス 📮

#### 申請前の最終確認
- [ ] 全ての必須項目がチェック済み
- [ ] テスト環境での最終動作確認
- [ ] ドキュメントの最終レビュー

#### 申請手順
1. [ ] Shopify Partnersダッシュボードにログイン
2. [ ] アプリ情報の最終確認
3. [ ] 「Submit for review」をクリック
4. [ ] 追加情報の入力（必要に応じて）
5. [ ] 申請完了

#### 申請後の対応
- [ ] 審査結果の通知を待つ（通常3-5営業日）
- [ ] フィードバックへの迅速な対応準備
- [ ] 修正要求への対応体制

## 🚨 重要な注意事項

### よくある却下理由
1. **セキュリティ要件の不備**
   - HTTPS未対応
   - HMAC検証の未実装
   - CSPヘッダーの設定ミス

2. **GDPR対応の不備**
   - 必須Webhookの未実装
   - データ削除機能の不備
   - プライバシーポリシーの不備

3. **ユーザーエクスペリエンス**
   - インストールプロセスが複雑
   - エラーメッセージが不適切
   - パフォーマンスが遅い

### 申請成功のコツ
- テストストアで十分な検証を行う
- ドキュメントを充実させる
- レビュアーの視点で確認する
- 初回申請で完璧を目指す

## 📅 タイムライン

| 日付 | タスク | 担当 | ステータス |
|------|--------|------|------------|
| 7/29-30 | OAuth実装完了 | YUKI/TAKASHI | 進行中 |
| 7/31 | GDPR Webhook完全実装 | TAKASHI | 予定 |
| 8/1 | セキュリティテスト | 両名 | 予定 |
| 8/2 | ドキュメント完成 | YUKI | 予定 |
| 8/3-4 | 本番環境セットアップ | TAKASHI | 予定 |
| 8/5-6 | 最終テスト・修正 | 両名 | 予定 |
| 8/7 | 申請準備完了 | 両名 | 予定 |
| 8/8 | **申請実行** | KENJI | 予定 |

---

**次のアクション**: 利用規約ドラフトの作成

Co-Authored-By: YUKI(Claude) <claude@anthropic.com>