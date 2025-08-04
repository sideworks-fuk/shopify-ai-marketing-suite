# 休眠顧客分析画面 パフォーマンス改善 実行ガイド

作成日: 2025年7月27日  
作成者: TAKASHI (AI Assistant)  
更新: 2025年7月27日 - ケンジ (AI Assistant) - 実行前の重要確認事項を追加

## 🚨 実行前の重要確認事項

### データベースのバックアップ（必須）
```sql
-- インデックス作成前に必ずバックアップを取得
BACKUP DATABASE [YourDatabaseName] 
TO DISK = 'C:\Backup\ShopifyAnalytics_20250727_before_index.bak'
WITH FORMAT, INIT, NAME = 'Before Performance Index Creation';
```

### 現在の接続数確認
```sql
-- アクティブな接続数を確認（特に本番環境では重要）
SELECT 
    COUNT(*) as ActiveConnections,
    DB_NAME() as DatabaseName
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID();

-- 5接続以下が推奨。多い場合は低負荷時間帯まで待機
```

### Azure環境での確認事項
1. **DTU使用率の確認**
   - Azure Portal → SQL Database → メトリック
   - DTU使用率が50%以下であることを確認
   - Basic tier (5 DTU)の場合、インデックス作成に10-15分かかる可能性

2. **データベースサイズの確認**
   ```sql
   -- 現在のデータベースサイズと空き容量を確認
   SELECT 
       size * 8 / 1024 AS 'Database Size (MB)',
       size * 8 / 1024 - FILEPROPERTY(name, 'SpaceUsed') * 8 / 1024 AS 'Free Space (MB)'
   FROM sys.database_files
   WHERE type = 0; -- データファイルのみ
   
   -- インデックス作成には最低200MB以上の空き容量が必要
   ```

### 実行タイミングの推奨
- **開発環境**: 即時実行可
- **ステージング環境**: 他のテストが実行されていない時間帯
- **本番環境**: 深夜帯（午前2-5時）を強く推奨

## 現時点で実行・確認していただきたい項目

### 1. データベースインデックスの適用

#### 実行手順

1. **開発環境のSQL Serverに接続**
   ```bash
   # Azure Data Studio または SQL Server Management Studio で接続
   ```

2. **現在のパフォーマンスを測定（インデックス適用前）**
   ```sql
   -- パフォーマンス測定を有効化
   SET STATISTICS TIME ON;
   SET STATISTICS IO ON;

   -- 365日以上購入していない顧客の取得（現在の状態）
   SELECT 
       c.Id,
       c.FirstName + ' ' + c.LastName as Name,
       c.Email,
       c.TotalSpent,
       c.OrdersCount,
       MAX(o.CreatedAt) as LastOrderDate,
       DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) as DaysSinceLastOrder
   FROM Customers c
   LEFT JOIN Orders o ON c.Id = o.CustomerId
   WHERE c.StoreId = 1
   GROUP BY c.Id, c.FirstName, c.LastName, c.Email, c.TotalSpent, c.OrdersCount
   HAVING DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) >= 365
   ORDER BY c.TotalSpent DESC;

   SET STATISTICS TIME OFF;
   SET STATISTICS IO OFF;
   ```
   
   **記録項目**:
   - CPU time
   - Elapsed time
   - Logical reads

3. **インデックスの適用**
   ```bash
   # SQLファイルの実行
   sqlcmd -S [サーバー名] -d [データベース名] -i backend/ShopifyAnalyticsApi/Migrations/2025-07-27-DormantCustomerPerformanceIndexes.sql
   ```

4. **適用後のパフォーマンス測定**
   - 上記と同じクエリを再実行
   - 改善率を計算

### 2. アプリケーションの動作確認

#### バックエンドの確認

1. **APIの起動**
   ```bash
   cd backend/ShopifyAnalyticsApi
   dotnet run
   ```

2. **エンドポイントのテスト**
   ```bash
   # 休眠顧客一覧の取得（ページサイズ30で確認）
   curl "https://localhost:7001/api/customer/dormant?pageSize=30&segment=365日以上"
   
   # レスポンスタイムを確認
   ```

#### フロントエンドの確認

1. **開発サーバーの起動**
   ```bash
   cd frontend
   npm run dev
   ```

2. **休眠顧客分析画面へアクセス**
   - URL: `http://localhost:3000/customers/dormant`
   
3. **確認ポイント**
   - 初期表示が30件になっているか
   - ページネーションが正常に動作するか
   - 365日以上セグメントを選択した際のフリーズ時間

### 3. パフォーマンス測定

#### Chrome DevToolsでの測定

1. **Performanceタブを開く**
   - F12 → Performance タブ

2. **測定開始**
   - Record開始
   - 休眠顧客分析画面をロード
   - 各セグメントを切り替え
   - Record停止

