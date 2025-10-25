# Shopify 技術ガイド

## 概要
Shopify AI Marketing SuiteのShopify統合に関する技術ガイドとドキュメントです。

---

## 📁 フォルダ構成

```
06-技術ガイド/
├── implementation-guides/     # 実装ガイド
│   └── Shopify-アプリ統合ガイド.md
├── test-guides/              # テストガイド
│   └── Shopify-App-Bridge-テストガイド.md
└── archive/                  # アーカイブ（古いドキュメント）
```

---

## 📚 ドキュメント一覧

### 実装ガイド

| ドキュメント | 説明 | 重要度 |
|------------|------|--------|
| [Shopify-アプリ統合ガイド](./implementation-guides/Shopify-アプリ統合ガイド.md) | Shopifyアプリ統合の段階的実装方法。埋め込みアプリ、CSP設定、認証フローを解説。 | ⭐⭐⭐ |

### テストガイド

| ドキュメント | 説明 | 重要度 |
|------------|------|--------|
| [Shopify-App-Bridge-テストガイド](./test-guides/Shopify-App-Bridge-テストガイド.md) | App Bridge Navigationのテスト方法。シンプル版から詳細版まで段階的に解説。 | ⭐⭐⭐ |

---

## 🔗 関連ドキュメント

### 認証・セキュリティ関連
- [Shopify アプリ認証・認可設計](../../04-development/09-認証・セキュリティ/Shopify-アプリ認証・認可設計.md)
- [認証モード一覧](../../04-development/09-認証・セキュリティ/認証モード一覧.md)
- [認証画面表示仕様](../../04-development/09-認証・セキュリティ/認証画面表示仕様.md)
- [環境変数チェックリスト](../../04-development/09-認証・セキュリティ/環境変数チェックリスト.md)
- [Shopify shopパラメータ仕様](../../04-development/09-認証・セキュリティ/Shopify-shopパラメータ仕様.md)

### 設計仕様
- [グローバル認証ガード](../../03-design-specs/01-frontend/global-authentication-guard.md)
- [開発者ツール仕様](../../03-design-specs/01-frontend/dev-tools-authentication.md)
- [OAuth・マルチテナント](../../03-design-specs/05-integration/oauth-multitenancy.md)

---

## 🚀 クイックスタート

### 1. Shopifyアプリ統合の基本実装
1. [Shopify-アプリ統合ガイド](./implementation-guides/Shopify-アプリ統合ガイド.md)を参照
2. CSPヘッダーの設定
3. 埋め込みアプリページの実装
4. 認証フローの実装

### 2. テストとデバッグ
1. [Shopify-App-Bridge-テストガイド](./test-guides/Shopify-App-Bridge-テストガイド.md)を参照
2. ローカル環境でのテスト
3. 開発ストアでのテスト
4. 本番環境での検証

---

## 📋 実装チェックリスト

### フェーズ1: 基本実装
- [ ] CSPヘッダーの設定
- [ ] 埋め込みアプリページの作成
- [ ] 基本的な認証フロー
- [ ] ローカルテスト環境の構築

### フェーズ2: 完全統合
- [ ] App Bridge完全統合
- [ ] セッショントークン認証
- [ ] ナビゲーションメニュー
- [ ] エラーハンドリング

### フェーズ3: 本番準備
- [ ] セキュリティ検証
- [ ] パフォーマンステスト
- [ ] App Store審査準備
- [ ] ドキュメント整備

---

## 🔧 開発環境セットアップ

### 必要なツール
- Node.js 18+
- .NET 8.0
- ngrok（ローカルテスト用）
- Shopify Partnersアカウント
- 開発ストア

### 環境変数
```bash
# フロントエンド
NEXT_PUBLIC_API_URL=https://your-api-url
NEXT_PUBLIC_ENVIRONMENT=development

# バックエンド
Shopify__ApiKey=your-api-key
Shopify__ApiSecret=your-api-secret
```

---

## 📞 サポート

### よくある問題
- [Shopify-App-Bridge-テストガイド](./test-guides/Shopify-App-Bridge-テストガイド.md)の「トラブルシューティング」セクションを参照

### 追加リソース
- [Shopify公式ドキュメント](https://shopify.dev/docs/apps)
- [App Bridge公式ガイド](https://shopify.dev/docs/apps/tools/app-bridge)

---

## 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2025-10-25 | フォルダ構成を整理、重複ドキュメントを統合 | Kenji |
| 2025-10-25 | 日本語ファイル名に統一、README作成 | Kenji |

---

**最終更新**: 2025年10月25日 21:00
**次回レビュー**: 2025年11月1日（週次）
