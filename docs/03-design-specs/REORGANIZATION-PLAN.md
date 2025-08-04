# 03-design-specs フォルダ整理計画書

**計画作成日**: 2025年7月27日  
**作成者**: 福田様 + AIアシスタントケンジ  

## 📋 整理の目的と背景

### 現状の問題
- **ファイル数過多**: 30以上のファイルが混在（ルートレベルに25ファイル）
- **重複コンテンツ**: 同一トピックで複数ファイルが存在
- **検索性の低下**: カテゴリ分類が不明確
- **保守負荷**: 関連ファイルの散在によるメンテナンス困難

### 整理の目標
1. **ファイル数削減**: 30+ → 20以下 (30%以上削減)
2. **カテゴリ明確化**: 機能・目的別の論理的構造
3. **重複排除**: 統合により一元化された情報
4. **検索性向上**: 直感的なフォルダ構造

## 📊 現状分析サマリー

### ファイル分類結果
| カテゴリ | ファイル数 | 統合後 | 削減率 |
|----------|------------|--------|--------|
| **画面設計** | 8 | 8 | 0% (維持) |
| **技術レビュー** | 2 | 1 | 50% |
| **パフォーマンス** | 3 | 2 | 33% |
| **Shopify連携** | 4 | 3 | 25% |
| **ユーザー調査** | 2 | 1 | 50% |
| **分析レビュー** | 2 | 1 | 50% |
| **その他** | 4 | 4 | 0% (維持) |
| **合計** | **25** | **20** | **20%** |

### 重複度評価
- 🔴 **高重複** (即座統合): 6ファイル → 3ファイル
- 🟡 **中重複** (検討統合): 8ファイル → 4ファイル
- ⚪ **重複なし** (維持): 11ファイル

## 🏗️ 新フォルダ構造設計

### 提案構造（福田様案ベース + 分析結果最適化）
```
docs/03-design-specs/
├── README.md                          # 📋 全体インデックス
│
├── screen-designs/                     # 🖥️ 画面設計書 (8ファイル)
│   ├── README.md                      # 画面一覧・実装状況
│   ├── product-analysis/              # 商品分析機能
│   │   ├── PROD-01-YOY.md            # 前年同月比
│   │   ├── PROD-02-FREQ.md           # 購入頻度分析
│   │   └── PROD-03-BASKET.md         # 組み合わせ商品分析
│   ├── purchase-analysis/             # 購買分析機能
│   │   ├── PURCH-01-MONTHLY.md      # 月別売上統計
│   │   ├── PURCH-02-COUNT.md        # 購入回数分析
│   │   └── PURCH-03-FTIER.md        # F階層傾向分析
│   ├── customer-analysis/             # 顧客分析機能
│   │   ├── CUST-01-DORMANT.md       # 休眠顧客分析
│   │   └── CUST-02-ANALYSIS.md      # 顧客分析ダッシュボード
│   ├── screen-design-overview.md      # 全体画面設計
│   └── screen-id-reference.md         # 画面ID参照表
│
├── technical-reviews/                  # 🔍 技術レビュー (1ファイル)
│   ├── README.md                      # レビュー履歴・概要
│   └── comprehensive-code-review.md   # 統合コードレビュー
│
├── performance/                        # ⚡ パフォーマンス設計 (2ファイル)
│   ├── README.md                      # パフォーマンス改善計画
│   ├── dormant-customer-optimization.md # 休眠顧客分析最適化
│   └── frontend-optimization-plan.md  # フロントエンド最適化
│
├── integration/                        # 🔗 統合・連携設計 (4ファイル)
│   ├── README.md                      # 統合システム概要
│   ├── shopify-integration.md         # Shopify連携設計
│   ├── api-batch-processing.md        # バッチ処理設計
│   ├── azure-functions.md             # Azure Functions設計
│   └── oauth-multitenancy.md          # OAuth・マルチテナント
│
├── database/                          # 🗃️ データベース設計 (既存保持)
│   ├── DATABASE-DESIGN.md             
│   ├── table-definitions/             
│   ├── design-decisions/              
│   └── diagrams/                      
│
├── api-documentation/                  # 📡 API設計 (既存保持)
│   ├── API-INTEGRATION-MAP.md         
│   ├── api-endpoints-catalog.md       
│   └── frontend-api-usage.md          
│
├── security/                          # 🔒 セキュリティ設計 (1ファイル)
│   ├── README.md                      # セキュリティ方針
│   └── frontend-security-issues.md    # フロントエンドセキュリティ
│
├── ux-research/                       # 👥 UXリサーチ (1ファイル)
│   ├── README.md                      # ユーザー調査概要
│   └── user-research-complete-guide.md # 統合調査ガイド
│
├── implementation/                     # 🛠️ 実装ガイド (既存保持)
│   └── error-handling-guide.md        
│
└── archive/                           # 📦 アーカイブ
    ├── README.md                      # アーカイブ理由・履歴
    ├── 2025-07/                       # 今回のアーカイブ
    │   ├── dormant-api-investigation-report.md
    │   ├── year-over-year-analysis-reports/
    │   └── [その他完了済みファイル]
    └── template-archived-structure.md
```

