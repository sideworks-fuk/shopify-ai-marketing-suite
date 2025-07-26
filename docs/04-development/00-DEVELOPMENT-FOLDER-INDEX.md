# 📁 Development フォルダ構成

## 📋 概要
開発に関する技術ドキュメントを整理・統合したフォルダです。

## 📂 ファイル構成

### 🚀 **メインドキュメント**

#### **DEVELOPMENT-SETUP-MASTER.md**
- **内容**: フロントエンド＋バックエンド統合セットアップガイド
- **対象**: 新規開発者のオンボーディング
- **統合元**: `setup-guide.md` + `development-environment-setup.md`
- **更新**: 2025-01-26（統合版）

### 🔧 **機能別実装ガイド**

#### **PURCH-02-COUNT-implementation-guide.md**
- **内容**: 購入回数分析機能の詳細実装記録
- **ステータス**: ✅ 実装完了（参考資料として保持）
- **用途**: 実装完了記録、類似機能開発時の参考

#### **PURCH-02-COUNT-api-testing.md**  
- **内容**: 購入回数分析APIのテスト手順
- **ステータス**: 🔧 フロントエンドAPIテストツール情報を統合
- **更新**: 2025-01-26（簡素化・現状反映）

### 🔮 **将来拡張用**

#### **AZURE-FUNCTIONS-FUTURE-INTEGRATION.md**
- **内容**: Shopifyデータ取得・DB登録でのAzure Functions活用案
- **用途**: 将来のバッチ処理・Webhook処理実装時の参考
- **統合元**: `azure-functions-setup-guide.md` + `backend-foundation-setup.md`
- **ステータス**: 📋 参考情報（実装時に詳細設計要）

## 🗑️ 削除・統合したファイル

| 元ファイル | 統合先 | 理由 |
|-----------|--------|------|
| `setup-guide.md` | `DEVELOPMENT-SETUP-MASTER.md` | フロントエンド中心の内容を統合 |
| `development-environment-setup.md` | `DEVELOPMENT-SETUP-MASTER.md` | バックエンド中心の内容を統合 |
| `azure-functions-setup-guide.md` | `AZURE-FUNCTIONS-FUTURE-INTEGRATION.md` | 将来利用時の参考として保持 |
| `backend-foundation-setup.md` | `AZURE-FUNCTIONS-FUTURE-INTEGRATION.md` | 初期計画の参考情報として統合 |

## 🔄 整理効果

### **Before（整理前）**
- ❌ 7ファイル（重複・散在）
- ❌ セットアップ手順の重複
- ❌ 古い情報と新しい情報の混在

### **After（整理後）**  
- ✅ 4ファイル（用途別整理）
- ✅ 統一されたセットアップガイド
- ✅ 現状に即した情報
- ✅ 将来拡張への配慮

## 📖 使用ガイド

### **新規開発者の場合**
1. 📖 `DEVELOPMENT-SETUP-MASTER.md` でセットアップ実行
2. 🧪 APIテストツール（`/dev/purchase-frequency-api-test`）で動作確認

### **既存機能の理解**
1. 📋 `PURCH-02-COUNT-implementation-guide.md` で実装詳細確認
2. 🔧 `PURCH-02-COUNT-api-testing.md` でテスト方法確認

### **将来機能の計画**
1. 🔮 `AZURE-FUNCTIONS-FUTURE-INTEGRATION.md` で技術選択肢確認
2. 📊 コスト・アーキテクチャの事前検討

## 🔗 関連リンク

### **他フォルダとの関連**
- 📋 `/docs/03-design-specs/` - 設計仕様書
- 🏗️ `/docs/06-infrastructure/` - インフラ構成
- 📝 `/docs/05-operations/` - 運用手順

### **実装ファイル**
- 🖥️ `/frontend/src/` - フロントエンド実装
- ⚙️ `/backend/ShopifyTestApi/` - バックエンド実装

---

**整理実施**: 2025年1月26日  
**整理者**: レイ（Claude Code AI）  
**整理方針**: 統合・簡素化・将来対応