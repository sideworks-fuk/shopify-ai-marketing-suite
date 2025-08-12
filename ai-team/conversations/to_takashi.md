# Takashiへのタスク指示 - 2025年8月12日（火）

## 本日の作業内容

Takashiさん、おはようございます！
昨日の驚異的な実装ペース、本当にお疲れ様でした。3種類のデータ同期ジョブと手動同期APIを完成させ、41個のテストも作成した成果は素晴らしいです。

本日は最終日として、統合テストと品質保証をお願いします。

---

## 優先タスク詳細

### 1. 統合テスト実施（9:00-11:00）

#### テスト対象
実際のShopify APIと接続して、エンドツーエンドの動作を確認します。

#### テストケース
1. **商品データ同期テスト**
   ```csharp
   [Fact]
   public async Task ProductSync_WithRealAPI_ShouldCompleteSuccessfully()
   {
       // 実際のShopify APIエンドポイントを使用
       // 100件の商品を同期
       // チェックポイント機能の確認
       // 進捗追跡の確認
   }
   ```

2. **顧客データ同期テスト**
   ```csharp
   [Fact]
   public async Task CustomerSync_WithPagination_ShouldHandleCorrectly()
   {
       // ページネーション処理の確認
       // 大量データ（1000件以上）の処理
       // メモリ使用量の監視
   }
   ```

3. **注文データ同期テスト**
   ```csharp
   [Fact]
   public async Task OrderSync_WithDateRange_ShouldFilterCorrectly()
   {
       // 日付範囲フィルタリングの確認
       // 関連データ（顧客、商品）の整合性確認
       // トランザクション処理の確認
   }
   ```

#### 確認項目
- [ ] Rate Limit処理が正しく動作
- [ ] エラー時のリトライが機能
- [ ] チェックポイントからの再開が可能
- [ ] ログが適切に出力される

### 2. パフォーマンステスト（11:00-12:00）

#### テストシナリオ
1. **大量データ処理**
   - 商品: 5,000件
   - 顧客: 10,000件
   - 注文: 20,000件

2. **メトリクス測定**
   ```csharp
   // パフォーマンス測定コード
   var stopwatch = Stopwatch.StartNew();
   var memoryBefore = GC.GetTotalMemory(false);
   
   // 同期処理実行
   await syncJob.Execute();
   
   var elapsed = stopwatch.Elapsed;
   var memoryAfter = GC.GetTotalMemory(false);
   
   // アサーション
   Assert.True(elapsed < TimeSpan.FromMinutes(5));
   Assert.True(memoryAfter - memoryBefore < 100_000_000); // 100MB以下
   ```

3. **ボトルネック分析**
   - データベース書き込み速度
   - API呼び出しの並列化
   - メモリ効率

### 3. 本番環境設定支援（13:00-15:00）

#### 環境変数ドキュメント
```yaml
# appsettings.Production.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:xxx.database.windows.net,1433;..."
  },
  "Shopify": {
    "ApiKey": "${SHOPIFY_API_KEY}",
    "ApiSecret": "${SHOPIFY_API_SECRET}",
    "Scopes": "read_products,write_products,read_customers,read_orders"
  },
  "HangFire": {
    "DashboardPath": "/hangfire",
    "RequireAuth": true
  }
}
```

#### デプロイスクリプト
```bash
#!/bin/bash
# deploy.sh

# ビルド
dotnet publish -c Release -o ./publish

# データベースマイグレーション
dotnet ef database update --connection "$PROD_CONNECTION_STRING"

# Azure App Serviceへデプロイ
az webapp deployment source config-zip \
  --resource-group gemini-rg \
  --name gemini-backend \
  --src publish.zip
```

#### コスト最適化の提案（福田様のリクエストに対応）
1. **App Service Plan**
   - 開始時: B1 (Basic) - 月額約$55
   - 負荷に応じて: S1 (Standard) - 月額約$70
   - 自動スケーリング設定で対応

2. **SQL Database**
   - 開始時: Basic (5 DTU) - 月額約$5
   - 必要に応じて: S0 (10 DTU) - 月額約$15
   - エラスティックプール検討

3. **監視設定**
   ```csharp
   // Application Insightsでパフォーマンス監視
   services.AddApplicationInsightsTelemetry();
   
   // アラート設定
   // CPU使用率 > 80% で通知
   // メモリ使用率 > 75% で通知
   // エラー率 > 1% で通知
   ```

### 4. API仕様書作成（15:00-17:00）

#### ドキュメント構成
1. **認証フロー**
   - OAuth 2.0フロー図
   - トークン管理
   - セキュリティ考慮事項

2. **エンドポイント一覧**
   ```markdown
   ## 同期管理API
   
   ### GET /api/sync/status
   現在の同期状態を取得
   
   **レスポンス:**
   ```json
   {
     "status": "running",
     "progress": 45,
     "currentDataType": "products",
     "startedAt": "2025-08-13T09:00:00Z"
   }
   ```
   
   ### POST /api/sync/start
   同期を開始
   
   **リクエスト:**
   ```json
   {
     "dataTypes": ["products", "customers", "orders"],
     "dateRange": {
       "from": "2024-01-01",
       "to": "2025-08-13"
     }
   }
   ```
   ```

3. **エラーコード一覧**
   | コード | 説明 | 対処法 |
   |--------|------|--------|
   | 400 | 不正なリクエスト | パラメータを確認 |
   | 401 | 認証エラー | トークンを更新 |
   | 429 | Rate Limit | 時間をおいて再試行 |
   | 500 | サーバーエラー | ログを確認 |

---

## 成果物チェックリスト

### 午前中（9:00-12:00）
- [ ] 統合テスト15本以上実施
- [ ] すべてのテスト成功
- [ ] パフォーマンス測定完了
- [ ] ボトルネック特定

### 午後（13:00-17:00）
- [ ] 本番環境設定ドキュメント完成
- [ ] デプロイスクリプト作成
- [ ] コスト最適化案作成
- [ ] API仕様書完成

---

## 技術的な注意事項

### テスト環境
- Shopify開発ストア使用
- テストデータは自動クリーンアップ
- Rate Limitに注意（2リクエスト/秒）

### 本番環境考慮事項
- Managed Identity使用
- Key Vault統合
- Application Insights設定
- 自動バックアップ設定

---

## 連絡事項

### コミュニケーション
- 進捗は`report_takashi.md`に記載
- 技術的な質問は`to_kenji.md`へ
- ブロッカーがあれば即座に連絡

### レビュー依頼
- 統合テスト結果は11:00頃に共有
- API仕様書は16:00頃にレビュー依頼

### 福田様への提案
本番環境のコスト最適化について、以下の段階的アプローチを提案します：
1. 最小構成でスタート（月額約$60）
2. 負荷監視でボトルネック特定
3. 必要な部分のみスケールアップ

詳細は本日14:00頃にドキュメント化します。

---

## サポート

何か不明な点や困ったことがあれば、遠慮なく連絡してください。
特に実際のShopify APIとの接続で問題があれば、すぐにサポートします。

本日も頑張りましょう！プロジェクト完成まであと少しです！

---

**Kenji**  
2025年8月13日 9:00

---

# 過去の作業指示履歴

## 2025年8月12日（火）12:40