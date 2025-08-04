# バックエンドプロジェクト名変更の検討と実施計画

## 概要
現在の `ShopifyTestApi` プロジェクト名を本格運用に適した名前に変更する必要性と実施可能性を評価します。

## 1. 現状分析

### 1.1 現在のプロジェクト構成
```
backend/
├── ShopifyTestApi/                     # メインAPIプロジェクト
│   ├── ShopifyTestApi.csproj          # プロジェクトファイル
│   ├── ShopifyTestApi.sln             # ソリューションファイル
│   └── Controllers/Services/Models/    # アプリケーションコード
├── ShopifyTestApi.Tests/              # テストプロジェクト
│   └── ShopifyTestApi.Tests.csproj    # テストプロジェクトファイル
└── run-tests.sh/cmd                   # テスト実行スクリプト
```

### 1.2 影響範囲調査結果

#### ファイル参照数
- **C#ファイル**: 55ファイル (using文、namespace宣言等)
- **プロジェクトファイル**: 3ファイル (.csproj, .sln)
- **JSONファイル**: 5ファイル (設定ファイル等)
- **Markdownファイル**: 55ファイル (ドキュメント)
- **スクリプトファイル**: 2ファイル (run-tests.sh/cmd)

#### 重要な依存関係
1. **プロジェクト参照**: テストプロジェクトからメインプロジェクトへの参照
2. **namespace宣言**: 全C#ファイルで `ShopifyTestApi.*` を使用
3. **設定ファイル**: Azure App Service、Docker、CI/CDで参照
4. **ドキュメント**: 技術仕様書、セットアップガイド等で多数参照

## 2. プロジェクト名候補の提案

### 2.1 推奨案（優先順位順）

#### A案: `ShopifyAnalyticsApi` 
**推奨度: ★★★★★**
- **理由**: 現在の機能（休眠顧客分析等）と一致
- **メリット**: 意味が明確、Shopifyとの関連性維持
- **デメリット**: なし

#### B案: `EcommerceAnalyticsApi`
**推奨度: ★★★★☆**
- **理由**: より汎用的、将来の拡張性を考慮
- **メリット**: プラットフォーム非依存、スケーラブル
- **デメリット**: Shopify特化から離れる

#### C案: `MarketingAnalyticsApi`
**推奨度: ★★★☆☆**
- **理由**: マーケティングスイート全体との整合性
- **メリット**: プロジェクト全体のコンセプトと一致
- **デメリット**: 現機能との乖離

### 2.2 名前空間構造案
```csharp
// 現在
namespace ShopifyTestApi.Services.Dormant

// 変更後（A案採用時）
namespace ShopifyAnalyticsApi.Services.Dormant
```

## 3. 実施計画

### 3.1 フェーズ1: 準備作業（作業時間: 2-3時間）

#### 3.1.1 バックアップ作成
- 現在のブランチから新しいfeatureブランチ作成
- 全体のgit状態確認とコミット

#### 3.1.2 依存関係マッピング
- プロジェクト参照の詳細調査
- 外部設定ファイルでの参照確認

### 3.2 フェーズ2: コア変更（作業時間: 3-4時間）

#### 3.2.1 プロジェクトファイル更新
```bash
# ディレクトリ名変更
mv ShopifyTestApi/ ShopifyAnalyticsApi/
mv ShopifyTestApi.Tests/ ShopifyAnalyticsApi.Tests/

# ファイル名変更
mv ShopifyAnalyticsApi/ShopifyTestApi.csproj ShopifyAnalyticsApi/ShopifyAnalyticsApi.csproj
mv ShopifyAnalyticsApi.Tests/ShopifyTestApi.Tests.csproj ShopifyAnalyticsApi.Tests/ShopifyAnalyticsApi.Tests.csproj
mv ShopifyAnalyticsApi/ShopifyTestApi.sln ShopifyAnalyticsApi/ShopifyAnalyticsApi.sln
```

