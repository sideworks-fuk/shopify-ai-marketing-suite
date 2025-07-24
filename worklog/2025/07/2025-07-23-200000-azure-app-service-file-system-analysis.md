# 作業ログ: Azure App Service ファイルシステム制約とローカルディスクログ出力分析

## 作業情報
- 開始日時: 2025-07-23 20:00:00
- 完了日時: 2025-07-23 20:20:00
- 所要時間: 20分
- 担当: 福田＋AI Assistant

## 作業概要
Azure App Serviceでのローカルディスクログ出力の実現可能性、取得方法、運用面でのメリット・デメリットについて詳細に調査・分析しました。

## 実施内容

### 1. Azure App Serviceのファイルシステム制約調査

#### 1.1 PaaS環境の特性分析
**Azure App ServiceはPaaS（Platform as a Service）**のため、従来のIaaS仮想マシンとは異なる制約があります：

| 項目 | 制約内容 | 影響 |
|------|----------|------|
| **永続性** | インスタンス再起動時にファイルが消失 | ログファイルの永続化に注意 |
| **容量制限** | 1GBの永続ストレージ | ログローテーション必須 |
| **パフォーマンス** | 共有ストレージのため遅い | 大量ログ出力時の性能劣化 |
| **アクセス方法** | Kudu Console / FTP | 直接アクセス不可 |

#### 1.2 利用可能なディレクトリ確認
```bash
# 永続ディレクトリ（推奨）
/home/LogFiles/Application/     # アプリケーションログ
/home/LogFiles/http/RawLogs/   # Webサーバーログ
/home/LogFiles/DetailedErrors/ # 詳細エラー

# 一時ディレクトリ（非推奨）
/tmp/                          # 一時ファイル
/var/tmp/                      # 一時ファイル
```

#### 1.3 ファイルシステム制約の詳細分析

**永続性の問題**:
- インスタンス再起動時に `/home` 以外のファイルが消失
- スケールアウト時にファイルが共有されない
- デプロイ時にファイルがリセットされる場合がある

**容量制限**:
- `/home` ディレクトリは約1GB
- ログファイルの蓄積で容量不足の可能性
- 自動ローテーション設定が必須

**パフォーマンス制約**:
- 共有ストレージのため書き込み速度が遅い
- 大量ログ出力時にアプリケーション性能が劣化
- 同時アクセス時の競合

### 2. ローカルディスクログ出力の実現可能性確認

#### 2.1 実現可能性：YES ✅
Azure App Serviceでもローカルディスクへのログ出力は**完全に実現可能**です。

#### 2.2 実装方法の詳細

**必要なパッケージ**:
```bash
dotnet add package Serilog.Sinks.File
```

**設定例（appsettings.Production.json）**:
```json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.Console", "Serilog.Sinks.File"],
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "File",
        "Args": {
          "path": "/home/LogFiles/Application/app-.txt",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 7,
          "fileSizeLimitBytes": 10485760,
          "outputTemplate": "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"
        }
      }
    ]
  }
}
```

#### 2.3 ログファイルの保存場所
```bash
# 推奨ディレクトリ構造
/home/LogFiles/Application/
├── app-20250723.txt          # 日別ログファイル
├── app-20250724.txt
├── app-20250725.txt
└── app-20250726.txt
```

### 3. ログファイルの取得方法調査

#### 3.1 Kudu Console での直接確認
**アクセス方法**:
```
https://<app-name>.scm.azurewebsites.net/
```

**確認コマンド**:
```bash
# ログディレクトリの確認
ls -la /home/LogFiles/Application/

# 最新ログファイルの確認
tail -f /home/LogFiles/Application/app-20250723.txt

# ファイルサイズ確認
du -h /home/LogFiles/Application/*.txt

# ディスク使用量確認
df -h /home/LogFiles/Application/
```

#### 3.2 Azure CLI での取得
```bash
# ログファイルのダウンロード
az webapp log download --name <app-name> --resource-group <rg-name>

# 特定ファイルの取得（Kudu REST API）
curl -u <username>:<password> \
  "https://<app-name>.scm.azurewebsites.net/api/vfs/home/LogFiles/Application/app-20250723.txt"
```

