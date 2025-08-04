# プロジェクト管理フォルダ再編成計画

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: ドキュメント構造の最適化提案

---

## 🎯 現状の課題

### 01-project-management フォルダの現状
- **14ファイル**が直下に混在
- カテゴリが混在（DB設計、開発計画、テスト計画など）
- 関連ファイルが散在して見つけにくい

### 06-infrastructure-cost の位置
- プロジェクト管理よりインフラ寄りの内容
- 他のインフラ関連ドキュメントと分離

---

## 📂 推奨フォルダ構造

### Option A: サブフォルダによる整理（推奨）

```
docs/
├── 01-project-management/
│   ├── 01-planning/                    # 計画・タスク管理
│   │   ├── project-status.md
│   │   ├── backlog-management.md
│   │   ├── development-phase-tasks.md
│   │   └── rapid-development-plan.md
│   │
│   ├── 02-data-architecture/           # データ設計・移行
│   │   ├── sample-db-architecture.md
│   │   ├── data-processing-architecture.md
│   │   ├── data-sync-implementation-guide.md
│   │   └── shopify-order-date-workaround.md
│   │
│   ├── 03-testing/                     # テスト・検証計画
│   │   ├── test-store-creation-plan.md
│   │   └── test-store-tasks.md
│   │
│   └── README.md                       # フォルダ説明
│
├── 02-architecture/
│   └── （既存のまま）
│
├── 03-design-specs/
│   └── （既存のまま）
│
├── 04-development/
│   └── （既存のまま）
│
├── 05-operations/
│   └── （既存のまま）
│
└── 06-infrastructure/                  # 名称変更＆統合
    ├── 01-azure-sql/                   # Azure SQL関連
    │   ├── database-development-strategy.md
    │   ├── azure-sql-performance-guide.md
    │   ├── azure-sql-multi-database-strategy.md
    │   └── azure-sql-migration-guide.md
    │
    ├── 02-cost-management/             # コスト管理（旧06-infrastructure-cost）
    │   ├── azure-cost-estimation-guide.md
    │   ├── azure-pricing-resources.md
    │   ├── cost-factors-checklist.md
    │   ├── cost-monitoring-plan.md
    │   ├── cost-monitoring-plan-detailed.md
    │   ├── cost-simulation-worksheet.md
    │   └── README.md
    │
    └── README.md
```

### Option B: 現状維持＋最小限の移動

```
docs/
├── 01-project-management/              # そのまま維持
│   └── （14ファイル）
│
└── 06-infrastructure/                  # 名称変更のみ
    ├── cost/                          # サブフォルダ化
    │   └── （旧06-infrastructure-costの内容）
    └── database/                      # Azure SQL関連を移動
        └── （4つのazure-sql-*.md）
```

---

## 🎯 推奨理由（Option A）

### メリット
1. **見つけやすさ向上**
   - 関連ファイルがグループ化
   - 目的別に整理

2. **スケーラビリティ**
   - 今後ファイルが増えても管理しやすい
   - 新規参画者にも理解しやすい

3. **論理的な構造**
   - プロジェクト管理とインフラが明確に分離
   - 各フォルダの責任範囲が明確

### デメリット
- 初期の移動作業が必要
- 既存のリンクの更新が必要

---

## 📋 移行手順（Option A採用時）

### Phase 1: フォルダ作成
```bash
# プロジェクト管理のサブフォルダ
mkdir -p docs/01-project-management/01-planning
mkdir -p docs/01-project-management/02-data-architecture
mkdir -p docs/01-project-management/03-testing

# インフラストラクチャフォルダ
mkdir -p docs/06-infrastructure/01-azure-sql
mkdir -p docs/06-infrastructure/02-cost-management
```

### Phase 2: ファイル移動
```bash
# プロジェクト管理ファイルの整理
mv docs/01-project-management/project-status.md docs/01-project-management/01-planning/
mv docs/01-project-management/backlog-management.md docs/01-project-management/01-planning/
# ... 他のファイルも同様

# Azure SQL関連をインフラへ
mv docs/01-project-management/azure-sql-*.md docs/06-infrastructure/01-azure-sql/
mv docs/01-project-management/database-development-strategy.md docs/06-infrastructure/01-azure-sql/

# コスト管理フォルダの移動
mv docs/06-infrastructure-cost/* docs/06-infrastructure/02-cost-management/
rmdir docs/06-infrastructure-cost
```

### Phase 3: README作成
各フォルダにREADMEを配置して、含まれる内容を説明

### Phase 4: リンク更新
既存ドキュメント内のリンクを新しいパスに更新

---

## 🤔 判断基準

### Option A を選ぶべき場合
- ドキュメントが今後も増える予定
- チーム開発で多人数がアクセス
- 長期的な保守を重視

### Option B を選ぶべき場合
- 急いでいて最小限の変更で済ませたい
- ドキュメント数がこれ以上増えない
- 既存のリンクを変更したくない

---

## 💡 追加提案

### ドキュメント命名規則の統一
```
{番号}-{カテゴリ}-{具体的内容}.md

例:
01-planning-project-status.md
02-data-sample-db-architecture.md
03-testing-store-creation-plan.md
```

### タグシステムの導入
各ドキュメントのヘッダーにタグを追加
```markdown
---
tags: [azure, sql, performance, infrastructure]
category: infrastructure/database
---
```

---

## 🎉 推奨結論

**Option A（サブフォルダによる整理）**を推奨します。

理由：
1. 現在14ファイルは整理が必要な規模
2. Azure SQL関連は明確にインフラカテゴリ
3. 今後の拡張性を考慮
4. 新規参画者の理解しやすさ

実行タイミング：
- 次の大きな開発フェーズの前
- または週末などの影響が少ない時期 