# ShopifyTestApi.Tests

## 概要

ShopifyTestApiのユニットテストプロジェクト。xUnit、Moq、FluentAssertionsを使用した包括的なテストスイートです。

## テスト構成

### Services/Dormant
- **DormantCustomerQueryServiceTests** - 基本機能のユニットテスト
  - ページング機能
  - フィルタリング機能
  - ソート機能
  - キャッシュ機能
  - エラーハンドリング

- **DormantCustomerQueryServicePerformanceTests** - パフォーマンステスト
  - 大量データ処理
  - キャッシュ効果測定
  - 並行実行テスト
  - スケーラビリティテスト

## テスト実行方法

```bash
# すべてのテストを実行
dotnet test

# 特定のテストクラスを実行
dotnet test --filter "ClassName=DormantCustomerQueryServiceTests"

# カバレッジレポート生成
dotnet test --collect:"XPlat Code Coverage"

# 詳細な出力付き
dotnet test --logger "console;verbosity=detailed"
```

## テストデータ

### 基本テストデータ
- 休眠顧客: 4名（異なる休眠期間）
- アクティブ顧客: 1名
- 他店舗顧客: 1名

### パフォーマンステストデータ
- 最大1000件の顧客データ
- 80%が休眠顧客、20%がアクティブ顧客
- ランダムだが再現可能なデータ生成

## テストカテゴリ

### 機能テスト
- ✅ ページング機能
- ✅ フィルタリング（セグメント、金額、リスクレベル）
- ✅ ソート機能（複数条件）
- ✅ キャッシュ機能
- ✅ 個別顧客取得
- ✅ 総数カウント

### エッジケーステスト
- ✅ Nullパラメータ
- ✅ 存在しない顧客
- ✅ アクティブ顧客の除外
- ✅ 異なる店舗の分離

### パフォーマンステスト
- ✅ 大量データ処理（1000件）
- ✅ キャッシュ効果
- ✅ 複雑なフィルター条件
- ✅ 並行実行

## アサーション

FluentAssertionsを使用した読みやすいアサーション:
```csharp
result.Should().NotBeNull();
result.Items.Should().HaveCount(10);
result.Items.Should().BeInDescendingOrder(x => x.TotalSpent);
```

## モック

Moqを使用した依存関係のモック:
```csharp
_mockLogger.Verify(x => x.Log(...), Times.Once);
_mockConfiguration.Setup(x => x.GetValue<int>(...)).Returns(90);
```

## カバレッジ目標

- 全体: 80%以上
- 重要なビジネスロジック: 90%以上
- エラーハンドリング: 100%

## CI/CD統合

GitHub ActionsやAzure DevOpsでの実行:
```yaml
- name: Run tests
  run: dotnet test --logger trx --results-directory TestResults
```

---

**作成日**: 2025年1月26日  
**最終更新**: 2025年1月26日