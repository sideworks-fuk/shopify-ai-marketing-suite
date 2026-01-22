# 公開アプリインストール時のProtected Customer Dataエラーについて

## 📋 状況報告

### ✅ 解決済み
- **認証エラー**: 新ドメイン設定変更により解消
- **商品データ同期**: 正常に取得できています

### ⚠️ 発生中の問題
- **顧客データ取得エラー**: `Failed to fetch customers: Forbidden`
- **注文データ取得エラー**: `Failed to fetch orders: Protected customer data. Forbidden`

## 🔍 原因

**ShopifyのProtected Customer Data（保護された顧客データ）へのアクセス承認が必要**です。

### カスタムアプリとの違い
- **カスタムアプリ**: Protected Customer Data へのアクセス承認が不要（開発者自身が所有）
- **公開アプリ**: Protected Customer Data へのアクセス承認が必要（第三者ストアのデータアクセス）

### エラー詳細
```
Failed to fetch customers: Forbidden

Failed to fetch orders: Protected customer data. Forbidden
```

**影響範囲**:
- ✅ 商品データ: 正常に取得可能
- ❌ 顧客データ: 取得不可（承認待ち）
- ❌ 注文データ: 取得不可（顧客情報を含むため承認待ち）

## 📊 現在の同期状態

### 同期結果
- **商品データ**: ✅ 正常に同期完了（150件）
- **顧客データ**: ❌ エラー（Protected Customer Data未承認により自動スキップ）
- **注文データ**: ❌ エラー（Protected Customer Data未承認により自動スキップ）

### 同期ステータス
```
Status: completed（部分的な成功）
- 顧客データ同期がスキップされました: Protected Customer Data未承認
- 注文データ同期がスキップされました: Protected Customer Data未承認
```

## ✅ 対応方針

### 1. Protected Customer Data へのアクセス申請（準備中）

**申請先**: Shopify Partners管理画面  
**URL**: https://partners.shopify.com → Apps → EC Ranger → App setup → Protected customer data

**現在の状態**: 
- ⚠️ **下書き (Draft)** 状態
- ✅ セクション1（データの用途と理由）: 完了
  - 保護された顧客データ: 選択済み
  - 理由: 「その他 (顧客データ分析機能を提供するために、顧客情報へのアクセスが必要です。以下の機能で使用します: 顧客分析・レポート機能 - 注文データと顧客データの関連付け - 休眠顧客分析機能)」
- ✅ セクション2（データ保護に関する詳細情報）: 「9件中、9件の質問が完了しました」
- ⚠️ **提出方法が不明**: 現在の画面には提出ボタンが見当たらない

**申請理由（記入済み）**:
```
その他 (顧客データ分析機能を提供するために、顧客情報へのアクセスが必要です。以下の機能で使用します: 顧客分析・レポート機能 - 注文データと顧客データの関連付け - 休眠顧客分析機能)
```

### 📋 提出方法について

**⚠️ 重要**: Protected Customer Dataへのアクセス申請は、**アプリ申請（App Storeへの申請）と一緒に提出される**可能性があります。

**一般的な提出フロー**:
1. **アプリ申請（App Storeへの申請）**を実行
2. アプリ申請の審査プロセスで、Protected Customer Dataへのアクセスも同時に審査される
3. または、アプリ申請後に個別に提出が必要な場合もある

**確認事項**:
- Shopify Partners管理画面の「App setup」セクションで、アプリ申請のステータスを確認
- アプリ申請ページにProtected Customer Dataへのアクセス申請を含めるオプションがあるか確認
- アプリ申請後にProtected Customer Dataセクションに「提出」ボタンが表示されるか確認

**次のステップ**:
1. ✅ 詳細情報の入力完了（済み）
2. 🔍 **アプリ申請ページを確認**して、Protected Customer Dataの申請が含まれているか確認
3. 📤 **アプリ申請を実行**（Protected Customer Dataへのアクセスも同時に審査される可能性が高い）
4. ⏳ 承認を待つ（通常1-3営業日）

### 2. 承認後の対応

1. 承認確認
2. データ同期の再実行 (`/sync/initial` または `/sync/trigger`)
3. 顧客データ・注文データの取得確認

## 📝 技術的な対応状況

### 実装済みのエラーハンドリング
- Protected Customer Data エラーを自動検出
- 顧客データ同期を自動スキップ
- 商品データ同期は継続（正常動作中）
- エラーメッセージをログ・データベースに記録

### 一時的な動作
- 商品データのみ同期可能な状態
- 顧客データ・注文データは承認後に同期可能

## 📋 提出方法の確認手順

### ステップ1: アプリ申請ページの確認

1. **Shopify Partners管理画面**にアクセス
   - URL: https://partners.shopify.com
   - Apps → EC Ranger → **App setup** → **App listings** または **Submit for review**

2. **アプリ申請ページ**で以下を確認：
   - Protected Customer Dataへのアクセス申請が含まれているか
   - 「Submit for review」ボタンにProtected Customer Dataの情報が含まれているか
   - 申請チェックリストにProtected Customer Dataが含まれているか

### ステップ2: アプリ申請の実行

**パターンA: アプリ申請と同時に提出される場合**
- アプリ申請（Submit for review）を実行すると、Protected Customer Dataへのアクセスも同時に審査される
- この場合、Protected Customer Dataセクションで個別に提出する必要はない

**パターンB: アプリ申請後に個別に提出が必要な場合**
- アプリ申請が承認された後、Protected Customer Dataセクションに「提出」または「Request access」ボタンが表示される
- このボタンをクリックして申請を提出

### ステップ3: 申請後の確認

- 申請後、Protected Customer Dataセクションの状態が「下書き」から「審査中」または「Pending」に変わる
- Shopifyからのメール通知を確認
- 承認後、自動的に有効になる

## 🔗 参考情報

- [Shopify Protected Customer Data Documentation](https://shopify.dev/docs/apps/launch/protected-customer-data)
- [Shopify Partners Dashboard](https://partners.shopify.com/)
- [Shopify App Store Listing Requirements](https://shopify.dev/docs/apps/app-store/requirements)

## 📅 スケジュール

- **2026-01-20**: エラー確認・原因調査完了
- **2026-01-20**: Protected Customer Data へのアクセス申請準備中（現在「下書き」状態）
- **次のステップ**: 「管理」ボタンから詳細情報を入力して申請を提出
- **申請提出後**: 承認待ち（通常1-3営業日）
- **承認後**: データ同期の再実行予定

---

**作成日**: 2026-01-20  
**作成者**: 福田
