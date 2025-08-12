# 📝 Architecture Decision Records (ADR)

## 概要
このフォルダには、プロジェクトの重要な技術的決定を記録したArchitecture Decision Records（ADR）が保存されています。

---

## ADRとは

Architecture Decision Records（ADR）は、重要な技術的決定を記録し、なぜその決定をしたのかを文書化するための仕組みです。

### なぜADRを使うのか
- **決定の経緯を記録**: なぜその技術を選んだのか、他の選択肢は何だったのかを記録
- **新メンバーの理解促進**: 後から参加したメンバーも過去の決定理由を理解できる
- **同じ議論の繰り返しを防ぐ**: 一度決定したことを再度議論することを防ぐ
- **決定の見直し**: 状況が変わった時に、過去の前提条件を確認できる

---

## ADR一覧

| 番号 | タイトル | 状態 | 決定日 |
|------|---------|------|--------|
| [000](./ADR-000-template.md) | テンプレート | - | - |
| [001](./ADR-001-hangfire-vs-azure-functions.md) | HangFire vs Azure Functions | 承認済み | 2025-07 |

---

## ADRの書き方

### 新しいADRを作成する場合

1. `ADR-000-template.md`をコピー
2. 連番を付けて新しいファイル名にする（例: `ADR-002-database-choice.md`）
3. テンプレートに従って内容を記載
4. このREADMEの一覧を更新

### ADRの構成

各ADRには以下の項目を含めます：

1. **タイトル**: 決定の内容を簡潔に表現
2. **状態**: 提案中 / 承認済み / 廃止 / 置換
3. **コンテキスト**: なぜこの決定が必要になったか
4. **決定**: 何を決定したか
5. **選択肢**: 検討した他の選択肢
6. **結果**: この決定による影響

---

## ADRのステータス

- **提案中（Proposed）**: まだ議論中の決定
- **承認済み（Accepted）**: チームで合意された決定
- **廃止（Deprecated）**: 新しい決定に置き換えられた
- **置換（Superseded）**: より新しいADRに置き換えられた

---

## 重要なADR

### 🔥 現在有効な決定

#### ADR-001: HangFire vs Azure Functions
- **決定**: バッチ処理にHangFireを採用
- **理由**: 
  - 既存のASP.NET Core環境との統合が容易
  - 追加のAzureリソースが不要
  - ダッシュボードによる監視が可能
- **影響**: バックエンドアプリケーション内でジョブスケジューリングを実装

---

## ADRを書くタイミング

以下のような場合にADRを作成します：

- 重要な技術選定を行うとき
- アーキテクチャの大きな変更を行うとき
- 複数の選択肢から一つを選ぶ必要があるとき
- 将来振り返る必要がありそうな決定をするとき

---

## 参考リンク

- [ADRについて（GitHub）](https://github.com/joelparkerhenderson/architecture-decision-record)
- [ADRテンプレート集](https://github.com/joelparkerhenderson/architecture-decision-record/tree/main/templates)

---

**最終更新**: 2025年8月12日