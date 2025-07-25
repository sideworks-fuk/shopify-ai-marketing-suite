using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using ShopifyDataAnonymizer.Configuration;

namespace ShopifyDataAnonymizer.Services
{
    public class AnonymizationService
    {
        private readonly CsvService _csvService;
        private readonly DataMapping _dataMapping;

        public AnonymizationService(CsvService csvService, DataMapping dataMapping)
        {
            _csvService = csvService;
            _dataMapping = dataMapping;
        }

        /// <summary>
        /// 顧客CSVの匿名化を実行します
        /// </summary>
        public async Task<int> AnonymizeCustomersCsv(string inputCsvPath, string outputCsvPath, string mapFilePath)
        {
            Console.WriteLine($"顧客CSVの匿名化を開始します: {inputCsvPath}");

            // CSVファイルの読み込み
            var (records, headers) = await _csvService.ReadCsvFile(inputCsvPath);
            int totalCount = records.Count;
            int processedCount = 0;
            int newMappingCount = 0;

            Console.WriteLine($"CSVファイルを読み込みました: {totalCount}件のレコード");

            // 各レコードの処理
            foreach (var record in records)
            {
                // 各フィールドの処理
                foreach (var header in headers)
                {
                    if (AnonymizationConfig.CustomerFieldMappings.TryGetValue(header, out string? fieldType) && fieldType != null)
                    {
                        string originalValue = record[header];

                        if (!string.IsNullOrWhiteSpace(originalValue))
                        {
                            if (_dataMapping.TryGetAnonymizedValue(originalValue, fieldType, out string? anonymizedValue) && anonymizedValue != null)
                            {
                                // 既存のマッピングを適用
                                record[header] = anonymizedValue;
                            }
                            else
                            {
                                // 新しい匿名化値を生成（頭文字保持機能付き）
                                anonymizedValue = GenerateAnonymizedValueWithContext(originalValue, fieldType, _dataMapping.NextIndex);
                                _dataMapping.AddMapping(originalValue, fieldType, anonymizedValue);
                                record[header] = anonymizedValue;
                                newMappingCount++;
                            }
                        }
                    }
                }

                processedCount++;

                // 進捗状況の表示（10%ごと）
                if (processedCount % Math.Max(1, (int)Math.Floor(totalCount / 10.0)) == 0)
                {
                    int percentage = (int)Math.Round((processedCount / (double)totalCount) * 100);
                    Console.WriteLine($"処理中... {percentage}% 完了 ({processedCount} / {totalCount})");
                }
            }

            // 結果の出力
            Console.WriteLine($"新しいCSVファイルを出力しています: {outputCsvPath}");
            await _csvService.WriteCsvFile(outputCsvPath, records);

            Console.WriteLine($"処理が完了しました: 新規生成された匿名化値 {newMappingCount}件");
            return newMappingCount;
        }

