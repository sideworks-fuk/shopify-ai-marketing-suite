# リリースタスク統合ダッシュボード

> 目的: docs/00-production-release と docs/01-project-management/01-planning 配下に分散した申請・本番準備タスクを一枚に集約し、最新の進捗を把握できるようにする。
> 最終更新: 2025-09-18 01:58

---

## 1. クリティカル（申請ブロッカー）

- [ ] GDPR Webhook 4種 実装/再検証/監査ログ（署名検証・5秒応答・冪等）
  - 出典: `docs/00-production-release/RELEASE-CHECKLIST.md` 技術要件, `docs/00-production-release/gdpr-compliance/GDPR_Webhook仕様.md`
- [ ] app/uninstalled 時の課金キャンセル（Webhook連動）
  - 出典: `docs/00-production-release/公開準備サマリー.md` 残作業, `billing-system-status-report-2025-09-04.md`
- [ ] Staging→Production DBマイグレーション適用・`database-migration-tracking.md`更新
  - 出典: `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md`
- [ ] 課金統合の最終化（BillingController等）とE2E
  - 出典: `billing-system-status-report-2025-09-04.md`, `RELEASE-CHECKLIST.md`

## 2. 高優先（品質/審査補助）

- [ ] 無料プラン制限の最終挙動（休眠顧客のみ／30日変更ルール）確認
  - 出典: `billing-system/free-plan-requirements.md`, `billing-system/mvp-billing-spec-2025-09-17.md`
- [ ] 開発ルートの本番非表示/遮断確認（/dev 等）
  - 出典: `公開準備サマリー.md`, `本番環境テスト計画.md`
- [ ] 申請素材（アイコン/スクショ/説明文）作成・配置
  - 出典: `shopify-submission/申請チェックリスト.md`, `shopify-submission/screenshot-guide.md`

## 3. 中優先（運用/周辺）

- [ ] 内部リリースノート（バージョン履歴）
  - 出典: `docs/01-project-management/01-planning/README.md` 他
- [ ] 課題管理表のGoogleシート移行・共有
  - 出典: `docs/01-project-management/00_meeting/250908_議事録.md`
- [ ] プライバシーポリシー 令和6年改定対応反映
  - 出典: `docs/00-production-release/legal/privacy-policy.md`, 議事録

---

## 4. 本番テスト計画リンク（実行チェック）

- [ ] 課金フロー（TEST/$0→承認→Webhook→解放）
- [ ] GDPR 3種＋再送・順不同冪等
- [ ] アンインストール→課金キャンセル
- [ ] 開発用ルート遮断

出典: `docs/00-production-release/本番環境テスト計画.md`

---

## 5. 進捗（担当/期限）

| タスク | 担当 | 期限 | 状態 |
|---|---|---|---|
| GDPR Webhook4種 | Takashi | 9/18 AM | 実装完了/検証待ち |
| app/uninstalled課金キャンセル | Takashi | 9/18 AM | 完了 |
| DBマイグレーション適用（Stg→Prod準備） | 福田 | 9/18 | 進行中 |
| 課金統合E2E | 全員 | 9/18 | 進行中 |
| 無料プラン制限最終確認 | Yuki | 9/18 | 実装完了/QA待ち |
| 開発ルート遮断確認 | Yuki | 9/18 | 完了 |
| 申請素材（スクショ等） | 福田 | 9/18 | 進行中 |
| リリースノートページ | Kenji | 9/18 | 予定 |
| 課題表のSheets移行 | Kenji | 9/19 | 予定 |

注: 状態は日次で更新。証跡は `docs/00-production-release/evidence/` に保存。

---

## 6. Excel移行用カラム定義（顧客共有）

以下の列でシート化してください。

- No
- カテゴリ（クリティカル/高/中）
- タスク名
- 詳細（完了条件/仕様要点）
- 担当
- 期限
- 状態（未着手/進行中/完了/保留）
- 出典ドキュメント（相対パス）
- 証跡リンク（任意）

---

## 7. 出典一覧（抜粋）

- `docs/00-production-release/RELEASE-CHECKLIST.md`
- `docs/00-production-release/公開準備サマリー.md`
- `docs/00-production-release/本番環境テスト計画.md`
- `docs/00-production-release/billing-system/*`
- `docs/01-project-management/00_meeting/250908_議事録.md`
- `docs/01-project-management/01-planning/*`
