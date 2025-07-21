using System.Collections.Generic;
using System.Threading.Tasks;
using ShopifyDataAnonymizer.Models;

namespace ShopifyDataAnonymizer.Services
{
    public class DataMapping
    {
        private readonly CsvService _csvService;

        public Dictionary<string, Dictionary<string, string>> FieldMappings { get; set; } = new Dictionary<string, Dictionary<string, string>>();
        public Dictionary<string, Dictionary<string, int>> FieldIndices { get; set; } = new Dictionary<string, Dictionary<string, int>>();
        public int NextIndex { get; set; } = 1;

        public DataMapping(CsvService csvService)
        {
            _csvService = csvService ?? throw new System.ArgumentNullException(nameof(csvService));
        }

        /// <summary>
        /// 新しいマッピングを追加します
        /// </summary>
        public void AddMapping(string originalValue, string fieldType, string anonymizedValue)
        {
            if (!FieldMappings.ContainsKey(fieldType))
            {
                FieldMappings[fieldType] = new Dictionary<string, string>();
                FieldIndices[fieldType] = new Dictionary<string, int>();
            }
            FieldMappings[fieldType][originalValue] = anonymizedValue;
            if (!FieldIndices[fieldType].ContainsKey(originalValue))
            {
                FieldIndices[fieldType][originalValue] = NextIndex++;
            }
        }

        /// <summary>
        /// 匿名化された値を取得します
        /// </summary>
        public bool TryGetAnonymizedValue(string originalValue, string fieldType, out string? anonymizedValue)
        {
            anonymizedValue = null;
            return FieldMappings.TryGetValue(fieldType, out var typeMappings) &&
                   typeMappings.TryGetValue(originalValue, out anonymizedValue);
        }

        /// <summary>
        /// マッピングファイルからデータをロードします
        /// </summary>
        public async Task LoadFromFile(string mapFilePath)
        {
            if (_csvService == null)
            {
                throw new System.InvalidOperationException("CsvServiceが設定されていません");
            }

            var records = await _csvService.ReadMappingFile(mapFilePath);
            foreach (var record in records)
            {
                AddMapping(record.OriginalValue, record.FieldType, record.AnonymizedValue);
                FieldIndices[record.FieldType][record.OriginalValue] = record.Index;

                // 最大インデックスを更新
                if (record.Index >= NextIndex)
                {
                    NextIndex = record.Index + 1;
                }
            }
        }

        /// <summary>
        /// マッピングレコードのリストを生成します
        /// </summary>
        public List<MappingRecord> GenerateMappingRecords()
        {
            var records = new List<MappingRecord>();

            foreach (var fieldType in FieldMappings.Keys)
            {
                foreach (var mapping in FieldMappings[fieldType])
                {
                    int index = FieldIndices[fieldType][mapping.Key];
                    records.Add(new MappingRecord
                    {
                        FieldType = fieldType,
                        OriginalValue = mapping.Key,
                        AnonymizedValue = mapping.Value,
                        Index = index
                    });
                }
            }

            return records;
        }
    }
}