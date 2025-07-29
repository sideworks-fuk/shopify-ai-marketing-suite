---
marp: true
theme: default
paginate: true
header: 'Shopifyアプリ開発打ち合わせ'
footer: '2025年1月9日 | 作成者: '
---

# **Shopifyアプリ開発打ち合わせ用資料**


### リンク先

[補足資料はこちら](https://lapis-aragon-3c9.notion.site/1776ed491fd780b4bd0dfef5cdefa764)

※リンク有効期間：24時間


---
## アーキテクチャ（ドラフト）

- システム構成案　全体
    
![alt text](image-1.png)
---
    
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