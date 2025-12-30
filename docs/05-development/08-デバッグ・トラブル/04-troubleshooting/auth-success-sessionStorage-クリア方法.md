# /auth/success ページの sessionStorage フラグクリア方法

## 問題

`/auth/success` ページが処理をスキップする場合、前回のテストで設定された `sessionStorage` のフラグが残っている可能性があります。

## 影響を受けるフラグ

以下のフラグが残っていると、`useEffect` の最初のチェックでスキップされます：

- `auth_success_processed` = `'true'`
- `auth_success_redirect_executed` = `'true'`
- `auth_success_redirect_timestamp` = `'タイムスタンプ'`

## 解決方法

### 方法1: ブラウザの DevTools でクリア（推奨）

1. ブラウザの DevTools を開く（F12 または 右クリック → 検証）
2. **コンソール**タブを開く
3. 以下のコードを実行：

```javascript
// sessionStorage のフラグをクリア
sessionStorage.removeItem('auth_success_processed');
sessionStorage.removeItem('auth_success_redirect_executed');
sessionStorage.removeItem('auth_success_redirect_timestamp');
console.log('✅ sessionStorage のフラグをクリアしました');

// 確認
console.log('確認:', {
  processed: sessionStorage.getItem('auth_success_processed'),
  redirectExecuted: sessionStorage.getItem('auth_success_redirect_executed'),
  redirectTimestamp: sessionStorage.getItem('auth_success_redirect_timestamp')
});
```

4. Shopify 管理画面からアプリを再度開いてテストしてください

### 方法2: Application タブからクリア

1. ブラウザの DevTools を開く
2. **Application** タブ（Chrome）または **ストレージ** タブ（Firefox）を開く
3. 左側のメニューから **Session Storage** → 現在のドメインを選択
4. 以下のキーを削除：
   - `auth_success_processed`
   - `auth_success_redirect_executed`
   - `auth_success_redirect_timestamp`
5. ページをリロードして再テスト

### 方法3: すべての sessionStorage をクリア

```javascript
// すべての sessionStorage をクリア（注意: 他のアプリのデータも削除されます）
sessionStorage.clear();
console.log('✅ すべての sessionStorage をクリアしました');
```

## デバッグログの確認

`/auth/success` ページにアクセスした際、コンソールに以下のログが表示されます：

```
🚀 [AuthSuccess] useEffect 開始
🔍 [AuthSuccess] hasProcessedRef.current: false
🔍 [AuthSuccess] sessionStorage auth_success_processed: null
🔍 [AuthSuccess] sessionStorage auth_success_redirect_executed: null
🔍 [AuthSuccess] sessionStorage auth_success_redirect_timestamp: null
📍 [AuthSuccess] 現在のURL: https://...
```

フラグが残っている場合：

```
⏸️ [AuthSuccess] 既に処理済みのため、スキップ（sessionStorage）
💡 [AuthSuccess] ヒント: sessionStorageをクリアするには、DevToolsコンソールで以下を実行してください:
   sessionStorage.removeItem("auth_success_processed");
   sessionStorage.removeItem("auth_success_redirect_executed");
   sessionStorage.removeItem("auth_success_redirect_timestamp");
```

## 関連ファイル

- `frontend/src/app/auth/success/page.tsx` - メインの処理ロジック
- `frontend/src/app/setup/initial/page.tsx` - リダイレクト後のページ（フラグをクリア）

## 注意事項

- `sessionStorage` はブラウザタブごとに独立しています
- タブを閉じると `sessionStorage` は自動的にクリアされます
- 開発中は、テスト前にフラグをクリアすることを推奨します
