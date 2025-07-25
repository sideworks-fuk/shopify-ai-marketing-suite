# インフラストラクチャ・コスト管理ドキュメント

このディレクトリには、Azureインフラストラクチャのコスト試算、監視、最適化に関するドキュメントが含まれています。

## 📚 ドキュメント一覧

### 1. [azure-cost-estimation-guide.md](./azure-cost-estimation-guide.md)
**Azureサービス コスト試算ガイド**
- 各Azureサービスの料金体系
- 規模別のコスト試算（小規模/中規模/大規模）
- コスト最適化のベストプラクティス
- Azure無料アカウント特典情報

### 2. [cost-monitoring-plan.md](./cost-monitoring-plan.md)
**コスト監視・試算 実施計画（簡略版）**
- 1日1,000リクエスト規模向け
- 最小限の監視設定
- 月額¥5,000以下の運用を想定
- クイックスタートコマンド付き

### 3. [cost-monitoring-plan-detailed.md](./cost-monitoring-plan-detailed.md)
**コスト監視・試算 実施計画（詳細版）**
- 将来の規模拡大時（日次10,000リクエスト以上）の参考資料
- 詳細な負荷テスト手法
- 高度な監視設定

### 4. [azure-pricing-resources.md](./azure-pricing-resources.md) ⭐NEW
**Azure価格情報・コストシミュレーション リソース集**
- Azure公式価格ページへのリンク集
- コスト計算ツールの使い方
- Cost Management API活用法
- よくある質問と回答

### 5. [cost-simulation-worksheet.md](./cost-simulation-worksheet.md) ⭐NEW
**コストシミュレーション実践ワークシート**
- Phase別コスト記録シート
- 週次コストレビューテンプレート
- Azure Pricing Calculator実践演習
- 月次コスト管理テンプレート
- 即効性のあるコスト削減アクション

### 6. [cost-factors-checklist.md](./cost-factors-checklist.md) ⭐NEW
**コスト影響要因 チェックリスト**
- 環境構成によるコスト影響（開発・ステージング・本番・DR）
- バックアップ・災害対策・セキュリティ・監視コスト
- ネットワーク・開発ツール・ライセンスコスト
- 予期せぬコスト要因と対策
- 3年間総保有コスト（TCO）試算

## 🎯 利用シーン別ガイド

### 初期デプロイ時
1. `azure-cost-estimation-guide.md`でコスト概算を確認
2. `cost-monitoring-plan.md`の「今すぐやること」を実施

### 月次レビュー時
1. `cost-monitoring-plan.md`の月次チェックリストを確認
2. Azure Cost Managementで実際の請求額を確認

### 規模拡大検討時
1. `azure-cost-estimation-guide.md`でスケール時のコストを確認
2. 日次5,000リクエストを超えたら`cost-monitoring-plan-detailed.md`を参照

## 💡 クイックスタート

### 最小構成でのデプロイ
```bash
# PostgreSQL B1msでデプロイ
az postgres flexible-server create \
  --resource-group myResourceGroup \
  --name myserver \
  --location japaneast \
  --sku-name Standard_B1ms \
  --storage-size 32

# 月額予算アラート設定
az consumption budget create \
  --amount 5000 \
  --budget-name "shopify-app-budget" \
  --time-grain Monthly
```

### 開発環境の自動停止設定
```powershell
# 平日19:00に自動停止、8:00に自動起動
az postgres flexible-server update \
  --resource-group myResourceGroup \
  --name myserver-dev \
  --backup-retention 7
```

## 📊 コスト目安（税抜）

| 規模 | 月間リクエスト | 推奨構成 | 月額コスト |
|------|---------------|----------|-----------|
| 小規模 | 30,000 | PostgreSQL B1ms | 約¥3,000 |
| 中規模 | 300,000 | PostgreSQL B2s + Redis | 約¥10,000 |
| 大規模 | 3,000,000 | PostgreSQL D4ds_v4 + 各種 | 約¥50,000〜 |

## ⚠️ 重要な注意事項

1. **価格は変動します** - 記載の価格は2024年1月時点の参考値
2. **リージョンによる差** - 東日本/西日本で5-10%の価格差
3. **税抜き表示** - すべての価格は税抜き
4. **為替変動** - 円建て価格は為替レートにより変動

## 🔄 更新履歴

- 2025-01-10: 初版作成
- 簡略版と詳細版を分離
- 小規模運用向けの最適化 