# 作業ログ: 環境設定改善

## 作業情報
- 開始日時: 2025-07-20 16:00:00
- 完了日時: 2025-07-20 17:00:00
- 所要時間: 60分
- 担当: 福田＋AI Assistant

## 作業概要
フロントエンドから接続できるバックエンドAPIを設定で切り替えられるように改善し、開発・ステージング・本番環境の切り替え機能を実装しました。さらに、ビルド時の環境変数で環境を切り替えられるように改善しました。

## 実施内容

### 1. 環境別設定ファイルの作成
- `frontend/src/lib/config/environments.ts` を作成
- 開発・ステージング・本番環境の定義
- 環境切り替え機能の実装

### 2. API設定の改善
- `frontend/src/lib/api-config.ts` を更新
- 新しい環境設定システムとの統合
- デバッグ情報の改善

### 3. 環境切り替えUIの実装
- `frontend/src/components/common/EnvironmentSelector.tsx` を作成
- 環境切り替えコンポーネントの実装
- 現在の環境表示機能

### 4. 環境管理フックの作成
- `frontend/src/hooks/useEnvironment.ts` を作成
- 環境情報の管理機能
- 環境切り替え機能

### 5. 環境設定ページの作成
- `frontend/src/app/settings/environment/page.tsx` を作成
- 環境設定管理ページの実装
- 詳細な環境情報表示

### 6. ビルド時環境変数対応の追加
- ビルド時の環境変数判定ロジックを追加
- `NEXT_PUBLIC_BUILD_ENVIRONMENT`、`NEXT_PUBLIC_DEPLOY_ENVIRONMENT`、`NEXT_PUBLIC_APP_ENVIRONMENT` の対応
- 環境設定ページにビルド時環境変数情報を表示

### 7. ドキュメントの作成・更新
- `docs/05-operations/environment-configuration-guide.md` を更新
- `docs/05-operations/build-time-environment-variables.md` を新規作成
- ビルド時の環境変数設定について詳細に説明

## 成果物

### 作成・修正したファイル一覧
- `frontend/src/lib/config/environments.ts` (新規作成・更新)
- `frontend/src/lib/api-config.ts` (更新)
- `frontend/src/components/common/EnvironmentSelector.tsx` (新規作成)
- `frontend/src/hooks/useEnvironment.ts` (新規作成)
- `frontend/src/app/settings/environment/page.tsx` (新規作成・更新)
- `docs/05-operations/environment-configuration-guide.md` (更新)
- `docs/05-operations/build-time-environment-variables.md` (新規作成)

### 主要な変更点
1. **環境別設定の統一管理**
   - 開発環境: `https://localhost:7088`
   - ステージング環境: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`
   - 本番環境: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net`

2. **設定の優先順位（改善）**
   - NEXT_PUBLIC_API_URL (最優先)
   - NEXT_PUBLIC_BUILD_ENVIRONMENT (ビルド時最優先)
   - NEXT_PUBLIC_DEPLOY_ENVIRONMENT (ビルド時第2優先)
   - NEXT_PUBLIC_APP_ENVIRONMENT (ビルド時第3優先)
   - ローカルストレージ (ブラウザ設定)
   - NEXT_PUBLIC_ENVIRONMENT (実行時環境変数)
   - NODE_ENV (自動判定)
   - デフォルト (開発環境)

3. **UI機能**
   - 環境切り替えコンポーネント
   - 現在の環境表示
   - 環境設定管理ページ
   - ビルド時環境変数情報の表示

4. **ビルド時環境変数対応**
   - ビルド時に環境を固定できる仕組み
   - デプロイ環境ごとの適切な環境設定
   - CI/CDでの環境変数設定例

## 課題・注意点
- 本番環境では環境切り替え機能は無効化されます
- 環境切り替え時はページがリロードされます
- セキュリティ上、機密情報は環境変数で管理してください
- ビルド時の環境変数はクライアントサイドに露出するため、機密情報は含めないでください

## 関連ファイル
- `frontend/src/lib/api-client.ts` - API接続クライアント
- `frontend/src/lib/data-service.ts` - データサービス
- `frontend/src/components/common/` - 共通コンポーネント 