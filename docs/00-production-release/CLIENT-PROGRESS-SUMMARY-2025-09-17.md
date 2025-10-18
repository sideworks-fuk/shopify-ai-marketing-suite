# EC Ranger 開発進捗サマリー（顧客向け）

- 日付: 2025-09-17
- 対象: 小野様 / 関係者各位
- 参照元: `docs/00-production-release/RELEASE-TASK-DASHBOARD.md`

## 現在の状況（要約）
- コアは実装済み（分析UI、課金システムの骨子、GDPR仕様/テスト計画）。
- 申請に向けたクリティカル残は、GDPR Webhook最終化、アンインストール時の課金停止、DBマイグレーション適用、課金統合E2Eの4点。
- 無料プラン制限（休眠顧客のみ）の最終挙動確認と、申請素材（スクショ等）作成を並行対応中。

## 48時間の実行計画
- 9/17 夜〜9/18 朝
  - バックエンド（Takashi）
    - GDPR Webhook 4種 最終化（署名検証・5秒応答・冪等・監査ログ）
    - `app/uninstalled` 受信時のサブスクリプション確実なキャンセル
    - Staging へのDBマイグレーション適用（記録更新）
    - 課金統合E2E準備（通知API/ログ確認）
  - フロントエンド（Yuki）
    - 無料プラン制限UIの最終化（403/409の理由表示、次回変更可能日の明示、Upgrade導線）
    - 開発用ルートの本番非表示/遮断の再確認
    - API URLの統一とモック外し（課金/ダッシュボード優先）
  - プロジェクト管理（Kenji/Fukuda）
    - ダッシュボード更新、申請素材（スクショ）作成、E2E計画に沿った検証準備

## クリティカル残タスク（申請ブロッカー）
1) GDPR Webhook 4種（customers/data_request, customers/redact, shop/redact, app/uninstalled）
2) `app/uninstalled` での課金キャンセル（冪等/記録）
3) DBマイグレーション適用（Staging→Production準備）
4) 課金統合E2E（インストール→承認→Webhook→解放の通し確認）

## 高優先タスク（審査補助/品質）
- 無料プラン制限の最終挙動確認（休眠顧客のみ）
- 開発ルートの本番遮断（/dev 等）
- 申請素材（アイコン/スクショ/説明文）の作成・配置

## 役割・担当
- Takashi（Backend）: GDPR・課金連動・DB適用・E2E準備
- Yuki（Frontend）: 無料プラン制限UI・API統合・本番遮断
- Kenji（PM）: タスク統合/進行管理・E2E計画・ドキュメント更新
- Fukuda（PO）: スクリーンショット、申請準備、最終承認

## リスクと対応
- GDPR/課金フローの最終化遅延 → タスク優先投入・夜間の結合テストで吸収
- 本番用遮断漏れ → チェックリストで二重確認
- 申請素材不足 → スクショ担当を福田様に集約、今夜〜明朝で取得

## 参考リンク
- 統合ダッシュボード: `docs/00-production-release/RELEASE-TASK-DASHBOARD.md`
- 本番テスト計画: `docs/00-production-release/本番環境テスト計画.md`
- GDPR仕様: `docs/00-production-release/gdpr-compliance/GDPR_Webhook仕様.md`
