# AI Team ファイル構造ルール
## 2025年8月12日制定

### 📁 ファイル配置の統一ルール

#### 1. コミュニケーションファイル
**場所**: `/ai-team/conversations/`

| ファイル種別 | ファイル名 | 用途 |
|------------|-----------|------|
| 個人レポート | `report_[名前].md` | 各メンバーからの進捗報告 |
| 個人宛連絡 | `to_[名前].md` | 各メンバーへの指示・連絡 |
| 全体連絡 | `to_all.md` | チーム全体への連絡 |
| 緊急連絡 | `temp.md` | 緊急事項・ブロッカー |

#### 2. 作業管理ファイル
**場所**: `/ai-team/`

| ファイル種別 | ファイル名 | 用途 |
|------------|-----------|------|
| 日次サマリー | `daily-summary-YYYYMMDD.md` | その日の作業総括 |
| 作業継続ガイド | `work_continuation_guide_YYYYMMDD.md` | 翌日への引き継ぎ |
| 進捗確認 | `progress_check_YYYYMMDD_[am/pm].md` | 定期進捗確認 |

#### 3. 知識ベース
**場所**: `/ai-team/knowledge/`

| ファイル種別 | ファイル名 | 用途 |
|------------|-----------|------|
| プロジェクトルール | `CLAUDE.md` | AI開発チームのルール |
| 技術ガイド | `[技術名]_guide.md` | 技術的なガイドライン |

### 🚫 廃止・移行対象

以下のファイルは重複のため、`conversations`フォルダに統一：
- `/ai-team/report_*.md` → `/ai-team/conversations/report_*.md`
- `/ai-team/to_*.md` → `/ai-team/conversations/to_*.md`

### ✅ 移行手順

1. 既存の重複ファイルを確認
2. 最新版を`conversations`フォルダに保存
3. ルートレベルの古いファイルを削除

### 📝 命名規則

- **日付付きファイル**: `YYYYMMDD`形式（ハイフンなし）
- **個人ファイル**: 小文字の名前（kenji, takashi, yuki）
- **作業ファイル**: スネークケース（work_summary）

### 💡 運用ルール

1. **report_*.md と to_*.md は必ず `/ai-team/conversations/` に配置**
2. 日次サマリーなど全体管理ファイルは `/ai-team/` 直下
3. 知識・ルール系は `/ai-team/knowledge/` に集約

---

**制定者**: Kenji
**施行日**: 2025年8月12日
**最終更新**: 2025年8月12日 13:10