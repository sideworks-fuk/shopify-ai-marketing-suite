# `/install`ページの役割と仕様

## 作成日
2025-01-27

## 概要
`/install`ページは、Shopifyアプリの**接続・認証**を管理する統合エントリーポイントです。初回インストールだけでなく、再認証や自動リダイレクトも担当します。

## 現在の実装状況

### ページの役割
1. **初回インストール（新規接続）**
   - 新しいShopifyストアをアプリに接続する
   - OAuth認証フローを開始する

2. **再認証（既存ストアの再認証）**
   - 既に登録済みのストアを再認証する
   - トークンが期限切れの場合などに使用

3. **自動リダイレクト（既に認証済みの場合）**
   - Shopify Adminから起動された場合、`shop`パラメータを自動入力
   - 認証済みで登録済みストアの場合は、自動的にダッシュボード（`/customers/dormant`）へリダイレクト

### アクセスパターン

#### パターン1: Shopify Adminから起動（埋め込みアプリ）
```
URL: /install?shop=example.myshopify.com&host=xxx&embedded=1
動作:
1. shopパラメータを自動入力（ロック状態）
2. 認証状態を確認
   - 認証済み & 登録済みストア → 自動リダイレクト（/customers/dormant）
   - 未認証 or 未登録 → インストール画面を表示
3. 「接続を開始」ボタンでOAuth認証フローを開始
```

#### パターン2: ブラウザで直接アクセス
```
URL: /install
動作:
1. shopパラメータがないことを検出
2. 手動入力フォームを表示
3. 「接続を開始」ボタンでOAuth認証フローを開始
4. 推奨アクセス方法の説明バナーを表示
```

#### パターン3: OAuth認証エラー後のリダイレクト
```
URL: /install?error=access_denied&error_description=xxx
動作:
1. エラーパラメータを検出
2. エラーモーダルを表示
3. エラーの種類に応じたメッセージを表示
```

## 現在の実装の課題

### 1. 命名の不一致
- **ページ名**: `/install`（インストール）
- **実際の役割**: 接続・認証の統合エントリーポイント
- **問題**: 「install」という名前だが、初回インストールだけでなく再認証も担当している

### 2. 役割の複雑化
- 初回インストール
- 再認証
- 自動リダイレクト
- エラーハンドリング

これらが1つのページに集約されているため、コードが複雑になっている

### 3. ユーザー体験の観点
- 初回ユーザー: 「インストール」という言葉は適切
- 既存ユーザー（再認証）: 「インストール」という言葉は不適切（「接続」や「認証」の方が適切）

## 改善提案

### オプション1: エイリアスを追加（推奨）
現在の`/install`を維持しつつ、より適切なエイリアスを追加：

```
/install          → 既存（後方互換性のため維持）
/connect          → 新規（推奨エイリアス）
/auth/connect     → 新規（認証関連として整理）
```

**メリット**:
- 既存のリンクやリダイレクトが壊れない
- 段階的に移行可能
- ユーザーに適切なURLを提供できる

**デメリット**:
- 複数のURLが同じページを指す（SEO的には問題ない）

### オプション2: ページ名を変更
`/install`を`/connect`に変更：

```
/install → /connect（リダイレクト）
```

**メリット**:
- 役割が明確になる
- 単一のURLで管理できる

**デメリット**:
- 既存のリンクやリダイレクトをすべて更新する必要がある
- ブックマークが壊れる可能性

### オプション3: 役割を分離
初回インストールと再認証を別ページに分離：

```
/install          → 初回インストール専用
/auth/reconnect   → 再認証専用
```

**メリット**:
- 役割が明確になる
- コードが簡潔になる

**デメリット**:
- 実装が複雑になる
- 自動リダイレクトのロジックが分散する

## 推奨案

**オプション1（エイリアス追加）を採用 ✅**

理由：
1. 既存の実装を壊さない
2. 段階的に移行可能
3. ユーザーに適切なURLを提供できる
4. 実装が簡単（Next.jsの`rewrites`または`redirects`を使用）

### 推奨URL

**`/connect`を主要URLとして推奨**

- `/connect` → **推奨**（分かりやすく、役割を正確に表現）
- `/auth/connect` → 認証関連として整理されたURL（オプション）
- `/install` → 後方互換性のため維持（既存のリンクやリダイレクトが壊れないように）

## 実装方法

### Next.jsの`rewrites`を使用（推奨）
`next.config.js`に以下を追加：

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/connect',
        destination: '/install',
      },
      {
        source: '/auth/connect',
        destination: '/install',
      },
    ]
  },
}
```

### または、`redirects`を使用
`next.config.js`に以下を追加：

```javascript
module.exports = {
  async redirects() {
    return [
      {
        source: '/connect',
        destination: '/install',
        permanent: false, // 一時的なリダイレクト（302）
      },
      {
        source: '/auth/connect',
        destination: '/install',
        permanent: false,
      },
    ]
  },
}
```

**違い**:
- `rewrites`: URLは変更されず、内部的に`/install`を表示（ユーザーには`/connect`と表示される）
- `redirects`: URLが`/install`に変更される（ブラウザのアドレスバーに`/install`と表示される）

**推奨**: `rewrites`を使用（ユーザーに適切なURLを表示できる）

## ドキュメント更新

### ページの説明を更新
`frontend/src/app/install/page.tsx`のコメントを更新：

```typescript
/**
 * Shopifyアプリ接続・認証ページ
 * 
 * 役割:
 * - 初回インストール（新規ストアの接続）
 * - 再認証（既存ストアの再認証）
 * - 自動リダイレクト（認証済み・登録済みストアの場合）
 * 
 * アクセス方法:
 * - /install（直接アクセス）
 * - /connect（エイリアス）
 * - /auth/connect（エイリアス）
 * 
 * @author YUKI
 * @date 2025-07-29
 * @updated 2025-01-27
 */
```

## 実装状況

1. [x] エイリアスの追加（`/connect`、`/auth/connect`）✅
2. [x] ページのコメントを更新 ✅
3. [x] ドキュメントを更新 ✅

## 次のステップ（任意・段階的移行）

1. [ ] フロントエンドのリダイレクト先を`/connect`に変更（段階的に）
   - `frontend/src/app/page.tsx`のリダイレクト先を`/install`から`/connect`に変更
   - その他の内部リンクも段階的に更新
2. [ ] バックエンドのリダイレクト先を`/connect`に変更（段階的に）
   - `ShopifyAuthController.cs`などのリダイレクト先を更新
3. [ ] 外部ドキュメント（README、API仕様書など）に`/connect`を推奨URLとして記載

**注意**: `/install`は後方互換性のため残しておくことを推奨します。

## 参考

- [Next.js Rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites)
- [Next.js Redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects)
