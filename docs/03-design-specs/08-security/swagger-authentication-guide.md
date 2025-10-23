# Swagger UI JWT認証テストガイド

**作成日**: 2025年7月28日  
**作成者**: ケンジ  
**対象**: 開発チーム

## 1. 概要

Swagger UIを使用してJWT認証付きAPIをテストする方法を説明します。

## 2. 事前準備

### 2.1 Swagger UI設定の確認

Program.csに以下の設定が含まれていることを確認してください：

```csharp
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Shopify Analytics API", Version = "v1" });
    
    // JWT認証スキーマの追加
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});
```

## 3. テスト手順

### 3.1 Swagger UIへのアクセス

1. 開発環境でAPIを起動
2. ブラウザで以下のURLにアクセス：
   ```
   https://localhost:5001/swagger
   ```

### 3.2 JWT トークンの取得

1. Swagger UIで `/api/auth/token` エンドポイントを探す
2. "Try it out" ボタンをクリック
3. リクエストボディに以下を入力：
   ```json
   {
     "storeId": 1,
     "shopDomain": "fuk-dev1.myshopify.com"
   }
   ```
4. "Execute" ボタンをクリック
5. レスポンスからアクセストークンをコピー：
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "...",
     "expiresIn": 3600,
     "tokenType": "Bearer"
   }
   ```

### 3.3 認証の設定

1. Swagger UI画面上部の **"Authorize"** ボタン（🔓アイコン）をクリック
2. 表示されるダイアログに、`Bearer ` (Bearerの後にスペース) を付けてアクセストークンを貼り付け
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   ⚠️ **重要**: "Bearer " プレフィックスを必ず含めてください
3. "Authorize" ボタンをクリック
4. "Close" ボタンで閉じる

### 3.4 認証付きAPIのテスト

1. 任意の保護されたエンドポイント（例：`/api/analytics/year-over-year`）を選択
2. "Try it out" をクリック
3. 必要なパラメータを入力
4. "Execute" をクリック
5. 認証が成功すれば、正常なレスポンスが返される

## 4. トラブルシューティング

### 4.1 "401 Unauthorized" エラー

- **"Bearer " プレフィックスが含まれているか確認** （最も一般的な原因）
  - ❌ 間違い: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - ✅ 正解: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- トークンが正しくコピーされているか確認
- トークンの有効期限（1時間）が切れていないか確認
- Authorizeダイアログでトークンが正しく設定されているか確認

### 4.2 認証不要のエンドポイント

以下のエンドポイントは認証不要でアクセス可能：
- `/api/health` - ヘルスチェック
- `/api/auth/token` - トークン取得
- `/api/auth/refresh` - トークン更新

### 4.3 トークンの更新

トークンの有効期限が切れた場合：
1. `/api/auth/refresh` エンドポイントを使用
2. リフレッシュトークンを送信
3. 新しいアクセストークンを取得
4. Swagger UIで再度Authorizeを実行

## 5. 開発時のヒント

### 5.1 トークンの保存

ブラウザの開発者ツールのコンソールで以下を実行すると、トークンを変数に保存できます：

```javascript
// トークンを保存
localStorage.setItem('jwt_token', 'your-token-here');

// トークンを取得
localStorage.getItem('jwt_token');
```

### 5.2 自動化スクリプト

頻繁にテストする場合は、以下のようなスクリプトを使用：

```bash
# トークン取得
TOKEN=$(curl -X POST https://localhost:5001/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"storeId": 1, "shopDomain": "fuk-dev1.myshopify.com"}' \
  | jq -r '.accessToken')

# APIテスト
curl -X GET https://localhost:5001/api/analytics/year-over-year \
  -H "Authorization: Bearer $TOKEN"
```

## 6. セキュリティ注意事項

- 本番環境のトークンを開発環境で使用しない
- トークンをGitにコミットしない
- 共有PCでテストした場合は、ブラウザのローカルストレージをクリア

---

**更新履歴**
- 2025-07-28: 初版作成（ケンジ）