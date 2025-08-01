# Backlogチケット: テストストアデータ準備と動作確認手順

## チケット概要
- **タイトル**: テストストアデータの準備と動作確認手順の整備
- **優先度**: 中
- **担当者**: 開発チーム
- **期限**: 2025年7月31日

## 背景
開発・テスト・デモ用に複数のストアデータを切り替えて使用できる機能が実装されました。
非エンジニアメンバーも含めて、誰でも簡単にテストデータでの動作確認ができるよう、手順を整備します。

## 実装内容

### 1. テストストアデータの確認と整備
- [ ] Store ID=2（テストストア）のデータ完全性チェック
  - 顧客データ: 20件（多様な購買パターン）
  - 商品データ: 27件（各カテゴリ網羅）
  - 注文データ: 169件（2020-2025年7月）
- [ ] データの不足があれば追加

### 2. 動作確認手順書の作成
- [ ] 非エンジニア向けの簡易手順書作成
- [ ] スクリーンショット付きガイド作成

### 3. ストア切り替え機能の説明資料
- [ ] ストア選択UIの使い方
- [ ] 各ストアの特徴説明

## 確認すべき画面と期待される動作

### ストア1（本番ストア）
- 実際のビジネスデータ
- リアルタイムの分析結果

### ストア2（テストストア）
| 画面 | 確認ポイント |
|------|------------|
| 前年同月比【商品】 | 2020-2025年の完全データで各年の比較が可能 |
| 購入回数分析【購買】 | 5階層（1回/2回/3-5回/6-10回/11回以上）の分布確認 |
| 休眠顧客分析【顧客】 | 山田由美（350日休眠）など設計された休眠パターン |

### ストア3（デモストア）
- プレゼンテーション用の整理されたデータ
- 分かりやすい傾向を示すサンプル

## 成果物
1. テストデータ一覧表（Excel/CSV）
2. 動作確認手順書（PDF）
3. ストア切り替えガイド（PDF）
4. FAQ文書

## 受け入れ条件
- [ ] 非エンジニアが手順書を見て独力で動作確認できる
- [ ] 全3画面で正しいテストデータが表示される
- [ ] ストア切り替えが3秒以内に完了する

## 備考
- テストデータは個人情報を含まない匿名化済みデータ
- 将来的にはShopify認証で自動的にストアが決定される予定