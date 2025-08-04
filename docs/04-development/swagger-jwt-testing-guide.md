# SwaggerでのJWT認証テストガイド

## 概要
JWT認証を実装したAPIをSwagger UIでテストする方法を説明します。

## 1. Swagger UIへのアクセス

開発環境：
```
http://localhost:7088/swagger
```

本番環境：
```
https://shopifytestapi20250720173320.azurewebsites.net/swagger
```

## 2. トークンの取得

### Step 1: AuthControllerでトークンを生成

1. Swagger UIで `/api/auth/token` エンドポイントを探す
2. "Try it out" をクリック
3. Request bodyに以下を入力：

```json
{
  "storeId": 1,
  "shopDomain": "fuk-dev1.myshopify.com"
}
```

4. "Execute" をクリック
5. レスポンスから `accessToken` をコピー

レスポンス例：
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

## 3. Swagger UIで認証を設定

### Step 2: トークンを設定

1. Swagger UIの右上にある "Authorize" ボタンをクリック
2. 表示されるダイアログに以下の形式でトークンを入力：
   ```
   Bearer {コピーしたaccessToken}
   ```
   例：
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. "Authorize" ボタンをクリック
4. "Close" ボタンをクリック

## 4. 認証付きAPIのテスト

### Step 3: 保護されたエンドポイントをテスト

認証が設定されたら、以下のエンドポイントがテスト可能になります：

- `/api/analytics/year-over-year` - 前年同月比分析
- `/api/customer/dormant` - 休眠顧客分析
- `/api/purchase/count` - 購入回数分析
- `/api/store` - ストア情報

各エンドポイントで "Try it out" → パラメータ入力 → "Execute" でテストできます。

## 5. トラブルシューティング

### 401 Unauthorized エラー

- トークンの期限切れ（1時間）
- トークンの形式が間違っている（"Bearer " プレフィックスを忘れていないか確認）
- 解決方法：新しいトークンを取得して再設定

### 403 Forbidden エラー

- 他のストアのデータにアクセスしようとしている
- 解決方法：トークンに含まれるstoreIdと一致するデータのみアクセス可能

## 6. 開発環境での簡易テスト

開発環境では、以下のエンドポイントは認証なしでアクセス可能：

- `/health` - ヘルスチェック
- `/env-info` - 環境情報
- `/db-test` - データベース接続テスト

## 7. cURLでのテスト例

```bash
# トークン取得
curl -X POST http://localhost:7088/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "shopDomain": "fuk-dev1.myshopify.com"
  }'

# APIアクセス（トークンを使用）
curl -X GET "http://localhost:7088/api/customer/dormant?storeId=1&daysThreshold=90" \
  -H "Authorization: Bearer {your-access-token}"
```

## 8. Postmanでのテスト

Postmanを使用する場合：

1. Authorizationタブを選択
2. TypeをBearer Tokenに設定
3. Tokenフィールドにアクセストークンを貼り付け
4. リクエストを送信

## 注意事項

- トークンは1時間で期限切れになります
- 本番環境では必ずHTTPSを使用してください
- トークンをブラウザのコンソールやログに出力しないでください
- テスト用のトークンは開発環境でのみ使用してください