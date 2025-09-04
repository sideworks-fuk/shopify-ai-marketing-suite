# TO: TEMP
エラー修正完了

## 修正内容
`frontend/src/app/settings/billing/page.tsx` で間違ったフックをインポートしていた問題を修正しました。

### 変更点
- 変更前: `import { useFeatureAccess } from '@/hooks/useFeatureAccess';`
- 変更後: `import { useComprehensiveFeatureAccess } from '@/hooks/useFeatureAccess';`

- 行60も同様に修正
- 変更前: `const { checkUsageLimit } = useFeatureAccess();`
- 変更後: `const { checkUsageLimit } = useComprehensiveFeatureAccess();`

`checkUsageLimit` 関数は `useComprehensiveFeatureAccess` フックにのみ含まれているため、正しいフックをインポートするように修正しました。

## テスト方法
1. http://localhost:3000/settings/billing にアクセス
2. エラーなく表示されることを確認
3. 「利用状況」タブで商品数と注文数の使用状況が表示されることを確認

## 補足
useFeatureAccessファイルには2つのフックがエクスポートされています：
- `useFeatureAccess` - 無料プランの選択可能機能用（シンプル版）
- `useComprehensiveFeatureAccess` - 全機能とUsage制限チェック用（フル機能版）

課金設定ページでは使用量制限のチェックが必要なため、フル機能版のフックを使用する必要があります。