#### 3.2.2 namespace一括変更
```bash
# C#ファイルの名前空間更新
find . -name "*.cs" -exec sed -i 's/ShopifyTestApi/ShopifyAnalyticsApi/g' {} \;

# プロジェクトファイル内容更新
find . -name "*.csproj" -exec sed -i 's/ShopifyTestApi/ShopifyAnalyticsApi/g' {} \;
find . -name "*.sln" -exec sed -i 's/ShopifyTestApi/ShopifyAnalyticsApi/g' {} \;
```

### 3.3 フェーズ3: 設定・ドキュメント更新（作業時間: 2-3時間）

#### 3.3.1 設定ファイル更新
- Azure App Service設定
- Docker設定
- CI/CDパイプライン設定
- 環境変数設定

#### 3.3.2 ドキュメント更新
- README.md
- セットアップガイド
- API仕様書
- 技術仕様書

### 3.4 フェーズ4: テスト・検証（作業時間: 1-2時間）

#### 3.4.1 ビルド検証
```bash
dotnet build
dotnet test
```

#### 3.4.2 機能テスト
- API エンドポイント動作確認
- データベース接続確認
- 認証・認可機能確認

## 4. リスク評価と対策

### 4.1 高リスク項目

#### 4.1.1 外部システム連携
**リスク**: Azure、CI/CD等の外部設定でアプリケーション名参照
**対策**: 段階的デプロイメント、設定ファイル事前確認

#### 4.1.2 データベース接続
**リスク**: 接続文字列でアプリケーション名参照の可能性
**対策**: 接続文字列の事前確認、テスト環境での検証

### 4.2 中リスク項目

#### 4.2.1 IDE・開発ツール設定
**リスク**: Visual Studio、VS Code等のプロジェクト設定
**対策**: .vscode, .vs フォルダの確認・更新

#### 4.2.2 ログ・監視システム
**リスク**: アプリケーション名でのログフィルタリング
**対策**: ログ設定の確認、監視アラート更新

### 4.3 低リスク項目

#### 4.3.1 開発者環境
**リスク**: 個人の開発環境設定
**対策**: 変更後の環境セットアップ手順提供

## 5. 実施スケジュール

### タイムライン（2日間）

#### Day 1（4-5時間）
- [ ] フェーズ1: 準備作業（1時間）
- [ ] フェーズ2: コア変更（3-4時間）

#### Day 2（3-4時間）
- [ ] フェーズ3: 設定・ドキュメント更新（2-3時間）
- [ ] フェーズ4: テスト・検証（1時間）

### チェックリスト

#### 事前確認
- [ ] 現在のgit状態クリーン
- [ ] 全テスト通過確認
- [ ] featureブランチ作成

#### 実施中確認
- [ ] 各フェーズ完了後のビルド確認
- [ ] プロジェクト参照の整合性確認
- [ ] 設定ファイルの妥当性確認

#### 完了確認
- [ ] 全機能のE2Eテスト実行
- [ ] ドキュメントの整合性確認
- [ ] デプロイメント準備完了

## 6. 実施推奨事項

### 6.1 即座実施推奨
プロジェクトが開発初期段階かつ本格運用前のため、**今が最適なタイミング**です。

### 6.2 推奨プロジェクト名
**`ShopifyAnalyticsApi`** を強く推奨します。
- 現在の機能との整合性
- 将来性と拡張性
- チームの理解しやすさ

### 6.3 実施方針
1. **段階的実施**: フェーズ分けで確実に進行
2. **検証重視**: 各段階でのテスト実施
3. **ドキュメント同期**: コードとドキュメントの同時更新

## 7. 結論

**実施可能性**: ★★★★★ (高)
**実施必要性**: ★★★★★ (高)
**推奨実施時期**: 即時

現在のプロジェクト段階であれば、リスクを最小限に抑えて名前変更が可能です。本格運用開始前の今こそが最適なタイミングであり、2日間の作業で確実に完了できます。