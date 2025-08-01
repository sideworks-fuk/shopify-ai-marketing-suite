### **Shopifyアプリ開発会議 議事録**

**日時**: 2025年2月12日 17:04 - 18:00 (GMT+09:00)

**参加者**:

- **福田** 
- **浜地さん** 
- **小野さん** 

------

## **1. 会議の目的**

- **Shopify APIの設定とアクセス管理の確認**
- **アプリ開発・データ連携の進め方**
- **プロトタイプ開発のロードマップとタスクの整理**
- **技術検証の進め方とデータ取得・分析の計画**
- **今後の進行スケジュールの確認**

------

## **2. 議題と主な決定事項**

### **(1) Shopify APIの確認とアカウント管理**

### **APIの確認**

- Shopify APIのアクセス権限の設定を確認し、開発用のダミーストアを作成。
- APIの提供データ
  - **注文情報**
  - **商品情報**
  - **顧客情報**
  - これらのデータ項目の詳細な確認が必要。

### **アクセス管理**

- **福田の開発環境へアクセス権限を設定**。
- 小野さんがオーナー権限でAPIアクセスを管理し、福田が開発用のAPIにアクセス可能な状態へ。

------

### **(2) アプリの開発とデプロイ方法**

### **Shopifyアプリの管理**

- アプリの開発・デプロイについて整理。
- **カスタムアプリとしてストアに追加**し、特定のストアでのみ利用可能な形にする方針。
- 公開アプリとしてShopifyマーケットプレイスに登録する場合の要件も調査。

### **テスト環境**

- ダミーストアの作成とデータ投入
  - サガシキさんのデータを活用して、テスト環境での動作確認を行う。

------

### **(3) データ取得・分析の方法**

### **APIで取得可能なデータの整理**

- Shopify APIを活用し、取得できるデータ範囲を確認。
- 注文データと顧客データの関連付け
  - **顧客ごとの購買履歴を取得**し、累計購買回数や周期分析が可能かを確認。

### **データ分析の方向性**

- AI活用の可否
  - AIを使って「購買傾向の予測」「定期購入の推奨」などの実現可能性を検討。
  - **購買周期の分析や商品レコメンドにAIを活用するアイデアが浮上**。

------

### **(4) プロトタイプ開発と今後の進め方**

### **Shopify APIの動作確認**

- APIを利用してデータを取得するテストを行う。
- **注文データ・商品データ・顧客データの取得と加工を試す**。

### **デモアプリの作成**

- Shopifyの管理画面とAPI連携の確認用に簡単なデモアプリを開発。

### **バックエンドの設計**

- **データの保存方法・管理方法を設計**。
- 必要に応じてShopifyのデータをローカルにキャッシュするか検討。

------

### **(5) 今後の進行スケジュール**

| タスク                                    | 担当       | 期限  |
| ----------------------------------------- | ---------- | ----- |
| 2月末までのプロトタイプ開発対応内容の検討 | 福田・浜地 | 2月末 |
| AI活用の方向性検討                        | 小野       |       |
| ダミーストアの作成                        | 福田       |       |
| プロトタイプ開発                          | 福田       |       |

------

## **3. アクションアイテム**

| 項目                           | 調査・準備内容                            | 担当             |
| ------------------------------ | ----------------------------------------- | ---------------- |
| Backlogでタスク管理            | バックログにタスクを登録し、進捗を可視化  | 福田             |
| プロトタイプ開発対応内容の提案 | 2月末までのプロトタイプ開発対応内容の検討 | 福田・浜地       |
| デモストアでのダミーデータ登録 | サガシキさんストアのデータ移行            | 福田・小野・浜地 |
| AI活用の方向性検討             | どの分析機能をAIで強化するか整理          | 小野             |

------

## **4. その他**

- Backlog**でタスクを管理し、進捗を可視化することを決定**。
- **3月の第一週に福岡で対面ミーティングを実施予定**。
- **プロジェクトの全体スケジュールを2月末までに確定する**。

------

## **5. 次回ミーティング予定**

- **3月第1週: 福岡での対面打ち合わせ**

------

### **補足**

本議事録は、福田が作成し、関係者に共有する。

修正があれば適宜反映するため、フィードバックをお願いしたい。