# ADR-001: バッチ処理実装方式の選定 - Hangfire vs Azure Functions

## ステータス
提案中

## 日付
2025-08-02

## コンテキスト
Shopifyアプリケーションにおいて、以下のバッチ処理を実装する必要があります：
- Shopifyストアからのデータ同期（顧客、注文、商品）
- データ分析処理（休眠顧客分析、売上分析など）
- レポート生成

これらのバッチ処理を実装するためのフレームワークを選定する必要があります。現在、ASP.NET Core Web APIをAzure App Service上で運用しており、この環境に適したバッチ処理の実装方式を決定する必要があります。

## 決定
Hangfireを採用してバッチ処理を実装する。

## 検討した選択肢

### 選択肢1: Hangfire
- **概要**: ASP.NET Coreアプリケーション内で動作するバックグラウンドジョブ処理フレームワーク
- **メリット**:
  - 既存のWeb APIプロジェクト内で実装可能
  - 管理画面が標準で提供される
  - スケジューリングが柔軟（Cron式対応）
  - 開発・デバッグが容易
  - 追加のAzureリソースが不要
- **デメリット**:
  - Web APIと同じリソースを共有するため、負荷が高い処理では影響を与える可能性
  - スケールアウトが複雑

### 選択肢2: Azure Functions
- **概要**: サーバーレスコンピューティングサービス
- **メリット**:
  - 自動スケーリング
  - Web APIとリソースを分離できる
  - 使用した分だけの課金
  - 様々なトリガーに対応（Timer、Queue、HTTP等）
- **デメリット**:
  - 別プロジェクトとして管理が必要
  - デプロイが複雑になる
  - ローカル開発環境の構築が複雑
  - 追加コスト（ただし使用量による）
  - 管理画面は別途実装が必要

### 選択肢3: Azure WebJobs
- **概要**: App Service内で動作するバックグラウンドジョブ
- **メリット**:
  - App Serviceとの統合が良い
  - 継続的なジョブに適している
- **デメリット**:
  - 古い技術（Azure Functionsが推奨）
  - 管理機能が限定的
  - スケジューリング機能が弱い

## 決定理由
以下の理由からHangfireを選択しました：

1. **開発効率**: 既存のWeb APIプロジェクト内で実装できるため、共通のコードベースを使用でき、開発効率が高い
2. **管理画面**: 標準で提供される管理画面により、ジョブの実行状況やエラーの確認が容易
3. **コスト**: 追加のAzureリソースが不要で、現在のApp Serviceプラン内で実行可能
4. **学習コスト**: チームメンバーがASP.NET Coreに精通しており、新しい技術スタックの学習が不要
5. **MVP開発**: まず動くものを作ることを優先する方針に合致

## 結果
**ポジティブな結果**:
- 開発速度の向上
- 運用管理の簡素化
- 初期コストの削減
- デバッグの容易さ

**ネガティブな結果**:
- 将来的に処理量が増えた場合、Azure Functionsへの移行を検討する必要がある
- Web APIのパフォーマンスに影響を与える可能性がある

**移行計画**:
処理量が増えてパフォーマンスに問題が生じた場合は、以下の段階的な移行を検討します：
1. 重い処理から順次Azure Functionsに移行
2. HangfireとAzure Functionsのハイブリッド構成
3. 最終的に全てをAzure Functionsに移行

## 参考資料
- [Hangfire公式ドキュメント](https://www.hangfire.io/)
- [Azure Functions vs WebJobs](https://docs.microsoft.com/en-us/azure/azure-functions/functions-compare-logic-apps-ms-flow-webjobs)
- `/docs/03-design-specs/integration/hangfire-implementation-guide.md`
- `/docs/03-design-specs/integration/azure-functions-batch-implementation-guide.md`