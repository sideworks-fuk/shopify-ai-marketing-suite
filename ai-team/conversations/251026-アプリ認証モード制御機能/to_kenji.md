# To: Kenji（PM/Tech Lead） - 認証モード制御機能実装開始

## 🎯 実装概要
**機能**: Shopify アプリ認証モード制御機能  
**期間**: 2025-10-25 〜 2025-10-30（予定）  
**優先度**: 高（セキュリティ強化のため）

## 📋 担当範囲
**全体統括、設計書の最終確認、統合テスト**

### 実装タスク

#### 1. 環境変数設定の確認・設定
**対象環境**:
- Development: `all_allowed` モード
- Staging: `demo_allowed` モード  
- Production: `oauth_required` モード

**設定ファイル**:
- `.env.local` (開発環境)
- Azure Static Web Apps 環境変数 (ステージング)
- Azure App Service 環境変数 (本番)

#### 2. 統合テストの実施
**テスト範囲**:
- フロントエンド・バックエンド連携テスト
- 各環境での認証モード切り替えテスト
- セキュリティ要件の検証
- パフォーマンステスト

#### 3. デプロイメント準備
**対象**:
- フロントエンド: Azure Static Web Apps
- バックエンド: Azure App Service
- データベース: Azure SQL Database

## 🔧 技術仕様

### 環境別設定

#### 本番環境
```yaml
environment:
  NEXT_PUBLIC_ENVIRONMENT: "production"
  NEXT_PUBLIC_AUTH_MODE: "oauth_required"
  NEXT_PUBLIC_ENABLE_DEV_TOOLS: "false"
  NEXT_PUBLIC_DEBUG_MODE: "false"

authentication:
  mode: "OAuthRequired"
  requireHttps: true
  enableCors: false
```

#### ステージング環境
```yaml
environment:
  NEXT_PUBLIC_ENVIRONMENT: "staging"
  NEXT_PUBLIC_AUTH_MODE: "demo_allowed"
  NEXT_PUBLIC_ENABLE_DEV_TOOLS: "true"
  NEXT_PUBLIC_DEBUG_MODE: "false"

authentication:
  mode: "DemoAllowed"
  requireHttps: true
  enableCors: true
```

#### 開発環境
```yaml
environment:
  NEXT_PUBLIC_ENVIRONMENT: "development"
  NEXT_PUBLIC_AUTH_MODE: "all_allowed"
  NEXT_PUBLIC_ENABLE_DEV_TOOLS: "true"
  NEXT_PUBLIC_DEBUG_MODE: "true"

authentication:
  mode: "AllAllowed"
  requireHttps: false
  enableCors: true
```

## 📚 参考ドキュメント
- **設計書**: `docs/03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-設計書.md`
- **要件定義**: `docs/03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-要件定義.md`
- **実装計画**: `docs/03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-実装計画.md`
- **テスト計画**: `docs/03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-テスト計画.md`

## ⏱️ スケジュール
- [x] Day 1: 環境変数設定の確認・設定
- [ ] Day 2: フロントエンド・バックエンド連携テスト
- [ ] Day 3: 各環境での認証モード切り替えテスト
- [ ] Day 4: セキュリティ要件の検証
- [ ] Day 5: 本番環境へのデプロイ準備

## 🧪 テスト要件
- [ ] 各環境での認証モード切り替えテスト
- [ ] デモモード時の制限機能テスト
- [ ] セキュリティ要件の検証
- [ ] パフォーマンステスト
- [ ] 統合テスト

## 📞 連絡事項
- 実装中に不明点があれば `to_yuki.md` または `to_takashi.md` で相談
- 進捗は `report_kenji.md` に日次で報告
- 緊急時は直接連絡

## 🎯 完了条件
1. 設計書の仕様通りに機能が実装されている
2. 各環境での認証モード切り替えが正常に動作する
3. セキュリティ要件が満たされている
4. 本番環境へのデプロイ準備が完了している
5. 統合テストが正常に完了している

## ⚠️ 重要な注意事項
- **セキュリティ**: 本番環境では必ず `OAuthRequired` モードを使用
- **環境変数**: 各環境の設定が正しく適用されていることを確認
- **テスト**: 各環境での動作確認を必ず実施
- **デプロイ**: 本番環境へのデプロイ前に十分なテストを実施

## 🔍 現在の実装状況確認
- ✅ **環境設定**: `environments.ts` で認証モード制御の型定義と設定取得機能が実装済み
- ✅ **認証ガード**: `AuthGuard.tsx` で基本的な認証制御が実装済み
- ✅ **開発者モード**: デモモード機能の基盤が実装済み
- 🔄 **実装中**: Yukiさん（フロントエンド）、Takashiさん（バックエンド）

---

**依頼日時**: 2025-10-25 10:00  
**依頼者**: Kenji  
**緊急連絡先**: 直接連絡