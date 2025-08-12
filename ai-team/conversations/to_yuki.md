# Yukiへのタスク指示 - 2025年8月13日（水）

## 本日の作業内容

Yukiさん、おはようございます！
昨日の素晴らしいUI実装、本当にお疲れ様でした。TypeScriptエラーを完全に解消し、同期UIを完成させた成果は素晴らしいです。

本日は最終日として、E2Eテストの実装と最終調整をお願いします。

---

## 優先タスク詳細

### 1. Cypressテスト修正（9:00-10:30）

#### 問題の内容
- TypeScript定義ファイルが不足
- `tsconfig.json`でCypressディレクトリが除外されている

#### 修正手順
1. **TypeScript定義ファイルの追加**
   ```typescript
   // frontend/cypress/support/index.d.ts
   /// <reference types="cypress" />
   
   declare namespace Cypress {
     interface Chainable {
       // カスタムコマンドの型定義を追加
     }
   }
   ```

2. **基本的なE2Eテストの実装**
   ```typescript
   // frontend/cypress/e2e/sync.cy.ts
   describe('データ同期機能', () => {
     it('同期ページが表示される', () => {
       cy.visit('/sync')
       cy.contains('データ同期管理').should('be.visible')
     })
     
     it('初回同期モーダルが動作する', () => {
       // テスト実装
     })
   })
   ```

3. **package.jsonにテストスクリプト追加**
   ```json
   "scripts": {
     "cypress:open": "cypress open",
     "cypress:run": "cypress run",
     "test:e2e": "cypress run --headless"
   }
   ```

### 2. UIの最終調整（10:30-12:00）

#### 改善項目
1. **エラー表示の改善**
   - トースト通知の実装確認
   - エラーメッセージの日本語化
   - リトライボタンの追加

2. **ローディング状態の最適化**
   - スケルトンローダーの実装
   - プログレスバーのアニメーション改善
   - キャンセルボタンの動作確認

3. **アクセシビリティチェック**
   - キーボードナビゲーション
   - スクリーンリーダー対応
   - カラーコントラスト確認

### 3. E2Eテスト実装（13:00-15:00）

#### テストシナリオ
1. **同期フローの完全テスト**
   ```typescript
   // 初回同期のE2Eテスト
   it('初回同期が完了する', () => {
     cy.visit('/sync')
     cy.get('[data-testid="initial-sync-button"]').click()
     cy.get('[data-testid="sync-range-select"]').select('1')
     cy.get('[data-testid="start-sync-button"]').click()
     cy.get('[data-testid="sync-progress"]').should('be.visible')
     // 同期完了まで待機
     cy.get('[data-testid="sync-complete"]', { timeout: 60000 })
       .should('be.visible')
   })
   ```

2. **ダッシュボード機能のテスト**
   - ウィジェット表示確認
   - データ更新の確認
   - グラフ表示の確認

3. **エラーケースのテスト**
   - API失敗時の表示
   - タイムアウト処理
   - リトライ機能

### 4. 運用マニュアル作成（15:00-17:00）

#### ドキュメント構成
1. **UI操作ガイド**
   - 初回同期の手順
   - 定期同期の設定
   - 手動同期の実行方法

2. **トラブルシューティング**
   - よくあるエラーと対処法
   - ログの確認方法
   - サポート連絡先

3. **FAQ**
   - 同期にかかる時間は？
   - データの整合性は？
   - 同期が失敗したら？

---

## 技術的な注意事項

### APIエンドポイント
```typescript
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140'

// 同期管理API
GET  /api/sync/status
POST /api/sync/start
POST /api/sync/stop
GET  /api/sync/progress

// 手動同期API
POST /api/manual-sync/products
POST /api/manual-sync/customers
POST /api/manual-sync/orders
```

### 状態管理
- 同期進捗は`useSyncProgress`フックで管理
- 30秒ごとにポーリング
- エラー時は自動リトライ（3回まで）

### テスト環境
- Cypress v13.x
- Next.js Dev Server: http://localhost:3000
- Backend API: https://localhost:7140

---

## 成果物チェックリスト

### 午前中（9:00-12:00）
- [ ] Cypress TypeScript設定完了
- [ ] 基本的なE2Eテスト（3本以上）動作確認
- [ ] UI最終調整完了
- [ ] エラー表示改善

### 午後（13:00-17:00）
- [ ] E2Eテスト10本以上実装
- [ ] すべてのテスト成功
- [ ] 運用マニュアル下書き完成
- [ ] スクリーンショット付きガイド作成

---

## 連絡事項

### コミュニケーション
- 進捗は`report_yuki.md`に記載
- 技術的な質問は`to_kenji.md`へ
- ブロッカーがあれば即座に連絡

### レビュー依頼
- E2Eテストのレビューは14:00頃に依頼予定
- マニュアルの確認は16:00頃に依頼予定

### 注意点
- 完璧を求めすぎない（まず動くものを）
- 基本的なケースを優先
- 複雑なケースは時間があれば

---

## サポート

何か不明な点や困ったことがあれば、遠慮なく連絡してください。
特にCypressの設定で問題があれば、一緒に解決しましょう。

本日も頑張りましょう！プロジェクト完成まであと少しです！

---

**Kenji**  
2025年8月13日 9:00

---

# 過去の作業指示履歴

## 2025年8月12日（火）12:40



