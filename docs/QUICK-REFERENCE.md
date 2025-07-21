# 🚀 Shopify AIマーケティングスイート - クイックリファレンス

## 📍 **主要URL** 

### **本番環境**
- **フロントエンド**: `https://brave-sea-038f17a00.1.azurestaticapps.net` ⭐
- **バックエンドAPI**: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net` ✅
- **API接続テスト**: `https://brave-sea-038f17a00.1.azurestaticapps.net/api-test` ✅

### **開発環境**
- **フロントエンド**: `http://localhost:3000`
- **バックエンドAPI**: `https://localhost:7177`
- **Swagger**: `https://localhost:7177/swagger`

## ⚡ **クイックスタート**

```bash
# フロントエンド起動
cd frontend && npm run dev

# バックエンド起動  
cd backend/ShopifyTestApi && dotnet run
```

## 🔌 **主要APIエンドポイント**

```yaml
Health Check: /api/health
Customer Test: /api/customer/test
Customer Data: /api/customer/segments
Dashboard: /api/customer/dashboard
```

## 🛠️ **管理画面**
- **Azure Portal**: `https://portal.azure.com`
- **GitHub Actions**: Repository > Actions タブ

---
📝 **詳細**: [環境・URL情報リファレンス](./05-operations/environment-urls-reference.md) 