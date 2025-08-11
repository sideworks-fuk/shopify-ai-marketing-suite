# Yukiからの報告書

## 2025年8月11日（日）14:00 - リダイレクトエラー調査結果

Kenjiさん、お疲れ様です。Yukiです。
リダイレクトエラーの調査結果と今後の対応について報告します。

## 1. 最優先：localhost リダイレクトエラー調査結果 🔴

### 発見した問題箇所

#### ハードコーディング検出（12ファイル）
以下のファイルでlocalhostがハードコーディングされています：

1. **middleware.ts** - リダイレクト処理の中核
2. **api/shopify/callback/route.ts** - OAuth コールバック処理
3. **lib/config/environments.ts** - 環境設定
4. **lib/api-config.ts** - API設定
5. **lib/config/validation.ts** - バリデーション処理

特に問題なのは：
- `middleware.ts`でlocalhostへの直接リダイレクトがある
- OAuth callbackで環境変数より優先してlocalhostを使用している箇所がある

### 環境変数の状況
```
frontend/.env.local - 存在（1829バイト）
frontend/.env.local.example - 存在
frontend/.env.local.fixed - 存在（最近作成？）
```

### 根本原因
1. **環境変数の取得ロジックが不統一**
   - 場所によって異なるフォールバック処理
   - process.env直接参照とconfig経由の混在

2. **本番環境検出の不具合**
   - isProduction判定が正しく機能していない可能性
   - Shopify環境での環境変数読み込みに問題

### 修正提案（即座に実装可能）

#### Step 1: 環境設定の統一（30分）
```typescript
// lib/config/app-config.ts (新規作成)
export const getAppUrl = () => {
  // Shopify埋め込みアプリの場合、httpsが必須
  const url = process.env.NEXT_PUBLIC_APP_URL || 
              process.env.SHOPIFY_APP_URL ||
              'https://ec-ranger.azurewebsites.net';
  
  // localhost判定と警告
  if (url.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.error('WARNING: localhost detected in production!');
  }
  
  return url;
};
```

#### Step 2: middleware.tsの修正（15分）
OAuth リダイレクトURLを環境変数ベースに統一

#### Step 3: callback処理の修正（15分）
ハードコーディングされたlocalhostを削除

## 2. Shopify API クリーンアップ状況

### 問題発見 ⚠️
以下のファイルで古いimportが残っています：

1. **services/dataService.ts**
   - `shopify-deprecated`から関数をインポート
   - calculatePurchaseFrequency
   - calculateCustomerSegments  
   - calculateSalesMetrics

2. **lib/data-service.ts**
   - 同様の古い関数参照の可能性

### 対応必要
これらの関数呼び出しをバックエンドAPI経由に置き換える必要があります。

## 3. 開発ページの本番除外進捗

### 実装計画
```
frontend/src/app/
├── (production)/     # 本番用
│   ├── customers/
│   ├── purchase/
│   ├── sales/
│   └── settings/
├── (development)/    # 開発用（本番で404）
│   ├── dev/
│   ├── test/
│   └── debug/
└── api/
```

### 実装時間見積もり
- ディレクトリ構造変更: 1時間
- middleware設定: 30分
- 動作確認: 30分

## 4. 本日の作業優先順位提案

### 14:00-15:00 🔴 最優先
1. localhost リダイレクト修正実装
2. 環境変数統一化

### 15:00-16:00 🟡 優先
1. Shopify API古いimport削除
2. dataService.tsのリファクタリング

### 16:00-17:00 🟢 通常
1. 開発ページの本番除外実装
2. ビルドサイズ確認

## 5. 技術的な質問と提案

### より良い実装方法の提案

#### 1. 環境変数管理の改善
現在3つの.env.localファイルが存在していて混乱の元です。
以下の構成を提案します：

```
.env.local - 開発用（gitignore）
.env.production - 本番用設定（暗号化して管理）
.env.example - サンプル（リポジトリに含める）
```

#### 2. リダイレクト処理の一元化
現在複数箇所に散らばっているリダイレクトロジックを
`lib/redirect-handler.ts`に統一することを提案します。

#### 3. Shopify App Bridge設定の見直し
App Bridgeの初期化でhostパラメータが正しく処理されていない可能性があります。
Shopifyのドキュメントに従った実装に修正が必要です。

## 6. 即座の行動計画

今から以下を実行します：

1. **14:00-14:30**: localhost ハードコーディング修正
2. **14:30-15:00**: 環境変数ロジック統一  
3. **15:00-15:30**: Shopify API import クリーンアップ
4. **15:30-16:00**: テストと動作確認

## 質問事項

1. `.env.local.fixed`ファイルは誰が作成したものでしょうか？正しい設定が入っているなら、これをベースにしたいです。

2. Azure上の環境変数設定は確認できますか？フロントエンドから見えている環境変数と一致しているか確認したいです。

3. ShopifyパートナーダッシュボードでアプリのコールバックURLは正しく設定されていますか？

不明点があればすぐに質問させていただきます。
より良い方法があれば積極的に提案していきます！

---
Yuki
2025年8月11日 14:00