# Postman - トークン自動保存スクリプト

## 概要

Postmanで開発者認証（`POST /api/developer/login`）を実行した後、レスポンスのトークンを自動的に環境変数に保存するスクリプトです。

---

## 設定方法

### 1. Postmanリクエストを開く

`POST developer/login` リクエストを開きます。

### 2. Testsタブにスクリプトを追加

リクエストの **Tests** タブを選択し、以下のスクリプトを貼り付けます。

```javascript
// ステータスコードが200の場合のみ処理
if (pm.response.code === 200) {
    try {
        // レスポンスボディをJSONとしてパース
        const jsonData = pm.response.json();
        
        // トークンを環境変数に保存
        if (jsonData.token) {
            pm.environment.set("token", jsonData.token);
            console.log("✅ トークンを環境変数に保存しました");
            console.log("Token (最初の20文字):", jsonData.token.substring(0, 20) + "...");
        } else {
            console.error("❌ レスポンスにトークンが含まれていません");
        }
        
        // オプション: 有効期限も保存
        if (jsonData.expiresAt) {
            pm.environment.set("token_expires_at", jsonData.expiresAt);
            console.log("✅ トークン有効期限を保存しました:", jsonData.expiresAt);
        }
        
        // オプション: authModeも保存
        if (jsonData.authMode) {
            pm.environment.set("auth_mode", jsonData.authMode);
            console.log("✅ 認証モードを保存しました:", jsonData.authMode);
        }
        
    } catch (error) {
        console.error("❌ トークンの保存に失敗しました:", error.message);
    }
} else {
    console.error("❌ 認証に失敗しました。ステータスコード:", pm.response.code);
    console.error("レスポンス:", pm.response.text());
}
```

### 3. 環境変数を確認

**右上の環境変数ドロップダウン** から、使用する環境（例: `Development` や `Local`）が選択されていることを確認してください。

---

## 使用方法

### 1. ログインリクエストを実行

`POST developer/login` リクエストを実行します。

### 2. トークンの自動保存

レスポンスが成功（200 OK）の場合、トークンが自動的に環境変数 `{{token}}` に保存されます。

### 3. 他のリクエストでトークンを使用

他のリクエスト（例: `POST sync/initial`）で、以下のようにトークンを使用できます：

**Authorization タブ**:
- Type: `Bearer Token`
- Token: `{{token}}`

または

**Headers タブ**:
- Key: `Authorization`
- Value: `Bearer {{token}}`

---

## スクリプトの動作確認

### Consoleで確認

Postmanの **Console**（左下の「Console」タブ）で、以下のメッセージが表示されることを確認できます：

```
✅ トークンを環境変数に保存しました
Token (最初の20文字): eyJhbGciOiJIUzI1NiIs...
✅ トークン有効期限を保存しました: 2026-01-20T07:50:18.97721572
✅ 認証モードを保存しました: developer
```

### 環境変数の確認

1. 右上の **👁️**（目）アイコンをクリック
2. 環境変数リストで `token` が表示されていることを確認
3. 値が設定されていることを確認

---

## 高度な使い方

### トークンの有効期限チェック

トークンを使用する前に、有効期限をチェックするスクリプトを追加できます：

```javascript
// Pre-request Scriptタブに追加
const tokenExpiresAt = pm.environment.get("token_expires_at");

if (tokenExpiresAt) {
    const expiresAt = new Date(tokenExpiresAt);
    const now = new Date();
    
    if (now >= expiresAt) {
        console.warn("⚠️ トークンの有効期限が切れています。再ログインしてください。");
    } else {
        const remainingMinutes = Math.floor((expiresAt - now) / 1000 / 60);
        console.log(`✅ トークンは有効です（残り${remainingMinutes}分）`);
    }
}
```

### 自動リログイン

トークンが無効な場合、自動的に再ログインするスクリプト：

```javascript
// Pre-request Scriptタブに追加
const tokenExpiresAt = pm.environment.get("token_expires_at");

if (!tokenExpiresAt || new Date() >= new Date(tokenExpiresAt)) {
    console.log("🔄 トークンが無効または期限切れのため、自動ログインを実行します...");
    
    pm.sendRequest({
        url: pm.environment.get("baseUrl") + "/api/developer/login",
        method: "POST",
        header: {
            "Content-Type": "application/json"
        },
        body: {
            mode: "raw",
            raw: JSON.stringify({
                password: "dev2026"
            })
        }
    }, function (err, res) {
        if (!err && res.code === 200) {
            const jsonData = res.json();
            pm.environment.set("token", jsonData.token);
            pm.environment.set("token_expires_at", jsonData.expiresAt);
            console.log("✅ 自動ログイン成功");
        } else {
            console.error("❌ 自動ログインに失敗しました");
        }
    });
}
```

---

## トラブルシューティング

### トークンが保存されない

1. **環境変数が選択されているか確認**
   - 右上の環境変数ドロップダウンで環境が選択されているか確認

2. **Testsタブにスクリプトが追加されているか確認**
   - `POST developer/login` リクエストの Testsタブを確認

3. **Consoleでエラーメッセージを確認**
   - Postmanの Consoleタブでエラーメッセージを確認

### トークンが使用できない

1. **環境変数の構文を確認**
   - `{{token}}` のように二重波括弧を使用

2. **Authorizationタブの設定を確認**
   - Type: `Bearer Token`
   - Token: `{{token}}`

3. **トークンの有効期限を確認**
   - 環境変数 `token_expires_at` を確認

---

## 参考

- [Postman - Test Scripts](https://learning.postman.com/docs/writing-scripts/test-scripts/)
- [Postman - Variables](https://learning.postman.com/docs/sending-requests/variables/)
