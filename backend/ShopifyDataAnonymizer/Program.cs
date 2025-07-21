using System;
using System.CommandLine;
using System.CommandLine.Invocation;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using ShopifyDataAnonymizer.Services;
using Microsoft.Extensions.Configuration;

namespace ShopifyDataAnonymizer
{
    class Program
    {
        static async Task<int> Main(string[] args)
        {
            // UTF-8 BOM付きエンコーディングを設定
            Console.InputEncoding = new UTF8Encoding(true);
            Console.OutputEncoding = new UTF8Encoding(true);

            // 設定ファイルの読み込み
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .Build();

            // 接続文字列の取得とチェック
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connectionString))
            {
                Console.WriteLine("エラー: appsettings.jsonに有効なデータベース接続文字列が設定されていません。");
                return 1;
            }

            // サービスの初期化
            var csvService = new CsvService();
            var dataMapping = new DataMapping(csvService);
            var anonymizationService = new AnonymizationService(csvService, dataMapping);
            var importService = new ImportService(connectionString);

            // ルートコマンドの作成
            var rootCommand = new RootCommand("Shopifyデータ匿名化処理")
            {
                Description = "ShopifyのCSVデータを匿名化するツール"
            };

            // 共通オプションの定義
            var inputOption = new Option<string>(
                name: "--input",
                description: "入力CSVファイルパス")
            {
                IsRequired = true
            };

            var outputOption = new Option<string>(
                name: "--output",
                description: "出力CSVファイルパス",
                getDefaultValue: () => "output.csv" // 修正: GetDefaultValue を getDefaultValue に変更
            )
            {
                IsRequired = false
            };

            var mappingOption = new Option<string>(
                name: "--mapping",
                description: "マッピングファイルパス",
                getDefaultValue: () => "mapping.csv" // 修正: GetDefaultValue を getDefaultValue に変更
            )
            {
                IsRequired = false
            };

            // 顧客CSV変換用コマンド
            var customersCommand = new Command("customers", "顧客CSVの個人情報を匿名化します");
            customersCommand.AddOption(inputOption);
            customersCommand.AddOption(outputOption);
            customersCommand.AddOption(mappingOption);

            customersCommand.SetHandler(async (string input, string output, string mapping) =>
            {
                await ProcessCustomersCsv(input, output, mapping, csvService, dataMapping, anonymizationService);
            }, inputOption, outputOption, mappingOption);

            // オーダーCSV変換用コマンド
            var ordersCommand = new Command("orders", "オーダーCSVの個人情報を匿名化します");
            ordersCommand.AddOption(inputOption);
            ordersCommand.AddOption(outputOption);
            ordersCommand.AddOption(mappingOption);

            ordersCommand.SetHandler(async (string input, string output, string mapping) =>
            {
                await ProcessOrdersCsv(input, output, mapping, csvService, dataMapping, anonymizationService);
            }, inputOption, outputOption, mappingOption);

            // 商品CSV変換用コマンド
            var productsCommand = new Command("products", "商品CSVの機密情報を匿名化します");
            productsCommand.AddOption(inputOption);
            productsCommand.AddOption(outputOption);
            productsCommand.AddOption(mappingOption);

            productsCommand.SetHandler(async (string input, string output, string mapping) =>
            {
                await ProcessProductsCsv(input, output, mapping, csvService, dataMapping, anonymizationService);
            }, inputOption, outputOption, mappingOption);

            // SQLServerインポート用コマンド
            var importCommand = new Command("import", "SQLServerにデータをインポートします");
            var importTypeOption = new Option<string>(
                name: "--type",
                description: "インポートするデータの種類 (customers, products, orders)")
            {
                IsRequired = true
            };
            var storeIdOption = new Option<int>(
                name: "--store-id",
                description: "ストアID（マルチストア対応）",
                getDefaultValue: () => 1)
            {
                IsRequired = false
            };
            importCommand.AddOption(inputOption);
            importCommand.AddOption(importTypeOption);
            importCommand.AddOption(storeIdOption);

            importCommand.SetHandler(async (string input, string type, int storeId) =>
            {
                await ProcessImport(input, type, storeId, importService);
            }, inputOption, importTypeOption, storeIdOption);

