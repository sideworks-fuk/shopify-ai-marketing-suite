# EC Ranger インストール手順

## インストールURL

以下の専用リンクをクリックしてインストールを開始してください：

[インストールリンク](https://admin.shopify.com/oauth/install_custom_app?client_id=23f81e22074df1b71fb0a5a495778f49&no_redirect=true&signature=eyJleHBpcmVzX2F0IjoxNzY2OTg4MzcyLCJwZXJtYW5lbnRfZG9tYWluIjoiM2UxYWFlLThkLm15c2hvcGlmeS5jb20iLCJjbGllbnRfaWQiOiIyM2Y4MWUyMjA3NGRmMWI3MWZiMGE1YTQ5NTc3OGY0OSIsInB1cnBvc2UiOiJjdXN0b21fYXBwIiwibWVyY2hhbnRfb3JnYW5pemF0aW9uX2lkIjoxMTYxMzA5Mjd9--b0d3b0dac923277271b704fce9d7b2616d0f98b0
)
```
https://admin.shopify.com/oauth/install_custom_app?client_id=23f81e22074df1b71fb0a5a495778f49&no_redirect=true&signature=eyJleHBpcmVzX2F0IjoxNzY2OTg4MzcyLCJwZXJtYW5lbnRfZG9tYWluIjoiM2UxYWFlLThkLm15c2hvcGlmeS5jb20iLCJjbGllbnRfaWQiOiIyM2Y4MWUyMjA3NGRmMWI3MWZiMGE1YTQ5NTc3OGY0OSIsInB1cnBvc2UiOiJjdXN0b21fYXBwIiwibWVyY2hhbnRfb3JnYW5pemF0aW9uX2lkIjoxMTYxMzA5Mjd9--b0d3b0dac923277271b704fce9d7b2616d0f98b0
```

### ⚠️ 重要な注意点

**このリンクは `roomandout.myshopify.com` 専用です**

- ✅ **正しいストア**: `roomandout.myshopify.com` で使用してください
- ❌ **他のストアでは使用できません**
- 間違ったストアで使用すると、以下のエラーが表示されます：
  ```
  Oauth error invalid_link_organization: 
  このリンクを使用してこのアプリをインストールすることはできません。
  このストアとアプリは異なる組織に属しています。
  詳細については、アプリ開発者にお問い合わせください。
  ```

**カスタムアプリのインストール後の動作について**

- カスタムアプリのインストールリンクからインストール後、Shopify管理画面のアプリメニューに「EC Ranger-demo」が表示されます

---

## 4ステップでインストール完了

### 1️⃣ インストールリンクをクリック
上記の専用インストールURLをクリックしてください。

### 2️⃣ Shopifyでログイン
- Shopifyのストア認証画面に遷移します
- `roomandout.myshopify.com` の**管理者アカウント**でログインしてください
- 2段階認証が設定されている場合は、認証コードも入力してください

### 3️⃣ 「インストール」ボタンをクリック
- 「アプリをインストール」画面が表示されます
- 画面には「このアプリはあなたのストア専用です」と表示されます（正常です）
- 必要な権限を確認し、「**インストール**」ボタンをクリックしてください

### 4️⃣ 「接続を開始」ボタンをクリック（重要！）
**⚠️ このステップが必須です**

「インストール」ボタンをクリック後、自動的に「接続を開始」画面に遷移します。

1. **ストアドメインを確認**
   - 画面に表示されているストアドメインが正しいことを確認してください（例: `roomandout`）
   - 必要に応じて修正してください（`.myshopify.com`は自動で追加されます）

2. **「接続を開始」ボタンをクリック**
   - 画面下部に表示されている「**接続を開始**」ボタンをクリックしてください
   - これにより、OAuth認証が実行され、ストア情報がデータベースに登録されます

**完了！** 🎉

---

## インストール完了後の確認

### ✅ インストールが正常に完了したか確認してください

1. **Shopify管理画面のアプリメニューに表示されているか**
   - Shopify管理画面の左メニューに「EC Ranger」が表示されていることを確認してください
   - 表示されていない場合は、インストールが完了していない可能性があります

2. **アプリを開けるか**
   - アプリメニューから「EC Ranger」をクリックして、アプリが正常に開けることを確認してください

3. **「接続を開始」ボタンをクリックしたか（重要！）**
   - ステップ4で「接続を開始」ボタンをクリックしたことを確認してください
   - これにより、ストア情報がデータベースに登録され、データ同期が可能になります
   - クリックしていない場合、データ同期が開始されません

### 📋 インストール完了後のお知らせ

インストールが完了しましたら、以下の情報をお知らせください：

- ✅ **アプリメニューに表示されているか**（表示されている / 表示されていない）
- ✅ **アプリを開けるか**（開ける / 開けない）
- ✅ **「接続を開始」ボタンをクリックしたか**（クリックした / クリックしていない）

**弊社側で確認・実施する作業：**
- ストア情報がデータベースに正しく登録されているか確認
- データ同期の開始（過去データの取り込み）
- 全プラン機能の有効化
- 動作確認

これらの作業完了後、改めてご連絡いたします。


