# Azureサービス コスト試算ガイド

## 使用予定サービスと料金体系

### 1. Azure Functions (Consumption Plan)

#### 料金体系
- **実行回数**: 最初の100万回/月は無料、以降 ¥22.4/100万回
- **実行時間**: 最初の40万GB秒/月は無料、以降 ¥1.792/GB秒
- **メモリ使用量**: 128MB～1.5GBで設定可能

#### 料金計算例
```
月間リクエスト数: 500万回
平均実行時間: 200ms
メモリ割当: 512MB

実行回数料金 = (500万 - 100万) × ¥22.4 = ¥89.6
実行時間料金 = 500万 × 0.2秒 × 0.5GB - 40万GB秒 = 10万GB秒 × ¥1.792 = ¥179.2
月額合計 = ¥268.8
```

#### Premium Plan（必要に応じて）
- **vCPU時間**: ¥1,848/vCPU時間
- **メモリ時間**: ¥131.04/GB時間
- **最小インスタンス**: 1（常時稼働）

---

### 2. Azure Database for PostgreSQL (Flexible Server)

#### 料金体系（Basic/Burstable）
| SKU | vCores | メモリ | 料金/月 |
|-----|--------|--------|---------|
| B1s | 1 | 1GB | ¥1,435 |
| B1ms | 1 | 2GB | ¥2,870 |
| B2s | 2 | 4GB | ¥5,740 |

#### ストレージ料金
- **基本**: ¥14.336/GB/月
- **バックアップ**: 7日間は無料、追加は ¥14.336/GB/月
- **長期保持（1年以上）**: ¥5.6/GB/月

#### General Purpose（本番環境）
| SKU | vCores | メモリ | 料金/月 |
|-----|--------|--------|---------|
| D2ds_v4 | 2 | 8GB | ¥17,223 |
| D4ds_v4 | 4 | 16GB | ¥34,445 |

#### 高可用性オプション
- **ゾーン冗長**: 基本料金の2倍
- **リードレプリカ**: 追加インスタンス料金

---

### 3. Azure Static Web Apps

#### 料金体系
- **Free Plan**: 
  - 100GB帯域幅/月
  - カスタムドメイン2個
  - 無料SSL
- **Standard Plan**: ¥1,120/アプリ/月
  - 無制限の帯域幅
  - SLA 99.95%

---

### 4. Azure Storage Account

#### Blob Storage (Hot Tier)
- **ストレージ**: ¥2.688/GB/月（最初の50TB）
- **書き込み**: ¥0.672/10,000操作
- **読み取り**: ¥0.056/10,000操作
- **データ転送（送信）**: 最初の5GB無料、以降 ¥13.44/GB

#### 冗長性オプション
- **LRS（ローカル冗長）**: 基本料金
- **ZRS（ゾーン冗長）**: LRSの1.25倍
- **GRS（geo冗長）**: LRSの2倍

---

### 5. Azure Redis Cache

#### 料金体系（Basic）
| サイズ | メモリ | 料金/月 |
|--------|--------|---------|
| C0 | 250MB | ¥1,960 |
| C1 | 1GB | ¥4,816 |
| C2 | 2.5GB | ¥10,976 |

#### Standard（レプリケーション付き）
- C1: ¥12,880/月
- C2: ¥20,720/月

---

### 6. 監視・ログサービス

#### Application Insights
- **取り込みデータ**: 最初の5GB/月は無料、以降 ¥336/GB
- **データ保持**: 90日間は無料

#### Log Analytics
- **データ取り込み**: ¥336/GB（5GB/月無料）
- **データ保持**: 31日間無料、以降 ¥14/GB/月

#### Azure Monitor
- **カスタムメトリクス**: ¥2.8/メトリクス/月
- **API呼び出し**: ¥0.112/1,000呼び出し

---

### 7. セキュリティサービス

#### Azure Active Directory B2C
- **月間認証数**: 最初の5万回無料、以降 ¥0.56/認証
- **MFA**: ¥1.68/認証

#### Key Vault
- **シークレット操作**: ¥0.392/10,000トランザクション
- **証明書**: ¥392/証明書/月

#### Azure Security Center
- **Free Tier**: 基本的な推奨事項のみ
- **Standard**: ¥2,100/サーバー/月

---

### 8. ネットワークサービス

#### Virtual Network
- **VNet**: 無料
- **VNet Peering**: ¥1.12/GB（同一リージョン）
- **Private Endpoint**: ¥1,120/エンドポイント/月

#### 送信帯域幅（全サービス共通）
- 最初の5GB/月: 無料
- 5GB-10TB: ¥13.44/GB
- 10TB-50TB: ¥11.2/GB

---

### 9. その他のサービス

#### Azure DevOps
- **Basic Plan**: 5ユーザーまで無料
- **Basic + Test Plans**: ¥6,720/ユーザー/月

#### Azure Backup
- **バックアップストレージ**: LRS ¥2.8/GB/月
- **長期保持**: ¥5.6/GB/月

---

## コスト試算シナリオ

### シナリオ1: 小規模（月間1,000注文）
```
想定:
- API呼び出し: 10万回/月
- 平均レスポンス時間: 100ms
- ストレージ使用量: 10GB
- データ転送: 5GB/月
- ユーザー認証: 1,000回/月

月額試算:
- Azure Functions: ¥0（無料枠内）
- PostgreSQL (B1ms): ¥2,870
- Static Web Apps: ¥0（無料枠）
- Storage (LRS): ¥27
- Application Insights: ¥0（無料枠内）
- Azure AD B2C: ¥0（無料枠内）
- 合計: 約¥2,897/月
```

