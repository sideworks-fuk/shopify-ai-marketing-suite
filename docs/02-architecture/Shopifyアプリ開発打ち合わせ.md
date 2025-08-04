# **Shopifyアプリ開発打ち合わせ**

## **プロジェクトの背景と目的　認識合わせ**

ご説明いただく

想像）

- 背景:
  - 例: Shopifyストアの運営者がデータ分析を活用してマーケティングを強化するニーズが高まっている。
  - AI技術を活用した効率的なデータ活用が求められている。
- 目的:
  - Shopifyアプリを通じて、顧客・商品データ分析やレポート作成を自動化し、ストア運営を支援する。
  - 初期段階では特定の分析機能を優先実装し、ユーザーからフィードバックを収集して改善を進める。

------

## **プロジェクトのゴール　認識合わせ**

例）

- 全体ゴール:
  - Shopifyストア運営者が直感的にデータ分析やレポート生成を行えるアプリを提供。
- 初期リリースのゴール:
  - 最低限の機能（MVP: Minimum Viable Product）:
    - 例: 「非アクティブ顧客抽出」（AN-001）の実装。
    - 例: 「DM宛名抽出機能」（DM-001）でターゲットリストを生成。
  - スケジュール目標:
    - プロトタイプ版を**2025年3月末**までに完成させる。
  - 成果物:
    - 技術検証結果
    - 初期リリース可能なShopifyアプリ（分析機能を1つ以上搭載）。

------

## **要件の優先順位、要件定義に関する認識合わせ**

- 優先度設定:
  - 依頼者が特に重要視している以下の要件を優先的に開発：
    - 顧客分析:
      - 例: 非アクティブ顧客抽出（AN-001）。
    - 商品分析:
      - 例: 商品別CV率（PN-004）。
    - レポート作成:
      - 例: DM宛名抽出機能（DM-001）。
  - **スタートとして現実的なスケジュールを考慮**

これまでに出ている案（LINE）

- **顧客分析要件 (AN)**:

  | 要件ID | 要件名                   | 詳細                                                  |
  | ------ | ------------------------ | ----------------------------------------------------- |
  | AN-001 | 非アクティブ顧客抽出     | 登録日から90日間購買がない顧客を抽出。                |
  | AN-002 | 放置カート分析           | カートに商品を入れてから30日間購買がない顧客を抽出。  |
  | AN-003 | 非アクティブ購買顧客分析 | 最終購買日から180日間ログインも購買もない顧客を抽出。 |

- **レポート/DM作成要件 (DM)**:

  | 要件ID | 要件名         | 詳細                                                       |
  | ------ | -------------- | ---------------------------------------------------------- |
  | DM-001 | DM宛名抽出機能 | 特定条件に基づき宛名リストを抽出（例: 購買履歴、登録日）。 |

- **商品分析要件 (PN)**:

  | 要件ID | 要件名         | 詳細                                               |
  | ------ | -------------- | -------------------------------------------------- |
  | PN-004 | 商品別閲覧CV率 | 商品閲覧数に基づくCV率（コンバージョン率）を計算。 |

------

## フェーズ

|              | タスク                   | 期間     | 担当                  |
| ------------ | ------------------------ | -------- | --------------------- |
| フェーズ 1   | 要件詳細化               | 1～2週間 | 開発、小野さん        |
| フェーズ 2-1 | **インフラ/API契約準備** | 1～2週間 | 開発、JDO？、小野さん |
| フェーズ 2-2 | 技術的検証               | 2～3週間 | 開発                  |
| フェーズ 3   | プロトタイプ構築         | 3～5週間 | 開発                  |
| フェーズ 4   | 検証・改良               | 2～3週間 | 開発、小野さん        |

------

## 作業期間の概算

| フェーズ             | 期間     | 主な成果物                                 |                |
| -------------------- | -------- | ------------------------------------------ | -------------- |
| **要件定義**         | 1～2週間 | 要件リストの最終版、機能優先順位           | 開発、小野さん |
| **技術検証 (PoC)**   | 2～3週間 | コア機能 (例: AN-001, DM-001) の実現可能性 | 開発           |
| **UI/UX設計**        | 1～2週間 | ワイヤーフレーム、基本的なUIデザイン       | 開発、小野さん |
| **プロトタイプ開発** | 4～6週間 | 優先機能の実装、動作確認可能なアプリ       | 開発           |
| **テスト・調整**     | 2～3週間 | バグ修正、パフォーマンス改善、改善         | 開発、小野さん |

------

## スケジュール案

