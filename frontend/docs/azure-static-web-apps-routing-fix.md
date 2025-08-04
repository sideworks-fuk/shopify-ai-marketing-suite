# Azure Static Web Apps ルーティング問題の解決

## 問題の原因

`navigationFallback`設定により、すべての404エラーが特定のページにリダイレクトされていました。これがNext.jsのクライアントサイドルーティングと競合し、すべてのページでリダイレクトループが発生していました。

## 解決策

### 1. navigationFallback設定の削除
`staticwebapp.config.json`から以下を削除：
- `navigationFallback`セクション
- `responseOverrides`セクション

### 2. Next.jsのデフォルトルーティングを利用
- Next.jsが生成する静的HTMLファイルをそのまま使用
- クライアントサイドルーティングはNext.jsに任せる

## 結果

- すべてのページが正常に表示される
- リダイレクトループが解消
- `/sales/year-over-year`などの個別ページも正常動作

## 注意事項

Azure Static Web AppsでNext.jsアプリをホストする場合：
1. `navigationFallback`は慎重に設定する
2. Next.jsのルーティングとの競合を避ける
3. 必要最小限の設定のみ使用する