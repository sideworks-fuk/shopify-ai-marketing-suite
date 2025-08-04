# Shopify統合機能 実装計画 - 2025年8月2日

## 優先実装タスク

### 1. Shopify管理画面へのリンク追加（優先度：高）

#### 実装内容
App Bridge Navigationを使用して、Shopify管理画面からアプリにアクセスしやすくする。

#### タスク分解
1. **App Bridge React導入**（2時間）
   - `@shopify/app-bridge-react`パッケージのインストール
   - App Bridge Provider設定
   - 認証コンテキスト統合

2. **NavigationMenuコンポーネント実装**（3時間）
   - メインレイアウトへの統合
   - ナビゲーションリンク設定
   - アイコンとラベルの設計

3. **ルーティング調整**（2時間）
   - Shopify埋め込みアプリ用のルート設定
   - iframe対応（X-Frame-Options）
   - セッション管理の調整

4. **テストと検証**（1時間）
   - 開発ストアでの動作確認
   - 各画面へのナビゲーション確認

#### 想定実装コード
```typescript
// components/ShopifyNavigation.tsx
import { NavigationMenu } from '@shopify/app-bridge-react';

export function ShopifyNavigation() {
  return (
    <NavigationMenu
      navigationLinks={[
        {
          label: 'ダッシュボード',
          destination: '/',
        },
        {
          label: '休眠顧客分析',
          destination: '/customer-analysis/dormant',
        },
        {
          label: '前年同月比分析',
          destination: '/product-analysis/year-over-year',
        },
        {
          label: '購入回数分析',
          destination: '/purchase-analysis/count',
        },
      ]}
    />
  );
}
```

### 2. アンインストール機能（優先度：中）

#### 実装内容
GDPR準拠のため、アプリアンインストール時のデータ削除処理を実装。

#### タスク分解
1. **Webhook Controller拡張**（3時間）
   - `app/uninstalled` エンドポイント追加
   - Webhook検証ロジック
   - エラーハンドリング

2. **データ削除サービス実装**（4時間）
   - 個人情報削除ロジック
   - データ匿名化処理
   - トランザクション管理

3. **データ保持ポリシー実装**（2時間）
   - 30日間の猶予期間設定
   - ソフトデリート実装
   - 復元機能の検討

4. **ログとモニタリング**（1時間）
   - アンインストールイベントログ
   - Application Insights統合

## 実装スケジュール

### 第1フェーズ（8月5日週）
- App Bridge Navigation実装
- 基本的なナビゲーション動作確認

### 第2フェーズ（8月12日週）
- アンインストールWebhook実装
- データ削除ロジック実装

### 第3フェーズ（8月19日週）
- 統合テスト
- Shopifyアプリ審査準備

## 技術的考慮事項

### App Bridge Navigation
- CSP（Content Security Policy）設定の調整が必要
- iframe内での動作を考慮したスタイリング
- セッショントークンの管理

### アンインストール処理
- 大量データの非同期削除
- 部分的失敗時のリトライ機構
- GDPR準拠の証跡管理

## リスクと対策

1. **CSPエラー**
   - 対策：適切なCSPヘッダー設定

2. **パフォーマンス問題**
   - 対策：バッチ削除とキューイング

3. **データ復元要求**
   - 対策：30日間のソフトデリート期間

## 次のアクション

1. TAKASHIさんにApp Bridge Navigation実装を依頼
2. YUKIさんにフロントエンド統合を依頼
3. 週明けのデモでプロトタイプを提示