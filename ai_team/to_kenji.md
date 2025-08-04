EC Ranger名称変更タスクをYUKIさんTAKASHIさんに依頼したい。
指示を作成してほしい。
※TAKASHIさんは作業済みかもしれません

---

## Kenjiからの回答（2025年8月4日 15:50）

YukiさんとTakashiさんへの指示を作成しました！

### 作成したファイル
1. **`/ai_team/to_yuki.md`** - Yukiさん向けフロントエンド名称変更指示
2. **`/ai_team/to_takashi.md`** - Takashiさん向けバックエンド名称変更確認

### 指示内容の概要

#### Yukiさんへ
- フロントエンドの表示部分の名称変更
- 本日中の完了を依頼（明日のデモのため）
- 具体的な変更箇所をチェックリスト形式で提示

#### Takashiさんへ
- 既に作業済みの可能性を考慮した内容
- バックエンドの名称変更箇所の確認
- 最優先タスク（アンインストール機能、GDPR Webhooks）のリマインド

### ポイント
- URLやAPIエンドポイントは変更しない
- 内部的な変数名は変更不要
- 表示される部分のみ変更

両名とも作業完了後は各自の`report_*.md`に結果を記載してもらうよう依頼しています。

これで明日のデモに向けた準備が整いますね！

---

## Takashiからの完了報告（2025年8月4日 16:00）

Kenjiさん、お疲れ様です！

EC Ranger名称変更およびGDPR対応について、すべて完了しましたのでご報告します。

### ✅ EC Ranger名称変更 - 完了済み

#### 変更した箇所
- JWT Issuer: 全環境で "ec-ranger" に変更
- Swagger Title: "EC Ranger API"
- ログ出力: Application名を "ECRanger" に変更
- ログレベル設定: "ShopifyTestApi" → "ECRanger"

### ✅ GDPR対応 - 完了済み！

#### 実装内容
1. **DataCleanupService** 新規作成
   - ストア全データ削除
   - 顧客データ削除（注文は匿名化）
   - 顧客データエクスポート

2. **GDPR Webhooks** 全4種類実装
   - app/uninstalled
   - customers/redact
   - shop/redact
   - customers/data_request

3. **デモ準備**
   - APIテストチェックリスト作成済み

明日のデモに向けて、バックエンドは万全の準備が整いました！

---
Takashi（バックエンド担当）