| フェーズ                               | タスク                                           | 開始日     | 終了日     | 担当           | 主な成果物                     |
| -------------------------------------- | ------------------------------------------------ | ---------- | ---------- | -------------- | ------------------------------ |
| **フェーズ 1: 要件詳細化**             | 要件リスト作成、機能優先順位設定                 |            | 2025/02/07 | 開発、小野さん | 要件リストの最終版             |
| 機能優先順位                           |                                                  |            |            |                |                                |
| **フェーズ 2-1: インフラ/API契約準備** | 必要なサービス選定、契約手続き                   |            | 2025/02/13 | 開発、JDO？    | 契約完了、利用可能状態         |
| **フェーズ 2-2: 技術的検証**           | コア機能の実現可能性検証（PoC）                  |            | 2025/02/13 | 開発           | 実現可能性の検証結果           |
| 技術メモ                               |                                                  |            |            |                |                                |
| **フェーズ 3: UI/UX設計**              | ワイヤーフレーム、基本UIデザイン作成             | 2025/02/17 | 2025/02/27 | 開発           | ワイヤーフレーム、UIデザイン案 |
| **フェーズ 4: プロトタイプ構築**       | 優先機能の実装、動作確認可能なプロトタイプ開発   | 2025/02/24 | 2025/03/27 | 開発           | 動作可能なプロトタイプ         |
| **フェーズ 5: 検証・改良**             | バグ修正、パフォーマンス改善、フィードバック対応 | 2025/03/30 |            | 開発、小野さん | 修正版プロトタイプ、改良メモ   |

------

## アーキテクチャ（ドラフト）

- システム構成案　全体

  ```mermaid
  flowchart TB
      subgraph UserEnv[ユーザー環境]
          User[利用者] --> |操作| UI[Shopifyアプリ-フロントエンド]
      end
      subgraph ShopifyPlatform[Shopifyプラットフォーム]
          ShopifyAPI[Shopify API]
      end
      subgraph HostedEnv[バックエンド]
          Backend[Shopifyアプリ-バックエンド]
          AIProcessing[AI処理サーバ]
      end
      User --> UI
      UI --> |APIリクエスト| Backend
      Backend --> |データ取得| ShopifyAPI
      Backend --> |AIリクエスト| AIProcessing
      AIProcessing --> |処理結果| Backend
      Backend --> |結果返却| UI
  ```

- システム構成案　バックエンド

  ```mermaid
  flowchart TB
      subgraph HostedEnv[自社運用バックエンド環境]
          Backend[Shopifyアプリ （バックエンド）]
          AIProcessing[AI処理サービス（プロンプト生成と解析）]
      end
      subgraph AzureEnv[Azureクラウドサービス（マネージド環境）]
          OpenAIAPI[Azure OpenAI API]
          Storage[Azure Storage （トレーニングデータ保存）]
          KeyVault[Azure Key Vault （認証情報管理）]
          Monitor[Azure Monitor （ログ・監視）]
      end
  
      %% データフロー
      Backend --> |Shopifyデータ送信| AIProcessing
      AIProcessing --> |プロンプト生成・リクエスト| OpenAIAPI
      OpenAIAPI --> |モデル応答| AIProcessing
      AIProcessing --> |解析結果| Backend
      Backend --> |トレーニングデータ保存| Storage
      Storage --> |データ参照| OpenAIAPI
      KeyVault --> |認証情報提供| Backend
      OpenAIAPI --> |利用ログ| Monitor
      Monitor --> |監視情報| AIProcessing
  ```

- アーキテクチャ図

  ```mermaid
  graph TB
      SA[Shopify App] -->|API Requests| NB[.NET Backend]
      NB -->|Shopify API Calls| SH[Shopify]
      subgraph ".NET Backend"
          NB -->|Uses| SK[Semantic Kernel]
          NB -->|Uses| AO[Azure OpenAI Client Library]
      end
      SK -->|AI Requests| AOS[Azure OpenAI Service]
      AO -->|Direct API Calls| AOS
  ```

