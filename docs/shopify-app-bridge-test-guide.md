# Shopify App Bridge Navigation テストガイド

## 🧪 テスト方法（シンプル版）

### 1. ローカルテスト（最も簡単）

#### ステップ1: 開発サーバー起動
```bash
# バックエンド起動
cd backend/ShopifyAnalyticsApi
dotnet run

# フロントエンド起動（別ターミナル）
cd frontend
npm run dev
```

#### ステップ2: 埋め込みモードテスト
```bash
# ブラウザで以下のURLにアクセス
http://localhost:3000?embedded=1&host=fuk-dev1.myshopify.com

# または開発ツールページ
http://localhost:3000/dev/shopify-embedded-test?embedded=1
```

#### ステップ3: 確認ポイント
- ✅ ヘッダーが非表示になっているか
- ✅ パディングが調整されているか
- ✅ コンソールに「Shopify embedded app mode」が表示されるか

### 2. ngrokを使った実店舗テスト

#### ステップ1: ngrok起動
```bash
# ngrokインストール（初回のみ）
# https://ngrok.com/ からダウンロード

# トンネル作成
ngrok http 3000
```

#### ステップ2: Shopifyアプリ設定
1. パートナーダッシュボード → アプリ選択
2. 「アプリ設定」→「App URL」に ngrok URLを設定
   ```
   App URL: https://xxxx.ngrok.io
   Allowed redirection URL(s): https://xxxx.ngrok.io/auth/callback
   ```

#### ステップ3: 開発ストアでテスト
1. 開発ストアにログイン
2. アプリ → 「アプリを管理」
3. インストール済みアプリをクリック
4. アプリがiframe内で表示されることを確認

### 3. デバッグツール

#### ブラウザコンソールで確認
```javascript
// 埋め込みモードかチェック
console.log('Is embedded:', window.location !== window.parent.location);

// URLパラメータ確認
console.log('URL params:', new URLSearchParams(window.location.search).toString());

// Shopify App Bridge存在確認
console.log('Shopify object:', window.shopify);
```

#### 開発者ツールで確認
1. **Network タブ**
   - CSPヘッダーが設定されているか
   - `frame-ancestors`に`*.myshopify.com`が含まれているか

2. **Elements タブ**
   - `.shopify-embedded`クラスが適用されているか
   - ヘッダーが非表示になっているか

### 4. よくある問題と対処法

#### CSPエラーが出る場合
```
Refused to frame 'localhost:3000' because an ancestor violates the following Content Security Policy directive
```

**解決方法**:
1. バックエンドでCSPヘッダーが設定されているか確認
2. TAKASHIさんの実装を待つ
3. 一時的にngrokでテスト

#### スタイルが崩れる場合
```css
/* globals.cssに追加 */
body.shopify-embedded {
  margin: 0 !important;
  padding: 0 !important;
}
```

#### パラメータが取得できない場合
```typescript
// useSearchParams()の代わりに
const params = new URLSearchParams(window.location.search);
const isEmbedded = params.has('embedded') || params.has('host');
```

### 5. 簡易チェックリスト

#### 基本動作確認
- [ ] 通常モード（http://localhost:3000）で正常表示
- [ ] 埋め込みモード（?embedded=1）でレイアウト変更
- [ ] コンソールエラーなし

#### スタイル確認
- [ ] ヘッダー非表示
- [ ] パディング調整
- [ ] スクロールバー正常

#### 機能確認
- [ ] ナビゲーション動作
- [ ] API通信正常
- [ ] ストア切り替え動作

### 6. YUKIさんの実装確認

YUKIさんが23:30に実装完了した内容：
- ✅ App Bridgeパッケージインストール
- ✅ 埋め込みモード判定機能
- ✅ スタイル調整
- ✅ テストページ作成（`/dev/shopify-embedded-test`）

### テストURL一覧
```bash
# 基本テスト
http://localhost:3000?embedded=1

# 開発ツール
http://localhost:3000/dev/shopify-embedded-test

# パラメータ付きテスト
http://localhost:3000?embedded=1&host=fuk-dev1.myshopify.com&session=xxx
```

これで基本的なテストが可能です！