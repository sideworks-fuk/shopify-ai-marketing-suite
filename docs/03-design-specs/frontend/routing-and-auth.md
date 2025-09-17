# ルーティング / 認証レイアウト

対象: `frontend/src/app/(authenticated)/layout.tsx`

## 概要
- `(authenticated)` セグメント配下のページを保護するためのレイアウト。
- 現状はTODOで、ヘッダからセッション検証を行い、未認証時はリダイレクトする想定。

## 現状コード要点
- `headers()` でヘッダを取得
- コメントに認証チェックのTODOが明記
- 未認証時の遷移先候補: `/install`（Shopify Embeddedの初期導線）

## 推奨実装（Clerk基準）
- `.cursor/rules/dev-rules/clerk.mdc` に準拠し、`middleware.ts` で保護
- サーバーコンポーネントで `auth()` を使用して `userId` を検証

### 擬似コード
```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
```

## 注意
- UI/UXルールに従い、承認なしのUI変更は禁止。
- 実導入時は `middleware.ts` と `app/layout.tsx` の設定も併せて整備すること。
