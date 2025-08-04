# 休眠顧客画面APIエラー調査 - 指示プロンプト

## 調査対象
休眠顧客分析画面で `/api/customer/dormant/detailed-segments` エンドポイントが500エラーを返している問題

## エラー内容
```
URL: https://localhost:7088/api/customer/dormant/detailed-segments?storeId=1
Status: 500 Internal Server Error
Message: "詳細な期間別セグメント分布の取得中にエラーが発生しました。"
```

## 調査手順

### 1. バックエンドログの確認
以下のファイルでエラーの詳細を確認してください：
- Azure App Service のログストリーム
- Application Insights のエラーログ
- ローカル開発環境の場合は `backend/ShopifyAnalyticsApi/bin/Debug/net8.0/` のログファイル

### 2. 該当APIコントローラーの確認
```
backend/ShopifyAnalyticsApi/Controllers/CustomerController.cs
```
- `GetDormantDetailedSegments` メソッドを確認
- エラーハンドリングの実装状況
- 依存サービスの呼び出し

### 3. サービス層の確認
```
backend/ShopifyAnalyticsApi/Services/Dormant/DormantSegmentationService.cs
```
- `GetDetailedSegmentsAsync` メソッドの実装
- データベースクエリの確認
- NULL値やゼロ除算などの潜在的な問題

### 4. データベース関連の確認
- ストアID=1のデータが存在するか
- 必要なインデックスが作成されているか
- クエリのタイムアウトが発生していないか

### 5. フロントエンドの対応確認
```
frontend/src/app/customer-analysis/dormant/page.tsx
```
- エラー時のフォールバック処理が正しく動作しているか
- "詳細セグメントAPI失敗、サマリーデータからのフォールバックを期待" のログが示すように、フォールバックは機能している模様

## 確認すべきポイント

1. **データの存在確認**
   ```sql
   SELECT COUNT(*) FROM Customers WHERE StoreId = 1;
   SELECT COUNT(*) FROM Orders WHERE StoreId = 1;
   ```

2. **最近追加されたインデックスの影響**
   - 休眠顧客分析用のインデックスが正しく作成されているか
   - インデックスによるクエリの競合がないか

3. **メモリ/パフォーマンスの問題**
   - 大量データ処理でメモリ不足になっていないか
   - クエリのタイムアウト設定

4. **エラーの再現性**
   - 常に発生するか、断続的か
   - 特定の条件（日付範囲、閾値）で発生するか

## 期待される調査結果

1. エラーの根本原因の特定
2. 修正方法の提案
3. 同様のエラーを防ぐための改善案

## 注意事項

- フロントエンドはフォールバック処理により画面表示は継続できているが、詳細セグメント機能が使えない状態
- ユーザー体験に影響があるため、早急な対応が必要

---

**調査担当者へ**: 上記の手順に従って調査を進め、発見事項を報告してください。