# WebhookController実装計画

## 📋 **実装概要**

Shopify OAuthハイブリッド方式の実装完了後、GDPR対応のWebhookControllerを実装します。これにより、ShopifyからのWebhookイベントを適切に処理し、データ保護規制に対応します。

## 🎯 **実装目標**

### **主要機能**
1. **GDPR Webhook処理**: 顧客データ削除要求の処理
2. **アプリアンインストール処理**: アプリ削除時のデータクリーンアップ
3. **非同期処理**: Azure Service Busを使用したスケーラブルな処理
4. **セキュリティ**: HMAC検証によるWebhook認証

### **対応Webhook**
- `app/uninstalled`: アプリアンインストール
- `customers/redact`: 顧客データ削除要求
- `shop/redact`: ショップデータ削除要求
- `customers/data_request`: 顧客データ要求

## 🏗️ **アーキテクチャ設計**

### **1. WebhookController構造**
```
Controllers/
├── WebhookController.cs          # メインWebhook処理
├── WebhookValidationService.cs   # HMAC検証サービス
└── WebhookProcessingService.cs   # 非同期処理サービス
```

### **2. サービス層**
```
Services/
├── Webhook/
│   ├── IWebhookService.cs
│   ├── WebhookService.cs
│   ├── CustomerRedactionService.cs
│   └── ShopRedactionService.cs
└── AzureServiceBus/
    ├── IMessageBusService.cs
    └── AzureServiceBusService.cs
```

### **3. モデル**
```
Models/
├── WebhookModels.cs
├── CustomerRedactionRequest.cs
├── ShopRedactionRequest.cs
└── DataRequest.cs
```

## 📝 **実装詳細**

### **Phase 1: 基本WebhookController実装**

#### **1.1 WebhookController作成**
```csharp
[ApiController]
[Route("api/webhook")]
public class WebhookController : ControllerBase
{
    // HMAC検証
    // Webhook受信処理
    // 非同期処理キュー投入
}
```

#### **1.2 エンドポイント実装**
- `POST /api/webhook/uninstalled`: アプリアンインストール
- `POST /api/webhook/customers-redact`: 顧客データ削除
- `POST /api/webhook/shop-redact`: ショップデータ削除
- `POST /api/webhook/customers-data-request`: 顧客データ要求

### **Phase 2: セキュリティ実装**

#### **2.1 HMAC検証**
```csharp
private bool VerifyWebhookHmac(string body, string hmacHeader)
{
    // Shopify Webhook HMAC検証
    // セキュリティ強化
}
```

#### **2.2 レート制限**
```csharp
// Webhook受信のレート制限
// 重複処理防止
```

### **Phase 3: 非同期処理実装**

#### **3.1 Azure Service Bus統合**
```csharp
public interface IMessageBusService
{
    Task SendMessageAsync<T>(T message, string queueName);
    Task ProcessMessageAsync<T>(Func<T, Task> handler, string queueName);
}
```

#### **3.2 メッセージキュー設計**
- `customer-redaction-queue`: 顧客データ削除処理
- `shop-redaction-queue`: ショップデータ削除処理
- `app-uninstall-queue`: アプリアンインストール処理

### **Phase 4: データ処理実装**

#### **4.1 顧客データ削除**
```csharp
public class CustomerRedactionService
{
    // 顧客データの完全削除
    // 匿名化処理
    // 削除ログ記録
}
```

#### **4.2 ショップデータ削除**
```csharp
public class ShopRedactionService
{
    // ショップデータの完全削除
    // 関連データのクリーンアップ
    // 削除確認レポート
}
```

## 🔧 **技術仕様**

### **使用技術**
- **ASP.NET Core 8**: Webhook受信
- **Azure Service Bus**: 非同期メッセージング
- **Entity Framework Core**: データベース操作
- **Polly**: リトライ機能
- **Serilog**: ログ出力

### **セキュリティ要件**
- **HMAC-SHA256**: Webhook認証
- **HTTPS必須**: 本番環境
- **レート制限**: 重複処理防止
- **データ暗号化**: 機密情報保護

### **パフォーマンス要件**
- **レスポンス時間**: 200ms以内
- **スループット**: 1000 req/sec
- **可用性**: 99.9%
- **スケーラビリティ**: 水平スケール対応

## 📊 **実装スケジュール**

### **午後（13:00-17:00）**

#### **13:00-14:00: Phase 1**
- [ ] WebhookController基本実装
- [ ] エンドポイント作成
- [ ] 基本的なWebhook受信処理

#### **14:00-15:00: Phase 2**
- [ ] HMAC検証実装
- [ ] セキュリティ強化
- [ ] エラーハンドリング

#### **15:00-16:00: Phase 3**
- [ ] Azure Service Bus統合
- [ ] 非同期処理実装
- [ ] メッセージキュー設計

#### **16:00-17:00: Phase 4**
- [ ] データ処理実装
- [ ] テスト作成
- [ ] ドキュメント更新

## 🧪 **テスト計画**

### **単体テスト**
- [ ] WebhookControllerテスト
- [ ] HMAC検証テスト
- [ ] データ処理テスト
- [ ] エラーハンドリングテスト

### **統合テスト**
- [ ] Webhook受信テスト
- [ ] 非同期処理テスト
- [ ] データベース操作テスト
- [ ] パフォーマンステスト

### **セキュリティテスト**
- [ ] HMAC検証テスト
- [ ] 不正リクエストテスト
- [ ] レート制限テスト
- [ ] データ漏洩テスト

## 📈 **成功指標**

### **機能指標**
- [ ] すべてのWebhookが正常に受信される
- [ ] データ削除が完全に実行される
- [ ] 非同期処理が正常に動作する
- [ ] エラーハンドリングが適切に動作する

### **パフォーマンス指標**
- [ ] レスポンス時間が200ms以内
- [ ] スループットが1000 req/sec以上
- [ ] エラー率が1%以下
- [ ] 可用性が99.9%以上

### **セキュリティ指標**
- [ ] HMAC検証が100%成功
- [ ] 不正リクエストが100%拒否
- [ ] データ漏洩が0件
- [ ] セキュリティ監査が合格

## 🔄 **次のステップ**

### **明日（1月26日）**
1. **最終調整**: パフォーマンス最適化
2. **セキュリティ監査**: 本番環境準備
3. **ドキュメント更新**: 運用マニュアル作成
4. **デプロイ準備**: Azure環境での動作確認

### **来週**
1. **本番デプロイ**: 段階的リリース
2. **監視設定**: アラートとメトリクス
3. **運用開始**: 実際のWebhook処理開始
4. **継続改善**: フィードバックに基づく改善

---

**作成日**: 2025-01-25  
**担当**: TAKASHI  
**次回更新**: WebhookController実装完了後 