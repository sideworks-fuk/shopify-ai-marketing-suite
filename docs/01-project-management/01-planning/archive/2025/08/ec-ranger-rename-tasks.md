# EC Ranger 名称変更タスクリスト

作成日: 2025年8月4日  
作成者: Kenji

## 概要
アプリ名を「Shopify AIマーケティングアプリ」から「**EC Ranger**」に変更するための全タスクリスト。

## 1. コード変更タスク 💻

### フロントエンド
- [ ] `package.json` - name, description の更新
- [ ] `public/manifest.json` - アプリ名、説明文の更新  
- [ ] ヘッダーコンポーネント - タイトル表示の変更
- [ ] ログインページ - アプリ名表示の変更
- [ ] メタタグ（title, og:title等）の更新
- [ ] PWA設定ファイルの更新

### バックエンド
- [ ] `appsettings.json` - アプリ名設定の更新
- [ ] Swagger設定 - API名称の変更
- [ ] ログ出力 - アプリ名の統一
- [ ] エラーメッセージ内のアプリ名変更

### 環境変数
- [ ] `NEXT_PUBLIC_APP_NAME` の更新
- [ ] Azure App Service設定の更新
- [ ] GitHub Secrets の更新（必要に応じて）

## 2. ドキュメント変更タスク 📄

### 技術ドキュメント
- [ ] README.md（ルート）
- [ ] frontend/README.md
- [ ] backend/README.md
- [ ] API仕様書
- [ ] デプロイメントガイド

### Shopify申請関連
- [ ] app-store-submission-guide.md
- [ ] app-submission-checklist.md
- [ ] privacy-policy-draft.md - アプリ名更新
- [ ] terms-of-service-draft.md - アプリ名更新

### プロジェクト管理
- [ ] プロジェクト計画書
- [ ] 会議議事録（過去分は変更不要）
- [ ] デモチェックリスト

## 3. Shopify Partner設定 🛍️

- [ ] アプリ名の変更
- [ ] アプリ説明文の更新
- [ ] アプリURLの確認（変更不要の場合あり）
- [ ] OAuth redirect URLの確認

## 4. マーケティング素材 🎨

- [ ] アプリアイコン（必要に応じて）
- [ ] スクリーンショット内のアプリ名
- [ ] プロモーション動画（作成する場合）
- [ ] アプリ説明文（日本語・英語）

## 5. インフラ・設定 ⚙️

### Azure
- [ ] App Service名（URLは変更しない）
- [ ] Application Insights設定
- [ ] リソースグループ名（オプション）

### GitHub
- [ ] リポジトリ説明文
- [ ] GitHub Actions workflow名

## 6. テスト項目 ✅

- [ ] アプリ名が正しく表示されることを確認
  - [ ] ログイン画面
  - [ ] ダッシュボード
  - [ ] ブラウザタブ
  - [ ] PWAインストール時
- [ ] メタデータの確認
  - [ ] OGP画像プレビュー
  - [ ] 検索エンジン表示
- [ ] エラーメッセージの確認
- [ ] ログ出力の確認

## 優先順位と期限

### 最優先（8/5中）
1. フロントエンド表示部分
2. Shopify Partner設定
3. 申請関連ドキュメント

### 高優先（8/6中）
1. バックエンド設定
2. 環境変数
3. テスト実施

### 中優先（8/7中）
1. 技術ドキュメント更新
2. マーケティング素材
3. 最終確認

## 注意事項

1. **URL変更は不要** - 既存のURLはそのまま使用
2. **データベース変更は不要** - テーブル名等は変更しない
3. **APIエンドポイントは変更しない** - 互換性維持のため

## 変更例

### Before
```javascript
<title>Shopify AIマーケティングアプリ</title>
```

### After
```javascript
<title>EC Ranger - Shopifyストア分析ツール</title>
```

---
最終更新: 2025年8月4日