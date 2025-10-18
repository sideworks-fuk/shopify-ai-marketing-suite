# Quick Ship Tracker - 実装計画書

## 概要
Quick Ship TrackerはShopifyアプリ申請プロセスを体験するための最小限のサンプルアプリです。
注文のトラッキング番号を簡単に登録・管理する機能を提供します。

**開発期間**: 2025年9月6日 - 9月10日（5日間）
**目標**: Shopifyアプリストア申請可能な状態まで完成

## MVP機能一覧

### フェーズ1: コア機能（9月6日-7日）
1. **認証機能**
   - OAuth認証フロー実装
   - JWT トークン管理
   - セッション管理

2. **注文管理**
   - 注文一覧表示
   - トラッキング番号登録
   - 出荷状態更新
   - 検索・フィルタリング

3. **データベース**
   - Shop情報の保存
   - トラッキング情報の保存
   - セッション管理

### フェーズ2: 課金機能（9月8日）
1. **料金プラン**
   - Free: 月10件まで
   - Basic: 月100件まで（$9.99/月）
   - Pro: 無制限（$29.99/月）

2. **Billing API統合**
   - RecurringApplicationCharge実装
   - 使用量追跡
   - プラン変更処理

### フェーズ3: GDPR対応（9月9日）
1. **必須Webhooks**
   - app/uninstalled
   - customers/data_request
   - customers/redact
   - shop/redact

### フェーズ4: UI/UX改善（9月10日）
1. **ユーザビリティ**
   - ローディング状態
   - エラーハンドリング
   - 成功通知
   - レスポンシブデザイン

## 技術アーキテクチャ

### バックエンド構成
```
QuickShipTracker/
├── Controllers/
│   ├── AuthController.cs        # OAuth認証
│   ├── OrdersController.cs      # 注文API
│   ├── TrackingController.cs    # トラッキングAPI
│   ├── BillingController.cs     # 課金API
│   └── WebhookController.cs     # Webhook処理
├── Models/
│   ├── Shop.cs                  # ショップ情報
│   ├── TrackingInfo.cs          # トラッキング情報
│   ├── BillingPlan.cs           # 料金プラン
│   └── DTOs/                    # データ転送オブジェクト
├── Services/
│   ├── ShopifyService.cs        # Shopify API通信
│   ├── AuthService.cs           # 認証処理
│   ├── TrackingService.cs       # トラッキング管理
│   └── BillingService.cs        # 課金管理
├── Data/
│   ├── AppDbContext.cs          # EF Core Context
│   └── Migrations/              # DBマイグレーション
├── Middleware/
│   ├── ShopifyAuthMiddleware.cs # 認証ミドルウェア
│   └── RateLimitMiddleware.cs   # レート制限
└── Program.cs                   # エントリーポイント
```

