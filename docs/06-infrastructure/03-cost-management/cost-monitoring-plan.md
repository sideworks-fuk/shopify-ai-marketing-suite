# コスト監視・試算 実施計画（簡略版）

## 前提条件
- **想定規模**: 1日1,000リクエスト（月間約30,000リクエスト）
- **月額予算**: ¥5,000以下
- **主要コスト**: PostgreSQL（約90%）、その他は従量課金でほぼ無視可能

---

## 簡略化された実施計画

### Phase 1: 最小限の監視設定（1日で完了）

#### 1.1 Azure Cost Management設定
```bash
# 月額予算アラートの設定（¥5,000）
az consumption budget create \
  --amount 5000 \
  --budget-name "shopify-app-budget" \
  --time-grain Monthly
```

#### 1.2 基本的なタグ設定
```json
{
  "Environment": "Production",
  "Project": "ShopifyApp"
}
```

### Phase 2: 固定費の最適化（最重要）

#### 2.1 PostgreSQL選定基準
| 環境 | 推奨SKU | 月額 | 理由 |
|------|---------|------|------|
| 開発 | B1s | ¥1,435 | 自動停止設定で実質¥500以下 |
| 本番 | B1ms | ¥2,870 | 1日1,000リクエストには十分 |

#### 2.2 開発環境の自動停止
```powershell
# Azure CLIで開発DBの自動停止設定
az postgres flexible-server update \
  --resource-group myResourceGroup \
  --name myserver-dev \
  --auto-grow Disabled \
  --backup-retention 7
```

### Phase 3: 簡易負荷テスト（30分で完了）

#### 3.1 最小限の動作確認
```bash
# PowerShellでの簡易テスト
$url = "https://your-api.azurewebsites.net/api/health"
1..100 | ForEach-Object -Parallel {
    Invoke-RestMethod -Uri $using:url
} -ThrottleLimit 10

# 実行時間の確認
Measure-Command { 上記のスクリプト }
```

#### 3.2 確認項目（これだけでOK）
- [ ] APIレスポンスが返ってくる
- [ ] エラーが発生しない
- [ ] Application Insightsで基本的なログが見える

---

## 月次チェックリスト（5分で完了）

### 毎月1回確認する項目
1. **Azure Portal > Cost Management**
   - 当月の請求額
   - PostgreSQLが総額の80%以上を占めているか
   - 異常な課金項目がないか

2. **スケールアップ判断基準**
   - 日次リクエストが5,000を超えたら検討
   - DBのCPU使用率が恒常的に80%超えたら検討

---

## 実装優先順位

### 今すぐやること（必須）
1. PostgreSQL B1msでデプロイ
2. 開発環境の自動停止設定
3. 月額¥5,000の予算アラート設定

### 1ヶ月後にやること
1. 実際の請求額確認
2. 必要に応じてDBスペック調整

### やらなくていいこと
- 詳細な実行時間測定
- 複雑な負荷テストツールの導入
- GB秒単位のコスト計算
- 日次のメトリクス記録

---

## コスト予測（超シンプル版）

### 月額コスト概算
```
開発環境:
- PostgreSQL B1s（夜間停止）: ¥500
- その他: ¥100
- 合計: ¥600

本番環境:
- PostgreSQL B1ms: ¥2,870
- Static Web Apps: ¥0（無料枠）
- Functions: ¥0（無料枠）
- Storage: ¥50
- 合計: ¥2,920

総合計: 約¥3,520/月
```

### スケール時の目安
| 日次リクエスト | DB推奨 | 月額概算 |
|---------------|--------|----------|
| 1,000 | B1ms | ¥3,000 |
| 10,000 | B2s | ¥6,000 |
| 100,000 | D2ds_v4 | ¥20,000 |

---

## まとめ

**1日1,000リクエスト規模では、以下の3点だけ注意すれば十分です：**

1. **PostgreSQLのスペックを適切に選ぶ**（B1msで開始）
2. **開発環境は使わない時は止める**
3. **月1回、請求額を確認する**

それ以外の細かいコスト最適化は、**日次10,000リクエストを超えてから**考えれば間に合います。

---

## 実践用ツール・リソース

### Azure無料アカウント活用
- **初回特典**: ¥22,500クレジット（30日間）で実験可能
- **永続無料枠**: Functions 100万回/月、Static Web Apps 1アプリ
- **登録URL**: https://azure.microsoft.com/ja-jp/free/

### コスト計算・監視ツール
- **料金計算ツール**: https://azure.microsoft.com/ja-jp/pricing/calculator/
- **Cost Management**: Azure Portal内で直接アクセス
- **予算アラート**: 月額¥5,000で設定推奨

### 実践ワークシート
- [コストシミュレーション実践ワークシート](./cost-simulation-worksheet.md)
- [Azure価格情報・コストシミュレーション リソース集](./azure-pricing-resources.md)
- [コスト影響要因 チェックリスト](./cost-factors-checklist.md) ⭐NEW

---

## クイックスタートコマンド

```powershell
# 1. Azure CLIインストール（未インストールの場合）
# https://docs.microsoft.com/ja-jp/cli/azure/install-azure-cli

# 2. ログイン
az login

# 3. リソースグループ作成
az group create --name shopify-app-rg --location japaneast

# 4. PostgreSQL B1ms作成（開発環境）
az postgres flexible-server create \
  --resource-group shopify-app-rg \
  --name shopify-db-dev \
  --location japaneast \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --version 14

# 5. 予算設定
az consumption budget create \
  --amount 5000 \
  --budget-name "shopify-app-budget" \
  --resource-group shopify-app-rg \
  --category cost \
  --time-grain Monthly
``` 