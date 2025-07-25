using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using System.Text;

namespace ShopifyDataAnonymizer.Services
{
    public class CsvService
    {
        /// <summary>
        /// CSVファイルからデータを読み込みます
        /// </summary>
        public async Task<(List<IDictionary<string, string>> Records, string[] Headers)> ReadCsvFile(string filePath)
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"ファイルが見つかりません: {filePath}");
            }

            var records = new List<IDictionary<string, string>>();
            string[] headers;

            using (var reader = new StreamReader(filePath, new UTF8Encoding(true)))
            using (var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)))
            {
                // ヘッダーを読み込む
                await Task.Run(() => csv.Read());
                await Task.Run(() => csv.ReadHeader());
                headers = csv.HeaderRecord ?? Array.Empty<string>(); // Nullチェックを追加

                // 各行を処理
                while (await Task.Run(() => csv.Read()))
                {
                    var record = new Dictionary<string, string>();

                    // ヘッダーの各フィールドを処理
                    foreach (var header in headers)
                    {
                        string value = csv.GetField(header) ?? string.Empty; // Nullチェックを追加
                        record[header] = value;
                    }

                    records.Add(record);
                }
            }

            return (records, headers);
        }

        /// <summary>
        /// CSVファイルにデータを書き込みます
        /// </summary>
        public async Task WriteCsvFile(string filePath, List<IDictionary<string, string>> records)
        {
            if (records == null || records.Count == 0)
            {
                throw new ArgumentException("書き込むレコードがありません");
            }

            using (var writer = new StreamWriter(filePath, false, new UTF8Encoding(true)))
            using (var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)))
            {
                // ヘッダーを書き込む
                foreach (var key in records[0].Keys)
                {
                    await Task.Run(() => csv.WriteField(key));
                }
                await Task.Run(() => csv.NextRecord());

                // レコードを書き込む
                foreach (var record in records)
                {
                    foreach (var value in record.Values)
                    {
                        await Task.Run(() => csv.WriteField(value));
                    }
                    await Task.Run(() => csv.NextRecord());
                }
            }
        }

        /// <summary>
        /// CSVファイルにデータを書き込みます（指定されたヘッダー順）
        /// </summary>
        public async Task WriteCsvFile(string filePath, List<IDictionary<string, string>> records, List<string> headers)
        {
            if (records == null || records.Count == 0)
            {
                throw new ArgumentException("書き込むレコードがありません");
            }

            using (var writer = new StreamWriter(filePath, false, new UTF8Encoding(true)))
            using (var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)))
            {
                // 指定されたヘッダーを書き込む
                foreach (var header in headers)
                {
                    await Task.Run(() => csv.WriteField(header));
                }
                await Task.Run(() => csv.NextRecord());

                // レコードを書き込む（指定されたヘッダー順）
                foreach (var record in records)
                {
                    foreach (var header in headers)
                    {
                        string value = record.ContainsKey(header) ? record[header] : "";
                        await Task.Run(() => csv.WriteField(value));
                    }
                    await Task.Run(() => csv.NextRecord());
                }
            }
        }

        /// <summary>
        /// マッピングファイルを読み込みます
        /// </summary>
        public async Task<List<Models.MappingRecord>> ReadMappingFile(string filePath)
        {
            if (!File.Exists(filePath))
            {
                return new List<Models.MappingRecord>();
            }

            using (var reader = new StreamReader(filePath, new UTF8Encoding(true)))
            using (var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)))
            {
                var records = await Task.Run(() => csv.GetRecords<Models.MappingRecord>().ToList());
                return records;
            }
        }

        /// <summary>
        /// マッピングファイルを保存します
        /// </summary>
        public async Task SaveMappingFile(string filePath, List<Models.MappingRecord> records)
        {
            using (var writer = new StreamWriter(filePath, false, new UTF8Encoding(true)))
            using (var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)))
            {
                await Task.Run(() => csv.WriteHeader<Models.MappingRecord>());
                await Task.Run(() => csv.NextRecord());

                foreach (var record in records)
                {
                    await Task.Run(() => csv.WriteRecord(record));
                    await Task.Run(() => csv.NextRecord());
                }
            }
        }

        /// <summary>
        /// CSVファイルの行数を取得します（ヘッダー行を除く）
        /// </summary>
        public int GetCsvLineCount(string filePath)
        {
            return File.ReadLines(filePath).Count() - 1;
        }
    }
}