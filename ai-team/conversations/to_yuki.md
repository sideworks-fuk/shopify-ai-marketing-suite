# Yukiへの作業指示

## 2025年8月11日（日）- Kenjiより

### 優先度1: リダイレクトエラー調査（09:00-12:00）🔴

Yukiさん、おはようございます。
最優先でインストール後のlocalhostリダイレクトエラーの調査をお願いします。

#### 調査項目（フロントエンド側）

1. **環境変数の確認**
   ```
   frontend/.env
   frontend/.env.production
   frontend/.env.staging
   ```
   以下の変数をチェック:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_BACKEND_URL`
   - `SHOPIFY_APP_URL`
   - その他URL関連の設定

2. **ハードコーディングの検索**
   ```bash
   # localhostが直接書かれていないか検索
   grep -r "localhost" frontend/src/
   grep -r "127.0.0.1" frontend/src/
   grep -r "http://localhost" frontend/src/
   ```

3. **リダイレクト処理の確認**
   - `/frontend/src/middleware.ts`
   - `/frontend/src/app/api/auth/callback/route.ts`
   - `/frontend/src/app/install/route.ts`（存在する場合）
   - その他認証関連のコンポーネント

4. **Shopify App Bridge設定**
   - App Bridgeの初期化コード
   - Host parameterの処理
   - リダイレクトURL生成ロジック

#### 確認してほしいコード箇所

```typescript
// 特に以下のパターンを確認
// 1. 環境変数の取得方法
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 2. リダイレクトURL生成
const redirectUrl = `${appUrl}/auth/callback`;

// 3. Shopify OAuth URL生成
const authUrl = `https://${shop}/admin/oauth/authorize?...`;
```

### 優先度2: 開発ページの本番除外（12:00-16:00）

リダイレクトエラーの調査後、開発ページの整理をお願いします。

#### 実装内容

1. **ディレクトリ構造の変更**
   ```
   frontend/src/app/
   ├── (production)/           # 本番用ページグループ
   │   ├── customers/
   │   ├── purchase/
   │   ├── sales/
   │   ├── ai-insights/
   │   └── settings/
   ├── (development)/          # 開発用ページグループ
   │   ├── dev/
   │   ├── test/
   │   ├── debug/
   │   ├── api-test/
   │   └── [その他テストページ]
   └── api/                    # APIルート（変更なし）
   ```

2. **環境変数による制御**
   - `(development)`グループのmiddleware.tsを作成
   - 本番環境では404を返すように設定

3. **既存ページの移動**
   - 開発用: dev/, test/, debug/, *-test/などを`(development)`へ
   - 本番用: customers/, purchase/, sales/などを`(production)`へ

#### 注意事項
- **既存の本番ページの動作を壊さない**
- **開発環境では全ページにアクセス可能を維持**
- **ビルドサイズの削減を確認**

### 進捗報告

- 10:00 - リダイレクトエラー調査結果を`report_yuki.md`に記載
- 11:00 - 修正案を提案
- 13:00 - 開発ページ整理の進捗報告
- 15:00 - 実装状況の共有
- 17:00 - 本日の成果まとめ

### コミュニケーション

- 問題や発見があれば即座に`to_kenji.md`または`to_all.md`に記載
- Takashiさんと連携が必要な場合は`to_takashi.md`も活用
- より良い実装方法があれば積極的に提案してください

### リソース

- Shopify App開発ドキュメント: https://shopify.dev/docs/apps
- Next.js App Router: https://nextjs.org/docs/app
- 既存の設計書: `/docs/03-design-specs/`

頑張ってください！質問があればいつでも聞いてください。

---
Kenji
2025年8月11日 09:00

---

# Yukiさんへ - 緊急追加タスク：Shopify管理画面サブメニュー実装

作成日: 2025年8月5日 11:30  
作成者: Kenji

## 新しいタスク：Shopify管理画面へのサブメニュー追加

福田さんから、Shopify管理画面の左メニューに直接サブメニューを表示したいとの要望がありました。
技術的な検証も含めて実装をお願いします。

### 実装内容

#### 1. App Bridge NavigationMenuの実装

**新規ファイル作成**: `frontend/src/components/ShopifyNavigation.tsx`
```typescript
import { NavigationMenu } from '@shopify/app-bridge-react';

