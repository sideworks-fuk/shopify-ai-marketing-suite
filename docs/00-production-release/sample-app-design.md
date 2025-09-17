実装を完成させてください

# Shopify申請テスト用サンプルアプリ設計書

## アプリ名
**Quick Ship Tracker**（クイックシップトラッカー）

## アプリ概要
注文の配送トラッキング番号を簡単に追加・管理できるシンプルな配送管理アプリ

## 主要機能（最小限）

### 1. 注文一覧表示
- 未発送の注文リスト表示
- 注文番号、顧客名、注文日、商品数を表示
- ページネーション（10件ずつ）

### 2. トラッキング番号登録
- 注文番号を選択
- トラッキング番号を入力
- 配送業者を選択（ヤマト運輸、佐川急便、日本郵便など）
- 「出荷処理」ボタンで登録

### 3. 出荷履歴
- 過去7日間の出荷履歴を表示
- 注文番号、トラッキング番号、出荷日時を表示

## 技術スタック

### フロントエンド
```
- Next.js 14（App Router）
- TypeScript
- Shopify Polaris（UIコンポーネント）
- @shopify/app-bridge-react（Shopify連携）
```

### バックエンド
```
- Node.js + Express
- Shopify Admin API（GraphQL）
- SQLite（シンプルなデータ保存）
```

## 必要なShopify API権限（スコープ）

```
read_orders        # 注文情報の読み取り
write_orders       # 注文情報の更新（フルフィルメント）
read_products      # 商品情報の読み取り（注文内容表示用）
read_fulfillments  # フルフィルメント情報の読み取り
write_fulfillments # フルフィルメント情報の書き込み
```

## 課金機能

### 料金プラン
```
1. 無料プラン
   - 月10件まで出荷処理可能
   - 基本機能のみ

2. ベーシックプラン（$9.99/月）
   - 月100件まで出荷処理可能
   - 出荷履歴エクスポート機能
   - メール通知カスタマイズ

3. プロプラン（$29.99/月）
   - 無制限の出荷処理
   - 一括出荷処理機能
   - API連携
   - 優先サポート
```

### Shopify Billing API実装
```javascript
// 課金プラン作成
const billingPlan = {
  name: "Quick Ship Tracker Basic",
  price: {
    amount: 9.99,
    currencyCode: "USD"
  },
  interval: "EVERY_30_DAYS",
  trialDays: 7,
  test: true // テスト環境では true
}
```

## 画面設計

### メイン画面
```
┌─────────────────────────────────────────┐
│  Quick Ship Tracker                     │
├─────────────────────────────────────────┤
│                                         │
│  [未発送注文] [出荷履歴]                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 注文一覧                        │   │
│  ├──────┬──────┬──────┬──────────┤   │
│  │注文# │顧客名│日付  │アクション│   │
│  ├──────┼──────┼──────┼──────────┤   │
│  │#1234 │山田  │12/1  │[出荷登録]│   │
│  │#1235 │田中  │12/1  │[出荷登録]│   │
│  │#1236 │佐藤  │12/2  │[出荷登録]│   │
│  └─────────────────────────────────┘   │
│                                         │
│  [< 前へ] [1] [2] [3] [次へ >]         │
│                                         │
└─────────────────────────────────────────┘
```

### 出荷登録モーダル
```
┌─────────────────────────────────────────┐
│  出荷情報を登録                          │
├─────────────────────────────────────────┤
│                                         │
│  注文番号: #1234                        │
│  顧客名: 山田太郎                       │
│                                         │
│  配送業者:                              │
│  [ヤマト運輸 ▼]                        │
│                                         │
│  トラッキング番号:                      │
│  [_________________________]           │
│                                         │
│  通知メール:                            │
│  ☑ 顧客に配送通知を送信                 │
│                                         │
│  [キャンセル] [出荷処理を実行]          │
│                                         │
└─────────────────────────────────────────┘
```

## インストール・アンインストールフロー

### インストール時の処理
```javascript
// 1. OAuth認証フロー
app.get('/auth', async (req, res) => {
  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `scope=${SCOPES}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `state=${nonce}`;
  res.redirect(authUrl);
});

