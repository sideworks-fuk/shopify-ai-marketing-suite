# 明日の作業クイックスタートガイド
**日付:** 2025年8月13日（火）向け  
**作成:** 2025年8月12日（月）22:30

## 🚀 Takashi - 朝一番にやること

### 1. 環境確認（5分）
```bash
# バックエンドディレクトリへ
cd backend/ShopifyAnalyticsApi

# ビルド確認
dotnet build

# HangFireダッシュボード確認
dotnet run
# ブラウザで http://localhost:5168/hangfire
```

### 2. データベース準備（10分）
```bash
# マイグレーション作成
dotnet ef migrations add AddSyncManagementTables

# データベース更新
dotnet ef database update
```

### 3. 初回同期実装開始（メインタスク）
```csharp
// 新規ファイル: Jobs/InitialSyncJob.cs
// 設計仕様書セクション2.1.1参照

public class InitialSyncJob : BaseSyncJob
{
    public async Task Execute(int storeId)
    {
        // 1. 同期状態チェック
        // 2. 商品データ同期（カーソル対応）
        // 3. 顧客データ同期（カーソル対応）
        // 4. 注文データ同期
        // 5. 完了マーク
    }
}
```

### 重要ポイント
- ✅ カーソルベースの再開機能を必ず実装
- ✅ エラー時は`SyncStates`テーブルに状態保存
- ✅ ログは構造化ログで記録
- ✅ xUnitテストも同時作成

---

## 🎨 Yuki - 朝一番にやること

### 1. 環境確認（5分）
```bash
# フロントエンドディレクトリへ
cd frontend

# 開発サーバー起動
npm run dev

# TypeScript型チェック
npx tsc --noEmit
```

### 2. 同期画面ディレクトリ作成（5分）
```bash
# ディレクトリ構造作成
mkdir -p src/app/\(authenticated\)/sync/components
touch src/app/\(authenticated\)/sync/page.tsx
touch src/app/\(authenticated\)/sync/components/SyncStatus.tsx
touch src/app/\(authenticated\)/sync/components/SyncProgress.tsx
touch src/app/\(authenticated\)/sync/components/SyncTrigger.tsx
touch src/app/\(authenticated\)/sync/components/SyncHistory.tsx
```

### 3. 基本ページ実装（メインタスク）
```tsx
// sync/page.tsx の基本構造
export default function SyncPage() {
  // 1. 同期状態の取得（30秒ポーリング）
  // 2. 同期タイプ別UI表示
  // 3. 手動同期トリガー
  // 4. 進捗表示
  return (
    <div className="container mx-auto p-6">
      {/* 実装開始 */}
    </div>
  );
}
```

### 重要ポイント
- ✅ 4つの同期タイプ（初回/定期/手動/Webhook）対応
- ✅ リアルタイム更新（30秒間隔）
- ✅ エラー時の適切な表示
- ✅ レスポンシブデザイン

---

## 📋 共通チェックリスト

### 朝のスタンドアップ（9:00-9:15）
- [ ] 昨日の成果確認
- [ ] 今日の目標設定
- [ ] ブロッカーの共有
- [ ] 作業分担の確認

### コミュニケーション
- 質問 → `to_kenji.md`に記載
- 進捗報告 → `report_[名前].md`に記載
- 緊急事項 → `temp.md`に記載

### Gitフロー
```bash
# 作業開始前に最新を取得
git pull origin develop

# 機能ブランチ作成
git checkout -b feature/sync-implementation

# こまめにコミット
git add .
git commit -m "feat: 実装内容の説明"
```

---

## 🎯 本日の目標

### 必須達成項目
1. **SyncStates/SyncHistoryテーブル作成**
2. **InitialSyncJob基本実装**
3. **同期画面の基本UI**

### できれば達成
1. **定期同期の実装開始**
2. **進捗表示の実装**
3. **エラーハンドリング強化**

---

## 📚 参考資料リンク

- [設計仕様書](/docs/04-development/data-sync-design-specification.md)
- [HangFire Docs](https://www.hangfire.io/documentation.html)
- [Shopify API Rate Limits](https://shopify.dev/api/usage/rate-limits)
- [作業指示（Takashi）](/ai-team/to_takashi.md)
- [作業指示（Yuki）](/ai-team/to_yuki.md)

---

## 💬 困ったときは

1. **設計仕様書を確認** - ほとんどの答えがここにある
2. **昨日のコードを参考に** - HangFire実装を参考
3. **Kenjiに相談** - `to_kenji.md`に質問を記載

頑張りましょう！🚀