# ShopifyDataAnonymizer

ShopifyのCSVデータを匿名化し、データベースにインポートするツールです。

## 🚀 主な機能

- ✅ ShopifyからエクスポートされたCSV形式の顧客・注文データを匿名化
- ✅ 複数ファイル間で一貫性のあるマッピングを維持
- ✅ データの関連性やパターンを保持
- ✅ 設定可能な匿名化ルール
- ✅ 自動化が容易なコマンドラインインターフェース
- ✅ 詳細なログと進捗表示

## 📋 動作環境

- .NET 8.0 SDK以上
- Windows、macOS、またはLinuxオペレーティングシステム

## 🔧 インストール方法

### 方法1: ソースコードからクローンしてビルド

```shell
# リポジトリのクローン
git clone https://github.com/sideworks-fuk/shopifyapp-azure-ai-prompt-testing.git
cd shopify-data-anonymizer

# プロジェクトのビルド
dotnet build src/ShopifyDataAnonymizer/ShopifyDataAnonymizer.csproj -c Release

# オプション: グローバルツールとして作成
dotnet pack src/ShopifyDataAnonymizer/ShopifyDataAnonymizer.csproj -c Release -o ./nupkg
dotnet tool install --global --add-source ./nupkg ShopifyDataAnonymizer
```

### 方法2: ビルド済みバイナリのダウンロード（近日公開予定）

[リリースページ](https://github.com/yourusername/shopify-data-anonymizer/releases)から、お使いのプラットフォーム向けの最新リリースをダウンロードしてください。

## 📖 使用方法

### コマンドライン構造

```shell
ShopifyDataAnonymizer [command] [options]
```

### 利用可能なコマンド

1. `import` - データのインポート
2. `anonymize` - データの匿名化

### オプション

| オプション | 説明 | 必須 |
|------------|------|------|
| `--input <path>` | 入力CSVファイルのパス | はい |
| `--output <path>` | 出力CSVファイルのパス（匿名化時のみ必須） | 条件付き |
| `--type <type>` | データの種類（customers/products/orders） | はい |
| `--mapping <path>` | マッピングファイルのパス（匿名化時のみ） | いいえ |

### 使用例

#### データの匿名化

```shell
# 顧客データの匿名化（基本）
ShopifyDataAnonymizer anonymize --input "customers.csv" --output "anonymized_customers.csv" --type "customers"

# マッピングファイルを使用した匿名化
ShopifyDataAnonymizer anonymize --input "customers.csv" --output "anonymized_customers.csv" --type "customers" --mapping "mapping.csv"
```

#### データのインポート

```shell
# 顧客データのインポート
ShopifyDataAnonymizer import --input "customers.csv" --type "customers"

# 商品データのインポート
ShopifyDataAnonymizer import --input "products.csv" --type "products"

# 注文データのインポート
ShopifyDataAnonymizer import --input "orders.csv" --type "orders"
```

### 注意事項

- 入力ファイルはUTF-8（BOM付き）のCSVファイルである必要があります
- データベース接続情報は`appsettings.json`で設定してください

## 💡 動作の仕組み

ShopifyDataAnonymizerは、ShopifyのCSVエクスポートに含まれる個人識別情報（PII）を匿名化された値に置き換え、ファイル間の一貫性を維持します：

1. **入力CSVファイルの読み込み** - Shopifyからエクスポートされた顧客または注文データを処理
2. **PII項目の特定** - 設定に基づいて個人情報を含むフィールドを識別
3. **一貫性のあるマッピングの作成** - 元の値を匿名化された代替値にマッピング
4. **関連性の保持** - 同一の元データに対して同じ匿名化された値を使用
5. **匿名化データの出力** - 処理されたデータを新しいCSVファイルに書き込み
6. **マッピング情報の保存** - 元のデータと匿名化されたデータの関係を保存

マッピングファイルにより、複数回の実行と異なるファイルタイプ間で一貫した匿名化が可能になり、顧客情報が顧客データと注文データの間で一貫して匿名化されることを保証します。

## 📁 サンプルデータ

`samples`ディレクトリには、ツールの機能を示すサンプルファイルが含まれています：

- `sample-customers.csv` - サンプル顧客データエクスポート
- `sample-orders.csv` - サンプル注文データエクスポート
- `run-samples.bat` / `run-samples.sh` - 匿名化プロセスのデモスクリプト

## 📚 ドキュメント

より詳細なドキュメントについては、以下を参照してください：

- [使用ガイド](docs/usage.md) - 詳細な使用方法
- [設定](docs/configuration.md) - 設定オプション
- [開発者向けガイド](docs/development.md) - 開発者向け情報
- [よくある質問](docs/faq.md) - よくある質問と回答

## 👥 貢献

貢献を歓迎します！お気軽にプルリクエストを提出してください。

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを開く

## 🙏 謝辞

- [CsvHelper](https://joshclose.github.io/CsvHelper/) - CSVファイル処理に使用
- [System.CommandLine](https://github.com/dotnet/command-line-api) - コマンドライン解析に使用

---

## 🔒 プライバシーに関する注意

このツールは、個人データを匿名化することでプライバシーを保護するために設計されています。GDPR、CCPA、またはその他の関連法規などの適用されるプライバシー法および規制に従って使用してください。常に処理するデータに対する適切な権限があることを確認してください。

このツールによって生成される匿名化データは、開発およびテスト目的でのみ使用してください。ツールは個人情報を削除するために最大限の努力をしていますが、すべてのケースで完全な匿名化を保証するものではありません。ユーザーは出力を確認し、使用前にプライバシー要件を満たしていることを確認すべきです。