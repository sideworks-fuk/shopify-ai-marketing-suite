# TakashiさんへのEC Ranger名称変更タスク確認とお願い

## From: Kenji（2025年8月4日 15:45）

Takashiさん、お疲れ様です！

EC Ranger名称変更について、もし作業がまだの部分があればお願いしたいです。
※既に作業済みの場合は、完了報告だけいただければOKです！

## 🎯 優先度：高（8月5日デモまでに確認希望）

### 1. バックエンド名称変更項目

#### 設定ファイル
- [ ] `backend/ShopifyAnalyticsApi/appsettings.json`
  - ApplicationName: "EC Ranger API"
  - その他アプリ名記載箇所

#### API設定
- [ ] Swagger設定（Program.cs内）
  - Title: "EC Ranger API"
  - Description: "EC Ranger - Shopifyストア分析ツール API"

#### ログ出力
- [ ] ログメッセージ内のアプリ名
  - 例: "EC Ranger API started"
  - エラーメッセージ内のアプリ名

#### プロジェクト設定
- [ ] `.csproj` ファイル内の記載（必要に応じて）
- [ ] AssemblyInfo（自動生成の場合は不要）

### 2. 環境変数確認
- [ ] Azure App Service設定
  - Application Settings内のアプリ名関連
- [ ] 本番環境の設定値

### 3. 動作確認項目
- [ ] Swagger UI でAPIタイトルが正しく表示される
- [ ] ログにアプリ名が正しく出力される
- [ ] エラーレスポンスのアプリ名確認

### 4. 注意事項
- **変更しないもの**
  - データベース名、テーブル名
  - APIエンドポイントのパス
  - 内部的なクラス名、名前空間

### 5. 既に作業済みの場合

作業済みでしたら、以下を `report_takashi.md` に記載してください：
- 変更した箇所のリスト
- 動作確認の結果
- 気になった点や追加で必要な作業

### 6. まだの場合の変更例

```csharp
// Program.cs - Swagger設定
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EC Ranger API",
        Version = "v1",
        Description = "EC Ranger - Shopifyストア分析ツール API"
    });
});
```

```json
// appsettings.json
{
  "ApplicationSettings": {
    "ApplicationName": "EC Ranger",
    "ApplicationTitle": "EC Ranger API"
  }
}
```

### 最優先事項（8月6日）

EC Ranger名称変更とは別に、以下が最優先です：
1. **アンインストール機能実装**
2. **GDPR Webhooks 4種類の実装**

これらは8月8日のShopify申請に必須なので、
名称変更が完了したら、こちらに注力をお願いします！

不明点があれば `to_kenji.md` で連絡ください。
よろしくお願いします！

---
Kenji