// 2. コールバック処理
app.get('/auth/callback', async (req, res) => {
  const { shop, code } = req.query;
  // アクセストークン取得
  const accessToken = await getAccessToken(shop, code);
  // ショップ情報をDBに保存
  await saveShopData(shop, accessToken);
  // Webhooks登録
  await registerWebhooks(shop, accessToken);
  // 課金プラン選択画面へリダイレクト
  res.redirect(`/billing/select-plan?shop=${shop}`);
});

// 3. 必須Webhooks登録
const webhooks = [
  { topic: 'app/uninstalled', address: `${APP_URL}/webhooks/app/uninstalled` },
  { topic: 'customers/data_request', address: `${APP_URL}/webhooks/gdpr/customers_data_request` },
  { topic: 'customers/redact', address: `${APP_URL}/webhooks/gdpr/customers_redact` },
  { topic: 'shop/redact', address: `${APP_URL}/webhooks/gdpr/shop_redact` }
];
```

### アンインストール時の処理
```javascript
// app/uninstalled webhook
app.post('/webhooks/app/uninstalled', async (req, res) => {
  const shop = req.get('X-Shopify-Shop-Domain');
  // 課金のキャンセル
  await cancelSubscription(shop);
  // ショップデータのソフトデリート（GDPR準拠）
  await softDeleteShopData(shop);
  res.status(200).send('OK');
});
```

## ディレクトリ構造（完全版）

```
quick-ship-tracker/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # メイン画面
│   │   ├── billing/
│   │   │   ├── page.tsx       # 課金プラン選択
│   │   │   └── success/       # 課金成功画面
│   │   ├── settings/          # 設定画面
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/  # OAuth コールバック
│   │       └── webhooks/      # Webhook エンドポイント
│   ├── components/
│   │   ├── OrderList.tsx
│   │   ├── ShipmentModal.tsx
│   │   ├── ShipmentHistory.tsx
│   │   ├── BillingCard.tsx    # 課金状態表示
│   │   └── UsageLimit.tsx     # 使用制限表示
│   └── lib/
│       ├── shopify.ts         # Shopify API クライアント
│       └── billing.ts         # 課金関連ユーティリティ
│
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js           # OAuth認証
│   │   ├── billing.js        # 課金API
│   │   ├── orders.js         # 注文API
│   │   ├── fulfillments.js   # フルフィルメントAPI
│   │   └── webhooks.js       # Webhookハンドラー
│   ├── middleware/
│   │   ├── auth.js           # 認証ミドルウェア
│   │   └── billing.js        # 課金チェック
│   └── db/
│       ├── database.sqlite    # ローカルDB
│       └── migrations/        # DBマイグレーション
│
├── docs/
│   ├── privacy-policy.md     # プライバシーポリシー
│   └── terms-of-service.md   # 利用規約
│
├── .env.example
├── package.json
└── README.md
```

## 最小限の実装手順

### Phase 1: 基本セットアップ（1-2日）
1. Shopifyパートナーアカウントでアプリ作成
2. Next.jsプロジェクト初期化
3. Shopify OAuth認証実装
4. 必須Webhooksの実装（GDPR対応）

### Phase 2: コア機能実装（2-3日）
1. 注文一覧取得・表示
2. トラッキング番号入力フォーム
3. フルフィルメント作成API実装
4. 使用制限チェック（無料プラン10件制限）

### Phase 3: 課金機能実装（2日）
1. Shopify Billing API統合
2. 料金プラン選択画面
3. サブスクリプション管理
4. 使用量トラッキング

### Phase 4: インストールフロー（1日）
1. アプリインストール画面
2. 権限承認画面
3. 初期設定ウィザード
4. ウェルカムガイド

### Phase 5: 申請準備（2日）
1. アプリアイコン・バナー作成
2. スクリーンショット撮影（最低5枚）
3. デモビデオ録画
4. プライバシーポリシー・利用規約作成
5. アプリ説明文作成（日英）

## Shopifyアプリ申請に必要な最小要件

### 必須項目
- [ ] OAuth 2.0認証の実装
- [ ] Webhook登録（app/uninstalled）
- [ ] GDPR準拠のWebhook実装
- [ ] アプリアイコン（512x512px）
- [ ] アプリバナー（1920x1080px）
- [ ] スクリーンショット（最低3枚）
- [ ] 動作デモビデオ（オプションだが推奨）

### 申請時の説明文例

**アプリ名**: Quick Ship Tracker

**簡単な説明** (100文字以内):
```
注文の配送トラッキング番号を簡単に登録・管理できるシンプルな配送管理アプリ
```

**詳細説明**:
```
Quick Ship Trackerは、Shopifyストアの注文管理を効率化する配送管理アプリです。