- アーキテクチャ図の補足　※Azure OpenAI Service側を追記

  ```mermaid
  flowchart TB
      subgraph UserEnv[ユーザー環境]
          User[利用者]
          UI[フロントエンド（UI）]
      end
  
      subgraph BackendEnv[バックエンド環境]
          Backend[バックエンドサーバ]
          SemanticKernel[Semantic Kernel]
      end
  
      subgraph ShopifyEnv[Shopify]
          ShopifyAPI[Shopify API]
      end
  
      subgraph AzureEnv[Azure]
          OpenAIClient[Azure OpenAI クライアントライブラリ]
          OpenAIService[Azure OpenAI Service]
          Redis[Azure Cache （Redis）]
          Storage[Azure Blob Storage]
      end
  
      %% データフローの定義
      User --> |自然言語クエリ| UI
      UI --> |クエリ送信| Backend
      Backend --> |Shopifyデータ取得| ShopifyAPI
      ShopifyAPI --> |データ返却| Backend
      Backend --> |プロンプト構築| SemanticKernel
      SemanticKernel --> |プロンプト送信| OpenAIClient
      OpenAIClient --> |解析結果| OpenAIService
      OpenAIService --> |応答データ| OpenAIClient
      OpenAIClient --> |結果解析| SemanticKernel
      SemanticKernel --> |最終結果| Backend
      Backend --> |結果表示| UI
  
      %% キャッシュとストレージ
      Backend --> |データ保存/参照| Redis
      Backend --> |履歴保存| Storage
  ```

  - 補足：Shopify App Bridgeの役割　※AI統合ロジックを含む

  ```mermaid
  flowchart TB
      subgraph ShopifyEnv[Shopify 管理画面環境]
          Admin[Shopify Admin Dashboard]
          ParentFrame[親フレーム （Shopify画面）]
      end
  
      subgraph AppEnv[Shopify アプリ環境]
          ChildFrame[子フレーム （アプリ画面）]
          AppLogic[アプリロジック]
      end
  
      subgraph BackendEnv[自社運用バックエンド環境]
          Server[バックエンドサーバ]
          AILogic[AI統合ロジック]
          ShopifyAPIHandler[Shopify API処理]
      end
  
      subgraph AzureEnv[Azure AI環境]
          OpenAIService[Azure OpenAI Service]
      end
  
      subgraph Bridge[Shopify App Bridge]
          Messaging[フレーム間通信]
          Session[セッション管理]
          UIControlLib[UI要素管理]
      end
  
      %% データフロー
      Admin --> |操作要求| ParentFrame
      ParentFrame --> |通信管理| Messaging
      Messaging --> |データ送信/受信| ChildFrame
      ChildFrame --> |クエリ送信| Server
      Server --> |Shopifyデータ取得| ShopifyAPIHandler
      ShopifyAPIHandler --> |Shopify Admin API| Admin
      Server --> |AI解析リクエスト| AILogic
      AILogic --> |モデル呼び出し| OpenAIService
      OpenAIService --> |解析結果| AILogic
      AILogic --> |結果返却| Server
      Server --> |データ返却| ChildFrame
      ChildFrame --> |結果表示| ParentFrame
  ```

- Shopifyアプリ機能のシーケンス図の例

  ```mermaid
  sequenceDiagram
      participant SA as Shopify App
      participant NB as .NET Backend
      participant SK as Semantic Kernel
      participant AO as Azure OpenAI Client
      participant SH as Shopify API
      participant AOS as Azure OpenAI Service
  
      SA->>NB: レコメンデーションリクエスト
      NB->>SH: 顧客データ取得
      SH-->>NB: 顧客データ
      NB->>SK: コンテキスト生成
      SK->>SK: 顧客データ処理
      SK-->>NB: レコメンデーションコンテキスト
      NB->>AO: 詳細レコメンデーション生成
      AO->>AOS: ChatCompletion リクエスト
      AOS-->>AO: レコメンデーション
      AO-->>NB: 生成されたレコメンデーション
      NB->>SK: レコメンデーション整形
      SK-->>NB: 整形されたレコメンデーション
      NB-->>SA: 最終レコメンデーション
  ```

## アプリ機能の例

### **1. 顧客分析要件 (AN)**

| 要件ID | 要件名                   | 詳細                                                  |
| ------ | ------------------------ | ----------------------------------------------------- |
| AN-001 | 非アクティブ顧客抽出     | 登録日から90日間購買がない顧客を抽出。                |
| AN-002 | 放置カート分析           | カートに商品を入れてから30日間購買がない顧客を抽出。  |
| AN-003 | 非アクティブ購買顧客分析 | 最終購買日から180日間ログインも購買もない顧客を抽出。 |

### **2. 商品分析要件 (PN)**

| 要件ID | 要件名               | 詳細                                                         |
| ------ | -------------------- | ------------------------------------------------------------ |
| PN-001 | 初回購入商品分析     | 初回購入商品と2回目・3回目購入商品を関連付けた分析（最大9個まで）。 |
| PN-002 | 複数商品同時購入分析 | 商品の同梱率、再販率を期間指定で分析。                       |
| PN-003 | 商品別閲覧CTR率      | 商品閲覧数に基づくCTR率（クリック率）を計算。                |
| PN-004 | 商品別閲覧CV率       | 商品閲覧数に基づくCV率（コンバージョン率）を計算。           |

### **3. レポート/DM作成要件 (DM)**

| 要件ID | 要件名                   | 詳細                                                       |
| ------ | ------------------------ | ---------------------------------------------------------- |
| DM-001 | DM宛名抽出機能           | 特定条件に基づき宛名リストを抽出（例: 購買履歴、登録日）。 |
| DM-002 | 宛名グループ別DM作成機能 | 宛名グループ別にDMテンプレートを作成・出力可能。           |
| DM-003 | DMアウトラインPDF生成    | DM裏面掲載商品をアウトライン化しPDF形式で生成。            |