### シナリオ2: 中規模（月間10,000注文）
```
想定:
- API呼び出し: 200万回/月
- 平均レスポンス時間: 150ms
- ストレージ使用量: 50GB
- データ転送: 50GB/月
- Redis Cache使用
- ユーザー認証: 20,000回/月
- ログデータ: 20GB/月

月額試算:
- Azure Functions: ¥179
- PostgreSQL (B2s + 50GB): ¥6,457
- Static Web Apps: ¥1,120
- Storage (ZRS): ¥168
- Redis (C1): ¥4,816
- データ転送: ¥605
- Application Insights: ¥336
- Log Analytics: ¥5,040
- Azure AD B2C: ¥0（無料枠内）
- 合計: 約¥18,721/月
```

### シナリオ3: 大規模（月間100,000注文）
```
想定:
- API呼び出し: 2,000万回/月
- Functions Premium Plan使用
- PostgreSQL HA構成
- Redis Standard使用
- ユーザー認証: 200,000回/月
- ログデータ: 100GB/月
- セキュリティ強化

月額試算:
- Functions Premium: ¥35,000
- PostgreSQL (D4ds_v4 + HA): ¥68,890
- Static Web Apps: ¥1,120
- Storage (GRS): ¥2,688
- Redis Standard: ¥20,720
- Application Insights: ¥1,680
- Log Analytics: ¥31,360
- Azure AD B2C: ¥84,000
- Security Center: ¥2,100
- Private Endpoints: ¥3,360
- データ転送: ¥6,720
- 合計: 約¥257,638/月
```

---

## コスト監視ツール

### 1. Azure Cost Management
- 日次・月次のコスト追跡
- 予算アラートの設定
- コスト分析レポート
- タグベースのコスト配分

### 2. Azure Pricing Calculator
- 事前見積もり作成
- 各種シナリオの比較
- エクスポート機能

### 3. Azure Advisor
- コスト最適化の推奨事項
- 未使用リソースの検出
- 予約インスタンスの推奨

### 4. サードパーティツール
- CloudHealth
- Cloudability
- Cost Explorer

---

## コスト最適化のベストプラクティス

### 開発・テスト環境
1. **自動シャットダウン**: 営業時間外は停止（最大66%削減）
2. **開発用SKU**: B-seriesを活用
3. **無料枠の活用**: Functions、Static Web Apps、AD B2C
4. **Spot インスタンス**: 最大90%割引（中断可能なワークロード）

### 本番環境
1. **予約インスタンス**: 
   - 1年契約: 最大42%割引
   - 3年契約: 最大72%割引
2. **オートスケール**: 需要に応じた自動調整
3. **CDN活用**: データ転送コストの削減
4. **適切なSKU選択**: オーバープロビジョニングの回避

### 監視設定
1. **日次予算アラート**: ¥1,000超過で通知
2. **異常検知**: 前日比50%増でアラート
3. **月次レビュー**: コスト分析と最適化
4. **タグ付け戦略**: 環境、部門、プロジェクト別の追跡

### コスト削減の具体例
1. **Storage最適化**:
   - Hot → Cool: 50%削減
   - 不要なスナップショット削除
   
2. **データベース最適化**:
   - 読み取り専用ワークロードはリードレプリカ
   - 開発環境は夜間停止
   
3. **ネットワーク最適化**:
   - 同一リージョン内通信の活用
   - CDNによるキャッシュ

---

## Azure無料アカウント特典

### 初回登録特典
- **¥22,500のクレジット**（最初の30日間）
- **12か月間無料のサービス**:
  - B1S Windows/Linux VM（750時間/月）
  - 5GBのBlobストレージ  
  - 250GBのSQL Database
- **永続的に無料のサービス**:
  - Azure Functions（100万リクエスト/月）
  - Static Web Apps（1アプリ）
  - Application Insights（5GB/月）

### 無料枠活用のポイント
1. **開発・テスト環境**: 無料枠を最大限活用
2. **本番環境移行時**: 段階的に有料サービスへ移行
3. **コスト管理**: 無料枠の使用状況を定期的に確認

---

## 注意事項

1. **価格は2024年1月時点の参考値**（実際の価格は変動する可能性あり）
2. **すべての価格は税抜き表示**
3. **為替レートの変動**により円建て価格は変動
4. **リージョンによる価格差**あり（東日本/西日本で約5-10%の差）
5. **Enterprise Agreement**による割引は含まず
6. **無料枠超過時**は自動的に従量課金へ移行

---

## 参考リンク

### 公式価格情報
- [Azure Functions 価格](https://azure.microsoft.com/ja-jp/pricing/details/functions/)
- [Azure Database for PostgreSQL 価格](https://azure.microsoft.com/ja-jp/pricing/details/postgresql/)
- [Azure Static Web Apps 価格](https://azure.microsoft.com/ja-jp/pricing/details/app-service/static/)
- [Azure Storage 価格](https://azure.microsoft.com/ja-jp/pricing/details/storage/blobs/)
- [Azure Redis Cache 価格](https://azure.microsoft.com/ja-jp/pricing/details/cache/)

### コスト管理ツール
- [Azure 料金計算ツール](https://azure.microsoft.com/ja-jp/pricing/calculator/)
- [Azure TCO 計算ツール](https://azure.microsoft.com/ja-jp/pricing/tco/calculator/)
- [Azure Cost Management](https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview)
- [Azure Advisor](https://azure.microsoft.com/ja-jp/services/advisor/)

### 関連ドキュメント
- [Azure価格情報・コストシミュレーション リソース集](./azure-pricing-resources.md)
- [コストシミュレーション実践ワークシート](./cost-simulation-worksheet.md) 