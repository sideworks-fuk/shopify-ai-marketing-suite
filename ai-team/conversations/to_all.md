# チーム全体への連絡
Date: 2025-09-17 21:42:06
From: Takashi（Backend Lead）

## 本日の進め方（会話ログ運用）
- 連絡・報告・共有は本ファイル（`ai-team/conversations/to_all.md`）に追記
- 個別依頼は `to_[名前].md`、日次報告は `report_[名前].md` に記録
- 重要決定は `ai-team/decisions/` に要約

## 直近のバックエンド状況（要点）
- 認証: `AuthController` は開発用トークン発行。Shopify OAuth正式実装はTODO
- 課金: `BillingController` 実装済（確認URL/Callback検証は要E2E）
- GDPR: 4種Webhook実装済。削除/エクスポートの本番スケジュール化（Hangfire/Queue）はTODO
- CORS/RateLimit/Hangfire: 設定済。ダッシュボードはフィルタで保護

## 本日の残作業（Kenji指示待ち前の準備）
1) OAuth正式実装の差分整理（必要パラメータと保存先の確認）
2) GDPR非同期スケジュール化の具体化（Hangfireエントリ）
3) 課金フローE2E前提条件の棚卸し（環境変数/Shopify設定）

---

# チーム全体への連絡
Date: 2025-09-06 09:00
From: Kenji

## 🚀 Quick Ship Tracker実装開始！

チームの皆さん、

本日より**Quick Ship Trackerサンプルアプリ**の実装を開始します。
これは**9月10日のShopifyアプリ申請**に向けた重要なマイルストーンです。

## 📋 本日のアクション

### Takashi（バックエンド）
1. **9:00-12:00**: C#プロジェクト初期設定
   - ASP.NET Core 8.0プロジェクト作成
   - Entity Framework Core + SQLite設定
   - 基本的なプロジェクト構造作成

2. **13:00-15:00**: データモデル実装
   - Shop、TrackingInfo、BillingPlanモデル
   - DbContext設定とマイグレーション

3. **15:00-17:00**: 認証基盤
   - AuthController作成
   - JWT認証の基本実装

### Yuki（フロントエンド）
1. **9:00-12:00**: Next.jsプロジェクト設定
   - Next.js 14 (App Router)セットアップ
   - TypeScript設定
   - 必要なパッケージインストール

2. **13:00-15:00**: Shopify統合
   - Polaris UIライブラリ統合
   - App Bridge設定
   - 認証フロー準備

3. **15:00-17:00**: 基本UI実装
   - AppProviderコンポーネント
   - メインナビゲーション
   - 基本ページ構造

## 📚 参照ドキュメント

必ず以下のドキュメントを確認してから作業を開始してください：

- **実装計画書**: `/sample-apps/quick-ship-tracker/docs/implementation-plan.md`
- **API仕様書**: `/sample-apps/quick-ship-tracker/docs/api-specification.md`
- **README**: `/sample-apps/quick-ship-tracker/README.md`

## 💡 重要な技術スタック

### バックエンド
- C# / ASP.NET Core 8.0
- Entity Framework Core (Code First)
- SQLite（開発環境）
- ShopifySharp
- JWT認証

### フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Shopify Polaris
- @shopify/app-bridge-react

## 🎯 本日の目標

**17:00までに以下を達成**:
- Takashi: バックエンドプロジェクトが起動可能な状態
- Yuki: フロントエンドが表示可能な状態
- 両方: 基本的な連携が可能な状態

## 📢 コミュニケーション

- **進捗報告**: 17:00に `report_[名前].md` に記載
- **質問・相談**: `to_kenji.md` または `to_[名前].md` に記載
- **緊急事項**: 即座に共有

## 🔥 モチベーション

このサンプルアプリは単なる申請用ではなく、今後の**Shopifyアプリ開発の標準テンプレート**となります。
高品質な実装を心がけましょう！

**5日間で完成させ、9月10日に申請可能な状態を実現しましょう！**

頑張りましょう！

Kenji

## 2025-09-17 21:40 本日の方針・連絡（申請準備 再開）

