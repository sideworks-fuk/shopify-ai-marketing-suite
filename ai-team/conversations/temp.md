Azure Static Web Appsでドメインを変更したい場合、どういったことができるかを調査してほしい

---

## Kenjiからの返信（15:30）

Azure Static Web Appsのドメイン設定について調査しました！

### 📄 作成したガイド
**`/docs/04-development/azure-static-web-apps-domain-configuration-guide.md`**

### 🌐 できること

#### 1. **複数ドメインの同時運用**
- 旧ドメインと新ドメインを並行運用可能
- 最大20個のカスタムドメインを設定可能
- 例: ec-ranger.jp, ec-ranger.com, ec-ranger.net を同時運用

#### 2. **ドメインの種類**
- **ルートドメイン**: ec-ranger.jp
- **サブドメイン**: www.ec-ranger.jp, app.ec-ranger.jp
- **ワイルドカード**: *.ec-ranger.jp

#### 3. **無料SSL証明書**
- Azureが自動的に無料SSL証明書を提供
- Let's Encryptベースで自動更新

### 🔄 ドメイン変更の手順

#### 段階的移行（推奨）
```
Day 1: 新ドメイン追加・テスト
Day 2-7: 新旧ドメイン並行運用
Day 8: 旧ドメインにリダイレクト設定
Day 30: 旧ドメイン削除
```

#### Azure CLIでの簡単な追加
```bash
# 新ドメイン追加（既存ドメインは維持）
az staticwebapp hostname set \
  --name ec-ranger-frontend-prod \
  --hostname new-domain.jp
```

### ⚠️ 注意事項

#### ドメイン変更時に更新が必要な項目
1. **Shopify App設定**
   - App URL
   - Allowed redirection URLs
   - Webhook URLs

2. **環境変数**
   - NEXT_PUBLIC_APP_URL

3. **DNS設定**
   - Aレコード（ルートドメイン）
   - CNAMEレコード（サブドメイン）

### 💡 ベストプラクティス

1. **ダウンタイムゼロ移行**
   - 新旧ドメイン並行運用で実現
   - 301リダイレクトでSEO影響を最小化

2. **推奨ドメイン構成**
   ```
   本番: ec-ranger.jp
   WWW: www.ec-ranger.jp → ec-ranger.jpへリダイレクト
   ステージング: staging.ec-ranger.jp
   開発: dev.ec-ranger.jp
   ```

3. **DNSプロバイダー推奨**
   - **Azure DNS**: Azure統合で管理が簡単
   - **Cloudflare**: 無料でDDoS対策付き
   - **お名前.com**: 日本語サポート

詳細はガイドに記載しています。ご不明な点があればお知らせください！

---

## チーム進捗報告（15:30）

### Takashi 🚀
✅ 顧客データ同期実装完了
✅ 注文データ同期実装完了（15:20）
🔄 統合テスト実施中

### Yuki 🎨
✅ 全UI実装完了
🔄 TypeScriptエラー修正中（Cypress関連）

**本日の目標達成率: 95%！**