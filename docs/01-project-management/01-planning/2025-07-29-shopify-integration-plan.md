# Shopify Admin API データ取得機能 実装計画

**作成日**: 2025年7月29日  
**作成者**: ケンジ

## 1. 概要

Shopify Admin APIからデータを取得し、Azure SQLデータベースに同期する機能を実装します。
8月8日のShopifyアプリ申請に向けて、優先度の高いタスクから順次実装を進めます。

## 2. 現状分析

### 実装済み
- ✅ JWT認証システム
- ✅ マルチテナントDB構造
- ✅ 基本的なサービスアーキテクチャ
- ✅ ShopifyClient基本実装（改善必要）

### 未実装
- ❌ Shopify OAuth認証フロー
- ❌ Webhook処理
- ❌ Azure Functions実装
- ❌ レート制限・リトライ機構
- ❌ アプリインストールフロー

## 3. 実装タスク一覧

### Phase 1: 基礎開発環境準備（7/29-7/30）

#### 1.1 Shopifyストアへサンプルデータ登録ツール実装
- **目的**: テスト用データの準備
- **内容**:
  - 顧客データ（100-1000件）
  - 商品データ（50-100件）
  - 注文データ（500-5000件）
- **実装方法**: 
  - ShopifyClient改良版を使用
  - CSVインポート機能
  - バルクAPI活用

#### 1.2 Shopifyからのデータ取得サンプルコード実装
- **目的**: API接続確認とデータ構造理解
- **内容**:
  - GraphQL/REST APIの両方をテスト
  - 認証フロー確認
  - ページネーション処理
  - エラーハンドリング

### Phase 2: OAuth認証実装（7/31-8/1）

#### 2.1 Shopify OAuth認証フロー実装
- **エンドポイント**:
  ```
  GET  /api/shopify/install?shop={shop_domain}
  GET  /api/shopify/callback?code={code}&shop={shop}
  POST /api/shopify/uninstall (webhook)
  ```
- **実装内容**:
  - 認証リクエスト生成
  - アクセストークン取得
  - トークン安全保存（暗号化）
  - HMAC検証

#### 2.2 アプリインストールリンク実装
- **内容**:
  - インストールページUI
  - ショップドメイン検証
  - エラーハンドリング
  - 成功後のリダイレクト

### Phase 3: Azure Functions実装（8/2-8/3）

#### 3.1 Azure Functionsインフラの準備
- **内容**:
  - Function App作成
  - 環境設定
  - Application Insights設定
  - Key Vault統合

#### 3.2 Azure Functionsコードサンプル実装
- **実装機能**:
  ```csharp
  // タイマートリガー（毎時実行）
  [FunctionName("SyncShopifyData")]
  public static async Task Run([TimerTrigger("0 0 * * * *")] TimerInfo timer)
  
  // Webhookプロセッサー
  [FunctionName("ProcessWebhook")]
  public static async Task<IActionResult> Run([HttpTrigger] HttpRequest req)
  ```

### Phase 4: データ同期機能実装（8/4-8/5）

#### 4.1 バッチ同期処理
- **対象データ**:
  - 顧客情報（Customer）
  - 商品情報（Product）
  - 注文情報（Order）
- **機能**:
  - 差分同期
  - 全件同期オプション
  - エラーリカバリー

#### 4.2 リアルタイムWebhook処理
- **必須Webhook**:
  - app/uninstalled
  - customers/redact
  - shop/redact
  - customers/data_request
- **追加Webhook**:
  - orders/create
  - orders/updated
  - products/update

### Phase 5: 本番準備（8/6-8/7）

#### 5.1 セキュリティ強化
- **実装内容**:
  - HMAC署名検証
  - リクエスト元検証
  - レート制限実装
  - Azure Key Vault統合

#### 5.2 アプリ申請準備
- **必要書類**:
  - プライバシーポリシー
  - 利用規約
  - アプリ説明文
  - スクリーンショット
- **技術要件**:
  - GDPR対応エンドポイント
  - 必須Webhook実装確認
  - パフォーマンステスト

## 4. 技術的考慮事項

### 4.1 既存ShopifyClientの改善点
```csharp
// 現在の実装
public class ShopifyClient
{
    // 基本的なGraphQL実装のみ
}

// 改善版
public class EnhancedShopifyClient
{
    // OAuth対応
    // レート制限
    // リトライ機構
    // Webhook署名検証
    // バルクオペレーション
}
```

### 4.2 マルチテナント対応
- ストアごとのアクセストークン管理
- テナント分離の徹底
- 同時実行制御

### 4.3 パフォーマンス最適化
- GraphQL使用によるデータ取得最適化
- バルクオペレーション活用
- 非同期処理の活用
- キャッシュ戦略

## 5. リスクと対策

### リスク
1. **Shopify APIレート制限**: 2リクエスト/秒
   - **対策**: リトライ機構、キュー実装

2. **大量データ処理**: 数万件のデータ
   - **対策**: バッチ処理、段階的同期

3. **セキュリティ**: トークン漏洩リスク
   - **対策**: Azure Key Vault、暗号化

4. **アプリ審査**: 厳格な審査基準
   - **対策**: 必須要件の確実な実装

## 6. 成功指標

- ✅ Shopify OAuth認証の完全動作
- ✅ 5000件/時のデータ同期達成
- ✅ 99.9%のWebhook処理成功率
- ✅ セキュリティ監査合格
- ✅ Shopifyアプリ審査通過

## 7. 参考資料

- `/backend/ShopifyClient` - 既存実装
- `/docs/03-design-specs/integration/shopify-integration.md` - 設計書
- `/docs/03-design-specs/integration/oauth-multitenancy.md` - OAuth設計
- `/docs/03-design-specs/integration/azure-functions.md` - Azure Functions設計
- `/docs/07_shopify/draft` - Shopify関連メモ

---

この計画に基づいて、優先度の高いタスクから順次実装を進めていきます。