- **目的**: 9/8定例の決定事項を反映し、本番申請に向けた残タスクを再開します。
- **期間**: 本日〜明朝（48h以内のクリティカル対応）

### Takashi（バックエンド）
1. GDPR Webhook 4種の実装/再検証（署名検証・冪等・監査ログ）
   - POST `/api/webhooks/customers/data_request`
   - POST `/api/webhooks/customers/redact`
   - POST `/api/webhooks/shop/redact`
   - POST `/api/webhooks/app/uninstalled`（課金キャンセルも実行）
2. ステージングへのDBマイグレーション適用 → `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md` 更新（日時/環境）
3. `BillingController` 最終統合と動作確認（Postman/Insomniaコレクション更新）

### Yuki（フロントエンド）
1. 無料プラン機能制限UI 最終化（409/403時の理由表示、次回変更可能日、Upgrade導線、残日数表示）
2. 申請用スクリーンショット撮影・配置（ガイド準拠）
   - 保存先: `docs/00-production-release/shopify-submission/assets/`
3. 本番で開発用ルートの非表示/遮断の再確認

### 全員（明日AMの共同作業）
- `docs/00-production-release/本番環境テスト計画.md` に沿って通しE2Eを実施
- ブロッカーは即時 `ai-team/conversations/to_kenji.md` に記載

### コミュニケーション
- 今夜 22:30 進捗チェック（短時間）
- 本日中に各自のレポートへ追記（`report_[名前].md`）

### 共有（2025-09-17 21:46）
- スクリーンショット取得は福田さん担当に変更。
- Yuki/Takashi は実装タスクに専念（詳細は `to_yuki.md` / `to_takashi.md` 参照）。

### 開始合図（2025-09-17 21:58）
- 方針承認済み。Yuki/Takashi は直ちに着手してください。
- 進捗・ブロッカーは各`report_*.md`へ即時記載、Kenji宛は`to_kenji.md`へ。

### 共有（2025-09-17 22:42）
- 担当変更: DBマイグレーション適用（Staging→本番準備）は福田さんが担当します。
- Takashiは適用手順の確認支援と適用後の動作確認に回ってください。

### 運用ルール（2025-09-17 23:25）
- 指示: `to_yuki.md` / `to_takashi.md` に記載（Kenji→各担当）。
- 報告: `report_yuki.md` / `report_takashi.md` に記載（各担当→Kenji）。
- 質問・緊急連絡: `to_kenji.md`（全員→Kenji）。
- 過去指示は日毎に整理し、当日分のみを各`to_*`に残します。

### 共有（2025-09-17 23:46）
- Frontend: 認証チェック・API URL統一・Dashboard実API連携・Billing接続・本番用middleware遮断を実施。
- Free Plan UI: 409/403時のUpgrade導線を追加、残日数/次回可日表示はUI実装済み。
- 次アクション候補: `lib/api/sync.ts` のURL/認証統一、分析画面のモック完全外し、課金E2E通し確認。

### 共有（2025-09-17 23:53）
- Backend: TakashiがHMAC固定時間比較、app/uninstalled課金キャンセル、監査ログIdempotencyKey、GDPRHangfireを実装。
- 次: 冪等性/重複抑止の検証、Postman/Insomnia更新、分割PR提出。

### 共有（2025-09-18 00:09）
- Backend: uninstalledキャンセル連動/IdempotencyKey/HMAC固定時間比較/GDPR Hangfire登録を実装。Webhook/Billingの.httpと手順md追加。
- 次: 指定シナリオでStaging検証→結果とPRリンクを`report_takashi.md`へ。

### 共有（2025-09-18 00:11）
- Frontend: 認証チェック本番化/URL統一/middleware遮断/ダッシュボード実API/課金UI接続/403-409時Upgrade導線 まで反映。
- 次: 分析画面モック排除→課金E2E通し→403/409表示の受け入れ基準検証。

### 共有（2025-09-18 00:14）
- Backend: Staging検証の受け入れ基準を設定（Webhook冪等/403副作用ゼロ、Billing通し、GDPR非同期）。提出物はコレクション・ログ抜粋・PRリンク・結果サマリ。