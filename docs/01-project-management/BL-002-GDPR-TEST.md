# BL-002 GDPR対応実装（進捗共有用）

- 作成日時: 2025-10-06 16:55:50 JST
- 更新日時: 2025-10-06 16:55:50 JST
- 目的: 非エンジニアと進捗・状況を共有（実装の詳細はエンジニア文書で管理）

## 概要
Shopifyアプリ審査に必須となるGDPR対応（必須Webhook）を実装し、プライバシー要件を満たす。

## 背景
- Shopify公開アプリはGDPR準拠が必須
- 3つの必須Webhook（customers/redact, shop/redact, customers/data_request）＋ app/uninstalled
- 48時間/30日/90日の期限要件

## 現在のステータス
🟡 実施中（基本実装完了、テスト実施中）

## 完了条件
- 必須Webhook実装・HMAC検証・自動削除スケジュール・証跡が揃うこと

## 担当
- メイン: Takashi（バックエンド）
- レビュー: Kenji（PM）

## 期限
- 申請前日（TBD）

## 進捗チェックリスト

### 必須Webhook実装 🔄 実施中
- [x] customers/data_request - 顧客データエクスポート
- [x] customers/redact - 顧客データ削除
- [x] shop/redact - ショップデータ削除
- [x] HMAC署名検証（固定時間比較）
- [ ] 自動削除スケジュール（本番：Hangfire単発遅延）

### データ管理 ✅ 完了
- [x] 個人情報の特定と分類
- [x] データ保持期間の設定
- [x] 暗号化の実装
- [x] アクセスログ/監査ログの記録

### ドキュメント準備 🔄 実施中
- [x] プライバシーポリシー（日本語）
- [ ] プライバシーポリシー（英語）
- [x] 利用規約（日本語）
- [ ] 利用規約（英語）
- [ ] データ処理に関する説明文

### テスト ⏳ 未着手
- [ ] Webhook動作テスト（ngrok or Staging）
- [ ] データ削除の動作確認（48h/30d/90dのスケジュール/即時動作）
- [ ] エクスポート機能の確認
- [ ] 監査ログの確認（個人情報非出力）

## 実装例（参考）
```csharp
// Webhook実装（実際のルートは /api/webhook/customers-redact 等）
[HttpPost("customers-redact")]
public async Task<IActionResult> CustomersRedact()
{
    // 受付 → 非同期処理/削除スケジュール
    return Ok();
}
```

## 備考
- 削除スケジュールは本番環境で単発遅延ジョブにより実施
- E2E証跡（ログ/スクショ/Hangfire/AIクエリ）を取得

## 関連リンク
- レポート: `docs/00-production-release/gdpr-compliance/実装状況確認と対応方針.md`
- 実装: `backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs`, `Program.cs`
- サービス: `backend/ShopifyAnalyticsApi/Services/GDPRService.cs`, `Services/DataCleanupService.cs`
- ジョブ: `backend/ShopifyAnalyticsApi/Jobs/GdprProcessingJob.cs`
