# Azure価格情報・コストシミュレーション リソース集

## 1. Azure公式価格情報

### 主要サービスの価格ページ
- **Azure Functions**: https://azure.microsoft.com/ja-jp/pricing/details/functions/
- **Azure Database for PostgreSQL**: https://azure.microsoft.com/ja-jp/pricing/details/postgresql/
- **Azure Static Web Apps**: https://azure.microsoft.com/ja-jp/pricing/details/app-service/static/
- **Azure Storage**: https://azure.microsoft.com/ja-jp/pricing/details/storage/blobs/
- **Azure Redis Cache**: https://azure.microsoft.com/ja-jp/pricing/details/cache/
- **帯域幅料金**: https://azure.microsoft.com/ja-jp/pricing/details/bandwidth/

### 地域別価格
- **リージョン別価格一覧**: https://azure.microsoft.com/ja-jp/explore/global-infrastructure/geographies/
- 東日本リージョン（Japan East）と西日本リージョン（Japan West）で価格が異なる場合があります

---

## 2. コスト計算ツール

### Azure Pricing Calculator（料金計算ツール）
**URL**: https://azure.microsoft.com/ja-jp/pricing/calculator/

#### 使用手順
1. **サービスの追加**
   - 「製品」タブから使用するサービスを検索
   - 「追加」をクリックして見積もりに追加

2. **構成の設定**
   ```
   例：Azure Functions
   - リージョン: Japan East
   - プラン: Consumption
   - 実行回数: 1,000,000/月
   - 実行時間: 200ms
   - メモリ: 512MB
   ```

3. **見積もりの保存**
   - 「保存」ボタンで見積もりをエクスポート
   - Excel形式でダウンロード可能
   - 共有用URLの生成

#### サンプル見積もりURL
```
基本構成の例:
https://azure.com/e/[見積もりID]
※実際の見積もり作成後に生成される固有URL
```

---

## 3. Azure Cost Management

### アクセス方法
1. **Azure Portal**: https://portal.azure.com
2. 「コスト管理 + 請求」を選択
3. 「コスト管理」→「コスト分析」

### 主要機能
- **コスト分析**: 日次・月次のコスト推移
- **予算設定**: アラート付き予算管理
- **推奨事項**: コスト最適化の提案
- **エクスポート**: CSVでのデータ出力

### 予算アラート設定手順
```
1. 「予算」→「追加」
2. 予算名: "開発環境月額予算"
3. 金額: ¥5,000
4. 期間: 月次
5. アラート条件:
   - 80% (¥4,000) で警告
   - 100% (¥5,000) で通知
6. 通知先メールアドレスを設定
```

---

## 4. TCO（総所有コスト）計算ツール

### Azure TCO Calculator
**URL**: https://azure.microsoft.com/ja-jp/pricing/tco/calculator/

**用途**: オンプレミスとの比較、3年間の総コスト試算

---

## 5. 無料アカウント・クレジット

### Azure無料アカウント
**URL**: https://azure.microsoft.com/ja-jp/free/

**特典**:
- **¥22,500のクレジット**（最初の30日間）
- **12か月間無料のサービス**:
  - B1S Windows/Linux VM（750時間/月）
  - 5GBのBlobストレージ
  - 250GBのSQL Database
- **永続的に無料のサービス**:
  - Azure Functions（100万リクエスト/月）
  - Static Web Apps（1アプリ）

---

## 6. コストシミュレーション手順書

### Step 1: 基本構成の見積もり作成
```
1. Azure Pricing Calculatorにアクセス
2. 以下のサービスを追加:
   - Azure Functions (Consumption)
   - Database for PostgreSQL (Flexible Server)
   - Static Web Apps
   - Storage Account

3. 各サービスの設定:
   Functions:
   - 月間実行数: 30,000
   - 実行時間: 200ms
   - メモリ: 512MB
   
   PostgreSQL:
   - Compute: Burstable B1ms
   - Storage: 32GB
   - Backup: 7日間
```

### Step 2: シナリオ別見積もり
```
小規模（月1,000注文）:
- Functions実行: 100,000回
- DB Storage: 10GB
- 帯域幅: 5GB

中規模（月10,000注文）:
- Functions実行: 2,000,000回
- DB Storage: 50GB
- 帯域幅: 50GB
- Redis Cache追加

大規模（月100,000注文）:
- Functions Premium Plan
- PostgreSQL General Purpose
- Redis Premium
```

### Step 3: コスト最適化オプション
```
1. 予約インスタンス（1年/3年）
   - 最大72%割引
   - URL: https://azure.microsoft.com/ja-jp/pricing/reserved-vm-instances/

2. Azure Hybrid Benefit
   - 既存ライセンスの活用
   - URL: https://azure.microsoft.com/ja-jp/pricing/hybrid-benefit/

3. Dev/Test価格
   - 開発環境向け割引
   - URL: https://azure.microsoft.com/ja-jp/pricing/dev-test/
```

---

## 7. リアルタイムコスト確認API

### Azure Cost Management API
```bash
# コスト情報の取得
GET https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2021-10-01

# リクエストボディ例
{
  "type": "Usage",
  "timeframe": "MonthToDate",
  "dataset": {
    "granularity": "Daily",
    "aggregation": {
      "totalCost": {
        "name": "Cost",
        "function": "Sum"
      }
    }
  }
}
```

### Power BIでの可視化
- **Azure Cost Management Power BI App**: https://aka.ms/costmgmt/powerbiapp
- リアルタイムダッシュボード作成可能

---

## 8. よくあるコスト関連の質問

### Q: 無料枠を超えたらどうなる？
A: 自動的に従量課金に移行。事前にアラート設定推奨

### Q: 請求書はいつ発行される？
A: 月末締め、翌月初旬に請求書発行

### Q: 為替レートは？
A: 月初のレートで固定（Microsoftが設定）

---

## 9. サポート・問い合わせ

### 料金に関する問い合わせ
- **Azure営業担当**: https://azure.microsoft.com/ja-jp/pricing/contact-sales/
- **無料サポート**: 請求・サブスクリプション管理は無料

### コミュニティ
- **Microsoft Q&A**: https://docs.microsoft.com/ja-jp/answers/
- **Stack Overflow**: タグ「azure-billing」

---

## 10. 関連ドキュメント

- [Azureサービス コスト試算ガイド](./azure-cost-estimation-guide.md)
- [コスト監視計画（簡略版）](./cost-monitoring-plan.md)
- [コスト監視計画（詳細版）](./cost-monitoring-plan-detailed.md)
- [コストシミュレーション実践ワークシート](./cost-simulation-worksheet.md) 