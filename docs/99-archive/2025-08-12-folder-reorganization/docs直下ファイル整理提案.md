# 📁 docs直下ファイル整理提案

## 作成日：2025年8月12日
## 作成者：Kenji（プロジェクトマネージャー）

---

## 🎯 現状分析

### docs直下のファイル一覧（15ファイル）

| ファイル名 | 内容 | 提案 |
|-----------|------|------|
| **README.md** | docsフォルダの説明 | ✅ 維持（必須） |
| **BOOKMARKS.md** | 重要リンク集 | ✅ 維持（よく使う） |
| **QUICK-REFERENCE.md** | クイックリファレンス | ✅ 維持（よく使う） |
| **ドキュメント構成ガイド.md** | フォルダ構造の説明 | ✅ 維持（重要） |
| **フォルダ統合提案.md** | 今回の作業提案 | 🗂️ アーカイブ推奨 |
| **フォルダ整理提案_追加.md** | 今回の作業提案 | 🗂️ アーカイブ推奨 |
| **フォルダ整理完了報告.md** | 今回の作業報告 | 🗂️ アーカイブ推奨 |
| **05番フォルダ整理提案.md** | 今回の作業提案 | 🗂️ アーカイブ推奨 |
| **daily-update-summary-2025-08-02.md** | 日次更新サマリ | 📁 worklogへ移動 |
| **demo-screenshot-guide-2025-08-05.md** | デモガイド | 📁 01-project-managementへ |
| **dev-env-setup-quick-fix.md** | 環境構築修正 | 📁 04-developmentへ |
| **shopify-app-bridge-navigation-test-guide.md** | Shopify技術文書 | 📁 06-shopifyへ |
| **shopify-app-bridge-test-guide.md** | Shopify技術文書 | 📁 06-shopifyへ |
| **shopify-app-integration-guide.md** | Shopify統合ガイド | 📁 06-shopifyへ |
| **shopify-simple-link-guide.md** | Shopifyリンクガイド | 📁 06-shopifyへ |

---

## ✅ 整理提案

### 1. アーカイブフォルダの作成
```
docs/00-archive/
├── 2025-08-12-folder-reorganization/
│   ├── フォルダ統合提案.md
│   ├── フォルダ整理提案_追加.md
│   ├── フォルダ整理完了報告.md
│   └── 05番フォルダ整理提案.md
```

### 2. ファイル移動計画

#### Shopify関連 → 06-shopify/05-技術ガイド/
- shopify-app-bridge-navigation-test-guide.md
- shopify-app-bridge-test-guide.md
- shopify-app-integration-guide.md
- shopify-simple-link-guide.md

#### 開発関連 → 04-development/01-環境構築/
- dev-env-setup-quick-fix.md

#### プロジェクト管理 → 01-project-management/
- demo-screenshot-guide-2025-08-05.md → 05-presentations/

#### 作業ログ → worklog/2025/08/
- daily-update-summary-2025-08-02.md

---

## 📊 整理後の構造

### docs直下（クリーンな状態）
```
docs/
├── README.md                    # フォルダ説明
├── BOOKMARKS.md                 # 重要リンク
├── QUICK-REFERENCE.md           # クイックガイド
├── ドキュメント構成ガイド.md      # 構造説明
└── 00-archive/                  # アーカイブ
    └── 2025-08-12-folder-reorganization/
```

### 移動先
```
01-project-management/
└── 05-presentations/
    └── demo-screenshot-guide-2025-08-05.md

04-development/
└── 01-環境構築/
    └── dev-env-setup-quick-fix.md

06-shopify/
└── 05-技術ガイド/            # NEW
    ├── shopify-app-bridge-navigation-test-guide.md
    ├── shopify-app-bridge-test-guide.md
    ├── shopify-app-integration-guide.md
    └── shopify-simple-link-guide.md

worklog/2025/08/
└── daily-update-summary-2025-08-02.md
```

---

## ⏱️ 作業時間と優先度

### 作業見積もり：15分

| 優先度 | 作業内容 | 時間 |
|--------|---------|------|
| 🔴 高 | Shopifyガイド4ファイル移動 | 5分 |
| 🟡 中 | アーカイブフォルダ作成・移動 | 5分 |
| 🟢 低 | その他ファイル移動 | 5分 |

---

## 📈 メリット

1. **docs直下がスッキリ**
   - 重要な4ファイルのみ残る
   - 一時的な作業ファイルを整理

2. **発見性の向上**
   - Shopifyガイドが適切な場所に
   - 関連ファイルがまとまる

3. **履歴の保存**
   - フォルダ整理の記録をアーカイブ
   - 将来の参考資料として活用可能

---

## 🎯 推奨実施内容

### Phase 1：即実施（5分）
1. `00-archive/2025-08-12-folder-reorganization/`作成
2. フォルダ整理関連4ファイルをアーカイブ

### Phase 2：Shopify移動（5分）
1. `06-shopify/05-技術ガイド/`作成
2. Shopify関連4ファイル移動

### Phase 3：その他（5分）
1. 残りのファイル移動
2. README更新（必要に応じて）

---

## 📋 チェックリスト

- [ ] 00-archiveフォルダ作成
- [ ] フォルダ整理ファイル4つをアーカイブ
- [ ] 06-shopify/05-技術ガイド作成
- [ ] Shopifyガイド4ファイル移動
- [ ] dev-env-setup-quick-fix.md移動
- [ ] demo-screenshot-guide移動
- [ ] daily-update-summary移動
- [ ] ドキュメント構成ガイド更新

---

## 💡 判断基準

### docs直下に残すべきファイル
- フォルダ全体の説明（README）
- 頻繁に参照される索引（BOOKMARKS、QUICK-REFERENCE）
- 構造の説明（ドキュメント構成ガイド）

### 移動すべきファイル
- 特定カテゴリに属する技術文書
- 日付付きの作業ファイル
- 一時的な提案・報告書

---

**推奨**: 全ファイルの整理を実施（15分で完了）

---

**作成日**: 2025年8月12日