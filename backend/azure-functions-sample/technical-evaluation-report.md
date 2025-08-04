# Azure Functions 技術検証レポート

**作成日**: 2025年8月2日  
**作成者**: TAKASHI  
**プロジェクト**: ShopifyAzureFunctionsSample

## 概要

Shopify統合におけるAzure Functionsの技術検証を実施しました。Timer Triggerを使用した30分ごとの定期実行関数を実装し、ローカル開発からAzureへのデプロイまでの一連のプロセスを検証しました。

## 検証項目と結果

### 1. ローカル開発の容易さ

**評価**: ⭐⭐⭐⭐☆（4/5）

**良い点**:
- Azure Functions Core Toolsのインストールが簡単
- `func start`コマンドでローカル実行が即座に可能
- Visual Studio Codeの拡張機能が充実
- デバッグが容易（ブレークポイント設定可能）

**課題点**:
- Storage Emulator（Azurite）の初期設定が必要
- ローカル環境でのApplication Insights設定がやや複雑

### 2. デプロイの手順と所要時間

**評価**: ⭐⭐⭐⭐⭐（5/5）

**所要時間**:
- 初回リソース作成: 約10分
- コードデプロイ: 約2-3分
- 設定変更反映: 即時

**デプロイ方法**:
- Visual Studio Code: 最も簡単、GUI操作で完結
- Azure CLI: 自動化に適している
- GitHub Actions: CI/CD構築が容易

### 3. Application Insights との統合

**評価**: ⭐⭐⭐⭐⭐（5/5）

**良い点**:
- 自動的に統合される
- カスタムイベント、メトリクスの送信が簡単
- リアルタイムモニタリングが可能
- ログの検索、分析が強力

**実装例**:
```csharp
_telemetryClient.TrackEvent("HelloShopifyTriggered", properties);
_telemetryClient.TrackMetric("HelloShopifyDuration", duration);
```

### 4. 環境変数の管理方法

**評価**: ⭐⭐⭐⭐☆（4/5）

**管理方法**:
- ローカル: `local.settings.json`
- Azure: Application Settings（Portal/CLI/ARM）
- Key Vault統合: 高度なシークレット管理

**課題点**:
- 環境ごとの設定管理が手動
- チーム開発時の設定共有に工夫が必要

### 5. コスト見積もり（Consumption Plan）

**評価**: ⭐⭐⭐⭐⭐（5/5）

**月間推定コスト**:
- Timer Trigger（30分ごと）: **¥0**（無料枠内）
- HTTP Trigger（1万回/月）: **¥0**（無料枠内）
- Application Insights（基本使用）: **¥0-100**

**無料枠**:
- 実行回数: 100万回/月
- 実行時間: 400,000 GB-秒/月
- Application Insights: 5GB/月

## Hangfire との比較

| 項目 | Azure Functions | Hangfire |
|------|----------------|----------|
| 初期設定 | 簡単 | やや複雑 |
| スケーラビリティ | 自動（無限） | 手動設定必要 |
| コスト | 従量課金 | VM/App Service必要 |
| 監視 | Application Insights統合 | 別途構築必要 |
| 開発体験 | 関数単位でシンプル | フルコントロール可能 |
| デプロイ | 数分 | App Serviceと同等 |

## 推奨事項

### Azure Functions が適している場合

1. **短時間の処理**（5分以内）
2. **イベントドリブンな処理**
3. **スケーラビリティが重要**
4. **コストを最小化したい**
5. **運用負荷を減らしたい**

### Hangfire が適している場合

1. **長時間実行ジョブ**（5分以上）
2. **複雑なワークフロー**
3. **細かい制御が必要**
4. **既存のApp Serviceがある**

## 実装上の注意点

### 1. タイムアウト制限
- Consumption Plan: 最大5分（設定可能）
- Premium Plan: 最大60分

### 2. コールドスタート
- 初回実行時に数秒の遅延
- Premium Planで回避可能

### 3. ステート管理
- ステートレス設計が必須
- Durable Functionsでステートフル処理可能

## 今後の拡張案

1. **Shopify Webhook受信**
   - HTTP Triggerで実装
   - HMAC検証の実装

2. **バッチ処理の実装**
   - Durable Functionsでオーケストレーション
   - ファンアウト/ファンイン パターン

3. **エラー処理の強化**
   - Dead Letter Queue の活用
   - リトライポリシーの設定

## 結論

Azure Functionsは、Shopify統合における定期バッチ処理やイベント処理に非常に適しています。特に以下の点で優れています：

1. **開発生産性**: 最小限のコードで実装可能
2. **運用負荷**: サーバーレスで運用不要
3. **コスト効率**: 小規模なら無料、スケール時も従量課金
4. **監視**: Application Insights統合で即座に可視化

Hangfireと比較して、シンプルな定期処理やイベント処理にはAzure Functionsを、複雑なワークフローや長時間処理にはHangfireを選択することを推奨します。

## 添付資料

- サンプルコード: `/azure-functions-sample/`
- デプロイガイド: `/docs/03-design-specs/integration/azure-functions-deployment-guide.md`
- ローカル実行手順: `/azure-functions-sample/README.md`