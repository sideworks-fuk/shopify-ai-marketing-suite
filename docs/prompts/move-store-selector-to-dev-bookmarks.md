# ストア切り替えドロップダウンを開発ブックマーク画面へ移動 - 指示プロンプト

## 変更概要
ストア切り替えドロップダウンリストを、現在のヘッダー常時表示から開発ブックマーク画面（/dev-bookmarks）への移動

## 現状
- ヘッダーに常にストア切り替えドロップダウンが表示されている
- 全ユーザーに見える状態
- 開発・テスト用の機能が本番UIに混在

## 変更後
- 開発ブックマーク画面でのみストア切り替えが可能
- 一般ユーザーには非表示
- 開発・テスト機能の適切な分離

## 実装手順

### 1. ヘッダーからStoreSelectorを削除

**対象ファイル**: ヘッダーコンポーネント（DashboardLayout等）
```tsx
// 以下の行を削除またはコメントアウト
import { StoreSelector } from '@/components/common/StoreSelector'

// ヘッダー内の以下の部分を削除
<StoreSelector />
```

### 2. 開発ブックマーク画面にStoreSelectorを追加

**対象ファイル**: `frontend/src/app/dev-bookmarks/page.tsx`

```tsx
// インポートを追加
import { StoreSelector } from '@/components/common/StoreSelector'
import { useStore } from '@/contexts/StoreContext'

// ページコンポーネント内に追加
export default function DevBookmarksPage() {
  const { currentStore } = useStore()
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">開発用ブックマーク</h1>
      
      {/* ストア切り替えセクション */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>ストア切り替え</CardTitle>
          <CardDescription>
            開発・テスト用のストアを切り替えます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <StoreSelector />
            <p className="text-sm text-muted-foreground">
              現在のストア: {currentStore?.name} (ID: {currentStore?.id})
            </p>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                ストアを切り替えると、ページがリロードされます。
                変更は全ての分析画面に反映されます。
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
      
      {/* 既存のブックマークセクション */}
      {/* ... */}
    </div>
  )
}
```

### 3. StoreSelectorコンポーネントの調整（オプション）

**対象ファイル**: `frontend/src/components/common/StoreSelector.tsx`

開発ブックマーク画面用に表示を調整する場合：
```tsx
export function StoreSelector({ showDetails = false }: { showDetails?: boolean }) {
  // ... 既存のコード ...
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {/* 既存のセレクター */}
      </div>
      
      {showDetails && currentStore && (
        <div className="text-sm space-y-1">
          <p>ストアID: {currentStore.id}</p>
          <p>データタイプ: {currentStore.dataType}</p>
          <p>説明: {currentStore.description}</p>
        </div>
      )}
    </div>
  )
}
```

### 4. 開発ブックマーク画面へのナビゲーション確認

開発ブックマーク画面へのアクセス方法を確認：
- URLで直接アクセス: `/dev-bookmarks`
- 開発メニューからのリンク（存在する場合）

### 5. ドキュメント更新

**対象ファイル**: 開発ガイドやREADME
- ストア切り替え方法の変更を記載
- 開発ブックマーク画面の使い方を追記

## 確認項目

- [ ] ヘッダーからStoreSelectorが完全に削除されている
- [ ] 開発ブックマーク画面でストア切り替えが正常動作
- [ ] ストア切り替え後、全画面でストアIDが反映される
- [ ] 一般ユーザーにはストア切り替え機能が見えない
- [ ] 開発者向けドキュメントが更新されている

## 注意事項

1. **ストアコンテキストの維持**
   - StoreProviderはアプリ全体で維持する必要がある
   - 開発ブックマーク画面で切り替えたストアは全画面で有効

2. **アクセス制限**
   - 将来的には開発ブックマーク画面自体にアクセス制限を設けることを検討

3. **ユーザビリティ**
   - 開発者が簡単にストア切り替えできるよう、開発ブックマーク画面へのアクセスを容易にする

---

**実装担当者へ**: 上記の手順に従って実装を進め、動作確認後にコミットしてください。