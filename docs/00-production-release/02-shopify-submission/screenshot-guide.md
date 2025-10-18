# Shopify App Submission Screenshot Guide

## 📸 スクリーンショット撮影ガイド

### 必要なスクリーンショット
Shopifyアプリ申請には**最低3枚、推奨5枚**のスクリーンショットが必要です。

### 推奨サイズ
- **最小**: 1280 x 800px
- **推奨**: 1920 x 1080px または 2880 x 1800px
- **形式**: PNG または JPEG
- **ファイルサイズ**: 各5MB以下

## 📋 撮影するスクリーンショット

### 1. ダッシュボード画面 (screenshot-1-dashboard.png)
**撮影内容**:
- メインダッシュボード全体
- 主要KPIカード表示
- グラフ・チャート表示
- ナビゲーションメニュー表示

**撮影URL**: `/dashboard`

**ポイント**:
- サンプルデータで良い数値を表示
- カラフルなグラフを含める
- 全体的な機能が一目でわかるように

### 2. 顧客分析画面 (screenshot-2-customer-analysis.png)
**撮影内容**:
- 顧客セグメント分析
- 顧客リスト表示
- フィルター機能表示

**撮影URL**: `/customer/analysis`

**ポイント**:
- 複数の顧客セグメントを表示
- アクティブなフィルターを適用
- データの豊富さをアピール

### 3. 購入回数分析画面 (screenshot-3-purchase-frequency.png)
**撮影内容**:
- 購入回数分布グラフ
- 詳細な統計情報
- トレンド表示

**撮影URL**: `/purchase/frequency-detail`

**ポイント**:
- きれいなグラフ表示
- 実用的な分析結果
- ビジネスインサイト表示

### 4. 休眠顧客分析画面 (screenshot-4-dormant-customers.png)
**撮影内容**:
- 休眠顧客リスト
- 休眠期間分析
- 再活性化の提案

**撮影URL**: `/customer/dormancy`

**ポイント**:
- アクション可能な情報表示
- セグメント別の分析
- 明確な改善提案

### 5. 設定・課金画面 (screenshot-5-settings-billing.png)
**撮影内容**:
- プラン選択画面
- 各プランの機能比較
- アップグレードボタン

**撮影URL**: `/settings/billing`

**ポイント**:
- 3つのプラン（Free/Basic/Pro）を明確に表示
- 価格を分かりやすく表示
- プロフェッショナルなデザイン

## 🎨 撮影時の注意事項

### Do's ✅
- **高解像度**で撮影（Retina/4Kディスプレイ推奨）
- **フルスクリーン**または適切にクロップ
- **実際のデータ**に近いサンプルデータを使用
- **ブランドカラー**（緑・青）を効果的に使用
- **クリーンなUI**を保つ（エラーや警告なし）

### Don'ts ❌
- 個人情報や実際の顧客データを含めない
- 開発ツール（DevTools）を表示しない
- エラーメッセージや未完成の機能を見せない
- 低解像度やぼやけた画像を使用しない
- 過度に加工した画像を使用しない

## 🛠️ 撮影ツール

### Windows
- **Snipping Tool** (Windows + Shift + S)
- **Xbox Game Bar** (Windows + G)
- **ShareX** (無料・高機能)

### ブラウザ拡張機能
- **Awesome Screenshot**
- **Nimbus Screenshot**
- **Full Page Screen Capture**

### 推奨設定
```javascript
// ブラウザのズーム設定
zoom: 100%  // 必ず100%に設定

// ウィンドウサイズ
width: 1920px
height: 1080px

// デバイスピクセル比
devicePixelRatio: 2  // Retinaディスプレイの場合
```

## 📝 撮影チェックリスト

### 撮影前の準備
- [ ] テスト用開発ストアにログイン
- [ ] サンプルデータを充実させる
- [ ] ブラウザのズームを100%に設定
- [ ] 不要なブラウザ拡張機能を無効化
- [ ] ウィンドウサイズを調整

### 各スクリーンショット撮影
- [ ] Screenshot 1: ダッシュボード
- [ ] Screenshot 2: 顧客分析
- [ ] Screenshot 3: 購入回数分析
- [ ] Screenshot 4: 休眠顧客分析
- [ ] Screenshot 5: 設定・課金

### 撮影後の処理
- [ ] 画像サイズの確認（1280x800px以上）
- [ ] ファイルサイズの確認（5MB以下）
- [ ] ファイル名を適切に設定
- [ ] `/docs/00-production-release/shopify-submission/assets/`に保存

## 💡 プロのヒント

### 1. データの準備
開発ストアに以下のようなサンプルデータを用意：
- 顧客数: 1,000〜5,000件
- 注文数: 5,000〜10,000件
- 複数の月にまたがるデータ
- 様々な購入パターン

### 2. タイミング
- 朝または夕方の自然光がある時間帯
- システムが安定している時間帯
- ネットワークが高速な環境

### 3. 後処理
必要に応じて以下の軽微な編集は可：
- 明るさ・コントラストの調整
- 不要な要素のクロップ
- 圧縮（品質を保ちながら）

## 📁 保存先

すべてのスクリーンショットは以下に保存：
```
/docs/00-production-release/shopify-submission/assets/
├── app-icon-1024x1024.png
├── screenshot-1-dashboard.png
├── screenshot-2-customer-analysis.png
├── screenshot-3-purchase-frequency.png
├── screenshot-4-dormant-customers.png
└── screenshot-5-settings-billing.png
```

## 🚀 次のステップ

1. スクリーンショットを撮影
2. 適切にリネーム・整理
3. Shopify Partner Dashboardにアップロード
4. アプリ説明文と併せて申請

---
*最終更新: 2025-09-08*