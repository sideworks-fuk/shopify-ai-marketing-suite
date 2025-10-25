# ルーティング / 認証レイアウト

対象: `frontend/src/app/(authenticated)/layout.tsx`

## 概要
- `(authenticated)` セグメント配下のページを保護。
- 現行は cookies と `middleware.ts` による保護を採用（Clerkは将来方針）。

## 現状コード要点
- `middleware.ts` にて以下を実施:
  - 本番で開発用パス（`/dev/*` 等）をブロック
  - `storeId` クッキーがある場合のみ初期設定ステータスをAPIで確認し、未完了なら `/setup/initial` へリダイレクト
- `(authenticated)/layout.tsx` はサーバー側レイアウト。将来的に追加のサーバー検証を入れる余地あり

## 認証/保護の実装方針（現行）
- 一次情報: `frontend/src/middleware.ts`
- ルール:
  - 認証・初期設定の前提はミドルウェアで判定
  - アプリ側は保護済み前提でUIを構成（未認証時のUI分岐は極力持たない）
  - APIアクセス時のURLは「[API設定/環境解決](./api-config.md#注意事項)」を参照

### 参考抜粋（現行の流れ）
- `cookies.storeId` 取得 → `/api/setup/status` へ問い合わせ → 未完了時 `/setup/initial` リダイレクト

## 将来方針（Clerk導入メモ）
- `.cursor/rules/dev-rules/clerk.mdc` を参照
- `middleware.ts` で保護、サーバーコンポーネントで `auth()` による追加検証
- 下記は参考の擬似コード（現行には未導入）

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
- 現行は cookies + `middleware.ts` が一次の保護手段。Clerkは「方針メモ」として保持。

## 関連リンク
- [API設定/環境解決](./api-config.md#注意事項)
- [Billingページ実装](./page-billing.md#統合前提)
- [使用例とFAQ](./examples-and-faq.md)