            // データベース確認コマンド
            var checkCommand = new Command("check", "データベースのレコード数を確認します");
            checkCommand.SetHandler(async () =>
            {
                await importService.CheckDatabaseRecords();
            });

            // ルートコマンドにサブコマンドを追加
            rootCommand.AddCommand(customersCommand);
            rootCommand.AddCommand(ordersCommand);
            rootCommand.AddCommand(productsCommand);
            rootCommand.AddCommand(importCommand);
            rootCommand.AddCommand(checkCommand);

            // コマンドラインの解析と実行
            return await rootCommand.InvokeAsync(args);
        }

        /// <summary>
        /// 顧客CSVの匿名化処理
        /// </summary>
        static async Task ProcessCustomersCsv(
            string inputCsvPath,
            string outputCsvPath,
            string mapFilePath,
            CsvService csvService,
            DataMapping dataMapping,
            AnonymizationService anonymizationService)
        {
            try
            {
                // 処理開始
                PrintHeader("顧客CSV匿名化処理");
                Console.WriteLine($"入力ファイル: {inputCsvPath}");
                Console.WriteLine($"出力ファイル: {outputCsvPath}");
                Console.WriteLine($"マッピングファイル: {mapFilePath}");

                // ファイルの存在チェック
                if (!File.Exists(inputCsvPath))
                {
                    Console.WriteLine($"エラー: 入力CSVファイルが見つかりません: {inputCsvPath}");
                    return;
                }

                // マッピングファイルを読み込む
                if (File.Exists(mapFilePath))
                {
                    Console.WriteLine($"既存のマッピングファイルを読み込んでいます: {mapFilePath}");
                    await dataMapping.LoadFromFile(mapFilePath);
                    Console.WriteLine($"マッピングデータをロードしました: {dataMapping.NextIndex - 1}件");
                }

                // 処理実行
                int newMappingCount = await anonymizationService.AnonymizeCustomersCsv(inputCsvPath, outputCsvPath, mapFilePath);

                // マッピングファイルを更新
                if (newMappingCount > 0)
                {
                    Console.WriteLine($"マッピングファイルを更新しています: {mapFilePath}");
                    await anonymizationService.SaveMappingToFile(mapFilePath);
                }

                Console.WriteLine("処理が完了しました。");
                Console.WriteLine($"- 出力ファイル: {outputCsvPath}");
                Console.WriteLine($"- マッピングファイル: {mapFilePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"エラーが発生しました: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }

        /// <summary>
        /// オーダーCSVの匿名化処理
        /// </summary>
        static async Task ProcessOrdersCsv(
            string inputCsvPath,
            string outputCsvPath,
            string mapFilePath,
            CsvService csvService,
            DataMapping dataMapping,
            AnonymizationService anonymizationService)
        {
            try
            {
                // 処理開始
                PrintHeader("オーダーCSV匿名化処理");
                Console.WriteLine($"入力ファイル: {inputCsvPath}");
                Console.WriteLine($"出力ファイル: {outputCsvPath}");
                Console.WriteLine($"マッピングファイル: {mapFilePath}");

                // ファイルの存在チェック
                if (!File.Exists(inputCsvPath))
                {
                    Console.WriteLine($"エラー: 入力CSVファイルが見つかりません: {inputCsvPath}");
                    return;
                }

                if (!File.Exists(mapFilePath))
                {
                    Console.WriteLine($"警告: マッピングファイルが見つかりません: {mapFilePath}");
                    Console.WriteLine("マッピングファイルがない場合、顧客データとの整合性が確保できません。");
                    Console.WriteLine("先に顧客CSVの処理を行うことをお勧めします。");

                    Console.Write("処理を続行しますか？ (y/n): ");
                    string response = Console.ReadLine()?.ToLower() ?? "n";
                    if (response != "y" && response != "yes")
                    {
                        Console.WriteLine("処理を中止しました。");
                        return;
                    }
                }
                else
                {
                    // マッピングファイルを読み込む
                    Console.WriteLine($"マッピングファイルを読み込んでいます: {mapFilePath}");
                    await dataMapping.LoadFromFile(mapFilePath);
                    Console.WriteLine($"マッピングデータをロードしました: {dataMapping.NextIndex - 1}件");
                }

                // 処理実行
                int newMappingCount = await anonymizationService.AnonymizeOrdersCsv(inputCsvPath, outputCsvPath, mapFilePath);

                // マッピングファイルを更新
                if (newMappingCount > 0)
                {
                    Console.WriteLine($"マッピングファイルを更新しています: {mapFilePath}");
                    await anonymizationService.SaveMappingToFile(mapFilePath);
                }

                Console.WriteLine("処理が完了しました。");
                Console.WriteLine($"- 出力ファイル: {outputCsvPath}");
                Console.WriteLine($"- マッピングファイル: {mapFilePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"エラーが発生しました: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }

        /// <summary>
        /// 商品CSVの匿名化処理
        /// </summary>
        static async Task ProcessProductsCsv(
            string inputCsvPath,
            string outputCsvPath,
            string mapFilePath,
            CsvService csvService,
            DataMapping dataMapping,
            AnonymizationService anonymizationService)
        {
            try
            {
                // 処理開始
                PrintHeader("商品CSV匿名化処理");
                Console.WriteLine($"入力ファイル: {inputCsvPath}");
                Console.WriteLine($"出力ファイル: {outputCsvPath}");
                Console.WriteLine($"マッピングファイル: {mapFilePath}");

                // ファイルの存在チェック
                if (!File.Exists(inputCsvPath))
                {
                    Console.WriteLine($"エラー: 入力CSVファイルが見つかりません: {inputCsvPath}");
                    return;
                }

                // マッピングファイルを読み込む
                if (File.Exists(mapFilePath))
                {
                    Console.WriteLine($"既存のマッピングファイルを読み込んでいます: {mapFilePath}");
                    await dataMapping.LoadFromFile(mapFilePath);
                    Console.WriteLine($"マッピングデータをロードしました: {dataMapping.NextIndex - 1}件");
                }

                // 処理実行
                int newMappingCount = await anonymizationService.AnonymizeProductsCsv(inputCsvPath, outputCsvPath, mapFilePath);

                // マッピングファイルを更新
                if (newMappingCount > 0)
                {
                    Console.WriteLine($"マッピングファイルを更新しています: {mapFilePath}");
                    await anonymizationService.SaveMappingToFile(mapFilePath);
                }

                Console.WriteLine("処理が完了しました。");
                Console.WriteLine($"- 出力ファイル: {outputCsvPath}");
                Console.WriteLine($"- マッピングファイル: {mapFilePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"エラーが発生しました: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }

        /// <summary>
        /// SQLServerへのデータインポート処理
        /// </summary>
        static async Task ProcessImport(string inputCsvPath, string type, int storeId, ImportService importService)
        {
            try
            {
                // 処理開始
                PrintHeader($"SQLServerインポート処理 - {type}");
                Console.WriteLine($"入力ファイル: {inputCsvPath}");
                Console.WriteLine($"ストアID: {storeId}");

                // ファイルの存在チェック
                if (!File.Exists(inputCsvPath))
                {
                    Console.WriteLine($"エラー: 入力CSVファイルが見つかりません: {inputCsvPath}");
                    return;
                }

                switch (type.ToLower())
                {
                    case "customers":
                        Console.WriteLine("匿名化された顧客データをインポートしています...");
                        await importService.ImportAnonymizedCustomers(inputCsvPath, storeId);
                        break;
                    case "products":
                        Console.WriteLine("ShopifyTestApi形式で商品データをインポートしています...");
                        await importService.ImportProductsWithVariantsForTestApi(inputCsvPath, storeId);
                        break;
                    case "orders":
                        await importService.ImportOrders(inputCsvPath, storeId);
                        break;
                    default:
                        Console.WriteLine($"エラー: サポートされていないデータ種類です: {type}");
                        return;
                }

                Console.WriteLine("インポート処理が完了しました。");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"エラーが発生しました: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }

        /// <summary>
        /// ヘッダーを表示します
        /// </summary>
        static void PrintHeader(string title)
        {
            Console.WriteLine(new string('=', 50));
            Console.WriteLine($"  {title}");
            Console.WriteLine(new string('=', 50));
        }
    }
}