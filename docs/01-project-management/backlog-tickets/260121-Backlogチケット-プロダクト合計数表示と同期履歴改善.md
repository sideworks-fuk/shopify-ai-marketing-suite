# Backlogチケット: プロダクト合計数表示と同期履歴改善

## タイトル
プロダクト合計数表示の修正と同期履歴改善

## 種別
バグ修正 / 改善

## 優先度
中

## 説明

### 問題1: 商品数カウントの不整合

**現象**:
- 商品管理画面で商品を削除しても、合計数が更新されない
- 例: 150個の商品を50個に減らした後、再同期しても150のまま表示される

**原因**:
- 削除後の再カウント処理に問題がある可能性
- 過去のデータが残っている可能性

**対応**:
- 商品数のカウントロジックを修正
- 削除された商品を除外してカウントする処理を実装

### 問題2: Shopify商品削除時の同期方法

**課題**:
- Shopify側で物理削除された商品データの同期方法が未確定
- 削除フラグが取得できるか確認が必要

**調査事項**:
- Shopify APIで削除フラグが取得できるか
- 物理削除か論理削除かを確認
- 削除された商品の同期方法を決定

**暫定方針**:
- サービス仕様として「Shopifyで削除されたデータはこちらも削除される」と明記
- 全データを再取得して同期する運用も検討
- 削除フラグが取得できる場合は、それを使用

**対応**:
- Shopify APIの仕様を調査
- 削除された商品の同期方法を決定
- 必要に応じて実装

### 問題3: 同期履歴の表示

**現象**:
- 同期履歴タブに履歴が表示されない
- 手動同期や初回同期を実行しても履歴が表示されない

**対応方針（要決定）**:
- オプション1: 同期履歴の表示を改善（履歴が正しく表示されるように修正）
- オプション2: 同期履歴タブ自体を削除

**対応**:
- 表示改善かタブ削除かを決定
- 決定に基づいて実装

## 完了条件
- [x] 商品数カウントの問題を修正（削除後も正しくカウントされる）
- [x] Shopifyの商品削除時の同期方法を調査・方針決定
- [x] 同期履歴表示の方針を決定（表示改善 or タブ削除）
- [x] 決定した方針に基づいて実装
- [x] マイグレーション適用（Development環境）
- [x] マイグレーション適用（Production環境）(2026-01-23 01:13)
- [ ] 動作確認完了

## 実装完了（2026-01-23）

### 対応内容

#### 問題1: 商品数カウントの不整合 → 解決
- **対応**: ProductsテーブルにIsActiveフィールドを追加（論理削除）
- **変更ファイル**:
  - `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs` - IsActiveフィールド追加
  - `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs` - 同期時にIsActive=trueを設定
  - `backend/ShopifyAnalyticsApi/Controllers/DatabaseController.cs` - IsActive=trueでカウント
  - `backend/ShopifyAnalyticsApi/Controllers/DashboardController.cs` - IsActive=trueでカウント
  - `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs` - IsActive=trueでカウント
  - `backend/ShopifyAnalyticsApi/Controllers/CustomerController.cs` - IsActive=trueでカウント
  - `backend/ShopifyAnalyticsApi/Services/StoreService.cs` - IsActive=trueでカウント
  - `backend/ShopifyAnalyticsApi/Services/ShopifyDataSyncService.cs` - IsActive=trueでカウント
- **マイグレーション**: `2026-01-23-AddIsActiveToProducts.sql`

#### 問題2: Shopify商品削除時の同期方法 → 実装完了
- **調査結果**: Shopify APIでは `products/delete` Webhookと Event API で削除を検知可能
- **決定方針**: 論理削除（IsActive=false）を採用
- **実装内容**:
  - フルスキャン同期（全期間）時に削除商品を自動検知
  - 同期で取得したShopify商品IDをHashSetで収集
  - ローカルDBにのみ存在する商品を `IsActive = false` に更新
  - `DeactivateDeletedProducts` メソッドを新規実装
- **変更ファイル**: `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs`
- **UI改善**: 「全期間」選択時に削除商品が整理される旨の説明を追加

#### 問題3: 同期履歴の表示 → 表示改善
- **原因**: 初期設定ページで同期履歴APIを呼び出していなかった（TODOコメントアウト状態）
- **対応**: `/api/sync/history` APIを呼び出すよう修正
- **変更ファイル**: `frontend/src/app/setup/initial/page.tsx`

## 関連情報
- 注文データは論理削除（ステータスで管理）のため問題なし
- 商品データは物理削除される可能性があるため、対応が必要

## 技術調査ドキュメント
- `docs/01-project-management/backlog-tickets/260123-技術確認-商品削除同期と履歴表示.md`
