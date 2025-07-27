# Shopify AI Marketing Suite - 画面設計書

## 🎯 8大機能一覧

Shopify AI Marketing Suiteの主要機能の画面設計書を機能カテゴリ別に整理しています。

**最終更新日**: 2025年7月27日  
**総機能数**: 8機能（商品分析3 + 購買分析3 + 顧客分析2）

---

## 🛍️ 商品分析機能（3機能）

| 機能ID | 機能名 | 実装状況 | 優先度 | 設計書 |
|--------|--------|----------|--------|--------|
| **PROD-01** | 前年同月比分析 | 🚧 実装中 | 🔴 高 | [詳細](./product-analysis/PROD-01-YOY.md) |
| **PROD-02** | 購入頻度分析 | 📝 設計完了 | 🟢 低 | [詳細](./product-analysis/PROD-02-FREQ.md) |
| **PROD-03** | 組み合わせ商品分析 | 📝 設計完了 | 🟢 低 | [詳細](./product-analysis/PROD-03-BASKET.md) |

**カテゴリ概要**: 商品の売上トレンド、購入パターン、組み合わせ分析により商品戦略をサポート  
**詳細**: [商品分析機能一覧](./product-analysis/README.md)

---

## 💰 購買分析機能（3機能）

| 機能ID | 機能名 | 実装状況 | 優先度 | 設計書 |
|--------|--------|----------|--------|--------|
| **PURCH-01** | 月別売上統計 | 📝 設計完了 | 🟢 低 | [詳細](./purchase-analysis/PURCH-01-MONTHLY.md) |
| **PURCH-02** | 購入回数分析 | 🚧 実装中 | 🟡 中 | [詳細](./purchase-analysis/PURCH-02-COUNT.md) |
| **PURCH-03** | F階層傾向分析 | 📝 設計完了 | 🟢 低 | [詳細](./purchase-analysis/PURCH-03-FTIER.md) |

**カテゴリ概要**: 購買行動の時系列分析、購入パターンの可視化により売上最適化をサポート  
**詳細**: [購買分析機能一覧](./purchase-analysis/README.md)

---

## 👥 顧客分析機能（2機能）

| 機能ID | 機能名 | 実装状況 | 優先度 | 設計書 |
|--------|--------|----------|--------|--------|
| **CUST-01** | 休眠顧客分析 | ✅ 実装済み | 🔴 高 | [詳細](./customer-analysis/CUST-01-DORMANT.md) |
| **CUST-02** | 顧客分析ダッシュボード | 📝 設計完了 | 🟡 中 | [詳細](./customer-analysis/CUST-02-ANALYSIS.md) |

**カテゴリ概要**: 顧客セグメンテーション、ライフサイクル分析により顧客価値最大化をサポート  
**詳細**: [顧客分析機能一覧](./customer-analysis/README.md)

---

## 📊 開発進捗サマリー

### 実装状況別
- ✅ **実装済み**: 1機能（CUST-01）
- 🚧 **実装中**: 2機能（PROD-01, PURCH-02）
- 📝 **設計完了**: 5機能（PROD-02, PROD-03, PURCH-01, PURCH-03, CUST-02）

### 優先度別
- 🔴 **高優先度**: 2機能（PROD-01, CUST-01）
- 🟡 **中優先度**: 2機能（PURCH-02, CUST-02）
- 🟢 **低優先度**: 4機能（PROD-02, PROD-03, PURCH-01, PURCH-03）

### 開発完了率
```
■■■□□□□□ 25% (2/8機能が実装済み・実装中)
```

---

## 🔍 クイックアクセス

### 機能ID別検索
| 機能ID | 直接リンク |
|--------|------------|
| PROD-01 | [前年同月比分析](./product-analysis/PROD-01-YOY.md) |
| PROD-02 | [購入頻度分析](./product-analysis/PROD-02-FREQ.md) |
| PROD-03 | [組み合わせ商品分析](./product-analysis/PROD-03-BASKET.md) |
| PURCH-01 | [月別売上統計](./purchase-analysis/PURCH-01-MONTHLY.md) |
| PURCH-02 | [購入回数分析](./purchase-analysis/PURCH-02-COUNT.md) |
| PURCH-03 | [F階層傾向分析](./purchase-analysis/PURCH-03-FTIER.md) |
| CUST-01 | [休眠顧客分析](./customer-analysis/CUST-01-DORMANT.md) |
| CUST-02 | [顧客分析ダッシュボード](./customer-analysis/CUST-02-ANALYSIS.md) |

### 状況別検索
- **実装済み機能**: [CUST-01](./customer-analysis/CUST-01-DORMANT.md)
- **開発中機能**: [PROD-01](./product-analysis/PROD-01-YOY.md), [PURCH-02](./purchase-analysis/PURCH-02-COUNT.md)
- **次期開発候補**: [CUST-02](./customer-analysis/CUST-02-ANALYSIS.md)

---

## 📝 ドキュメント更新ルール

1. **実装状況更新**: 機能実装完了時は該当行の状況を「✅ 実装済み」に変更
2. **優先度変更**: ビジネス要件変更時は優先度カラムを更新
3. **新機能追加**: 新機能追加時は該当カテゴリに行を追加し、設計書を作成
4. **月次レビュー**: 毎月末に進捗状況と優先度を見直し

---

**管理者**: 福田 + AIアシスタントケンジ  
**次回更新予定**: 2025年8月27日