### フロントエンド構成
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # ルートレイアウト
│   │   ├── page.tsx             # ホームページ
│   │   ├── orders/
│   │   │   ├── page.tsx         # 注文一覧
│   │   │   └── [id]/page.tsx    # 注文詳細
│   │   ├── settings/
│   │   │   └── page.tsx         # 設定画面
│   │   └── billing/
│   │       └── page.tsx         # 課金画面
│   ├── components/
│   │   ├── OrderList.tsx        # 注文リストコンポーネント
│   │   ├── TrackingForm.tsx     # トラッキング登録フォーム
│   │   ├── BillingPlans.tsx     # 料金プラン選択
│   │   └── Layout/
│   │       ├── AppProvider.tsx  # Shopify App Bridge Provider
│   │       └── Navigation.tsx   # ナビゲーション
│   └── lib/
│       ├── api.ts               # API通信
│       ├── auth.ts              # 認証ヘルパー
│       └── utils.ts             # ユーティリティ
```

## 実装タイムライン

### 9月6日（金）- Day 1
**担当**: Takashi（バックエンド）、Yuki（フロントエンド）

#### バックエンド（Takashi）
- [ ] プロジェクト初期設定
- [ ] データベースモデル作成
- [ ] AuthController実装
- [ ] JWT認証ミドルウェア

#### フロントエンド（Yuki）
- [ ] Next.jsプロジェクト設定
- [ ] Polaris統合
- [ ] App Bridge設定
- [ ] 基本レイアウト作成

### 9月7日（土）- Day 2
**担当**: Takashi（バックエンド）、Yuki（フロントエンド）

#### バックエンド（Takashi）
- [ ] OrdersController実装
- [ ] TrackingController実装
- [ ] ShopifyService実装
- [ ] 単体テスト作成

#### フロントエンド（Yuki）
- [ ] 注文一覧画面
- [ ] トラッキング登録フォーム
- [ ] API統合
- [ ] エラーハンドリング

### 9月8日（日）- Day 3
**担当**: Takashi（バックエンド）、Yuki（フロントエンド）

#### バックエンド（Takashi）
- [ ] BillingController実装
- [ ] RecurringApplicationCharge統合
- [ ] 使用量制限ロジック

#### フロントエンド（Yuki）
- [ ] 課金画面実装
- [ ] プラン選択UI
- [ ] 課金フロー実装

### 9月9日（月）- Day 4
**担当**: Takashi（バックエンド）、Yuki（フロントエンド）

#### バックエンド（Takashi）
- [ ] WebhookController実装
- [ ] GDPR Webhooks処理
- [ ] データ削除ロジック

#### フロントエンド（Yuki）
- [ ] 設定画面実装
- [ ] UI/UX改善
- [ ] レスポンシブ対応

### 9月10日（火）- Day 5
**担当**: Kenji（統合）、全員（テスト）

#### 統合作業（Kenji）
- [ ] Azure環境デプロイ
- [ ] 環境変数設定
- [ ] SSL証明書設定

#### テスト（全員）
- [ ] 統合テスト
- [ ] パフォーマンステスト
- [ ] セキュリティチェック
- [ ] 申請書類準備

## 役割分担

### Kenji（PM/統合）
- プロジェクト管理
- Azure環境構築
- デプロイ作業
- 申請書類準備
- 最終テスト

### Yuki（フロントエンド）
- Next.js実装
- Polaris UI実装
- App Bridge統合
- UX設計
- フロントエンドテスト

### Takashi（バックエンド）
- C# API実装
- データベース設計
- Shopify API統合
- セキュリティ実装
- バックエンドテスト

## 成功基準

### 技術要件
- [ ] OAuth認証が正常に動作
- [ ] GDPR Webhooksが処理される
- [ ] エラー率1%未満
- [ ] ページ読込3秒以内
- [ ] セキュリティ脆弱性なし

### 機能要件
- [ ] 注文一覧が表示される
- [ ] トラッキング番号が登録できる
- [ ] 課金フローが完了する
- [ ] プラン制限が機能する
- [ ] データが適切に保存される

### 申請要件
- [ ] アプリアイコン作成
- [ ] スクリーンショット5枚以上
- [ ] プライバシーポリシー作成
- [ ] 利用規約作成
- [ ] アプリ説明文（日英）

## リスクと対策

### リスク1: 時間不足
**対策**: MVPに集中し、不要な機能は削除

### リスク2: Shopify API制限
**対策**: レート制限実装、キャッシュ活用

### リスク3: セキュリティ問題
**対策**: セキュリティベストプラクティス遵守、脆弱性スキャン実施

### リスク4: デプロイ問題
**対策**: 早期にステージング環境構築、段階的デプロイ

## 次のステップ

1. **即座に開始**
   - Takashi: バックエンドプロジェクト作成
   - Yuki: フロントエンドプロジェクト作成

2. **日次スタンドアップ**
   - 毎日10:00に進捗確認
   - ブロッカーの早期発見と解決

3. **コミュニケーション**
   - ai-team/conversations/を活用
   - 重要な決定は全員で議論

## 連絡先

- **Kenji**: プロジェクト全体、統合作業
- **Yuki**: フロントエンド関連
- **Takashi**: バックエンド関連

---
*作成日: 2025-09-06*
*更新日: 2025-09-06*