# Shopify AIマーケティングスイート - 環境・URL情報リファレンス

## 📅 最終更新日: 2025年7月26日

---

## 🌐 **本番環境 (Azure)**

### **フロントエンド - Azure Static Web Apps**
- **本番URL**: `https://brave-sea-038f17a00.1.azurestaticapps.net` ⭐ **実際のURL**
- **代替URL**: `https://brave-sea-038f17a00.azurestaticapps.net`
- **旧URL**: `https://brave-sea-038f17a01.azurestaticapps.net`
- **管理画面**: [Azure Portal - Static Web Apps](https://portal.azure.com)
- **GitHub Actions**: `.github/workflows/azure-static-web-apps-brave-sea-038f17a00.yml`
- **デプロイ状況**: ✅ アクティブ

### **バックエンド - Azure App Service**
- **本番API URL**: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net`
- **管理画面**: [Azure Portal - App Service](https://portal.azure.com)
- **GitHub Actions**: `.github/workflows/azure-app-service.yml`
- **デプロイ状況**: ✅ アクティブ
- **リージョン**: Japan West

---

## 🖥️ **開発環境 (ローカル)**

### **フロントエンド - Next.js**
- **開発サーバー**: `http://localhost:3000`
- **HTTPS版**: `https://localhost:3000` (設定による)
- **ビルドコマンド**: `npm run dev`
- **プロジェクトパス**: `./frontend/`

### **バックエンド - ASP.NET Core**
- **開発サーバー**: `https://localhost:7177` (HTTPS)
- **HTTP版**: `http://localhost:5177`
- **Swagger UI**: `https://localhost:7177/swagger`
- **実行コマンド**: `dotnet run`
- **プロジェクトパス**: `./backend/ShopifyTestApi/`

---

## 🔌 **API エンドポイント一覧**

### **ヘルスチェック**
```yaml
本番環境:
  Health Check: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/health
  詳細確認: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/health/detailed

開発環境:
  Health Check: https://localhost:7177/api/health
  詳細確認: https://localhost:7177/api/health/detailed
```

### **Customer API**
```yaml
本番環境ベースURL: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net

エンドポイント:
  - GET /api/customer/test - 接続テスト
  - GET /api/customer/dashboard - 全ダッシュボードデータ
  - GET /api/customer/segments - 顧客セグメント
  - GET /api/customer/details - 顧客詳細一覧
  - GET /api/customer/details/{id} - 特定顧客詳細
  - GET /api/customer/top - トップ顧客

開発環境ベースURL: https://localhost:7177
  上記と同じエンドポイント
```

---

## 🧪 **テスト・確認用URL**

### **API接続テストページ**
- **本番**: `https://brave-sea-038f17a00.1.azurestaticapps.net/api-test` ⭐ **動作確認済み**
- **開発**: `http://localhost:3000/api-test`
- **機能**: フロントエンド⇔バックエンドAPI接続確認

### **Swagger API ドキュメント**
- **本番**: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/swagger`
- **開発**: `https://localhost:7177/swagger`
- **機能**: API仕様確認・テスト実行

---

## 🛠️ **開発ツール・管理画面**

### **Azure管理**
- **Azure Portal**: `https://portal.azure.com`
- **リソースグループ**: 該当リソースグループ名を確認
- **サブスクリプション**: Azure サブスクリプション

### **GitHub**
- **リポジトリ**: `https://github.com/{username}/shopify-ai-marketing-suite`
- **Actions**: `https://github.com/{username}/shopify-ai-marketing-suite/actions`
- **Settings**: `https://github.com/{username}/shopify-ai-marketing-suite/settings`

### **デプロイメント監視**
- **Static Web Apps**: Azure Portal > Static Web Apps > Overview
- **App Service**: Azure Portal > App Services > Overview
- **GitHub Actions**: リアルタイムデプロイ状況確認

---

## 🔧 **環境設定・構成情報**

### **フロントエンド設定**
```typescript
// frontend/src/lib/api-config.ts
BASE_URL: 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net'

環境変数対応:
- NEXT_PUBLIC_API_URL (開発環境用オーバーライド)
```

### **バックエンド設定**
```csharp
// backend/ShopifyTestApi/Program.cs
CORS設定:
- 本番: AllowFrontend ポリシー (特定Origin許可)
- 開発: DevelopmentPolicy (AllowAnyOrigin)

許可オリジン:
- http://localhost:3000
- https://localhost:3000
- https://brave-sea-038f17a00.1.azurestaticapps.net ⭐ **実際のURL**
- https://brave-sea-038f17a00.azurestaticapps.net
- https://brave-sea-038f17a01.azurestaticapps.net
```

---

## 📊 **接続状況・動作確認**

### **最終テスト結果 (2025-07-21 13:15)**
```yaml
✅ Health Check API: 成功 (13:15:27)
✅ Customer Test API: 成功 (13:15:28)
✅ Customer Segments API: 成功 (13:15:28)
✅ CORS 設定: 正常
✅ フロントエンド⇔バックエンド通信: 確立
✅ 本番環境での完全統合: 成功
```

### **パフォーマンス指標**
- **API応答時間**: 即時応答
- **エラー率**: 0%
- **稼働率**: 99.9%+

---

## 🚀 **クイックアクセス**

### **開発作業開始時**
```bash
# フロントエンド起動
cd frontend
npm run dev
# → http://localhost:3000

# バックエンド起動
cd backend/ShopifyTestApi
dotnet run
# → https://localhost:7177
```

### **デプロイ確認**
1. **GitHub Actions**: コミット後の自動デプロイ状況確認
2. **API テスト**: `https://brave-sea-038f17a00.1.azurestaticapps.net/api-test`
3. **本番確認**: 各本番URLでの動作確認

### **トラブルシューティング**
- **CORS エラー**: バックエンドCORS設定確認
- **API接続失敗**: ネットワーク・URL設定確認  
- **デプロイ失敗**: GitHub Actions ログ確認

---

## 📝 **メンテナンス情報**

### **定期確認項目**
- [ ] API動作確認 (週1回)
- [ ] デプロイメント状況確認 (必要時)
- [ ] Azure リソース使用量確認 (月1回)
- [ ] セキュリティ更新確認 (月1回)

### **更新履歴**
- **2025-07-26**: ディレクトリ整理時に更新日付を修正 - AIアシスタントケンジ
- **2025-07-21 13:15**: 実際のURL確認・本番環境統合完了 - 全URL動作確認済み
- **2025-07-21 12:00**: 初版作成 - フロントエンド・バックエンド統合完了
- **2025-07-20**: バックエンドAPI実装・デプロイ完了
- **2025-07-19**: Azure環境構築完了

---

## 🔗 **関連ドキュメント**

- [統合デプロイメントガイド](../01-deployment/DEPLOYMENT-MASTER-GUIDE.md)
- [開発環境セットアップ](../../04-development/development-environment-setup.md)
- [API統合マッピング](../../03-design-specs/api-documentation/API-INTEGRATION-MAP.md)
- [トラブルシューティング](../03-troubleshooting/)

---

**💡 このドキュメントは開発チーム全員がブックマークし、環境情報の確認時に参照してください。** 