# ドキュメント再編成提案書

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: 長期開発を見据えたドキュメント構造の最適化

---

## 🎯 現状の課題と改善提案

### 1. 命名規則の不統一

#### 現状の問題点
- 日本語と英語の混在（例：`バックエンド基盤構築.md` vs `setup-guide.md`）
- 日付形式の不統一（`20250525` vs `2025-05-25`）
- ファイル名の長さが不揃い

#### 改善提案
```
# 統一ルール
- 基本は英語（日本語は必要最小限）
- 日付形式：YYYY-MM-DD
- 最大40文字以内
- ケバブケース使用（kebab-case）
```

### 2. ドキュメントの重複と散在

#### 発見した重複
- `development-phase-tasks.md` と `rapid-development-plan.md`（内容が重複）
- `data-processing-architecture.md` と `data-sync-implementation-guide.md`（分離不要）
- 複数の前年同月比関連ドキュメント

#### 統合提案
```
旧：
- development-phase-tasks.md
- rapid-development-plan.md
新：
- development-roadmap.md（統合）

旧：
- data-processing-architecture.md
- data-sync-implementation-guide.md
新：
- data-architecture.md（統合）
```

### 3. worklogフォルダの整理

#### 現状の問題点
- 250以上のファイルが直下に存在（将来的に管理困難）
- 空ファイルが複数存在
- 命名規則が不統一

#### 改善提案
```
worklog/
├── 2025/
│   ├── 05/
│   │   ├── 2025-05-25-project-analysis.md
│   │   └── 2025-05-25-phase1-completion.md
│   ├── 06/
│   │   ├── 2025-06-03-infrastructure-setup.md
│   │   └── 2025-06-10-ui-unification.md
│   └── 07/
│       ├── 2025-07-20-development-planning.md
│       └── 2025-07-20-db-architecture.md
├── daily/        # 日次レポート
├── releases/     # リリースノート
└── archive/      # 古いログ（1年以上）
```

---

## 📂 提案する新構造

### 全体構造
```
docs/
├── 01-project-management/
│   ├── 01-planning/
│   │   ├── project-roadmap.md          # 統合版ロードマップ
│   │   ├── backlog.md                  # シンプル化
│   │   └── milestones.md               # NEW：マイルストーン管理
│   │
│   ├── 02-requirements/                 # NEW：要件管理
│   │   ├── functional-requirements.md
│   │   ├── non-functional-requirements.md
│   │   └── user-stories/
│   │
│   └── 03-testing/
│       ├── test-strategy.md             # 名称変更
│       └── test-data-preparation.md     # 名称変更
│
├── 02-architecture/
│   ├── 01-system/
│   │   ├── overview.md                  # system-architecture.mdから改名
│   │   ├── data-architecture.md         # 統合版
│   │   └── integration-architecture.md  # NEW：外部連携設計
│   │
│   ├── 02-database/
│   │   ├── schema-design.md             # NEW：スキーマ設計
│   │   └── migration-history/           # NEW：マイグレーション履歴
│   │
│   └── 03-api/
│       ├── rest-api-spec.md             # NEW：REST API仕様
│       └── graphql-schema.md            # NEW：GraphQLスキーマ
│
├── 03-design/                           # design-specsから改名
│   ├── 01-ui-ux/
│   │   ├── design-system.md             # NEW：デザインシステム
│   │   ├── screen-specifications.md     # screen-design.mdから改名
│   │   └── component-library.md         # NEW：コンポーネントカタログ
│   │
│   └── 02-features/
│       ├── year-over-year-analysis.md   # 機能別に整理
│       ├── dormant-customer-analysis.md
│       └── market-basket-analysis.md
│
├── 04-development/
│   ├── 01-guides/
│   │   ├── setup-guide.md
│   │   ├── backend-setup.md             # 日本語から英語に
│   │   └── development-workflow.md      # NEW：開発フロー
│   │
│   ├── 02-standards/                    # NEW：開発標準
│   │   ├── coding-standards.md
│   │   ├── git-conventions.md
│   │   └── review-guidelines.md
│   │
│   └── 03-troubleshooting/              # NEW：トラブルシューティング
│       └── common-issues.md
│
├── 05-deployment/                       # operationsから改名
│   ├── deployment-guide.md
│   ├── ci-cd-pipeline.md                # NEW：CI/CD設定
│   └── monitoring-setup.md              # NEW：監視設定
│
├── 06-infrastructure/
│   ├── 01-azure/                        # azure-sqlから拡張
│   │   ├── database/
│   │   ├── app-service/                 # NEW：App Service設定
│   │   └── security/                    # NEW：セキュリティ設定
│   │
│   └── 02-cost-management/
│       └── （既存のまま）
│
└── 07-references/                       # NEW：参考資料
    ├── glossary.md                      # 用語集
    ├── external-links.md                # 外部リンク集
    └── decision-log.md                  # 技術選定記録
```

---

## 🔄 移行計画

### Phase 1: 緊急対応（1日）
1. 空ファイルの削除
2. 重複ドキュメントの統合
3. 日本語ファイル名の英語化

### Phase 2: 構造改善（1週間）
1. worklogの年月フォルダ化
2. 新フォルダ構造の作成
3. ドキュメントの移動と更新

### Phase 3: 内容充実（継続的）
1. 不足ドキュメントの作成
2. 既存ドキュメントの更新
3. テンプレート化

---

## 📋 命名規則ガイドライン

### ファイル名
```
# 良い例
- project-roadmap.md
- api-specification.md
- 2025-07-20-feature-planning.md

# 悪い例
- プロジェクト計画.md
- APISpec.md
- 20250720_feature_planning.md
```

### フォルダ名
```
# ルール
- 番号プレフィックス（01-, 02-）で順序制御
- 小文字、ハイフン区切り
- 簡潔で分かりやすい名前
```

---

## 💡 追加提案

### 1. ドキュメントテンプレート
各カテゴリ用のテンプレートを用意：
- feature-spec-template.md
- api-endpoint-template.md
- worklog-template.md

### 2. 自動化ツール
- ドキュメントリンクチェッカー
- 命名規則検証スクリプト
- 更新日自動記録

### 3. ドキュメント管理ルール
- 3ヶ月更新がないドキュメントはarchiveへ
- リリース時にドキュメントレビュー必須
- 機能追加時は関連ドキュメント更新必須

---

## 🎯 期待効果

1. **検索性向上**: 統一された命名規則で検索が容易に
2. **保守性向上**: 論理的な構造で長期メンテナンスが容易
3. **オンボーディング改善**: 新メンバーの理解が早い
4. **重複削減**: 統合により情報の一元化
5. **自動化対応**: 規則的な構造でツール導入が容易

---

## 🚀 実行優先順位

1. **即実行**（影響小・効果大）
   - 空ファイル削除
   - 日本語ファイル名の英語化
   - worklog年月フォルダ化

2. **1週間以内**（計画的実行）
   - 重複ドキュメント統合
   - 新フォルダ構造作成
   - 主要ドキュメント移動

3. **継続的改善**
   - テンプレート作成
   - 不足ドキュメント追加
   - 自動化ツール導入 