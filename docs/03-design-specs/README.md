# フロントエンド包括ドキュメント（概要）

本ドキュメントは、EC Ranger（Shopify AI Marketing Suite）のフロントエンド実装の全体像と主要モジュールの使い方をまとめたものです。詳細は各モジュール別ドキュメントを参照してください。

## 目的と範囲
- Next.js(App Router)における課金/機能制御/分析UIの実装を理解し、保守・拡張を容易にする
- 認証・環境変数・API連携・モック/本番切替の設計方針を明確化する

## アーキテクチャ概要
- ルート/ページ: App Router 構成（例: `(authenticated)/dashboard`, `billing`, `settings`）
- 状態・ビジネスロジック:
  - `contexts/SubscriptionContext.tsx`: サブスクリプション（課金）状態の提供
  - `hooks/useSubscription.ts`: 課金操作（作成/更新/キャンセル/再有効化）
  - `hooks/useFeatureSelection.ts`: 無料プランの機能選択と使用状況
- API 設定:
  - `lib/api-config.ts`: API ベースURL解決、環境情報、共通エンドポイント定義
  - `lib/api/dashboard.ts`: ダッシュボードデータ取得/更新（分析系の基礎）

## 環境変数とURL解決
- 既存コードは `NEXT_PUBLIC_BACKEND_URL` と `NEXT_PUBLIC_API_URL` の両方を参照
- 実運用では1つに統一することを推奨（`NEXT_PUBLIC_API_URL` 推奨）
- ローカル固定URL（localhost:7140/7088/7059）が残存 → 本番・ステージングは環境変数で上書き

## モック/本番の切替
- 一部コンポーネントに `useSampleData`/モックデータが残存
- 段階的に `useSampleData=false` をデフォルト化し、API統合へ切替推奨

## 主要モジュール
- 課金/購読: `contexts/SubscriptionContext.tsx`, `hooks/useSubscription.ts`
- 無料プラン機能選択: `hooks/useFeatureSelection.ts`
- API設定/環境: `lib/api-config.ts`
- ダッシュボードAPI: `lib/api/dashboard.ts`

## 参考
- 認証保護レイアウト: `(authenticated)/layout.tsx`（認証チェックの実装が必要）
- 申請の前提: GDPR/Webhook/課金フローはバックエンドと同期する

---
- 詳細: `subscription.md`, `feature-selection.md`, `api-config.md`, `dashboard-api.md`, `examples-and-faq.md`