## 🔄 統合実施計画

### Phase 1: 緊急統合（当日実施）
#### A. 高重複ファイルの統合

1. **技術レビュー統合**
   ```markdown
   統合元:
   - frontend-code-review-comprehensive.md (359行)
   - Backend-Code-Review-Report.md (620行)
   
   統合先:
   → technical-reviews/comprehensive-code-review.md
   
   統合方針:
   - バックエンドレビューをベースに、フロントエンドの内容を統合
   - セクション別に整理（Security, Performance, Architecture等）
   - 実装済み/未実装の状況を明記
   ```

2. **Shopify API設計統合**
   ```markdown
   統合元:
   - shopify-api-batch-processing-basic-design.md (298行)
   - shopify-api-batch-processing-detailed-design.md (779行)
   
   統合先:
   → integration/api-batch-processing.md
   
   統合方針:
   - 詳細版をベースに、基本版の概要セクションを冒頭に追加
   - 段階別実装計画として再構成
   ```

3. **パフォーマンス文書統合**
   ```markdown
   統合元:
   - dormant-customer-performance-improvement-design.md (431行)
   - dormant-customer-performance-quick-wins.md (244行)
   
   統合先:
   → performance/dormant-customer-optimization.md
   
   統合方針:
   - Quick Winsを短期改善として位置付け
   - 長期改善計画と組み合わせた包括的な最適化計画
   ```

#### B. ユーザー調査統合
```markdown
統合元:
- user-interview-guide.md (279行)
- user-research-framework.md (370行)

統合先:
→ ux-research/user-research-complete-guide.md

統合方針:
- フレームワークをベースに、具体的なインタビューガイドを統合
- 段階別調査プロセスとして再構成
```

### Phase 2: 構造化実施（翌日実施）

#### A. フォルダ構造作成
```bash
# 新フォルダ構造の作成
mkdir -p docs/03-design-specs/{screen-designs/{product-analysis,purchase-analysis,customer-analysis},technical-reviews,performance,integration,security,ux-research,archive/2025-07}
```

#### B. 画面設計書の移動・整理
```markdown
移動計画:
- PROD-01-YOY-detailed-design.md → screen-designs/product-analysis/PROD-01-YOY.md
- PROD-02-FREQ-detailed-design.md → screen-designs/product-analysis/PROD-02-FREQ.md
- PROD-03-BASKET-detailed-design.md → screen-designs/product-analysis/PROD-03-BASKET.md
- PURCH-01-MONTHLY-detailed-design.md → screen-designs/purchase-analysis/PURCH-01-MONTHLY.md
- PURCH-02-COUNT-detailed-design.md → screen-designs/purchase-analysis/PURCH-02-COUNT.md
- PURCH-03-FTIER-detailed-design.md → screen-designs/purchase-analysis/PURCH-03-FTIER.md
- CUST-01-DORMANT-detailed-design.md → screen-designs/customer-analysis/CUST-01-DORMANT.md
- CUST-02-ANALYSIS-detailed-design.md → screen-designs/customer-analysis/CUST-02-ANALYSIS.md

ファイル名変更理由:
- 機能識別子は維持（PROD-01等）
- "-detailed-design"は冗長なため削除
- カテゴリはフォルダ構造で表現
```

#### C. Shopify関連ファイルの整理
```markdown
移動・統合計画:
- shopify-data-integration-design.md → integration/shopify-integration.md
- shopify-azure-functions-detailed-design.md → integration/azure-functions.md
- shopify-oauth-multitenancy-detailed-design.md → integration/oauth-multitenancy.md
- shopify-api-batch-processing-*.md → integration/api-batch-processing.md (統合済み)
```

#### D. その他ファイルの配置
```markdown
- frontend-security-issues-detailed.md → security/frontend-security-issues.md
- frontend-performance-optimization-plan.md → performance/frontend-optimization-plan.md
- screen-design.md → screen-designs/screen-design-overview.md
- screen-id-reference.md → screen-designs/screen-id-reference.md
```

### Phase 3: アーカイブ実施