#### 3.3 FTP での取得
```bash
# FTP接続情報の取得
az webapp deployment list-publishing-profiles --name <app-name> --resource-group <rg-name>

# FTP接続例
ftp <app-name>.ftp.azurewebsites.windows.net
# ユーザー名: <app-name>\<username>
# パスワード: <password>
```

#### 3.4 Azure Storage への自動転送
**Blob Storage への転送設定**:
```json
{
  "Serilog": {
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "path": "/home/LogFiles/Application/app-.txt"
        }
      },
      {
        "Name": "AzureBlobStorage",
        "Args": {
          "connectionString": "#{STORAGE_CONNECTION_STRING}#",
          "containerName": "app-logs",
          "blobName": "app-{Date}.txt"
        }
      }
    ]
  }
}
```

### 4. 運用面でのメリット・デメリット分析

#### 4.1 メリット ✅

**詳細なログ分析**:
```bash
# 特定エラーの検索
grep "ERROR" /home/LogFiles/Application/app-20250723.txt

# 特定時間帯のログ抽出
sed -n '/2025-07-23 14:00/,/2025-07-23 15:00/p' app-20250723.txt

# ログ統計
wc -l /home/LogFiles/Application/app-20250723.txt
```

**オフライン分析**:
- ログファイルをダウンロードしてローカル分析
- 外部ツールでの詳細解析
- 長期保存とアーカイブ

**コスト効率**:
- Application Insights のデータ保持料金を削減
- 詳細ログの選択的送信
- ローカルでの高速検索

#### 4.2 デメリット ❌

**永続性の問題**:
- インスタンス再起動時にログファイルが消失
- スケールアウト時にファイルが共有されない
- デプロイ時にファイルがリセットされる場合がある

**容量制限**:
```bash
# 容量不足の例
df -h /home/LogFiles/Application/
Filesystem      Size  Used Avail Use% Mounted on
/dev/sdb1       1.0G  950M   50M  95% /home
```

**パフォーマンス影響**:
```csharp
// パフォーマンスに影響する例
_logger.LogInformation("大量データ: {Data}", JsonSerializer.Serialize(largeObject));
```

**管理の複雑性**:
- ローテーション設定の管理
- ディスク容量の監視
- ファイルアクセス権限の管理

### 5. 推奨設定の策定

#### 5.1 環境別推奨設定

**開発環境**:
```json
{
  "Serilog": {
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "File",
        "Args": {
          "path": "logs/app-.txt",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 3
        }
      }
    ]
  }
}
```

**本番環境（推奨）**:
```json
{
  "Serilog": {
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "File",
        "Args": {
          "path": "/home/LogFiles/Application/app-.txt",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 7,
          "fileSizeLimitBytes": 10485760
        }
      },
      {
        "Name": "ApplicationInsights",
        "Args": {
          "connectionString": "#{APPLICATIONINSIGHTS_CONNECTION_STRING}#"
        }
      }
    ]
  }
}
```

#### 5.2 運用監視設定

**ディスク容量監視**:
```csharp
// ディスク容量チェック機能
public class DiskSpaceMonitor
{
    public static bool CheckDiskSpace(string path, long minSpaceBytes)
    {
        var driveInfo = new DriveInfo(Path.GetPathRoot(path));
        return driveInfo.AvailableFreeSpace > minSpaceBytes;
    }
}
```

**ログローテーション監視**:
```csharp
// ログローテーション監視
public class LogRotationMonitor
{
    public static void MonitorLogFiles(string logDirectory, int maxFiles)
    {
        var logFiles = Directory.GetFiles(logDirectory, "app-*.txt")
            .OrderByDescending(f => File.GetLastWriteTime(f))
            .Skip(maxFiles);
            
        foreach (var file in logFiles)
        {
            File.Delete(file);
        }
    }
}
```

### 6. 最終推奨の策定