export function ShopifyNavigation() {
  return (
    <NavigationMenu
      navigationLinks={[
        {
          label: 'データ同期',
          destination: '/setup/initial',
        },
        {
          label: '前年同月比分析',
          destination: '/sales/year-over-year',
        },
        {
          label: '購入回数分析', 
          destination: '/purchase/count-analysis',
        },
        {
          label: '休眠顧客分析',
          destination: '/customers/dormant',
        },
      ]}
      matcher={(link, location) => link.destination === location.pathname}
    />
  );
}
```

#### 2. App.tsxへの統合
```typescript
import { ShopifyNavigation } from './components/ShopifyNavigation';

// AppProviderの中に追加
<AppProvider>
  <ShopifyNavigation />
  {/* 既存のコンポーネント */}
</AppProvider>
```

### 注意事項
- Shopify環境でのみ動作するため、条件付きレンダリングが必要かも
- App Bridgeが正しく初期化されているか確認
- エラーが発生しても既存の機能に影響しないように

### 優先度
**高** - 本日中に実装して技術的検証を完了したい

### 参考資料
- 詳細な実装ガイド: `/docs/04-development/shopify-submenu-implementation-guide.md`
- [Shopify App Bridge Navigation](https://shopify.dev/docs/api/app-bridge/actions/navigation)

よろしくお願いします！

---

# Yukiさんへ - 追加タスク：Shopify管理メニューへのリンク追加（完了済み）

作成日: 2025年8月5日 09:00  
作成者: Kenji

## 初期設定画面の実装お疲れ様でした！

素晴らしい仕事でした！初期設定画面が完成したとのこと、ありがとうございます。

## 次のタスク：Shopify管理メニューへのリンク追加

福田さんから新しいタスクの依頼です。Shopifyの管理画面に以下のメニューリンクを追加してください。

### 追加するメニュー項目

1. **データ同期**（新規）← 名称変更しました！
   - パス: `/setup/initial`
   - アイコン: 同期アイコン（🔄）または データベースアイコン
   - 説明: データ同期設定・管理画面

2. **前年同月比分析【商品】**
   - パス: `/analytics/year-over-year` (確認してください)
   - アイコン: グラフアイコン
   - 説明: 商品の前年同月比較

3. **購入回数分析【購買】**
   - パス: `/analytics/purchase-frequency` (確認してください)
   - アイコン: カートアイコン
   - 説明: 顧客の購買頻度分析

4. **休眠顧客分析【顧客】**
   - パス: `/analytics/dormant-customers` (既存)
   - アイコン: ユーザーアイコン
   - 説明: 休眠顧客の分析

### 実装方法

Shopifyアプリのナビゲーションメニューは、通常以下の方法で実装します：

1. **サイドバーメニューに追加**（MainLayout.tsx）
   - 既存のメニュー構造に上記4項目を追加

2. **Shopify App Bridgeのナビゲーション**（必要な場合）
   - App Bridgeを使用してShopify管理画面との統合

### 注意事項

- パスが不明な画面は、既存のルーティングを確認してください
- アイコンは適切なものを選んでください（react-iconsなど）
- 順序は上記の通りでお願いします

### 優先度

中〜高（初期設定画面の次に重要）

よろしくお願いします！

---

# Yukiさんへ - 初期設定画面の実装指示（完了済み）

作成日: 2025年8月5日 08:30  
作成者: Kenji

## 本日の最優先タスク

初期設定画面の実装をお願いします！詳細設計書は以下にあります：
`/docs/03-design-specs/screen-designs/initial-setup-design-2025-08-05.md`

### 実装順序（推奨）

1. **初期設定チェックロジック（30分）**
   - `frontend/src/components/Layout.tsx` を修正
   - アプリ起動時に `/api/setup/status` を呼び出し
   - 未設定なら `/setup/initial` へリダイレクト

2. **データ同期設定画面（1時間）**
   - `frontend/src/pages/setup/initial.tsx` を新規作成
   - シンプルなラジオボタンUI
   - EC Rangerロゴを忘れずに！

3. **同期実行中画面（1時間）**
   - `frontend/src/pages/setup/syncing.tsx` を新規作成
   - プログレスバーとステータス表示
   - 5秒ごとにAPIポーリング

4. **エラーハンドリング（30分）**
   - try-catchでAPIエラーをキャッチ
   - ユーザーフレンドリーなエラーメッセージ

### 重要ポイント

- **シンプルに作る**（完璧を求めない）
- **EC Rangerブランド**を明確に
- **TypeScriptの型**は最低限でOK（anyを使っても良い）

### 困ったら

- すぐに質問してください！
- 既存のコードを参考にしてOK
- 動けば良い精神で！

頑張ってください！🚀

---

# YukiさんへのEC Ranger名称変更タスク指示

## From: Kenji（2025年8月4日 15:45）

Yukiさん、お疲れ様です！

アプリ名を「EC Ranger」に変更する作業をお願いしたいです。
以下、フロントエンド関連の名称変更タスクをまとめました。

## 🎯 優先度：最高（8月5日デモまでに完了希望）

### 1. 必須変更項目（本日中）

#### パッケージ設定
- [ ] `frontend/package.json`
  - name: "ec-ranger-frontend"
  - description: "EC Ranger - Shopifyストア分析ツール"

#### 公開設定
- [ ] `frontend/public/manifest.json`
  - name: "EC Ranger"
  - short_name: "EC Ranger"

#### UI表示
- [ ] ヘッダーコンポーネント
  - タイトル表示を「EC Ranger」に変更
  - サブタイトルがあれば「Shopifyストア分析ツール」

- [ ] ログインページ
  - アプリ名表示を変更
  - ウェルカムメッセージも更新

#### メタ情報
- [ ] HTMLメタタグ
  - `<title>EC Ranger</title>`
  - og:title、og:site_name なども更新

### 2. 環境変数（確認・更新）
- [ ] `NEXT_PUBLIC_APP_NAME` を "EC Ranger" に
- [ ] `.env.local` の確認
- [ ] `.env.production` の確認

### 3. 動作確認項目
- [ ] ブラウザタブにアプリ名が正しく表示される
- [ ] ヘッダーのアプリ名表示
- [ ] ログイン画面のアプリ名
- [ ] PWAとしてインストールした時の名前

### 4. 注意事項
- URLやAPIエンドポイントは**変更しません**
- 内部的な変数名（shopifyAnalytics等）は**そのまま**
- 表示される部分のみ変更します

### 5. 変更例

```jsx
// Before
<h1>Shopify AIマーケティングアプリ</h1>

