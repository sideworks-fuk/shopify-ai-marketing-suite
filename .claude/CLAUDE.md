# Shopify AI Marketing Suite - Claude Project Guide

## プロジェクト概要

Shopify向けの顧客分析・マーケティング分析スイート。Next.js + .NET Core Web APIのフルスタック構成。

## 技術スタック

### フロントエンド
- **Next.js** 15.1.0 (App Router)
- **React** 18.2.0 + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Zustand** (状態管理)

### バックエンド
- **.NET 8** ASP.NET Core Web API
- **Entity Framework Core** 8.0
- **SQL Server** (Azure SQL Database)

### インフラ
- **Azure App Service** (バックエンド)
- **Azure Static Web Apps** (フロントエンド)
- **Azure SQL Database**

## 重要なコマンド

### 開発サーバー起動
```bash
# フロントエンド
cd frontend && npm run dev

# バックエンド
cd backend/ShopifyTestApi && dotnet run
```

### テスト実行
```bash
# フロントエンド
cd frontend && npm run test

# バックエンド
cd backend/ShopifyTestApi && dotnet test
```

### ビルド
```bash
# フロントエンド
cd frontend && npm run build

# バックエンド
cd backend/ShopifyTestApi && dotnet build
```

## API エンドポイント

### 本番環境
- **Backend API**: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
- **Frontend**: https://shopify-ai-marketing-suite.azurestaticapps.net

### 主要API
- `GET /api/health` - ヘルスチェック
- `GET /api/customer/dormant` - 休眠顧客分析
- `GET /api/customer/dormant/summary` - 休眠顧客サマリー
- `GET /api/customer/{id}/churn-probability` - 離脱確率

## プロジェクト構成

```
shopify-ai-marketing-suite/
├── frontend/                  # Next.js フロントエンド
│   ├── src/
│   │   ├── app/              # App Router ページ
│   │   ├── components/       # Reactコンポーネント
│   │   ├── lib/             # ユーティリティ・API クライアント
│   │   └── types/           # TypeScript型定義
│   └── package.json
├── backend/
│   └── ShopifyTestApi/       # .NET Core Web API
│       ├── Controllers/      # APIコントローラー
│       ├── Services/         # ビジネスロジック
│       ├── Models/          # データモデル
│       └── Data/            # Entity Framework
├── docs/                     # プロジェクト文書
└── .claude/                  # Claude設定
```

## 実装済み機能

### Phase 1 完了済み
- ✅ 休眠顧客分析API (完全実装)
- ✅ フロントエンド統合 (API連携完了)
- ✅ 顧客セグメント分析
- ✅ リスクレベル判定
- ✅ 離脱確率計算

### 進行中
- 🔄 年間売上比較分析
- 🔄 購入頻度分析

## 開発ガイドライン

### コーディング規約
- TypeScript strict mode使用
- ESLintルール遵守
- shadcn/uiコンポーネント優先使用
- API errorハンドリング必須

### Git ワークフロー
- mainブランチから feature/xxx ブランチを作成
- プルリクエスト必須
- コミットメッセージは英語

### デバッグ
```bash
# API ログ確認
curl https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/health

# フロントエンドデバッグ
npm run dev
# ブラウザ開発者ツールでNetworkタブ確認
```

## よくある問題と解決方法

### 1. セグメントフィルターが効かない
```typescript
// 解決済み: backend/ShopifyTestApi/Services/DormantCustomerService.cs
// GetSegmentDateRange メソッドでDB レベルフィルタリング実装
```

### 2. CORS エラー
```csharp
// backend/Program.cs で設定済み
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("https://shopify-ai-marketing-suite.azurestaticapps.net")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

### 3. 環境変数設定
```bash
# .env.local (フロントエンド)
NEXT_PUBLIC_API_URL=https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
NEXT_PUBLIC_DEBUG_API=true

# appsettings.json (バックエンド)
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=..."
  },
  "DormancyThresholdDays": 90
}
```

## 重要なファイル

### 設定ファイル
- `frontend/src/lib/api-config.ts` - API設定
- `backend/ShopifyTestApi/appsettings.json` - バックエンド設定

### 主要コンポーネント
- `frontend/src/components/dashboards/DormantCustomerAnalysis.tsx` - 休眠顧客分析画面
- `backend/ShopifyTestApi/Services/DormantCustomerService.cs` - 休眠顧客サービス

### ドキュメント
- `docs/03-design-specs/CUST-01-DORMANT-detailed-design.md` - 休眠顧客機能設計書

## 今後の開発予定

### Phase 2 (次期実装)
- 年間売上比較API完全実装
- 購入頻度詳細分析
- データエクスポート機能拡張
- パフォーマンス最適化

## 連絡先・リソース

- **Azure Portal**: [リソースグループ確認]
- **API Documentation**: Swagger UI (/swagger/index.html)
- **Frontend URL**: https://shopify-ai-marketing-suite.azurestaticapps.net
- **Backend Health**: /api/health

---

*最終更新: 2025年7月25日*
*Phase 1 完了、フロントエンド統合完了*