3. **記録項目**
   - FCP (First Contentful Paint)
   - LCP (Largest Contentful Paint)
   - Total Blocking Time
   - Memory使用量

#### Network タブでの確認

1. **APIレスポンスタイムの確認**
   - `/api/customer/dormant` のTiming
   - Response sizeの確認

2. **Waterfallチャートの分析**
   - ボトルネックの特定

### 4. 推奨される確認フロー

```markdown
## チェックリスト

### インデックス適用前
- [ ] 365日以上セグメントの読み込み時間: ___秒
- [ ] メモリ使用量: ___MB
- [ ] SQLクエリ実行時間: ___ms

### インデックス適用後
- [ ] 365日以上セグメントの読み込み時間: ___秒
- [ ] メモリ使用量: ___MB
- [ ] SQLクエリ実行時間: ___ms

### 改善率
- [ ] 読み込み時間: ___%改善
- [ ] SQLクエリ: ___%改善
```

## 段階的実行の推奨（安全性向上）

大量データがある場合や本番環境では、インデックスを1つずつ作成することを推奨：

```sql
-- Step 1: 最重要インデックスから（約1-2分）
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice, FinancialStatus, FulfillmentStatus)
WITH (ONLINE = ON, MAXDOP = 4);

-- 動作確認（改善効果を確認）
-- 365日セグメントのクエリを実行して時間を測定

-- Step 2: 問題なければ次のインデックス（約1分）
CREATE NONCLUSTERED INDEX IX_Customers_CreatedAt_StoreId
ON Customers(CreatedAt, StoreId) 
INCLUDE (Email, FirstName, LastName, TotalSpent, OrdersCount)
WITH (ONLINE = ON, MAXDOP = 4);

-- Step 3: 最後のインデックス（約1-2分）
CREATE NONCLUSTERED INDEX IX_Orders_StoreId_CreatedAt
ON Orders(StoreId, CreatedAt)
INCLUDE (CustomerId, TotalPrice)
WITH (ONLINE = ON, MAXDOP = 4);
```

## 緊急時のロールバック手順

インデックス作成で問題が発生した場合の対処：

```sql
-- インデックスの削除（作成の逆順で実行）
DROP INDEX IF EXISTS IX_Orders_StoreId_CreatedAt ON Orders;
DROP INDEX IF EXISTS IX_Customers_CreatedAt_StoreId ON Customers;
DROP INDEX IF EXISTS IX_Orders_CustomerId_CreatedAt_DESC ON Orders;

-- パフォーマンスが悪化した場合は統計情報をリセット
UPDATE STATISTICS Orders WITH FULLSCAN;
UPDATE STATISTICS Customers WITH FULLSCAN;
```

## トラブルシューティング

### インデックス作成時のエラー

1. **権限不足の場合**
   ```sql
   -- 必要な権限を確認
   SELECT * FROM fn_my_permissions(NULL, 'DATABASE');
   ```

2. **既存インデックスとの競合**
   ```sql
   -- 既存インデックスを確認
   SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Orders');
   ```

### パフォーマンスが改善されない場合

1. **統計情報の更新を再実行**
   ```sql
   UPDATE STATISTICS Orders WITH FULLSCAN;
   UPDATE STATISTICS Customers WITH FULLSCAN;
   ```

2. **クエリ実行プランの確認**
   - SQL Server Management Studioで実行プランを表示
   - Index Seekが使用されているか確認

## 結果報告テンプレート

```markdown
## パフォーマンス改善結果報告

測定日時: 2025年7月__日 __:__
測定環境: [開発/ステージング/本番]

### 改善前
- 365日セグメント読み込み: __秒
- 初期ロード（30件）: __秒
- メモリ使用量: __MB

### 改善後
- 365日セグメント読み込み: __秒（__%改善）
- 初期ロード（30件）: __秒（__%改善）
- メモリ使用量: __MB（__%削減）

### 所感
- 
```

---

## 期待される結果の目安

実行後、以下の改善が期待されます：

| 測定項目 | 改善前（目安） | 改善後（期待値） | 改善率 |
|---------|--------------|----------------|--------|
| 365日以上セグメント | 20-30秒 | 1-3秒 | 90%以上 |
| 180日以上セグメント | 10-15秒 | 0.5-2秒 | 80%以上 |
| 初期表示（30件） | 10-15秒 | 2-3秒 | 70%以上 |
| SQLクエリ実行時間 | 5000ms以上 | 100-300ms | 95%以上 |
| メモリ使用量 | 200-300MB | 100-150MB | 30-50% |

## 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025年7月27日 | TAKASHI (AI Assistant) | 初版作成 |
| 2025年7月27日 | ケンジ (AI Assistant) | 実行前の重要確認事項、段階的実行、ロールバック手順を追加 |