// After  
<h1>EC Ranger</h1>
```

```json
// package.json
{
  "name": "ec-ranger-frontend",
  "description": "EC Ranger - Shopifyストア分析ツール"
}
```

### 作業完了後

1. 変更内容をコミット（メッセージ: "feat: EC Rangerへの名称変更（フロントエンド）"）
2. 動作確認の結果を `report_yuki.md` に記載
3. 問題があれば `to_kenji.md` で相談

明日のデモに向けて重要な作業なので、よろしくお願いします！
不明点があれば遠慮なく質問してください。

---
Kenji

---

## 追加タスク：TypeScriptエラー修正（2025年8月4日 16:15）

Yukiさん、追加でTypeScriptのエラー修正をお願いします。

### エラー内容
`npx tsc --noEmit` 実行時に以下のエラーが発生しています：

```
src/app/dev/jwt-production-test/page.tsx:51:38 - error TS18046: 'e' is of type 'unknown'.
src/app/dev/jwt-production-test/page.tsx:75:37 - error TS18046: 'e' is of type 'unknown'.
src/app/dev/jwt-production-test/page.tsx:102:40 - error TS18046: 'e' is of type 'unknown'.
```

### 修正方法
catch節の`e`が`unknown`型のため、`.message`にアクセスできません。
以下のように修正してください：

```typescript
// 修正前
} catch (e) {
  results.healthCheck = { error: e.message }
}

// 修正後
} catch (e) {
  results.healthCheck = { error: e instanceof Error ? e.message : String(e) }
}
```

または、より明示的に：

```typescript
} catch (e) {
  const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
  results.healthCheck = { error: errorMessage }
}
```

### 対象箇所
1. 51行目: healthCheckのcatch節
2. 75行目: authTestのcatch節
3. 102行目: refreshTestのcatch節

### 優先度
中（デモには影響しないが、型安全性のため修正推奨）

よろしくお願いします！