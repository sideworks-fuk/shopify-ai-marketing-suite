# Yuki → Kenji 質問・確認事項（2025-09-17T23:13:54）

## 認証・トークン
- フロントの認証トークンはクッキー `authToken` で統一で良いですか？それとも `localStorage.authToken` を使用しますか？
- 本番想定の署名/有効期限やリフレッシュの扱いは別途ガイドに従いますか？

## APIベースURL
- `NEXT_PUBLIC_API_URL` をステージング/本番でそれぞれ確定ください（例: `https://...azurewebsites.net`）。

## 課金API
- `POST /api/subscription/create` / `POST /api/subscription/upgrade` の使い分けは現行の想定でOKですか？
- 成功時 `confirmationUrl` のキー名はこのまま（`confirmationUrl`）で確定ですか？

## 無料プラン機能選択API
- 409時に `nextChangeAvailableDate` を返す想定で確定でしょうか？
- `available-features` のスキーマ（`limits`, `currentUsage`）は現行のままで問題ないですか？

## その他
- 本番での開発用ルート遮断対象（フロント側）に追加があればご共有ください。