        /// <summary>
        /// オーダーCSVの匿名化を実行します
        /// </summary>
        public async Task<int> AnonymizeOrdersCsv(string inputCsvPath, string outputCsvPath, string mapFilePath)
        {
            Console.WriteLine($"注文CSVの匿名化を開始します: {inputCsvPath}");

            // CSVファイルの読み込み
            var (records, headers) = await _csvService.ReadCsvFile(inputCsvPath);
            int totalCount = records.Count;
            int processedCount = 0;
            int newMappingCount = 0;
            int anonymizedFieldsCount = 0;

            Console.WriteLine($"CSVファイルを読み込みました: {totalCount}件のレコード");

            // 必要な列のみを抽出
            var requiredHeaders = new List<string>
            {
                "Name", "Email", "Financial Status", "Paid at", "Fulfillment Status", "Fulfilled at",
                "Currency", "Subtotal", "Shipping", "Taxes", "Total", "Discount Code", "Discount Amount",
                "Shipping Method", "Created at", "Lineitem quantity", "Lineitem name", "Lineitem price",
                "Lineitem compare at price", "Lineitem sku", "Lineitem requires shipping", "Lineitem taxable",
                "Lineitem fulfillment status", "Billing Name", "Billing Street", "Billing Address1", "Billing Address2",
                "Billing Company", "Billing City", "Billing Zip", "Billing Province", "Billing Country", "Billing Phone",
                "Shipping Name", "Shipping Street", "Shipping Address1", "Shipping Address2", "Shipping Company",
                "Shipping City", "Shipping Zip", "Shipping Province", "Shipping Country", "Shipping Phone",
                "Notes", "Cancelled at", "Payment Method", "Payment Reference", "Refunded Amount", "Vendor",
                "Outstanding Balance", "Employee", "Location", "Device ID", "Id", "Tags", "Risk Level", "Source",
                "Lineitem discount", "Tax 1 Name", "Tax 1 Value", "Tax 2 Name", "Tax 2 Value", "Tax 3 Name",
                "Tax 3 Value", "Tax 4 Name", "Tax 4 Value", "Tax 5 Name", "Tax 5 Value", "Phone", "Receipt Number",
                "Duties", "Billing Province Name", "Shipping Province Name", "Payment ID", "Payment Terms Name",
                "Next Payment Due At", "Payment References"
            };

            // 存在するヘッダーのみを抽出
            var existingHeaders = headers.Where(h => requiredHeaders.Contains(h)).ToList();
            var missingHeaders = requiredHeaders.Where(h => !headers.Contains(h)).ToList();

            Console.WriteLine($"抽出する列数: {existingHeaders.Count}件");
            if (missingHeaders.Any())
            {
                Console.WriteLine($"見つからない列: {string.Join(", ", missingHeaders)}");
            }

            // 各レコードの処理
            foreach (var record in records)
            {
                var newRecord = new Dictionary<string, string>();

                // 必要な列のみを処理
                foreach (var header in existingHeaders)
                {
                    if (AnonymizationConfig.OrderFieldMappings.TryGetValue(header, out string? fieldType) && fieldType != null)
                    {
                        string originalValue = record.ContainsKey(header) ? record[header] : "";

                        if (!string.IsNullOrWhiteSpace(originalValue))
                        {
                            if (_dataMapping.TryGetAnonymizedValue(originalValue, fieldType, out string? anonymizedValue) && anonymizedValue != null)
                            {
                                // 既存のマッピングを適用
                                newRecord[header] = anonymizedValue;
                                anonymizedFieldsCount++;
                            }
                            else
                            {
                                // 新しい匿名化値を生成
                                anonymizedValue = AnonymizationConfig.GenerateAnonymizedValue(fieldType, _dataMapping.NextIndex);
                                _dataMapping.AddMapping(originalValue, fieldType, anonymizedValue);
                                newRecord[header] = anonymizedValue;
                                newMappingCount++;
                            }
                        }
                        else
                        {
                            newRecord[header] = originalValue;
                        }
                    }
                    else
                    {
                        // 匿名化対象外の列はそのまま保持
                        newRecord[header] = record.ContainsKey(header) ? record[header] : "";
                    }
                }

                // 元のレコードを新しいレコードで置き換え
                record.Clear();
                foreach (var kvp in newRecord)
                {
                    record[kvp.Key] = kvp.Value;
                }

                processedCount++;

                // 進捗状況の表示（10%ごと）
                if (processedCount % Math.Max(1, (int)Math.Floor(totalCount / 10.0)) == 0)
                {
                    int percentage = (int)Math.Round((processedCount / (double)totalCount) * 100);
                    Console.WriteLine($"処理中... {percentage}% 完了 ({processedCount} / {totalCount})");
                }
            }

            // 結果の出力
            Console.WriteLine($"新しいCSVファイルを出力しています: {outputCsvPath}");
            await _csvService.WriteCsvFile(outputCsvPath, records, existingHeaders);

            Console.WriteLine($"処理が完了しました:");
            Console.WriteLine($"- 抽出された列数: {existingHeaders.Count}件");
            Console.WriteLine($"- 匿名化されたフィールド: {anonymizedFieldsCount}件");
            Console.WriteLine($"- 新規生成された匿名化値: {newMappingCount}件");

            return newMappingCount;
        }

        /// <summary>
        /// マッピング情報をファイルに保存します
        /// </summary>
        public async Task SaveMappingToFile(string mapFilePath)
        {
            var records = _dataMapping.GenerateMappingRecords();
            await _csvService.SaveMappingFile(mapFilePath, records);
            Console.WriteLine($"マッピングファイルを保存しました: {mapFilePath}");
        }

        /// <summary>
        /// 元の値のコンテキストを考慮した匿名化値を生成
        /// </summary>
        private string GenerateAnonymizedValueWithContext(string originalValue, string fieldType, int index)
        {
            return fieldType switch
            {
                "FirstName" => AnonymizationConfig.GenerateAnonymizedNameWithPrefix(originalValue, fieldType, index),
                "LastName" => AnonymizationConfig.GenerateAnonymizedNameWithPrefix(originalValue, fieldType, index),
                "Company" => AnonymizationConfig.GenerateAnonymizedCompanyWithPrefix(originalValue, index),
                "Tags" => AnonymizationConfig.FilterTags(originalValue, index),
                _ => AnonymizationConfig.GenerateAnonymizedValue(fieldType, index)
            };
        }

