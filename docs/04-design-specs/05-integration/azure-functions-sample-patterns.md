# Azure Functions サンプルパターン集

## 概要
Shopifyアプリケーションで使用される様々なAzure Functionsパターンのサンプル集。

## サンプル一覧

### 1. Timer Trigger - 定期実行
- **用途**: バッチ処理、定期的なデータ同期
- **例**: Shopifyデータの定期取得
- **フォルダ**: `/backend/azure-functions-sample/ShopifyAzureFunctionsSample/`
- **ステータス**: ✅ 完成

### 2. HTTP Trigger - API/Database接続
- **用途**: REST API、データベースクエリ
- **例**: 注文統計の取得API
- **フォルダ**: `/backend/azure-functions-sample/DatabaseFunction/`
- **ステータス**: 🚧 開発中
- **技術要素**:
  - Azure SQL Database接続
  - Managed Identity
  - Dapper ORM

### 3. Queue Trigger - 非同期処理
- **用途**: Webhook処理、メッセージ処理
- **例**: Shopify Webhookの処理
- **フォルダ**: `/backend/azure-functions-sample/WebhookFunction/`
- **ステータス**: 📅 予定
- **技術要素**:
  - Azure Queue Storage
  - Pollyによるリトライ
  - Dead Letter Queue

### 4. Blob Trigger - ファイル処理
- **用途**: CSVインポート、レポート生成
- **例**: 注文データのバルクインポート
- **フォルダ**: `/backend/azure-functions-sample/BlobFunction/`
- **ステータス**: 📅 予定
- **技術要素**:
  - Azure Blob Storage
  - ストリーミング処理
  - 大容量ファイル対応

## 将来の拡張案

### 5. Service Bus Trigger
- **用途**: エンタープライズ統合
- **例**: 在庫同期システム

### 6. Event Grid Trigger
- **用途**: イベント駆動アーキテクチャ
- **例**: リアルタイム通知

### 7. Durable Functions
- **用途**: 長時間実行ワークフロー
- **例**: 複雑な承認フロー

## 使い方

1. 各サンプルフォルダのREADME.mdを参照
2. local.settings.jsonを設定
3. `func start`でローカル実行
4. デプロイ手順に従ってAzureへデプロイ

## 選定基準

どのトリガータイプを使うか：

| シナリオ | 推奨トリガー | 理由 |
|---------|------------|------|
| 定期的なデータ同期 | Timer | シンプルで信頼性が高い |
| REST API | HTTP | 標準的なWeb API |
| 非同期処理 | Queue | スケーラブルで復元力がある |
| ファイル処理 | Blob | ファイルイベント駆動 |

---

作成: 2025-08-02
更新: 随時
作成者: KENJI