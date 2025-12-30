# EncryptionKey 設定ガイド

## 作成日
2025-12-30

## 概要
`EncryptionKey`は、Shopify Access Tokenを暗号化してデータベースに保存する際に使用されるAES暗号化キーです。

## 設定方法

### 開発環境（推奨設定）

開発環境では、`EncryptionKey`を**空文字列**または**未設定**にすることで、Base64エンコードのみを使用します（暗号化なし）。

**方法1: 空文字列を設定**

```json
{
  "Shopify": {
    "EncryptionKey": ""
  }
}
```

**方法2: 設定自体を削除**

```json
{
  "Shopify": {
    // EncryptionKey を設定しない
  }
}
```

**理由**:
- 開発環境では暗号化のオーバーヘッドが不要
- Base64エンコードのみで十分
- 設定が簡単
- コードでは`string.IsNullOrEmpty(key)`でチェックしているため、空文字列または未設定のどちらでも動作します

### 本番環境（必須設定）

本番環境では、**有効なBase64エンコードされた32バイト（256ビット）のキー**を設定する必要があります。

#### キーの生成方法

**方法1: PowerShellで生成（推奨）**

```powershell
# 32バイトのランダムキーを生成してBase64エンコード
$key = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Host "EncryptionKey: $key"
```

**方法2: C#で生成**

```csharp
using System;
using System.Security.Cryptography;

var key = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
Console.WriteLine($"EncryptionKey: {key}");
```

**方法3: OpenSSLで生成**

```bash
openssl rand -base64 32
```

#### 設定例

**正しいBase64エンコードされた32バイトのキー（44文字）**:

```json
{
  "Shopify": {
    "EncryptionKey": "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI="
  }
}
```

**注意**: 
- Base64エンコードされた32バイトのキーは**44文字**（パディング含む）になります
- 本番環境では、環境変数またはAzure Key Vaultを使用して設定してください
- 上記の例は開発用の固定キーです。本番環境では必ずランダムなキーを生成してください

## 動作確認

### 暗号化キーが設定されている場合

- AES暗号化を使用してトークンを暗号化
- データベースに暗号化されたトークンが保存される

### 暗号化キーが設定されていない場合（空文字列）

- Base64エンコードのみを使用
- データベースにBase64エンコードされたトークンが保存される
- ログに警告メッセージが出力される：
  ```
  [WRN] 暗号化キーが設定されていません。Base64エンコードを使用します
  ```

## トラブルシューティング

### エラー: `The input is not a valid Base-64 string`

**原因**: `EncryptionKey`が無効なBase64文字列になっている

**解決方法**:
1. `EncryptionKey`を空文字列に設定（開発環境）
2. または、有効なBase64エンコードされた32バイトのキーを生成して設定（本番環境）

### エラー: `Error occurred during token encryption`

**原因**: `EncryptionKey`のBase64デコードに失敗

**解決方法**:
- コードにはフォールバック処理があり、Base64エンコードのみを使用します
- ログを確認して、`EncryptionKey`の設定を修正してください

## セキュリティ考慮事項

1. **開発環境**: Base64エンコードのみで問題ありません
2. **本番環境**: 必ずAES暗号化を使用してください
3. **キーの管理**: 
   - 環境変数またはAzure Key Vaultを使用
   - ソースコードに直接記述しない
   - 定期的にキーをローテーション

## 参考

- [AES暗号化](https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.aes)
- [Base64エンコード](https://docs.microsoft.com/en-us/dotnet/api/system.convert.tobase64string)
