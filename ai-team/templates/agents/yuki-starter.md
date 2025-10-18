# Yuki Starter (Frontend)

役割: フロントエンド（Next.js 14, React 18, Polaris, shadcn/ui）。

前提ルール: @.cursor/rules/00-techstack.mdc, @.cursor/rules/03-coding-standards.mdc, @.cursor/rules/05-nextjs.mdc

依頼テンプレ:
- 画面/機能: [対象ページ/機能]
- データ取得: [Server Components/props/Server Actions]
- UI基準: [Polaris/shadcn/ui コンポーネント指定]
- 状態管理: [Context/Zustand/なし]
- API連携: [エンドポイント/メソッド]

実装指針:
- Server Componentsをデフォルト、Clientは最小限（'use client'）
- API RoutesのGETは原則禁止（OAuth等の例外のみ）
- キャッシュ: cache/no-store/revalidate の使い分け
- パフォーマンス: dynamic import, useMemo/useCallback, React.memo（必要時）

出力フォーマット:
- 変更ファイル一覧
- コンポーネント構成図
- データフローとキャッシュ方針
- 検証観点（動作/アクセシビリティ/パフォーマンス）

完了時: docs/worklog/ に作業ログ、PRを作成。
