# ChunkLoadError: Loading chunk 185 failed (app/layout.js) 調査・対処

## エラー概要

```
Unhandled Runtime Error
ChunkLoadError: Loading chunk 185 failed.
(timeout: http://localhost:3000/_next/static/chunks/app/layout.js)
```

- **現象**: 開発環境 (`next dev`) でルートレイアウト読み込み時にチャンク185のロードがタイムアウトする。
- **環境**: Next.js 14.2.3、App Router、localhost:3000。

## 想定原因

1. **HMR / ビルドキャッシュの不整合**
   - `.next` 内のチャンクと、ブラウザが参照するチャンクIDが一致しない。
   - 開発サーバー再起動・コード変更後のホットリロードで、古いチャンク（例: 185）を要求し続けている。

2. **レイアウト依存の重さ**
   - `app/layout.tsx` が多くのプロバイダ・レイアウトを直列に読み込む（AuthProvider, StoreProvider, AuthGuard, SubscriptionProvider, ZustandProvider, FilterProvider, ConditionalLayout）。
   - Polaris CSS・Polaris/App Bridge 系のインポートもレイアウト配下に含まれる。
   - チャンク数・サイズが増え、初回ロードや HMR 時にタイムアウトしやすくなる。

3. **Next.js 14.2.x の既知の事象**
   - `app/layout` まわりの ChunkLoadError が Next.js 14.2 系で報告されている（[例](https://stackoverflow.com/questions/78836315/next-js-app-throws-chunkloaderror-on-startup-for-app-layout-chunk)）。
   - `.next` 削除のみでは解消しないケースもあり、ハードリロードなどと組み合わせる必要がある。

## 既存の緩和設定（next.config.js）

- `chunkLoadTimeout: 60000`（60秒）に延長済み。
- `splitChunks` のカスタム設定（vendor / default の cacheGroups）。
- `moduleIds: 'deterministic'`, `chunkIds: 'deterministic'` でチャンクIDの安定化。

それでも発生する場合は、キャッシュ破棄とブラウザ側のリセットが有効。

## 対処手順（推奨順）

### 1. クイック対応（まず試す）

1. **ブラウザのハードリロード**
   - `Ctrl + Shift + R`（Windows） / `Cmd + Shift + R`（Mac）
   - または DevTools 開いた状態でリロードボタン長押し → 「キャッシュの消去とハード再読み込み」。

2. **開発サーバーの再起動**
   - `npm run dev` を停止（`Ctrl + C`） → 再度 `npm run dev`。

### 2. キャッシュ削除してから再起動（よく効く）

1. **`npm run dev` を停止。**

2. **`.next` を削除（PowerShell）:**
   ```powershell
   Remove-Item -Recurse -Force frontend\.next
   ```

3. **フロントエンドで dev 再起動:**
   ```powershell
   cd frontend
   npm run dev
   ```

4. **ブラウザで `http://localhost:3000` を開き直し、ハードリロード (`Ctrl + Shift + R`)。**

### 3. それでも発生する場合

- **別ブラウザ／シークレットウィンドウ**で `http://localhost:3000` を開いてみる。  
  （拡張機能やサービスワーカーがチャンク取得を邪魔している可能性。）

- **localhost:3000 のサイトデータ削除**
  - Chrome: アドレスバー左の鍵マーク → 「サイトの設定」→「データを削除」。

- **環境要因の確認**
  - ワットナンバーや VPN、プロキシ、ファイアウォール、セキュリティソフトが `localhost` や `_next/static` へのアクセスをブロックしていないか確認。

### 4. 開発時のみの暫定回避（オプション）

- **`splitChunks` を開発時無効化して試す**  
  `next.config.js` の `webpack` で `isServer` に加え `dev: !isServer` 等で分岐し、開発時は `splitChunks` のカスタム設定を適用しない。  
  ChunkLoadError が減るかどうかを見て、本番用設定との両立を検討。

## 関連ファイル

- `frontend/next.config.js` … `chunkLoadTimeout`、`splitChunks`、`optimization` の設定。
- `frontend/src/app/layout.tsx` … ルートレイアウト。プロバイダ・ConditionalLayout の組み合わせ。
- `frontend/src/components/layout/ConditionalLayout.tsx` … MainLayout / EmbeddedAppLayout の切り替え。

## 作業ログの記録

- 上記いずれかの対処を実施したら、`docs/worklog/YYYY/MM/` に「ChunkLoadError 対処」として実施内容・結果を簡潔に残すとよい。

## 実施メモ（2026-01-28）

- `frontend\.next` を削除済み。`npm run dev` を停止 → 再起動し、ブラウザでハードリロード (`Ctrl + Shift + R`) すること。

---

**作成日**: 2026-01-28  
**目的**: ChunkLoadError (chunk 185 / app/layout.js) の原因整理と再発時の対処手順の共有。
