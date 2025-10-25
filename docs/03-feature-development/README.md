# 機能開発管理

## 概要
新機能開発のプロセス管理とドキュメント化を行うフォルダです。

---

## 📁 フォルダ構成

```
03-feature-development/
├── 01-requirements/          # 要件定義
├── 02-design/               # 機能設計
├── 03-implementation/       # 実装計画
├── 04-review/               # レビュー・テスト
├── templates/               # テンプレート
└── README.md                # このファイル
```

---

## 🚀 開発フロー

### 1. 要件定義（01-requirements）
- 機能要件の定義
- ユーザーストーリーの作成
- 受け入れ基準の設定

### 2. 機能設計（02-design）
- 機能設計書の作成
- システム設計の概要
- UIワイヤーフレーム

### 3. 実装計画（03-implementation）
- 実装計画の策定
- タスク分解
- 技術的ノート

### 4. レビュー・テスト（04-review）
- コードレビュー記録
- テスト結果
- デプロイメント記録

---

## 📋 テンプレート

### 利用可能なテンプレート
- [要件定義テンプレート](./templates/requirements-template.md)
- [機能設計テンプレート](./templates/feature-design-template.md)
- [実装計画テンプレート](./templates/implementation-plan-template.md)
- [レビューテンプレート](./templates/review-template.md)

---

## 🎯 使用方法

### 新機能開発の開始
1. `01-requirements/` に要件定義を作成
2. `02-design/` に機能設計を作成
3. `03-implementation/` に実装計画を作成
4. `04-review/` にレビュー・テスト記録を作成

### フォルダ命名規則
```
YYYY/MM/feature-XXX-機能名/
├── requirements.md
├── feature-design.md
├── implementation-plan.md
└── review-results.md
```

例：
```
2025/10/feature-001-customer-segmentation/
├── requirements.md
├── feature-design.md
├── implementation-plan.md
└── review-results.md
```

---

## 🔗 関連ドキュメント

### 技術設計
- [設計仕様](../04-design-specs/README.md)
- [アーキテクチャ](../02-architecture/README.md)

### 開発・実装
- [開発ドキュメント](../05-development/README.md)
- [テスト・品質保証](../06-testing/README.md)

### 運用
- [運用・デプロイ](../07-operations/README.md)
- [運用マニュアル](../09-operations-manual/README.md)

---

## 📝 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2025-10-25 | フォルダ作成、テンプレート整備 | Kenji |

---

**最終更新**: 2025年10月25日 22:00
**次回レビュー**: 2025年11月1日（週次）

