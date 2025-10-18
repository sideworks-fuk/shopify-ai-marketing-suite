# 機能選択（無料プラン）ドキュメント

対象: `frontend/src/hooks/useFeatureSelection.ts`

## 概要
- 無料プランユーザーが1日1回などの制約下で利用機能を選択するためのフック。
- 現在選択・次回変更可能日・利用可能機能一覧の取得、選択操作、使用状況取得、堅牢なリトライ/バックオフを実装。

## 返却プロパティ
- 状態: `currentSelection`, `availableFeatures`, `isLoading`, `isSelecting`, `error`, `errorDetails`
- 計算: `daysUntilNextChange`, `canChangeToday`, `hasFullAccess`
- アクション: `selectFeature(feature)`, `getFeatureUsage(feature)`, `clearError()`, `retryAction?`

## API
- `GET /api/feature-selection/current`
- `GET /api/feature-selection/available-features`
- `POST /api/feature-selection/select` （冪等性トークン `X-Idempotency-Token`）
- `GET /api/feature-selection/usage/{feature}`

## 実装ポイント
- ベースURL: `NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140'`
- フェッチャは指数バックオフ、429は自動リトライ、401/403は非リトライ
- `mutate` により選択成功後のキャッシュ更新
- 次回変更日差分を `calculateDaysRemaining` で算出

### 使用例
```tsx
import { useFeatureSelection } from '@/hooks/useFeatureSelection';

export default function FeatureGate() {
  const { currentSelection, availableFeatures, selectFeature, isSelecting, error } = useFeatureSelection();

  if (!currentSelection) return <div>Loading...</div>;

  return (
    <div>
      <p>Current: {currentSelection.selectedFeature ?? '未選択'}</p>
      {availableFeatures.map(f => (
        <button key={f.id} disabled={isSelecting} onClick={() => selectFeature(f.id)}>
          {f.label}
        </button>
      ))}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### FAQ
- Q: 409が返るのは？
  - A: 規約上の変更不可期間。`daysUntilNextChange` で残り日数を表示し、選択ボタンを無効化。
- Q: リトライはどのケースで？
  - A: 429/ネットワーク障害。401/403は非リトライでUIに案内表示。
