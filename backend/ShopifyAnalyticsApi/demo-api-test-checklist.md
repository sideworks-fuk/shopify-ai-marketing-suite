# バックエンドAPIデモ動作確認チェックリスト

## 実施日: 2025年8月4日
## 実施者: Takashi

## 環境情報
- **API URL**: https://shopifytestapi20250720173320.azurewebsites.net/
- **Swagger UI**: https://shopifytestapi20250720173320.azurewebsites.net/swagger
- **認証方式**: JWT Bearer Token

## 1. 認証関連 🔐

### JWT取得
- [ ] POST /api/auth/token - JWTトークン取得
  - StoreId: 1 (本番ストア)
  - StoreId: 2 (テストストア)
- [ ] トークンにtenant_idが含まれていることを確認

### OAuth関連
- [ ] GET /api/shopify-auth/install - インストールページ
- [ ] GET /api/shopify-auth/callback - コールバック処理

## 2. 主要API動作確認 📊

### 売上分析
- [ ] GET /api/analytics/monthly-sales - 月次売上データ
  - レスポンス時間: < 500ms
  - データ整合性確認

### 休眠顧客分析
- [ ] GET /api/customer/dormant-customers - 休眠顧客リスト
  - レスポンス時間: < 1000ms
  - ページネーション動作確認
  
- [ ] GET /api/customer/dormant-analysis - 休眠顧客分析
  - セグメント別データ確認
  - リスクレベル計算確認

### 年次比較分析
- [ ] GET /api/analytics/year-over-year - 前年同月比データ
  - レスポンス時間: < 1000ms
  - フィルター機能確認

### 購入回数分析
- [ ] GET /api/purchase/count-analysis - 購入回数分析
  - レスポンス時間: < 500ms
  - セグメント分析確認

## 3. GDPR Webhook確認 🛡️

### アンインストール処理
- [ ] POST /api/webhook/uninstalled
  - HMAC検証動作
  - データ削除スケジュール確認

### 顧客データ削除
- [ ] POST /api/webhook/customers-redact
  - 顧客データ匿名化処理
  - エラーハンドリング確認

### ショップデータ削除
- [ ] POST /api/webhook/shop-redact
  - ショップデータ削除スケジュール

### 顧客データエクスポート
- [ ] POST /api/webhook/customers-data-request
  - エクスポート処理確認

## 4. セキュリティ確認 🔒

### マルチテナント分離
- [ ] Store1のトークンでStore2のデータにアクセス不可を確認
- [ ] 全エンドポイントでStoreId検証動作確認

### エラーレスポンス
- [ ] 401 Unauthorized - 認証なし
- [ ] 403 Forbidden - 権限なし
- [ ] 404 Not Found - リソースなし

## 5. パフォーマンス確認 ⚡

### インデックス効果測定
- [ ] 休眠顧客クエリ: < 500ms (1万件データ)
- [ ] 年次比較クエリ: < 500ms (1万件データ)
- [ ] 購入分析クエリ: < 300ms (1万件データ)

### 同時実行テスト
- [ ] 複数リクエスト同時実行時の安定性
- [ ] レート制限の動作確認

## 6. ロギング確認 📝

### Application Insights
- [ ] リクエストログ記録確認
- [ ] エラーログ記録確認
- [ ] パフォーマンスメトリクス確認

### ログ内容
- [ ] アプリ名が"ECRanger"になっている
- [ ] StoreIdが正しく記録されている
- [ ] 実行時間が記録されている

## 7. エラーシナリオ 🚨

### データベース接続エラー
- [ ] 適切なエラーメッセージ返却
- [ ] ログへの記録

### 無効なリクエスト
- [ ] バリデーションエラーの返却
- [ ] 400 Bad Requestレスポンス

### 認証失敗
- [ ] 401レスポンス
- [ ] 再認証への誘導

## 注意事項

1. **EC Ranger名称変更**: Swagger UIのタイトルが"EC Ranger API"になっていることを確認
2. **JWT Issuer**: トークンのissuerが"ec-ranger"になっていることを確認
3. **開発環境**: GDPR Webhookは開発環境では即座に実行される

## デモ時の説明ポイント

1. **セキュアなマルチテナント実装**: 完全なデータ分離
2. **高速レスポンス**: インデックス最適化による高速化
3. **GDPR完全準拠**: 必須Webhook全対応
4. **拡張性**: Hangfire統合準備完了（バッチ処理用）

---
最終更新: 2025年8月4日
作成者: Takashi（バックエンド担当）