主な機能：
• 未発送注文の一覧表示
• ワンクリックでトラッキング番号登録
• 自動的な顧客への配送通知
• 出荷履歴の管理

このアプリを使用することで、手動での配送情報入力の手間を削減し、
顧客への迅速な配送通知が可能になります。
```

## サンプルコード（最小限の実装）

### 注文取得GraphQLクエリ
```graphql
query getUnfulfilledOrders($first: Int!) {
  orders(first: $first, query: "fulfillment_status:unfulfilled") {
    edges {
      node {
        id
        name
        createdAt
        customer {
          displayName
        }
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
      }
    }
  }
}
```

### フルフィルメント作成Mutation
```graphql
mutation createFulfillment($input: FulfillmentCreateV2Input!) {
  fulfillmentCreateV2(fulfillment: $input) {
    fulfillment {
      id
      trackingInfo {
        number
        company
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

## 申請テストの流れ

1. **開発ストアで動作確認**
   - パートナーダッシュボードから開発ストア作成
   - アプリインストール・動作テスト

2. **申請前チェック**
   - アプリ要件チェックリスト確認
   - セキュリティスキャン実行
   - パフォーマンステスト

3. **申請提出**
   - パートナーダッシュボードから申請
   - 必要書類アップロード
   - レビュー待ち（通常3-5営業日）

4. **フィードバック対応**
   - Shopifyレビューチームからのフィードバック確認
   - 必要な修正を実施
   - 再提出

## 完全な申請チェックリスト

### 技術要件
- [x] OAuth 2.0認証実装
- [x] セッション管理（JWT使用）
- [x] HTTPS通信のみ
- [x] CSRFトークン実装
- [x] XSS対策
- [x] SQLインジェクション対策

### 必須Webhook
- [x] app/uninstalled
- [x] customers/data_request (GDPR)
- [x] customers/redact (GDPR)
- [x] shop/redact (GDPR)

### 課金要件
- [x] Shopify Billing API使用
- [x] 無料トライアル期間設定
- [x] プランアップグレード/ダウングレード対応
- [x] 使用量制限の明確な表示
- [x] 課金失敗時の処理

### UI/UX要件
- [x] Shopify Polarisデザインガイドライン準拠
- [x] レスポンシブデザイン
- [x] エラー処理とユーザーフィードバック
- [x] ローディング状態の表示
- [x] 多言語対応（最低限英語）

### ドキュメント要件
- [x] プライバシーポリシー（URL必須）
- [x] 利用規約（URL必須）
- [x] サポート連絡先
- [x] よくある質問（FAQ）
- [x] インストールガイド

### アプリリスティング
- [x] アプリ名（ユニークであること）
- [x] アプリアイコン（512x512px）
- [x] アプリバナー（1920x1080px）
- [x] スクリーンショット（1280x720px、最低5枚）
- [x] 紹介ビデオ（2-3分推奨）
- [x] 短い説明（100文字以内）
- [x] 詳細説明（500文字以上）
- [x] 主要機能リスト（箇条書き）
- [x] カテゴリ選択

### パフォーマンス要件
- [x] ページ読み込み3秒以内
- [x] API応答2秒以内
- [x] エラー率1%未満
- [x] 99%以上の稼働率

## 注意事項

- 申請は無料だが、レビューに**5-10営業日**かかる
- **80%以上が初回リジェクト**されることを想定
- フィードバックを元に改善して再申請（通常2-3回）
- 本番アプリ開発前の良い練習になる
- テストアプリでも実際の申請プロセスは同じ

## まとめ

このサンプルアプリは：
- **最小限の機能**で申請プロセスを体験できる
- **実装が簡単**（3-4日で完成可能）
- **実用的**（実際に使える機能）
- **申請要件を満たす**（OAuth、Webhook、GDPR対応）

これにより、本番のEC Rangerアプリ申請時には、プロセスを理解した上でスムーズに進められます。