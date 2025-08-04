# 統合テスト実施計画

作成日: 2025年8月4日  
作成者: Kenji（AI開発チームリーダー/PM）

## 1. テスト目的

### 主要目的
- セキュリティ脆弱性修正の検証
- マルチテナント機能の正常動作確認
- API全体のパフォーマンス測定
- エンドツーエンドの動作確認

## 2. テスト環境

### 環境情報
- **API**: https://shopifytestapi20250720173320.azurewebsites.net/
- **フロントエンド**: https://shiny-meadow-0e86bcc00.5.azurestaticapps.net/
- **データベース**: Azure SQL Database（Production）

### テストアカウント
- Store1: 本番データ（約1000件の注文）
- Store2: テストデータ（約100件の注文）
- Store3: 北海道ストア（地域特化データ）
- Store4: 前尾ストア（パフォーマンステスト用）

## 3. テストカテゴリ

### 3.1 セキュリティテスト 🔐

#### JWT認証テスト
```http
### 正常系: 有効なトークンでのアクセス
GET {{baseUrl}}/api/analytics/monthlySales?storeId=1
Authorization: Bearer {{valid_jwt_token}}

### 異常系: 無効なトークンでのアクセス
GET {{baseUrl}}/api/analytics/monthlySales?storeId=1
Authorization: Bearer invalid_token

### 異常系: トークンなしでのアクセス
GET {{baseUrl}}/api/analytics/monthlySales?storeId=1
```

#### マルチテナント分離テスト
```http
### Store1のトークンでStore2のデータにアクセス（失敗すべき）
GET {{baseUrl}}/api/analytics/monthlySales?storeId=2
Authorization: Bearer {{store1_jwt_token}}

### クエリパラメータによるインジェクション試行
GET {{baseUrl}}/api/customers/dormant?storeId=1 OR 1=1
Authorization: Bearer {{valid_jwt_token}}
```

#### セキュリティヘッダー確認
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] X-XSS-Protection
- [ ] Content-Security-Policy
- [ ] Strict-Transport-Security

### 3.2 機能テスト ✅

#### AnalyticsController
- [ ] GET /api/analytics/monthlySales
- [ ] GET /api/analytics/yearOverYear
- [ ] GET /api/analytics/purchaseCount

#### CustomerController
- [ ] GET /api/customers/dormant
- [ ] GET /api/customers/search
- [ ] GET /api/customers/{id}

#### PurchaseController
- [ ] GET /api/purchase/frequency
- [ ] GET /api/purchase/tier-trends

#### StoreController
- [ ] GET /api/stores
- [ ] GET /api/stores/{id}
- [ ] POST /api/stores/switch

### 3.3 パフォーマンステスト ⚡

#### レスポンスタイム目標
| エンドポイント | データ量 | 目標時間 |
|------------|---------|---------|
| /api/analytics/monthlySales | 100件 | < 500ms |
| /api/analytics/monthlySales | 1000件 | < 2s |
| /api/customers/dormant | 100件 | < 1s |
| /api/customers/dormant | 1000件 | < 3s |
| /api/analytics/yearOverYear | 全商品 | < 2s |

#### 負荷テスト
```bash
# Apache Benchを使用
ab -n 100 -c 10 -H "Authorization: Bearer ${JWT_TOKEN}" \
  https://shopifytestapi20250720173320.azurewebsites.net/api/analytics/monthlySales?storeId=1
```

### 3.4 統合テスト 🔄

#### ストア切り替えフロー
1. ログイン → JWTトークン取得
2. ストア一覧取得
3. ストア切り替え → 新しいJWTトークン取得
4. 新しいトークンでデータ取得
5. 正しいストアのデータが返ることを確認

#### データ整合性テスト
- [ ] Orders - OrderItems の関連性
- [ ] Customers - Orders の関連性
- [ ] Products - OrderItems の関連性
- [ ] 集計値の正確性（TotalSpent, TotalOrders）

### 3.5 エラーハンドリングテスト 🚨

#### APIエラーレスポンス
```json
{
  "type": "https://example.com/errors/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "The store ID is invalid",
  "instance": "/api/analytics/monthlySales"
}
```

#### テストケース
- [ ] 404 Not Found
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 400 Bad Request
- [ ] 500 Internal Server Error

## 4. テスト実施スケジュール

### 8月4日（日）
- **午前**: テスト環境準備、テストデータ確認
- **午後**: セキュリティテスト実施

### 8月5日（月）
- **午前**: 機能テスト、統合テスト
- **午後**: パフォーマンステスト、結果まとめ

## 5. テスト自動化

### Postmanコレクション
```json
{
  "info": {
    "name": "Shopify Analytics API Integration Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    // テストケース
  ]
}
```

### xUnitテスト（C#）
```csharp
[Fact]
public async Task GetMonthlySales_WithValidStoreId_ReturnsOk()
{
    // Arrange
    var client = _factory.WithWebHostBuilder(builder =>
    {
        builder.ConfigureServices(services =>
        {
            services.AddAuthentication("Test")
                .AddScheme<TestAuthenticationSchemeOptions, TestAuthenticationHandler>(
                    "Test", options => { });
        });
    }).CreateClient();

    // Act
    var response = await client.GetAsync("/api/analytics/monthlySales?storeId=1");

    // Assert
    response.EnsureSuccessStatusCode();
    Assert.Equal("application/json", 
        response.Content.Headers.ContentType.MediaType);
}
```

## 6. 成功基準

### 必須要件
- [ ] 全セキュリティテストがPASS
- [ ] 全機能テストがPASS
- [ ] パフォーマンス目標の80%以上達成
- [ ] 重大なバグがゼロ

### 推奨要件
- [ ] パフォーマンス目標の100%達成
- [ ] エラーハンドリングが適切
- [ ] ログが適切に記録される

## 7. テスト結果記録

### テスト実施結果テンプレート
```markdown
## テスト実施日: 2025-08-XX

### テスト環境
- 実施者: 
- 環境: Production / Staging
- ブラウザ: Chrome XX

### テスト結果サマリ
- 総テストケース数: XX
- 成功: XX
- 失敗: XX
- スキップ: XX

### 詳細結果
[テストケースごとの結果を記載]

### 発見された問題
[問題があれば記載]

### 改善提案
[提案があれば記載]
```

## 8. リスクと対策

### 識別されたリスク
1. **本番データでのテスト**: データ破損の可能性
   - 対策: 読み取り専用のテストを優先
   
2. **高負荷テスト**: 本番環境への影響
   - 対策: 段階的に負荷を上げる

3. **セキュリティテスト**: 攻撃と誤認される可能性
   - 対策: Azure WAFの一時的な調整

---
更新日時: 2025年8月4日 10:00