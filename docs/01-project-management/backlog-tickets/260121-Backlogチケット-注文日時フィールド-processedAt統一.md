# Backlogチケット: 注文日時フィールドをprocessedAtに統一

## タイトル
注文日時フィールドをprocessedAt（決済完了日時）に統一

## 種別
改善

## 優先度
高

## 期限
2026-01-21（明日まで）

## 説明

### 背景
現在、注文データの日付フィールドとして`createdAt`（注文登録時間）を使用しているが、分析レポートでは`processedAt`（決済完了日時）を使用すべきであることが判明。

Shopify公式ドキュメントでも、分析レポートでは`processedAt`が推奨されている。

### 影響範囲
以下の機能で日付フィールドを`processedAt`に統一する必要がある：

1. **休眠顧客分析**
   - 最終注文日の判定
   - 休眠日数の計算

2. **購入回数分析**
   - 注文日時の参照

3. **前年同月比分析**
   - 期間集計の基準日時

4. **その他のオーダー分析系**
   - 期間集計・一覧の対象日
   - ダッシュボードの売上集計

### 対応内容

#### 1. データ取得の改修
- Shopify REST APIからGraphQL APIへの移行（または両方を使用）
- `processedAt`フィールドを取得して保存
- `Order`エンティティに`ShopifyProcessedAt`フィールドを追加
- マイグレーションを作成

#### 2. 分析処理の修正
- 休眠顧客分析: `ShopifyProcessedAt ?? ShopifyCreatedAt ?? CreatedAt`を使用
- 購入回数分析: `ShopifyProcessedAt ?? ShopifyCreatedAt ?? CreatedAt`を使用
- 前年同月比分析: `ShopifyProcessedAt ?? ShopifyCreatedAt ?? CreatedAt`を使用
- その他のオーダー分析系: 同様に修正

### 参考
- Shopify公式確認結果: `docs/05-development/08-デバッグ・トラブル/01-problem-analysis/2026-01/2026-01-20-注文日時フィールド-Shopify公式確認結果.md`
- 注文日時フィールド参照先確認結果: `docs/05-development/08-デバッグ・トラブル/01-problem-analysis/2026-01/2026-01-20-注文日時フィールド-参照先確認結果.md`

## 完了条件
- [ ] `Order`エンティティに`ShopifyProcessedAt`フィールドを追加
- [ ] マイグレーションを作成・適用
- [ ] Shopify APIから`processedAt`を取得して保存する処理を実装
- [ ] 休眠顧客分析で`processedAt`を使用するよう修正
- [ ] 購入回数分析で`processedAt`を使用するよう修正
- [ ] 前年同月比分析で`processedAt`を使用するよう修正
- [ ] その他のオーダー分析系で`processedAt`を使用するよう修正
- [ ] 動作確認完了

## 関連タスク
- 動画撮影の準備（データ整理が完了すれば明後日から撮影可能）
