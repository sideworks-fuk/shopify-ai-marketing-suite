# 作業ログ: GitHub Actionsビルドエラー修正

## 作業情報
- 開始日時: 2025-07-20 14:30:00
- 完了日時: 2025-07-20 14:45:00
- 所要時間: 15分
- 担当: 福田＋AI Assistant

## 作業概要
GitHub Actionsのビルドパイプラインで発生していたMSBuildエラー「Project file does not exist」の原因調査と修正を実施。

## 実施内容
1. **エラー原因の分析**
   - MSBuildエラー: `MSB1009: Project file does not exist.`
   - 環境変数`DOTNET_ROOT`の設定問題
   - アーティファクト名の不一致（`dotnet-app` vs `.net-app`）

2. **プロジェクト構造の確認**
   - `backend/ShopifyTestApi/ShopifyTestApi.csproj`ファイルの存在確認
   - プロジェクトファイルは正常に存在することを確認

3. **ワークフローファイルの修正**
   - パブリッシュパスを`${{env.DOTNET_ROOT}}/myapp`から`./publish`に変更
   - アーティファクトパスを相対パスに修正
   - アーティファクト名を統一（`dotnet-app`）

4. **デバッグ用ステップの追加**
   - プロジェクト構造確認用のデバッグステップを追加
   - パスとファイル存在確認のログ出力

## 成果物
- 修正したファイル: `.github/workflows/develop_shopifyapp-backend-develop.yml`
- 主な変更点:
  - パブリッシュパスの修正
  - アーティファクト名の統一
  - デバッグステップの追加

## 課題・注意点
- 環境変数`DOTNET_ROOT`の使用は予期しない動作を引き起こす可能性がある
- 相対パスの使用により、より確実で予測可能なビルドプロセスを実現
- アーティファクト名の統一により、デプロイジョブでのダウンロードエラーを防止

## 関連ファイル
- `.github/workflows/develop_shopifyapp-backend-develop.yml`
- `backend/ShopifyTestApi/ShopifyTestApi.csproj` 