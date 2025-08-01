# Shopify アプリ開発要件まとめ

**作成日**: 2025年7月29日  
**更新者**: ケンジ  
**申請期限**: 2025年8月8日（残り7日）

## 1. 現状のドキュメント整理結果

### 📁 既存ドキュメント
- ✅ カスタムアプリ開発ガイド（技術調査メモ）
- ✅ デプロイテストフェーズ計画
- ✅ 基本用語と概念
- ❌ **App Store審査・申請ガイド（空ファイル）**

### 🚨 緊急作成が必要なドキュメント
1. **プライバシーポリシー**（日本語・英語）
2. **利用規約**（日本語・英語）
3. **アプリ説明文**（日本語・英語）
4. **インストール手順書**
5. **サポート連絡先情報**

## 2. 必須技術要件（8月8日まで）

### 🔴 最優先実装項目

#### 2.1 OAuth 2.0認証フロー
```
必須エンドポイント:
- GET  /api/shopify/install?shop={shop_domain}
- GET  /api/shopify/callback?code={code}&shop={shop}
- POST /api/shopify/uninstall (webhook)
```

**実装要件**:
- HMAC署名検証
- State パラメータ（CSRF対策）
- セキュアなトークン保存（Azure Key Vault）
- HTTPSのみでのコールバック

#### 2.2 GDPR対応必須Webhook
```
必須実装:
1. app/uninstalled - アプリアンインストール時の処理
2. customers/redact - 顧客データ削除要求
3. shop/redact - ショップデータ削除要求  
4. customers/data_request - 顧客データ開示要求
```

#### 2.3 セキュリティ要件
- **HTTPS必須**: すべてのエンドポイント
- **HMAC検証**: すべてのWebhook
- **レート制限**: 2リクエスト/秒
- **トークン暗号化**: 保存時の暗号化必須

## 3. Shopify API制限事項

### 3.1 レート制限
- **REST API**: 2リクエスト/秒
- **GraphQL API**: 計算されたコストベース
- **対策**: リトライ機構、キューイング

### 3.2 データ取得制限
- **最大ページサイズ**: 250アイテム
- **GraphQL複雑度**: 1000ポイント/クエリ
- **対策**: バルクオペレーション使用

### 3.3 Webhook制限
- **タイムアウト**: 5秒以内にレスポンス
- **リトライ**: 48時間で19回
- **対策**: 非同期処理、キューイング

## 4. アプリ審査チェックリスト

### 4.1 機能要件 ✅
- [ ] OAuth認証フロー実装
- [ ] 必須Webhook実装（4種類）
- [ ] データ同期機能
- [ ] エラーハンドリング

### 4.2 ドキュメント要件 📝
- [ ] プライバシーポリシー
- [ ] 利用規約
- [ ] アプリ説明（日本語）
- [ ] アプリ説明（英語）
- [ ] スクリーンショット（最低5枚）

### 4.3 セキュリティ要件 🔒
- [ ] HTTPS通信
- [ ] HMAC検証
- [ ] トークン暗号化
- [ ] レート制限実装

### 4.4 UI/UX要件 🎨
- [ ] Polarisデザインシステム準拠
- [ ] レスポンシブデザイン
- [ ] エラーメッセージの適切な表示
- [ ] ローディング状態の表示

## 5. 早稲田メーヤウ様固有要件

### 5.1 ビジネス要件
- **激辛レベル分析**: 商品の辛さレベル（★1-5）での分析
- **サブスクリプション管理**: 定期購入顧客の管理
- **カレー専門分析**: カレー関連商品の特別な分析機能

### 5.2 データ要件
- **商品メタデータ**: 辛さレベル、原材料
- **顧客セグメント**: 辛さ耐性による分類
- **注文パターン**: リピート率、購入間隔

## 6. 実装優先順位（残り7日）

### Day 1-2（7/29-30）: 基礎準備 ⚡
1. OAuth認証フロー設計
2. サンプルデータ生成ツール
3. ドキュメントテンプレート作成

### Day 3-4（7/31-8/1）: コア機能 🔧
1. OAuth実装完了
2. 必須Webhook実装
3. 基本的なデータ同期

### Day 5-6（8/2-3）: Azure統合 ☁️
1. Azure Functions設定
2. バッチ処理実装
3. エラーハンドリング

### Day 7-8（8/4-5）: 品質保証 ✨
1. セキュリティテスト
2. パフォーマンステスト
3. ドキュメント完成

### Day 9-10（8/6-7）: 最終準備 🚀
1. 本番環境デプロイ
2. 最終チェック
3. 申請提出

## 7. リスクと対策

### 7.1 技術的リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| OAuth未実装 | 高 | 最優先で実装 |
| レート制限 | 中 | リトライ機構実装 |
| Webhook処理遅延 | 中 | 非同期処理実装 |

### 7.2 申請リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| ドキュメント不足 | 高 | テンプレート使用 |
| セキュリティ不備 | 高 | チェックリスト確認 |
| UI/UX問題 | 中 | Polaris使用 |

## 8. 次のアクション

### 本日中に完了すべきタスク
1. ✅ ドキュメント整理（完了）
2. ⏳ OAuth実装設計書作成
3. ⏳ プライバシーポリシー草案作成
4. ⏳ アプリ説明文草案作成

### 明日の優先タスク
1. OAuth実装開始
2. サンプルデータ生成ツール作成
3. Webhook設計書作成

---

**重要**: 8月8日の申請期限まで残り7日です。OAuth実装とGDPR対応Webhookが最優先事項です。