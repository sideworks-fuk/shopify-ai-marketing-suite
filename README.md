# Shopify AI Marketing Suite

## 🔗 **ブックマーク・クリンク集**
- [📊 **ブックマーク・リンク集**](./docs/BOOKMARKS.md) - 全URL・ワンクリックアクセス
- [📖 **クイックリファレンス**](./docs/QUICK-REFERENCE.md) - 開発者必読ガイド
- [🔧 **本番API接続テスト**](https://brave-sea-038f17a00.1.azurestaticapps.net/api-test) - ライブ動作確認
- [🗄️ **Database API テスト**](https://brave-sea-038f17a00.1.azurestaticapps.net/database-test) - Azure SQL統合確認画面

## 🚀 **開発環境情報**

### **現在の環境構成**
```yaml
環境種別: 開発環境（Development）
フロントエンド: https://brave-sea-038f17a00.1.azurestaticapps.net
バックエンドAPI: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
データベース: Azure SQL Database (shopify-test-db)
ブランチ戦略: develop ブランチ中心の開発
```

### **主要テストページ**
- **Database API**: [/database-test](https://brave-sea-038f17a00.1.azurestaticapps.net/database-test) - Azure SQL接続・顧客データ表示
- **Shopify API**: [/api-test](https://brave-sea-038f17a00.1.azurestaticapps.net/api-test) - Shopify連携テスト
- **Swagger UI**: [Backend API Docs](https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/swagger)

## 📋 **開発フロー**

### **ブランチ戦略**
```bash
main (将来の本番環境)
├── develop (開発統合) ✅ 現在メイン
└── feature/* (機能開発)
```

### **機能開発手順**
```bash
# 1. feature ブランチで開発
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. 開発・テスト
# ローカル開発...

# 3. develop へのPR
git push origin feature/new-feature
# GitHub でPR作成 → develop

# 4. 開発環境で動作確認
# https://brave-sea-038f17a00.1.azurestaticapps.net
```

## 概要 

このプロジェクトは、**Shopifyストア運営者向けのAIを活用した購買データ分析とDM作成・郵送自動化**を実現するWebアプリケーションです。

### 主要機能
- **売上分析ダッシュボード**: 売上推移、商品別売上、前年比較などを可視化
- **顧客分析ダッシュボード**: 顧客セグメント、購入頻度、リピート率などを分析  
- **AI分析インサイト**: トレンド予測、異常検知、推奨施策を自動生成
- **Database API統合**: Azure SQL Database実データ表示・検証 ✅ **実装完了**

## 🛠️ 技術スタック

### フロントエンド
- **Next.js**: 15.2.4 (App Router)
- **React**: 19
- **TypeScript**: 5
- **Tailwind CSS**: 3.4.17
- **shadcn/ui**: UIコンポーネント

### バックエンド
- **.NET**: 8.0
- **Entity Framework Core**: 8.0
- **Azure SQL Database**: Basic
- **Swagger/OpenAPI**: API仕様書自動生成

### インフラ・デプロイ
- **Azure Static Web Apps**: フロントエンド
- **Azure App Service**: バックエンドAPI
- **GitHub Actions**: CI/CD
- **Azure SQL Database**: データ永続化

## 📊 実装状況

### ✅ 完了機能
1. **Database API統合** - Azure SQL Database完全統合
2. **前年同月比【商品】** - 複数年対応完了
3. **購入頻度【商品】** - 商品別購入パターン分析
4. **月別売上統計【購買】** - 月次トレンド可視化
5. **組み合わせ商品【商品】** - マーケットバスケット分析
6. **F階層傾向【購買】** - 購入頻度別顧客分類
7. **顧客購買【顧客】** - 個別顧客分析
8. **休眠顧客【顧客】** - 離脱リスク管理

### 🔄 開発中
- **Shopify API連携**: リアルデータ取得・保存
- **バッチ処理**: Hangfire導入による自動更新
- **認証システム**: Azure AD連携

## 📁 プロジェクト構造

```
shopify-ai-marketing-suite/
├── frontend/src/           # Next.js フロントエンド
│   ├── app/               # App Router ページ
│   ├── components/        # React コンポーネント
│   └── lib/              # ユーティリティ・API
├── backend/              # .NET 8 バックエンド
│   ├── Controllers/      # Web API コントローラー
│   ├── Services/         # ビジネスロジック
│   ├── Data/            # Entity Framework DbContext
│   └── Models/          # データモデル
├── docs/                # プロジェクト文書
└── worklog/            # 開発ログ・タスク管理
```

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- .NET 8 SDK
- Azure CLI

### ローカル開発環境
```bash
# フロントエンド
cd frontend
npm install
npm run dev

# バックエンド
cd backend
dotnet restore
dotnet run
```

## 📚 ドキュメント

### 開発者向け
- [📖 クイックリファレンス](./docs/QUICK-REFERENCE.md) - 開発必読ガイド
- [🔧 セットアップガイド](./docs/04-development/setup-guide.md) - 環境構築手順
- [🌳 ブランチ戦略](./docs/05-operations/branch-strategy-and-deployment-plan.md) - 開発フロー

### 設計・仕様
- [🏗️ システム設計](./docs/02-architecture/system-architecture.md) - アーキテクチャ概要
- [📊 画面設計](./docs/03-design-specs/screen-design.md) - UI/UX仕様
- [🗄️ データ設計](./docs/01-project-management/02-data-architecture/) - DB設計

### 運用・インフラ
- [☁️ Azure構成](./docs/06-infrastructure/) - インフラ設計
- [🚀 デプロイ手順](./docs/05-operations/deployment-guide.md) - 本番リリース
- [📊 コスト管理](./docs/06-infrastructure/02-cost-management/) - 運用コスト

## 🎯 現在の開発目標

### **Phase 1: Database統合完了** ✅
- Azure SQL Database完全統合
- 実データでのAPI動作確認
- フロントエンド統合画面

### **Phase 2: Shopify連携** 🔄
- Shopify API統合実装
- リアルタイムデータ取得
- バッチ処理による自動更新

### **Phase 3: 本格運用** ⏳
- 本番環境構築
- 認証・セキュリティ強化
- 監視・ログ基盤

## 👥 コントリビュート

開発に参加される方は、[ブランチ戦略ガイド](./docs/05-operations/branch-strategy-and-deployment-plan.md)をご確認ください。

---

**🚀 開発は絶賛進行中！現在はAzure SQL Database統合が完了し、次はShopify API連携に取り組んでいます。**
