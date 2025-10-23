# 申請前・環境再構築プラン（2025-10）

## 目的
- クリーン環境からの再構築で、申請に必要な全機能の再現性を担保する

## 対象
- Frontend（Next.js 14, TS 5）
- Backend（.NET 8, EF Core 8）
- Azure SQL（DB初期化/マイグレーション適用）

## 前提
- `.env`/`appsettings.*.json`は別管理（機密情報はKV/ローカルのみに保持）

## 手順（ローカル）
1. リポジトリ取得/クリーン
2. フロントエンド
   - `npm ci`
   - `npm run build`
   - `npm run start`
3. バックエンド
   - `dotnet restore`
   - `dotnet build -c Release`
   - DB接続確認 `/api/health/detailed`
4. データベース
   - 初期構築: `2025-09-04-MASTER-CreateDatabaseFromScratch.sql`
   - 差分適用: tracking.md の未適用分を適用（順序厳守）
5. 設定確認
   - `NEXT_PUBLIC_API_URL` の統一
   - Shopify OAuth設定/リダイレクトURL

## 手順（Staging/Production）
- AzureにてApp Service/SQLを対象に、手順3-5相当を環境別に実施

## 検証
- `docs/00-production-release/RELEASE-CHECKLIST.md` を全項目グリーンに
- `test-procedures/*` の手順をすべて通す

## 出力
- 証跡（スクショ/ログ）を `docs/00-production-release/` 配下に保存
