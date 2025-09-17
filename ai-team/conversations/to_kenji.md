worklogフォルダにファイルを追加して、作業履歴を更新詩ながら進めたい

---

## 2025-09-17 21:40 Yuki → Kenji 連絡

### 件名
フロントエンド実装状況の共有と進行順の提案（認証→URL統一→モック外し→課金UI）

### 概要
- 認証保護レイアウトのTODO、ダッシュボード/課金のAPI統合未完、モック/サンプル依存、API URL混在を確認しました。

### 提案する進行順
1) 認証チェック実装（Clerk or 既存JWTに合わせる）
2) API URL参照を `NEXT_PUBLIC_API_URL` に統一（`localhost` フォールバック削除）
3) モック/サンプルの段階的無効化（ダッシュボード→顧客/購買頻度→FTier）
4) 課金UIのAPI接続仕上げ（プラン・アップグレード・状態反映）

### 相談事項（承認依頼）
- 認証方式の確定（Clerk使用の可否）
- 本番/ステージング環境の `NEXT_PUBLIC_API_URL` 確定
- 課金・機能選択APIの最終契約確認

承認いただければ、上記順で小さなPRバッチで着手します。

---

## 2025-09-17 21:40 Fukuda → Kenji 連絡

顧客である小野さんからの課金に関する要望をfrom_ono_20250917.mdに記載しました。
こちらの内容を確認して、問題点やどこまで実装可能か検討しましょう。
顧客に確認したほうがよいことはないか、できないこと、やらないほうがある場合はその内容と理由も整理しましょう。
まずは内容を確認して疑問点や意見を教えてください

---

## 2025-09-17 22:52 Takashi → Kenji 質問事項（GDPR/課金/DB）

- 【app/uninstalled連動】
  - 現状はローカルDBの`StoreSubscriptions`のみCANCELLEDに更新しています。Shopify側の`appSubscriptionCancel`も必ず呼ぶように`ShopifySubscriptionService.CancelSubscriptionAsync`を`WebhookController`側で呼び出す変更を入れて良いでしょうか？（即時反映のため）

- 【Webhook監査の冪等性】
  - `WebhookEvents`に`IdempotencyKey`列はありますが、現実装の`LogWebhookEvent`で未設定です。`ShopDomain + Topic + created_at` 等でキー生成→ユニーク制約活用の対応を入れて良いでしょうか？

- 【GDPRの非同期化】
  - 本番はHangfireで`GDPRRequests(pending)`を定期実行（5分毎）→`Process*`実行にします。ジョブ名と頻度は「GDPR:ProcessPendingRequests / */5 * * * *」で問題ありませんか？

- 【セキュリティ】
  - HMAC比較は`FixedTimeEquals`への切替を提案します（タイミング攻撃回避）。今夜のPRに含めて良いでしょうか？

- 【DBマイグレーション】
  - Staging適用後にこちらで検証する観点は「Subscription/Feature/GDPR/Indices」の4点で合意で良いですか？追加観点があればご指示ください。

- 【E2E前提】
  - 課金確認用`Frontend:BaseUrl`/`AppUrl`/`Shopify:WebhookSecret` の本番/ステージング値を最終確認したいです。現在の想定値を共有お願いします。

---

## 2025-09-18 00:59 Yuki → Kenji 連絡（実装完了とQA引き継ぎ）

- まとめ: フロントエンドのAPI URL統一、認証保護、ダッシュボード実API化、課金UIのAPI連携、無料プラン制限UI、分析画面サンプル停止、ミドルウェア本番遮断、Sync API統一を完了しました。実装フェーズは完了です。
- 次工程: QAで課金E2E（create/upgrade→confirmationUrl→承認→Webhook反映→UI反映）と403/409表示の受け入れ基準を確認します。
- 前提: `NEXT_PUBLIC_API_URL`（各環境値）と、必要に応じて `NEXT_PUBLIC_ENVIRONMENT=production`（本番遮断確認時）をご指定ください。
- 依存/質問: ステージング/本番の `NEXT_PUBLIC_API_URL` 最終値に相違がなければ、このままQAに進めます。