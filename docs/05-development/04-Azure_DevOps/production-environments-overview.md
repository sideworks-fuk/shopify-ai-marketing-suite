# 本番環境フロントエンド 環境整理サマリー

## 作成日: 2025-12-31

## 概要

本番環境フロントエンドは3つの環境に整理されました。各環境は異なる用途とShopifyアプリタイプに対応しています。

## 環境構成

### Production1: EC Ranger（公開アプリ）

- **リソース名**: `ec-ranger-frontend-prod-1`
- **アプリ名**: EC Ranger
- **Azure URL**: https://white-island-08e0a6300.2.azurestaticapps.net
- **カスタムドメイン**: https://ec-ranger.access-net.co.jp
- **種別**: 公開アプリ
- **用途**: 一般公開用Shopifyアプリ
- **備考**: カスタムドメインが設定されており、公開アプリとして運用

### Production2: EC Ranger-xn-fbkq6e5da0fpb（カスタムアプリ）

- **リソース名**: `ec-ranger-frontend-prod-2`
- **アプリ名**: EC Ranger-xn-fbkq6e5da0fpb
- **Azure URL**: https://black-flower-004e1de00.2.azurestaticapps.net
- **種別**: カスタムアプリ
- **用途**: 特定ストア向けカスタムアプリ

### Production3: EC Ranger-demo（カスタムアプリ）

- **リソース名**: `ec-ranger-frontend-prod-3`
- **アプリ名**: EC Ranger-demo
- **Azure URL**: https://ashy-plant-01b5c4100.1.azurestaticapps.net
- **種別**: カスタムアプリ
- **用途**: デモ・テスト用カスタムアプリ

## 環境マッピング

| 環境名 | リソース名 | アプリ名 | Azure URL | カスタムドメイン | 種別 |
|--------|-----------|---------|-----------|----------------|------|
| Production1 | ec-ranger-frontend-prod-1 | EC Ranger | white-island | ec-ranger.access-net.co.jp | 公開アプリ |
| Production2 | ec-ranger-frontend-prod-2 | EC Ranger-xn-fbkq6e5da0fpb | black-flower | - | カスタムアプリ |
| Production3 | ec-ranger-frontend-prod-3 | EC Ranger-demo | ashy-plant | - | カスタムアプリ |

## GitHub Actions ワークフロー

### デプロイオプション

- `Production1`: Production1のみデプロイ
- `Production2`: Production2のみデプロイ
- `Production3`: Production3のみデプロイ
- `Both`: Production1とProduction2をデプロイ
- `All`: 全環境をデプロイ

### 環境変数

各環境は独立したShopify API Keyを使用します：

- `SHOPIFY_API_KEY_PRODUCTION`: Production1用
- `SHOPIFY_API_KEY_PRODUCTION_2`: Production2用
- `SHOPIFY_API_KEY_PRODUCTION_3`: Production3用

## デプロイ手順

1. **GitHub Actions でワークフローを実行**
   - 「Actions」タブ → 「Production Frontend Deploy」を選択
   - 「Run workflow」をクリック
   - `target_environment` で対象環境を選択
   - `confirm_production` に `YES - 本番環境にデプロイします` を選択

2. **デプロイの確認**
   - ワークフローのログでデプロイ完了を確認
   - 各環境のURLにアクセスして動作確認

## 注意事項

### Production3のカスタムドメイン

- Production3はカスタムドメイン `https://ec-ranger.access-net.co.jp` が設定されています
- カスタムドメインの設定はAzure Portalで管理されています
- カスタムドメインへのアクセスは自動的にAzure URLにリダイレクトされます

### リソース名とアプリ名の関係

- リソース名（Azureリソース名）とアプリ名（Shopifyアプリ名）は異なる場合があります
- ワークフローではリソース名を基準にデプロイ先を決定します

## 関連ドキュメント

- [本番環境構成サマリー](./production-environment-summary.md)
- [Production3 Static Web Apps セットアップ手順](./Static_Web_Apps/production3-static-web-app-setup.md)
- [Production3 GitHub Secrets設定手順](./Static_Web_Apps/production3-github-secrets-setup.md)

---

作成者: 福田＋AI Assistant
作成日: 2025-12-31
