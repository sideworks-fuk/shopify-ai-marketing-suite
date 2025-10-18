# Yukiへの依頼事項（2025-09-17）

## 21:45 指示（実装集中：認証/URL統一/モック外し/課金UI）

- 注記: スクリーンショット取得は福田さんが担当。Yukiは実装に専念してください。

### タスク（優先順）
1) 認証チェック実装の確定
   - 対象: `app/(authenticated)/layout.tsx`
   - 現状は既存方式でOK（Clerk移行は後続）。
2) API URL参照の統一
   - `NEXT_PUBLIC_API_URL` に一本化。
   - `NEXT_PUBLIC_BACKEND_URL` と `localhost` フォールバックは排除。
3) モック/サンプルの段階的無効化
   - 順序: ダッシュボード → 顧客/購買頻度 → FreeTier 周辺。
   - `MOCK_PLANS` 等の置換、`useSampleData` 無効化。
4) 課金UIのAPI接続仕上げ
   - プラン取得/アップグレード/状態反映のAPI接続完了。
5) 本番で開発用ルートの非表示/遮断最終チェック

### 依存/前提
- API: 課金・機能選択系のエンドポイント契約に追従。
- 環境: `NEXT_PUBLIC_API_URL` をステージング/本番で正設定。

### 期限/報告
- 期限: 9/18 AM（E2E開始前）
- 報告: `ai-team/conversations/report_yuki.md`

## 21:58 開始合図
- 指示どおり、認証→URL統一→モック外し→課金UIの順で着手。
- 進捗は`report_yuki.md`へ、ブロッカーは`to_kenji.md`へ。

## 2025-09-17 23:18 Kenji → Yuki 回答

- 認証トークン: MVPはCookie `authToken` を使用。`localStorage`は使用しない（XSS耐性）。
- 署名/有効期限/リフレッシュ: 既存ガイドに従う（当面は短期有効＋自動リフレッシュなし）。
- APIベースURL: `NEXT_PUBLIC_API_URL`
  - Staging: https://stg-api.ec-ranger.example.com
  - Production: https://api.ec-ranger.example.com
- 課金API: `create`（新規作成）/`upgrade`（プラン変更）でOK。成功時キーは`confirmationUrl`で確定。
- 無料プラン機能選択API:
  - 409時は`nextChangeAvailableDate`を返すで確定。
  - `available-features` の`limits`/`currentUsage`スキーマは現行のままでOK。
- 本番での開発用ルート遮断: `/dev`, `/design-system`, `/playground` は非表示・遮断対象に含めてください。

## 2025-09-17 23:22 次アクション

1) 無料プラン制限UIの最終仕上げ
   - 409/403時の理由表示、次回変更可能日、Upgrade導線、残日数の表示を実装完了まで。
2) ダッシュボード/分析画面のモック完全排除
   - `useSampleData` 等の無効化、API実データ連携の確認。
3) 課金UIの通し確認
   - `create`/`upgrade`→`confirmationUrl`→承認→Webhook反映→UI反映の通し。
4) middleware遮断の本番フラグ確認
   - ステージングでの無害化、本番でのみ遮断する条件分岐の確認。

報告: `report_yuki.md` にPRリンク・確認キャプチャを貼付してください。

## 2025-09-17 23:52 指示（仕上げタスクと受け入れ基準）

### 仕上げタスク
1) 無料プラン制限UIの最終仕上げ
   - 403/409時の理由表示、次回変更可能日、Upgrade導線、残日数の表示が正しく出ること。
2) モック排除の完了
   - ダッシュボード/分析系の`useSampleData`やダミーを全除去、API実データ連携で描画。
3) 課金UI通し確認
   - `create`/`upgrade`→`confirmationUrl`→承認→Webhook反映→UI反映まで通しで確認。
4) middleware遮断の本番条件
   - 本番のみ遮断、ステージングでは影響しない条件分岐を確認。

### 受け入れ基準（抜粋）
- 409時に`nextChangeAvailableDate`がUI表示される。
- 403/409時にUpgrade導線が提示される。
- ダッシュボードにモック依存が一切無い（コード確認含む）。
- 課金承認完了後、UIが自動で最新状態（プラン/トライアル残）に反映。

提出物
- PRリンク、確認キャプチャ（403/409ケース、課金通し）、影響範囲メモ

ブロッカーは `to_kenji.md` へ。

## 2025-09-18 00:11 受領・次タスク

- 受領: 認証/URL統一/middleware遮断/ダッシュボード実API化/課金UI接続/Upgrade導線 ありがとうございます。

次タスク（優先順）
1) 分析画面のモック完全排除＋API接続
   - `CustomerSegmentAnalysis`, `PurchaseFrequencyDetailAnalysis`, `ProductPurchaseFrequencyAnalysis`, `CustomerPurchaseAnalysis`
2) 課金E2E通し
   - `create|upgrade`→`confirmationUrl`→承認→Webhook反映→UI反映
3) 403/409表示の受け入れ基準検証
   - 理由・`nextChangeAvailableDate`・Upgrade導線の表示

提出: PRリンクとキャプチャを`report_yuki.md`へ。
