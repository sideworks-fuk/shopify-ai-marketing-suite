# モノレポ構成移行計画書

## 📋 移行概要
- **移行日**: 2025年7月20日
- **目的**: 開発効率向上とデプロイ管理の簡素化
- **対象**: Shopify AI Marketing Suite プロジェクト

---

## 🏗️ 現在の構成

### 現在のフォルダ構造
```
shopify-ai-marketing-suite/
├── src/                    # Next.js フロントエンド
├── public/                 # 静的ファイル
├── docs/                   # ドキュメント
├── worklog/               # 作業ログ
├── shopify-ai-marketing-suite-backend/
│   └── ShopifyTestApi/    # .NET 8 Web API
├── package.json           # Next.js 設定
├── next.config.js         # Next.js 設定
└── その他の設定ファイル
```

### 問題点
- バックエンドが別フォルダに分離
- デプロイ設定が分散
- 開発環境の管理が複雑

---

## 🎯 目標構成

### 移行後のフォルダ構造
```
shopify-ai-marketing-suite/
├── frontend/              # Next.js フロントエンド
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   └── その他のフロントエンド設定
├── backend/               # .NET 8 Web API
│   ├── ShopifyTestApi/
│   ├── ShopifyTestApi.csproj
│   └── その他のバックエンド設定
├── infrastructure/        # インフラ設定
│   ├── azure/
│   ├── vercel/
│   └── docker/
├── docs/                 # ドキュメント（既存）
├── worklog/             # 作業ログ（既存）
├── package.json         # ワークスペース管理用
└── README.md           # プロジェクト概要
```

---

## 📝 詳細移行手順

### Phase 1: フォルダ作成とファイル移動

#### 1.1 フォルダ作成
```bash
# 新規フォルダ作成
mkdir frontend
mkdir backend
mkdir infrastructure
mkdir infrastructure/azure
mkdir infrastructure/vercel
mkdir infrastructure/docker
```

#### 1.2 フロントエンド移動
```bash
# src/ を frontend/ に移動
mv src frontend/
mv public frontend/
mv package.json frontend/
mv next.config.js frontend/
mv tailwind.config.ts frontend/
mv tsconfig.json frontend/
mv postcss.config.* frontend/
mv next-env.d.ts frontend/
mv components.json frontend/
```

#### 1.3 バックエンド移動
```bash
# バックエンドフォルダを移動
mv shopify-ai-marketing-suite-backend/ShopifyTestApi backend/
```

#### 1.4 インフラ設定移動
```bash
# Azure設定関連を移動
# （必要に応じて）
```

### Phase 2: 設定ファイル調整

#### 2.1 ルート package.json 作成
```json
{
  "name": "shopify-ai-marketing-suite",
  "version": "1.0.0",
  "description": "Shopify AI Marketing Suite - Monorepo",
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && dotnet run",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && dotnet build",
    "test": "npm run test:frontend && npm run test:backend"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

#### 2.2 フロントエンド設定調整
```json
// frontend/package.json
{
  "name": "@shopify-ai-marketing-suite/frontend",
  "version": "1.0.0",
  // 既存の設定をそのまま保持
}
```

#### 2.3 バックエンド設定調整
```xml
<!-- backend/ShopifyTestApi.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <!-- 既存の設定をそのまま保持 -->
  </PropertyGroup>
</Project>
```

### Phase 3: デプロイ設定更新

#### 3.1 Vercel 設定
```json
// vercel.json (ルート)
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install"
}
```

#### 3.2 Azure App Service 設定
- デプロイパス: `backend/`
- ビルドコマンド: `dotnet build`
- 出力ディレクトリ: `backend/bin/Release/net8.0/`

#### 3.3 .gitignore 更新
```gitignore
# 既存の設定
node_modules/
.next/
*.log

# モノレポ用追加
frontend/node_modules/
frontend/.next/
backend/bin/
backend/obj/
```

---

## ⚠️ リスクと対策

### リスク1: デプロイ設定の混乱
**対策**: 
- 段階的移行
- 各段階での動作確認
- ロールバック計画の準備

### リスク2: 開発環境の破綻
**対策**:
- 既存設定のバックアップ
- 設定ファイルの段階的移行
- 動作確認の徹底

### リスク3: Git履歴の混乱
**対策**:
- フォルダ移動はGit履歴を保持
- コミット前の動作確認
- 段階的コミット

---

## 📅 移行スケジュール

### Day 1: 準備とフォルダ作成
- [ ] バックアップ確認
- [ ] フォルダ作成
- [ ] 設定ファイル準備

### Day 2: ファイル移動と設定調整
- [ ] フロントエンド移動
- [ ] バックエンド移動
- [ ] 設定ファイル調整

### Day 3: デプロイ設定更新
- [ ] Vercel設定更新
- [ ] Azure設定更新
- [ ] 動作確認

---

## ✅ 移行完了チェックリスト

### 開発環境
- [ ] `npm run dev` でフロントエンド起動
- [ ] `dotnet run` でバックエンド起動
- [ ] 両方同時起動でエラーなし

### ビルド
- [ ] `npm run build` で全プロジェクトビルド
- [ ] フロントエンドビルド成功
- [ ] バックエンドビルド成功

### デプロイ
- [ ] Vercelデプロイ成功
- [ ] Azure App Serviceデプロイ成功
- [ ] API接続確認

### ドキュメント
- [ ] README.md 更新
- [ ] 開発手順書更新
- [ ] デプロイ手順書更新

---

## 🎯 移行後のメリット

1. **開発効率向上**
   - 単一リポジトリでの管理
   - 統一された開発環境

2. **デプロイ管理の簡素化**
   - 明確な責任分離
   - 設定の一元化

3. **チーム開発の効率化**
   - コードレビューの簡素化
   - 変更追跡の容易化

---

*この計画に基づいて段階的に移行を進めます。* 