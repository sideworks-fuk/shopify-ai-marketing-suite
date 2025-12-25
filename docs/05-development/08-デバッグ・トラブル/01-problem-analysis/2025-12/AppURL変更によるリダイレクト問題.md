# AppURL変更によるリダイレクト問題

## 問題の概要

ShopifyのAppURLを変更したことで、初回インストール時にリダイレクトが正しく動作しなくなった。

**変更前**: `https://black-flower-004e1de00.2.azurestaticapps.net/install`
**変更後**: `https://black-flower-004e1de00.2.azurestaticapps.net`

## 影響範囲

### 1. カスタムアプリインストールフロー

**変更前の動作**:
1. Shopifyのインストールリンク → `/install` に直接アクセス
2. `/install` ページで「接続を開始」ボタンをクリック
3. OAuth認証フロー開始

**変更後の動作**:
1. Shopifyのインストールリンク → `/` にアクセス
2. `/` ページで認証状態をチェック
3. 未認証の場合、`/install` にリダイレクト
4. `/install` ページで「接続を開始」ボタンをクリック
5. OAuth認証フロー開始

### 2. 問題点

`/` ページのリダイレクトロジックが正しく動作していない可能性がある：

1. **認証状態の初期化タイミング**
   - `AuthProvider` の初期化が完了するまで待機（`isInitializing` チェック）
   - しかし、初期化が完了しても `isAuthenticated` が正しく設定されていない可能性

2. **authMode が null の場合**
   - `authMode` が `null` の場合、`isAuthenticated` が `false` のままになる可能性
   - 先ほど修正した `AuthProvider.tsx` で `authMode === null` の場合の処理を追加したが、タイミングの問題がある可能性

3. **リダイレクトのタイミング**
   - `setTimeout` で100ms待機してからリダイレクト
   - しかし、`AuthProvider` の初期化が完了する前にリダイレクトが実行される可能性

## 確認すべきポイント

### 1. ブラウザの開発者ツールで確認

**コンソールタブ**:
- `🚀 認証の初期化を開始...` ログが表示されるか
- `✅ OAuth認証済みフラグを確認しました` ログが表示されるか
- `🔍 認証状態をチェック:` ログが表示されるか
- `⚠️ 未認証: インストールページにリダイレクト:` ログが表示されるか

**Applicationタブ（Local Storage）**:
- `oauth_authenticated`: `true` になっているか
- `currentStoreId`: 数値が設定されているか

### 2. リダイレクトのタイミング

`page.tsx` のリダイレクトロジック：
- `isInitializing` が `false` になるまで待機
- 100ms待機してからリダイレクト
- しかし、`AuthProvider` の初期化が完了しても、`isAuthenticated` が正しく設定されていない可能性

## 修正案

### 案1: リダイレクトのタイミングを調整

`page.tsx` のリダイレクトロジックで、`AuthProvider` の初期化が完了するまで待機する時間を延長する。

### 案2: AuthProviderの初期化を改善

`AuthProvider` の初期化ロジックで、`authMode === null` の場合でも、`oauth_authenticated` フラグを確認する処理を確実に実行する。

### 案3: リダイレクトロジックを改善

`page.tsx` のリダイレクトロジックで、`isAuthenticated` が `false` の場合でも、`oauth_authenticated` フラグを直接確認してリダイレクトする。

## 次のステップ

1. ブラウザの開発者ツールでログを確認
2. `AuthProvider` の初期化タイミングを確認
3. リダイレクトのタイミングを確認
4. 必要に応じて修正を実施

