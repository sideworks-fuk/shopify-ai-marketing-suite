# タスク: デプロイ関係ドキュメントの整理

## タスク情報
- **タスクID**: 251023-deployment-docs-cleanup
- **作成日**: 2025-10-23
- **優先度**: 中
- **状況**: 未着手
- **担当**: 福田 + AI Assistant

## 背景

デモ準備中に以下の問題が判明：
1. `docs/04-development/04-Azure_DevOps/デプロイメント/` 配下のドキュメントが古い情報を含む
2. GitHub環境変数の設定方法が複数あり、わかりづらい
3. Repository Secrets と Environment Variables の使い分けが不明確

## 目標

デプロイ関係のドキュメントを整理し、最新の実装と整合させる

## 作業内容

### 1. 現状調査
- [ ] `docs/04-development/04-Azure_DevOps/` 配下のファイル一覧作成
- [ ] 各ドキュメントの内容確認
- [ ] 古い情報・不正確な情報の特定
- [ ] 重複ドキュメントの特定

### 2. ドキュメント整理

#### 2.1 環境変数設定ガイドの更新
- [ ] `environment-variables-guide.md` の見直し
- [ ] Repository Secrets の説明を追加
- [ ] Environment Variables の説明を追加
- [ ] 設定手順のスクリーンショット追加

#### 2.2 新規ドキュメント作成
- [ ] `github-secrets-and-variables.md` - GitHub設定の完全ガイド
  - Repository Secrets の設定方法
  - Environment Variables の設定方法
  - 使い分けのベストプラクティス
  - セキュリティ考慮事項

#### 2.3 既存ドキュメントの更新
- [ ] `azure-static-web-apps-environment-variables.md` の更新
  - Azure Portal の環境変数は `NEXT_PUBLIC_*` に効かないことを明記
  - GitHub での設定が必須であることを強調

### 3. フォルダ構成の見直し

#### 現在の構成
```
docs/04-development/
├── 01-環境構築/
├── 02-開発ガイド/
├── 03-データベース/
└── 04-Azure_DevOps/
    ├── デプロイメント/
    │   ├── azure-static-web-apps-environment-variables.md
    │   └── environment-variables-guide.md
    └── その他...
```

#### 提案する構成（検討）
```
docs/04-development/
├── 01-環境構築/
├── 02-開発ガイド/
├── 03-データベース/
└── 04-デプロイメント/  ← リネーム検討
    ├── 01-環境変数設定/
    │   ├── README.md（概要）
    │   ├── github-secrets-and-variables.md（GitHub設定）
    │   ├── azure-portal-settings.md（Azure設定）
    │   └── environment-variables-guide.md（詳細ガイド）
    ├── 02-GitHub_Actions/
    │   ├── workflow-overview.md
    │   └── troubleshooting.md
    └── 03-Azure_Static_Web_Apps/
        ├── deployment-guide.md
        └── custom-domains.md
```

### 4. 古い情報の削除・アーカイブ
- [ ] 古いドキュメントをアーカイブフォルダに移動
- [ ] 削除したドキュメントのリストを作成
- [ ] リンク切れの修正

### 5. クロスリファレンスの整備
- [ ] `QUICK-REFERENCE.md` の更新
- [ ] `README.md` の更新
- [ ] `ドキュメント構成ガイド.md` の更新

## 完了条件

- [ ] すべてのデプロイ関係ドキュメントが最新の実装と整合している
- [ ] GitHub Secrets と Environment Variables の設定方法が明確
- [ ] 新規メンバーがドキュメントを見て環境変数を設定できる
- [ ] 古い情報が削除またはアーカイブされている
- [ ] フォルダ構成が論理的で分かりやすい

## 関連ファイル

### 既存ドキュメント
- `docs/04-development/04-Azure_DevOps/デプロイメント/environment-variables-guide.md`
- `docs/04-development/04-Azure_DevOps/デプロイメント/azure-static-web-apps-environment-variables.md`
- `docs/04-development/01-環境構築/開発環境セットアップガイド.md`

### 参照すべきファイル
- `.github/workflows/develop_frontend.yml`
- `frontend/src/lib/config/environments.ts`
- `frontend/.env.example`

## 参考情報

### 今回の学び（2025-10-23）

#### GitHub環境変数の2つの設定場所

**1. Repository Secrets（暗号化）**
- パス: `Settings → Secrets and variables → Actions → Secrets タブ`
- 用途: 秘密情報（デプロイトークン、パスワード等）
- 参照: `${{ secrets.NAME }}`
- ログ: `***` と表示される

**2. Environment Variables（環境別）**
- パス: `Settings → Environments → [環境名] → Environment variables`
- 用途: 環境ごとに異なる設定（API URL、機能フラグ等）
- 参照: `${{ vars.NAME }}`
- ログ: そのまま表示される

**3. Repository Variables（全環境共通）**
- パス: `Settings → Secrets and variables → Actions → Variables タブ`
- 用途: 全環境で共通の公開情報
- 参照: `${{ vars.NAME }}`
- ログ: そのまま表示される

#### Azure Portal の環境変数の制限
- Azure Portal の環境変数は `NEXT_PUBLIC_*` には効果がない
- `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、GitHub での設定が必須
- サーバーサイド専用の変数（プレフィックスなし）のみ Azure Portal で有効

#### ハードコードされたデフォルト値の問題
- `frontend/src/lib/config/environments.ts` の36行目にデフォルト値がハードコード
- 環境変数が未設定でも動作してしまう（設定ミスに気づかない）
- デモ後に厳格モードに変更予定（未設定時はエラーを投げる）

## 進捗メモ

- [2025-10-23 09:00] タスク作成
- [2025-10-23 09:00] デモ準備のため作業は後日実施

## 注意点・改善提案

### 優先度の高い修正
1. **GitHub環境変数設定ガイドの作成**（最優先）
   - Repository Secrets vs Environment Variables の違い
   - 実際の設定手順（スクリーンショット付き）
   - トラブルシューティング

2. **ハードコードされたデフォルト値の削除**（デモ後）
   - 環境変数未設定時はエラーを投げる
   - セキュリティ向上

3. **フォルダ構成の見直し**（中期的）
   - より論理的な構成に変更
   - 関連ドキュメントをグループ化

### ドキュメント作成時の注意点
- スクリーンショットを多用（特にGitHub設定画面）
- 実際のコマンド例を記載
- トラブルシューティングセクションを充実
- 最終更新日を必ず記載

## 関連タスク

- デモ後の環境変数厳格化（別タスク）
- フロントエンドコードのリファクタリング（別タスク）

## 参考ドキュメント

- [environment-variables-guide.md](../04-development/04-Azure_DevOps/デプロイメント/environment-variables-guide.md)
- [開発環境セットアップガイド](../04-development/01-環境構築/開発環境セットアップガイド.md)
- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md)

