# 作業ログ: データ同期機能ソースレビュー

## 作業情報
- 開始日時: 2026-01-19 22:00:02
- 完了日時: 2026-01-19 22:03:17
- 所要時間: 0時間3分
- 担当: 福田＋AI Assistant

## 作業概要
データ同期機能のソースを確認し、オーダー日時の不整合などの懸念点をレビューとして整理した。

## 実施内容
1. データ同期関連のソース（API/ジョブ/モデル）を確認
2. オーダー日時の登録不整合に関する原因を整理
3. レビュー結果をドキュメント化

## 成果物
- docs/03-feature-development/データ同期機能/2026-01-19-データ同期機能ソースレビュー.md
- tasks/task-260119-data-sync-review.md

## 課題・注意点
- JSONのsnake_caseマッピング不足により注文日時が現在時刻で保存される可能性がある
- OrderNumberのユニーク制約がマルチストアで衝突する可能性がある

## 関連ファイル
- backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs
- backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs
- backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs
