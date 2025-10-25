# デバッグ・トラブルシューティング

## 概要
Shopify AI Marketing Suiteのデバッグ・トラブルシューティングに関するドキュメントです。

---

## 📁 フォルダ構成

```
08-デバッグ・トラブル/
├── 01-problem-analysis/          # 問題分析レポート
│   └── 2025-08/                 # 年月別
│       ├── hmac-verification-issue/  # HMAC検証問題
│       └── localstorage-analysis/    # LocalStorage分析
├── 02-debug-guides/             # デバッグガイド
├── 03-test-guides/              # テストガイド
├── 04-troubleshooting/          # トラブルシューティング
├── 05-monitoring/               # ログ・監視
└── README.md                    # このファイル
```

---

## 📚 ドキュメント一覧

### 🔍 問題分析レポート

| ドキュメント | 説明 | 重要度 |
|------------|------|--------|
| [HMAC検証問題](./01-problem-analysis/2025-08/hmac-verification-issue/問題分析.md) | HMAC検証エラーの根本原因分析 | ⭐⭐⭐ |
| [HMAC検証問題 - 解決策](./01-problem-analysis/2025-08/hmac-verification-issue/解決策.md) | HMAC検証問題の解決方法 | ⭐⭐⭐ |
| [HMAC検証問題 - 検証結果](./01-problem-analysis/2025-08/hmac-verification-issue/検証結果.md) | HMAC検証のデバッグ手順 | ⭐⭐⭐ |
| [LocalStorage分析](./01-problem-analysis/2025-08/localstorage-analysis/使用状況分析.md) | LocalStorage変数の使用状況分析 | ⭐⭐ |

### 🧪 テストガイド

| ドキュメント | 説明 | 重要度 |
|------------|------|--------|
| [Swagger JWTテスト](./03-test-guides/Swagger-JWTテスト.md) | Swagger UIでのJWT認証テスト方法 | ⭐⭐⭐ |

---

## 🚀 クイックスタート

### 1. よくある問題の解決

#### HMAC検証エラー
1. [問題分析](./01-problem-analysis/2025-08/hmac-verification-issue/問題分析.md)を確認
2. [解決策](./01-problem-analysis/2025-08/hmac-verification-issue/解決策.md)を実行
3. [検証結果](./01-problem-analysis/2025-08/hmac-verification-issue/検証結果.md)で確認

#### JWT認証テスト
1. [Swagger JWTテスト](./03-test-guides/Swagger-JWTテスト.md)を参照
2. トークンを取得
3. Swagger UIで認証設定

### 2. デバッグ手順

#### フロントエンドデバッグ
1. ブラウザ開発者ツールを開く
2. Console タブでエラーを確認
3. Network タブでAPI通信を確認
4. Application タブでLocalStorageを確認

#### バックエンドデバッグ
1. ログレベルをDebugに設定
2. アプリケーションログを確認
3. データベース接続を確認
4. 環境変数を確認

---

## 🔧 デバッグツール

### フロントエンド
- **ブラウザ開発者ツール**: Chrome DevTools, Firefox Developer Tools
- **React DevTools**: コンポーネント状態の確認
- **Network タブ**: API通信の監視

### バックエンド
- **Swagger UI**: API テスト
- **Serilog**: ログ出力
- **Application Insights**: 本番環境の監視

### データベース
- **SQL Server Management Studio**: データベース接続
- **Entity Framework Core**: マイグレーション管理

---

## 📋 トラブルシューティングチェックリスト

### 認証関連
- [ ] JWTトークンの有効期限確認
- [ ] HMAC検証の設定確認
- [ ] 環境変数の設定確認
- [ ] Shopify認証情報の確認

### API関連
- [ ] エンドポイントのURL確認
- [ ] リクエストヘッダーの確認
- [ ] レスポンスステータスの確認
- [ ] ログの確認

### データベース関連
- [ ] 接続文字列の確認
- [ ] マイグレーションの適用確認
- [ ] データの整合性確認
- [ ] インデックスの確認

---

## 🔗 関連ドキュメント

### 認証・セキュリティ
- [認証モード一覧](../09-認証・セキュリティ/認証モード一覧.md)
- [認証画面表示仕様](../09-認証・セキュリティ/認証画面表示仕様.md)
- [環境変数チェックリスト](../09-認証・セキュリティ/環境変数チェックリスト.md)

### 技術ガイド
- [Shopify アプリ統合ガイド](../../06-shopify/06-技術ガイド/implementation-guides/Shopify-アプリ統合ガイド.md)
- [Shopify App Bridge テストガイド](../../06-shopify/06-技術ガイド/test-guides/Shopify-App-Bridge-テストガイド.md)

### 運用マニュアル
- [トラブルシューティングガイド](../../07-operations-manual/02-トラブルシューティングガイド.md)
- [FAQ](../../07-operations-manual/03-FAQ.md)

---

## 📞 サポート

### 内部リソース
- 開発チーム: AI Assistant (Kenji)
- プロジェクト管理: [01-project-management](../../01-project-management/)

### 外部リソース
- [Shopify公式ドキュメント](https://shopify.dev/docs/apps)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [ASP.NET Core公式ドキュメント](https://docs.microsoft.com/aspnet/core)

---

## 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2025-10-25 | フォルダ構成を整理、問題分析レポートを時系列で管理 | Kenji |
| 2025-10-25 | デバッグガイドとテストガイドを分離 | Kenji |

---

**最終更新**: 2025年10月25日 21:30
**次回レビュー**: 2025年11月1日（週次）
