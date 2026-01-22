# appsettings.Production.jsonが反映されない問題

## 📋 問題概要

**発生日時**: 2026年1月19日  
**環境**: 本番環境（Production）  
**症状**: `appsettings.Production.json`を更新したが、Azure App Serviceにデプロイされても最新の内容が反映されない

### 確認方法

Kudu（高度なツール）でファイルを確認：
```
D:\home\site\wwwroot\appsettings.Production.json
```

**問題**: ファイルの更新日時が古い、または内容が最新でない

---

## 🔍 根本原因

### 1. デプロイ時にappsettings.Production.jsonが含まれていない（最も可能性が高い）

**原因**:
- `dotnet publish`コマンドで`appsettings.Production.json`が自動的に含まれない場合がある
- `.csproj`ファイルで明示的に含める設定がない

**確認方法**:
1. ローカルで`dotnet publish`を実行
2. `published`フォルダに`appsettings.Production.json`が含まれているか確認

```powershell
cd backend/ShopifyAnalyticsApi
dotnet publish -c Release -o ./published
Get-ChildItem ./published -Filter "appsettings*.json"
```

---

### 2. デプロイプロセスで設定ファイルが上書きされている

**原因**:
- Azure App Serviceのデプロイ設定で、既存のファイルを上書きしない設定になっている
- `SkipExtraFilesOnServer`が`true`に設定されている

**確認方法**:
- PublishProfileファイル（`.pubxml`）を確認
- `SkipExtraFilesOnServer`の設定を確認

---

### 3. ビルド時に設定ファイルが除外されている

**原因**:
- `.csproj`ファイルで`appsettings.Production.json`が除外されている
- ビルド設定で設定ファイルが除外されている

**確認方法**:
- `.csproj`ファイルを確認
- `Exclude`や`Remove`の設定がないか確認

---

## ✅ 解決方法

### 方法1: .csprojファイルでappsettings.Production.jsonを明示的に含める（推奨）

**ファイル**: `backend/ShopifyAnalyticsApi/ShopifyAnalyticsApi.csproj`

**修正内容**:
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <!-- appsettings.Production.jsonを明示的に含める -->
  <ItemGroup>
    <Content Include="appsettings.Production.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="appsettings.Staging.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="appsettings.Development.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="ShopifySharp" Version="6.24.1" />
    <!-- ... 他のパッケージ参照 ... -->
  </ItemGroup>

</Project>
```

**メリット**:
- デプロイ時に確実に設定ファイルが含まれる
- ビルド時に設定ファイルがコピーされることを保証

---

### 方法2: dotnet publishコマンドにオプションを追加

**ファイル**: `.github/workflows/production_backend.yml`

**修正内容**:
```yaml
- name: 📦 Publish project
  run: |
    cd backend/ShopifyAnalyticsApi
    # appsettings.Production.jsonを明示的に含める
    dotnet publish -c Release -o ./published --no-restore --no-build /p:CopyAllFilesToOutputDirectory=true
```

**注意**: `/p:CopyAllFilesToOutputDirectory=true`は、すべてのファイルをコピーするため、パフォーマンスに影響する可能性があります。

---

### 方法3: デプロイ後にKuduで手動でアップロード（一時的な対処）

**手順**:
1. Kudu（高度なツール）を開く
2. `D:\home\site\wwwroot\`に移動
3. `appsettings.Production.json`を編集
4. 最新の内容を貼り付け
5. 保存
6. App Serviceを再起動

**注意**: これは一時的な対処法です。次回のデプロイで上書きされる可能性があります。

---

### 方法4: Azure Portalの環境変数で設定（代替案）

**問題**: `appsettings.Production.json`が反映されない場合、環境変数で直接設定する方法もあります。

**手順**:
1. Azure Portal → App Service → 設定 → 構成 → アプリケーション設定
2. 以下の環境変数を追加：
   ```
   Cors__AllowedOrigins__0=https://ec-ranger.access-net.co.jp
   Cors__AllowedOrigins__1=https://brave-sea-038f17a00.1.azurestaticapps.net
   Cors__AllowedOrigins__2=https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net
   Cors__AllowedOrigins__3=https://brave-sea-038f17a00-staging.eastasia.1.azurestaticapps.net
   ...
   ```
3. App Serviceを再起動

**メリット**:
- 即座に反映される
- デプロイプロセスに依存しない

**デメリット**:
- 設定が分散する（`appsettings.Production.json`と環境変数の両方で管理）
- 環境変数の形式が特殊（`Cors__AllowedOrigins__0`など）

---

## 🚀 推奨される解決手順

### ステップ1: .csprojファイルを修正（根本的な解決）

1. `backend/ShopifyAnalyticsApi/ShopifyAnalyticsApi.csproj`を開く
2. `appsettings.Production.json`を明示的に含める設定を追加
3. 変更をコミット・プッシュ

### ステップ2: ローカルで確認

```powershell
cd backend/ShopifyAnalyticsApi
dotnet publish -c Release -o ./published
Get-ChildItem ./published -Filter "appsettings*.json" | Select-Object Name, LastWriteTime
```

**確認事項**:
- `appsettings.Production.json`が`published`フォルダに含まれているか
- ファイルの内容が最新か

### ステップ3: バックエンドを再デプロイ

1. GitHub Actionsでバックエンドを再デプロイ
2. デプロイ完了後、Kuduでファイルを確認

### ステップ4: Kuduで確認

1. Kudu（高度なツール）を開く
2. `D:\home\site\wwwroot\appsettings.Production.json`を確認
3. 最新の内容（`https://ec-ranger.access-net.co.jp`が含まれている）が反映されているか確認

---

## 🔧 トラブルシューティング

### デプロイ後もファイルが更新されない場合

1. **デプロイログを確認**
   - GitHub Actionsのデプロイログで、`appsettings.Production.json`が含まれているか確認

2. **Kuduでファイルを直接確認**
   - `D:\home\site\wwwroot\appsettings.Production.json`の内容を確認
   - 更新日時を確認

3. **一時的な対処: Kuduで手動更新**
   - Kuduでファイルを編集
   - 最新の内容を貼り付け
   - App Serviceを再起動

4. **環境変数で設定（代替案）**
   - Azure Portalの環境変数で直接設定
   - 即座に反映される

---

## 📝 チェックリスト

### デプロイ前の確認

- [ ] `.csproj`ファイルで`appsettings.Production.json`が明示的に含まれている
- [ ] ローカルで`dotnet publish`を実行して、`published`フォルダに`appsettings.Production.json`が含まれている
- [ ] ファイルの内容が最新であることを確認

### デプロイ後の確認

- [ ] GitHub Actionsのデプロイログで、`appsettings.Production.json`が含まれているか確認
- [ ] Kuduで`D:\home\site\wwwroot\appsettings.Production.json`の内容を確認
- [ ] ファイルの更新日時が最新であることを確認
- [ ] App Serviceを再起動
- [ ] CORS設定が正しく反映されているか確認

---

## 📚 参考情報

### 関連ドキュメント

- [.NET デプロイ時のファイルコピー設定](https://learn.microsoft.com/ja-jp/dotnet/core/project-sdk/msbuild-props#copytooutputdirectory)
- [Azure App Service デプロイ設定](https://learn.microsoft.com/ja-jp/azure/app-service/deploy-configure-options)

### 関連ファイル

- `backend/ShopifyAnalyticsApi/ShopifyAnalyticsApi.csproj`
- `.github/workflows/production_backend.yml`
- `backend/ShopifyAnalyticsApi/appsettings.Production.json`

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