#### 6.1 推奨する場合 ✅
1. **詳細なログ分析が必要**
2. **Application Insights のコストを削減したい**
3. **オフラインでのログ分析が必要**
4. **特定のログ形式での保存が必要**

#### 6.2 推奨しない場合 ❌
1. **高可用性が重要なシステム**
2. **ログ管理の複雑性を避けたい**
3. **Application Insights の高度な機能が必要**
4. **ディスク容量の制約が厳しい**

## 成果物

### 作成したファイル一覧
1. `docs/05-operations/azure-app-service-file-system-limitations.md` - Azure App Service ファイルシステム制約とローカルディスクログ出力（新規作成）

### 主要な内容
1. **Azure App Serviceのファイルシステム制約**: PaaS環境の特性と制約
2. **ローカルディスクログ出力の実現可能性**: 完全に実現可能
3. **ログファイルの取得方法**: 4つの取得方法（Kudu, CLI, FTP, Storage）
4. **運用面でのメリット・デメリット**: 詳細な分析結果
5. **推奨設定**: 環境別の設定例と運用監視

### 技術的詳細
- **制約分析**: 永続性、容量制限、パフォーマンス制約
- **実装方法**: Serilog File Sink の詳細設定
- **取得方法**: 複数のログ取得手段
- **運用監視**: ディスク容量とローテーション監視

## 質問への回答

### Q1: Azure App Serviceの場合でもローカルディスクへのログ出力できるのでしょうか？

**A: はい、完全に実現可能です ✅**

**理由**:
- `/home/LogFiles/Application/` ディレクトリが永続化される
- Serilog File Sink が正常に動作する
- 適切なローテーション設定で容量管理可能

### Q2: どのように取得できる？

**A: 4つの主要な方法があります**

1. **Kudu Console** (直接確認)
   - URL: https://<app-name>.scm.azurewebsites.net/
   - コマンド: `ls -la /home/LogFiles/Application/`

2. **Azure CLI** (ダウンロード)
   ```bash
   az webapp log download --name <app-name> --resource-group <rg-name>
   ```

3. **FTP** (ファイル転送)
   - FTP接続でファイル取得
   - 大量ファイルの一括取得に適している

4. **Azure Storage** (自動転送)
   - Blob Storage への自動転送設定
   - 長期保存とアーカイブに適している

### Q3: できる場合は出力したほうがよいのでしょうか？

**A: 状況に応じて判断が必要です**

#### ✅ 推奨する場合
- **詳細なログ分析が必要**
- **Application Insights のコストを削減したい**
- **オフラインでのログ分析が必要**
- **特定のログ形式での保存が必要**

#### ❌ 推奨しない場合
- **高可用性が重要なシステム**
- **ログ管理の複雑性を避けたい**
- **Application Insights の高度な機能が必要**
- **ディスク容量の制約が厳しい**

## 課題・注意点

### 実装済み
- Azure App Serviceのファイルシステム制約の詳細分析
- ローカルディスクログ出力の実現可能性確認
- ログファイル取得方法の整理
- 運用面でのメリット・デメリット分析
- 推奨設定の策定

### 重要な制約事項
1. **永続性の問題**: インスタンス再起動時にファイル消失の可能性
2. **容量制限**: 1GBの制限でローテーション設定が必須
3. **パフォーマンス影響**: 共有ストレージのため書き込み速度が遅い
4. **管理の複雑性**: ローテーションと容量監視が必要

### 確認項目
- [x] Azure App Serviceのファイルシステム制約確認
- [x] ローカルディスクログ出力の実現可能性確認
- [x] ログファイル取得方法の調査
- [x] 運用面でのメリット・デメリット分析
- [x] 推奨設定の策定

## 関連ファイル
- `docs/05-operations/azure-app-service-file-system-limitations.md` - 作成した詳細分析
- `docs/05-operations/azure-app-service-logging-guide.md` - 前回作成したログガイド
- `backend/ShopifyTestApi/Program.cs` - 現在のログ設定
- `backend/ShopifyTestApi/appsettings.Production.json` - 本番環境設定 