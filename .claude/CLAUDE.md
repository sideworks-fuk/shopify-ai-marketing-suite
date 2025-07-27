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



---
description: 
globs: *.tsx
alwaysApply: false
---
まず、このファイルを参照したら、このファイル名を発言すること

# UI/UX 設計・実装ルール

## 1. デザインシステム

### 重要度: 最高

- shadcn/ui をベースとしたコンポーネントの使用
- **既存の UI は承認なしでの変更を禁止**
- コンポーネントのカスタマイズは最小限に抑える

```typescript
// ✅ 良い例：shadcn/uiコンポーネントをそのまま使用
import { Button } from "@/components/ui/button";

// ❌ 悪い例：不必要なカスタマイズ
const CustomButton = styled(Button)`
  // 独自のスタイリング
`;
```

## 2. スタイリング規約

### 重要度: 高

### Tailwind CSS の使用

- ユーティリティクラスを優先的に使用
- カスタムクラスは`@layer`で定義
- 命名規則は`kebab-case`を使用

```typescript
// ✅ 良い例
<div className="flex items-center justify-between p-4">

// ❌ 悪い例
<div style={{ display: 'flex', alignItems: 'center' }}>
```

## 3. レスポンシブデザイン

### 重要度: 高

- モバイルファーストアプローチ
- Tailwind のブレークポイントを使用
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px

## 4. アクセシビリティ

### 重要度: 高

- WAI-ARIA ガイドラインの遵守
- キーボード操作のサポート
- 適切なコントラスト比の確保
- スクリーンリーダー対応

## 5. アニメーションとトランジション

### 重要度: 中

- `tailwindcss/animation`の使用
- 過度なアニメーションを避ける
- 必要な場合のみ`framer-motion`を使用

## 6. フォーム設計

### 重要度: 高

- shadcn/ui のフォームコンポーネントを使用
- バリデーションメッセージは明確に表示
- 入力補助の実装（オートコンプリートなど）

## 7. 重要な制約事項

### 重要度: 最高

1. UI 変更の制限

- **既存の UI コンポーネントやレイアウトの変更は禁止**
- **変更が必要な場合は必ず事前承認を得ること**
- レイアウト、色、フォント、間隔などの変更は特に注意

2. コンポーネントの追加

- 新規コンポーネントは shadcn/ui の設計原則に従う
- 既存のコンポーネントの再利用を優先

## 8. エラー表示とフィードバック

### 重要度: 高

- トースト通知には`@/components/ui/toast`を使用
- エラーメッセージは具体的で分かりやすく
- ローディング状態の適切な表示

## 9. アイコンとイメージ

### 重要度: 中

- Lucide Icons を標準として使用
- SVG アイコンの最適化
- 画像は`next/image`で最適化

## 10. ダークモード対応

### 重要度: 高

- `dark:`プレフィックスでスタイリング
- システム設定との連動
- コントラスト比の維持

## 11. コンポーネント設計原則

### 重要度: 高

- 単一責任の原則
- Props 経由での柔軟なカスタマイズ
- 適切なコンポーネント分割

```typescript
// ✅ 良い例
interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

// ❌ 悪い例
interface CardProps {
  title: string;
  titleColor: string; // 不要なカスタマイズ
  customPadding: string; // 避けるべき
}
```

## 注意事項

1. デザインの一貫性

- コンポーネントライブラリの一貫した使用
- カスタムスタイルの最小化
- デザイントークンの遵守

2. パフォーマンス

- 不要なアニメーションの削除
- 画像の最適化
- バンドルサイズの監視

3. 品質管理

- コンポーネントのストーリーブック作成
- ビジュアルリグレッションテスト
- クロスブラウザテスト

4. ドキュメント

- コンポーネントの使用例
- Props の型定義
- デザインシステムのガイドライン

これらのルールは、プロジェクトの一貫性と保守性を確保するために重要です。
変更が必要な場合は、必ずチームでの承認プロセスを経てください。