        /// <summary>
        /// 商品CSVの匿名化を実行します
        /// </summary>
        public async Task<int> AnonymizeProductsCsv(string inputCsvPath, string outputCsvPath, string mapFilePath)
        {
            Console.WriteLine($"商品CSVの匿名化を開始します: {inputCsvPath}");

            // CSVファイルの読み込み
            var (records, headers) = await _csvService.ReadCsvFile(inputCsvPath);
            int totalCount = records.Count;
            int processedCount = 0;
            int newMappingCount = 0;

            Console.WriteLine($"CSVファイルを読み込みました: {totalCount}件のレコード");

            // 各レコードの処理
            foreach (var record in records)
            {
                // 各フィールドの処理
                foreach (var header in headers)
                {
                    string originalValue = record[header];

                    if (AnonymizationConfig.ProductDeletedFields.Contains(header))
                    {
                        // 削除対象フィールド
                        record[header] = string.Empty;
                    }
                    else if (AnonymizationConfig.ProductPreservedFields.Contains(header))
                    {
                        // 保持対象フィールド（そのまま）
                        continue;
                    }
                    else if (AnonymizationConfig.ProductFieldMappings.TryGetValue(header, out string? fieldType) && fieldType != null)
                    {
                        // 匿名化対象フィールド
                        if (!string.IsNullOrWhiteSpace(originalValue))
                        {
                            if (_dataMapping.TryGetAnonymizedValue(originalValue, fieldType, out string? anonymizedValue) && anonymizedValue != null)
                            {
                                // 既存のマッピングを適用
                                record[header] = anonymizedValue;
                            }
                            else
                            {
                                // 新しい匿名化値を生成
                                anonymizedValue = GenerateAnonymizedProductValue(originalValue, fieldType, _dataMapping.NextIndex);
                                _dataMapping.AddMapping(originalValue, fieldType, anonymizedValue);
                                record[header] = anonymizedValue;
                                newMappingCount++;
                            }
                        }
                    }
                }

                processedCount++;

                // 進捗状況の表示（10%ごと）
                if (processedCount % Math.Max(1, (int)Math.Floor(totalCount / 10.0)) == 0)
                {
                    int percentage = (int)Math.Round((processedCount / (double)totalCount) * 100);
                    Console.WriteLine($"処理中... {percentage}% 完了 ({processedCount} / {totalCount})");
                }
            }

            // 結果の出力
            Console.WriteLine($"新しいCSVファイルを出力しています: {outputCsvPath}");
            await _csvService.WriteCsvFile(outputCsvPath, records);

            Console.WriteLine($"処理が完了しました: 新規生成された匿名化値 {newMappingCount}件");
            return newMappingCount;
        }

        /// <summary>
        /// 商品の匿名化値を生成
        /// </summary>
        private string GenerateAnonymizedProductValue(string originalValue, string fieldType, int index)
        {
            return fieldType switch
            {
                "Title" => AnonymizationConfig.GenerateAnonymizedProductTitle(originalValue, index),
                "Handle" => AnonymizationConfig.GenerateAnonymizedProductHandle(originalValue, index),
                "Vendor" => AnonymizationConfig.GenerateAnonymizedVendor(originalValue, index),
                "Type" => AnonymizationConfig.GenerateAnonymizedProductType(originalValue, index),
                "Tags" => AnonymizationConfig.FilterTags(originalValue, index),
                "SeoTitle" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト{originalValue}" : string.Empty,
                "SeoDescription" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト商品の説明{index:D3}" : string.Empty,
                "ImageAltText" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト画像{index:D3}" : string.Empty,
                "Option1Name" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト{originalValue}" : string.Empty,
                "Option2Name" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト{originalValue}" : string.Empty,
                "Option3Name" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト{originalValue}" : string.Empty,
                "Option1Value" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト{originalValue}" : string.Empty,
                "Option2Value" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト{originalValue}" : string.Empty,
                "Option3Value" => !string.IsNullOrWhiteSpace(originalValue) ? $"テスト{originalValue}" : string.Empty,
                _ => originalValue // その他はそのまま
            };
        }
    }
}