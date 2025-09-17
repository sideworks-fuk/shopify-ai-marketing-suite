# チーム全体への連絡
Date: 2025-09-06 09:00
From: Kenji

## 🚀 Quick Ship Tracker実装開始！

チームの皆さん、

本日より**Quick Ship Trackerサンプルアプリ**の実装を開始します。
これは**9月10日のShopifyアプリ申請**に向けた重要なマイルストーンです。

## 📋 本日のアクション

### Takashi（バックエンド）
1. **9:00-12:00**: C#プロジェクト初期設定
   - ASP.NET Core 8.0プロジェクト作成
   - Entity Framework Core + SQLite設定
   - 基本的なプロジェクト構造作成

2. **13:00-15:00**: データモデル実装
   - Shop、TrackingInfo、BillingPlanモデル
   - DbContext設定とマイグレーション

3. **15:00-17:00**: 認証基盤
   - AuthController作成
   - JWT認証の基本実装

### Yuki（フロントエンド）
1. **9:00-12:00**: Next.jsプロジェクト設定
   - Next.js 14 (App Router)セットアップ
   - TypeScript設定
   - 必要なパッケージインストール

2. **13:00-15:00**: Shopify統合
   - Polaris UIライブラリ統合
   - App Bridge設定
   - 認証フロー準備

3. **15:00-17:00**: 基本UI実装
   - AppProviderコンポーネント
   - メインナビゲーション
   - 基本ページ構造

## 📚 参照ドキュメント

必ず以下のドキュメントを確認してから作業を開始してください：

- **実装計画書**: `/sample-apps/quick-ship-tracker/docs/implementation-plan.md`
- **API仕様書**: `/sample-apps/quick-ship-tracker/docs/api-specification.md`
- **README**: `/sample-apps/quick-ship-tracker/README.md`

## 💡 重要な技術スタック

### バックエンド
- C# / ASP.NET Core 8.0
- Entity Framework Core (Code First)
- SQLite（開発環境）
- ShopifySharp
- JWT認証

### フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Shopify Polaris
- @shopify/app-bridge-react

## 🎯 本日の目標

**17:00までに以下を達成**:
- Takashi: バックエンドプロジェクトが起動可能な状態
- Yuki: フロントエンドが表示可能な状態
- 両方: 基本的な連携が可能な状態

## 📢 コミュニケーション

- **進捗報告**: 17:00に `report_[名前].md` に記載
- **質問・相談**: `to_kenji.md` または `to_[名前].md` に記載
- **緊急事項**: 即座に共有

## 🔥 モチベーション

このサンプルアプリは単なる申請用ではなく、今後の**Shopifyアプリ開発の標準テンプレート**となります。
高品質な実装を心がけましょう！

**5日間で完成させ、9月10日に申請可能な状態を実現しましょう！**

頑張りましょう！

Kenji