#### アーカイブ対象ファイル
```markdown
完了済み調査・レビューファイル:
- dormant-api-investigation-report.md → archive/2025-07/
- year-over-year-detailed-design-review.md → archive/2025-07/year-over-year-analysis-reports/
- year-over-year-implementation-analysis.md → archive/2025-07/year-over-year-analysis-reports/

アーカイブ理由:
- 調査・レビュー完了
- 現在の実装に反映済み
- 参考資料として保管価値あり
```

## 📝 README.md作成計画

### メインREADME.md
```markdown
# Design Specifications

Shopify AI Marketing Suite の設計仕様書集

## 📂 フォルダ構成

| フォルダ | 説明 | ファイル数 | 状況 |
|----------|------|------------|------|
| [screen-designs/](./screen-designs/) | 画面設計書 | 10 | 🚧 実装中 |
| [technical-reviews/](./technical-reviews/) | 技術レビュー | 1 | ✅ 完了 |
| [performance/](./performance/) | パフォーマンス設計 | 2 | ⏳ 計画中 |
| [integration/](./integration/) | 統合・連携設計 | 4 | ⏳ 計画中 |
| [database/](./database/) | データベース設計 | 8 | ✅ 完了 |
| [api-documentation/](./api-documentation/) | API設計 | 3 | 🚧 実装中 |
| [security/](./security/) | セキュリティ設計 | 1 | ⏳ 計画中 |
| [ux-research/](./ux-research/) | UXリサーチ | 1 | ⏳ 未実施 |

## 🎯 機能実装状況

### 📊 実装済み機能
- [CUST-01-DORMANT](./screen-designs/customer-analysis/CUST-01-DORMANT.md) - 休眠顧客分析
- [データベース設計](./database/DATABASE-DESIGN.md) - 完全設計完了

### 🚧 実装中機能  
- [PROD-01-YOY](./screen-designs/product-analysis/PROD-01-YOY.md) - 前年同月比分析
- [PURCH-02-COUNT](./screen-designs/purchase-analysis/PURCH-02-COUNT.md) - 購入回数分析

### 📝 モック完了機能
- [PROD-02-FREQ](./screen-designs/product-analysis/PROD-02-FREQ.md) - 購入頻度分析
- [PROD-03-BASKET](./screen-designs/product-analysis/PROD-03-BASKET.md) - 組み合わせ商品分析
- [PURCH-01-MONTHLY](./screen-designs/purchase-analysis/PURCH-01-MONTHLY.md) - 月別売上統計
- [PURCH-03-FTIER](./screen-designs/purchase-analysis/PURCH-03-FTIER.md) - F階層傾向分析
- [CUST-02-ANALYSIS](./screen-designs/customer-analysis/CUST-02-ANALYSIS.md) - 顧客分析ダッシュボード

## 📋 ドキュメント更新ルール

1. **実装完了時**: 該当設計書の実装状況を更新
2. **機能変更時**: 関連する設計書を同時更新
3. **月1回**: 実装状況の全体見直し
```

### 各フォルダREADME.md
各フォルダにも概要・インデックス・状況を記載したREADME.mdを作成

## ⚡ 実施スケジュール

### 当日 (2025-07-27)
- ✅ **現状分析** - 完了
- 🔄 **Phase 1統合** - 実施中
  - [ ] 技術レビュー統合 (30分)
  - [ ] Shopify API設計統合 (30分)
  - [ ] パフォーマンス文書統合 (30分)
  - [ ] ユーザー調査統合 (20分)

### 翌日 (2025-07-28)
- **Phase 2構造化** (2時間)
  - [ ] フォルダ構造作成
  - [ ] ファイル移動・リネーム
  - [ ] README.md作成
- **Phase 3アーカイブ** (30分)
- **検証・テスト** (30分)

## 📈 期待される効果

### 短期効果（実施直後）
1. **ファイル数削減**: 25 → 20ファイル (20%削減)
2. **重複排除**: 6つの重複ペアを3ファイルに統合
3. **検索時間短縮**: カテゴリ別分類による直感的検索

### 中期効果（1ヶ月後）
1. **メンテナンス負荷軽減**: 関連ファイルの一元化
2. **新規開発効率向上**: 明確な設計書の位置
3. **品質向上**: 重複による情報の不整合解消

### 長期効果（3ヶ月後）
1. **知識共有促進**: 整理された情報へのアクセス性向上
2. **設計品質向上**: 一貫した文書構造による設計品質向上
3. **保守性向上**: 持続可能な文書管理体制の確立

---

**整理実施準備完了** 🚀  
福田さんの承認を得て、実施に移ります。