おはようございます。
今日も頑張りましょう。
本日は主に福田の作業が多いですが、以下3点を優先的に進めていきます。
お互いに作業状況を確認しながらひとつづつクリアしていきましょう。
まずは全体共有用のメッセージを作成してください。
作業自体は確認しながらひとつづつ進めます。

1) インストールをデプロイ環境で実行してもlocalhostに遷移してエラーとなる事象の調査。その後、インストール機能、マルチテナント管理機能を完成させる。
・ハードコーディングが残っていないか？
・または設定が漏れているか？

2) [Frontend] 開発用ページの本番環境除外とディレクトリ構造整理
## 概要

現在、開発・テスト用ページが本番ビルドに含まれる可能性がある。
これらを本番環境から除外し、ディレクトリ構造を整理する。

## 背景

- `/frontend/src/app/` に30以上の開発用ディレクトリが存在
- 本番環境では不要なページが含まれている
- セキュリティリスクとビルドサイズの増大

## 実装内容

### 1. ディレクトリ構造の再編成

現在:
frontend/src/app/
├── dev/
├── test/
├── debug/
├── dev-bookmarks/
├── debug-env/
├── dormant-api-test/
├── purchase-count-api-test/
├── year-over-year-api-test/
└── [本番ページ]

変更後:
frontend/src/app/
├── (production)/           # 本番用ページグループ
│   ├── customers/
│   ├── purchase/
│   ├── sales/
│   ├── ai-insights/
│   └── settings/
├── (development)/          # 開発用ページグループ（本番除外）
│   ├── dev/
│   ├── test/
│   ├── debug/
│   ├── api-test/
│   └── [その他テストページ]
└── api/                    # APIルート（変更なし）

### 2. 環境変数による制御
.env.production:
NEXT_PUBLIC_ENABLE_DEV_PAGES=false

.env.development:
NEXT_PUBLIC_ENABLE_DEV_PAGES=true

## テスト項目

- [ ] 開発環境で全ページアクセス可能
- [ ] 本番ビルドで開発ページ除外確認
- [ ] 本番環境で開発URLアクセス時404またはリダイレクト
- [ ] ビルドサイズの削減確認
- [ ] 既存の本番ページの動作確認

３）バックエンド、データ取得、データ登録機能の開発 Shopify API連携
以下の開発を着手できずに止まっていたので再開。
改めて、設計、実装、テストを計画
docs/02-architecture/shopify-batch-processor-architecture.md

４）インフラ　Azure本番環境構築　githubworkflow整理