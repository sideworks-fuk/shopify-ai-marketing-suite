# 作業ログ: APIエラー調査とトラブルシューティング

## 作業情報
- 開始日時: 2025-07-25 17:30:00
- 完了日時: 2025-07-25 18:00:00
- 所要時間: 30分
- 担当: 福田＋AI Assistant

## 作業概要
フロントエンドで発生したAPIエラー（Unexpected token '<'）の原因調査と対策の検討

## エラー詳細
```
ApiError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
at a.request (https://brave-sea-038f17a00.1.azurestaticapps.net/_next/static/chunks/app/customers/dormant/page-bab8ecd19b865df2.js:1:36212)
```

## 問題の分析

### 現象
- フロントエンドで休眠顧客分析ページにアクセス時にエラー発生
- APIレスポンスがJSONではなくHTML（エラーページ）を返している
- **バックエンドAPIは正常に動作している**（Swagger UIが表示、直接API呼び出しで200 OK）

### 原因の特定
**Static Web Appsのプロキシ設定問題**
- フロントエンドから `/api/*` へのリクエストが正しくバックエンドに転送されていない
- CORS設定が不完全
- 特定のAPIエンドポイントへのルーティングが不適切

## 実施内容

### 1. 設定ファイルの確認
- **api-config.ts**: API設定の確認
- **staticwebapp.config.json**: Static Web Apps設定の確認
- 設定は正常であることを確認

### 2. トラブルシューティングガイドの作成・更新
- `docs/05-operations/api-error-troubleshooting.md` を作成・更新
- エラーの原因と対策を詳細に記載
- 解決手順を段階的に整理

### 3. Static Web Apps設定の改善
- より詳細なAPIルーティング設定を追加
- CORSヘッダーの強化（Acceptヘッダーを追加）
- 特定エンドポイントの明示的な設定
- **ルーティング順序の修正**（ワイルドカードルートの競合解決）

### 4. フロントエンドのデバッグ強化
- APIクライアントにデバッグ情報を追加
- レスポンス内容の詳細ログ出力

### 5. バックエンドAPIの状態確認
- Swagger UIが正常に表示されることを確認
- 直接API呼び出しで200 OKレスポンスを確認
- バックエンドAPIは正常に動作していることを確認

### 6. Static Web Appsデプロイエラーの解決
- ルーティング順序の問題を特定
- より具体的なルートを先に配置するように修正
- ワイルドカードルートの競合を解決

## 成果物
- トラブルシューティングガイド: `docs/05-operations/api-error-troubleshooting.md`
- 作業ログ: `worklog/2025/07/2025-07-25-173000-api-error-investigation.md`
- 修正されたファイル:
  - `frontend/staticwebapp.config.json`（改善版・ルーティング順序修正）
  - `frontend/src/lib/api-client.ts`

## 推奨対策

### 即座に実施すべき対策
1. **フロントエンドの再デプロイ**
   - Static Web Apps設定の変更を反映
   - GitHub Actionsでフロントエンドを再デプロイ

2. **動作確認**
   - ブラウザでフロントエンドにアクセス
   - 休眠顧客分析ページでAPIエラーが解決されたか確認

3. **デバッグ確認**
   - 開発者ツールでNetworkタブを確認
   - APIリクエストが正常に処理されているか確認

## 次のステップ
1. フロントエンドの再デプロイ完了を待機
2. ブラウザでの動作確認
3. APIエラーが解決されたか確認
4. 必要に応じて追加のデバッグ

## 課題・注意点
- Static Web Appsのルーティング順序に注意
- より具体的なルートを先に配置する
- ワイルドカードルートは最後に配置する 