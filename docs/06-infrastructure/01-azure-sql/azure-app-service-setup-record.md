# Azure App Service 設定記録

## 📋 設定概要
- **作成日**: 2025年7月6日
- **目的**: Shopify AI Marketing Suite 技術検証
- **環境**: 開発環境

---

## 🔧 基本設定

| 設定名 | 設定値 |
| --- | --- |
| **App Service 名** | `ShopifyTestApi20250720173320` |
| **サブスクリプション** | `ShopifyApp` |
| **リソースグループ** | `ShopifyApp (Japan West)` |
| **ホスティングプラン** | `ShopifyTestApi20250720173320Plan*` |
| **リージョン** | `Japan West (西日本)` |
| **価格レベル** | `B1 Basic` |
| **OS** | `Windows` |

---

## 💰 料金情報

| 項目 | 詳細 |
| --- | --- |
| **プラン** | B1 Basic |
| **月額推定コスト** | 約1,900円 |
| **CPU** | 1コア |
| **メモリ** | 1.75GB |
| **ストレージ** | 10GB |

---

## 🌐 アクセス情報

| 項目 | 値 |
| --- | --- |
| **URL** | `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net` |
| **管理URL** | `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.scm.azurewebsites.net` |

## ⚠️ 作成時の問題と解決

| 項目 | 詳細 |
| --- | --- |
| **初回エラー** | Japan East でクォータ制限エラー発生 |
| **エラー内容** | "Quota exceeded for : 0 VMs allowed, 1 VMs requested" |
| **解決方法** | Japan West リージョンに変更して作成成功 |
| **教訓** | リージョンによってクォータ制限が異なる |

---

## 📝 デプロイ情報

### プロジェクト詳細
- **プロジェクト名**: ShopifyTestApi
- **フレームワーク**: .NET 8.0
- **認証**: なし（技術検証用）
- **HTTPS**: 有効
- **Swagger**: 有効

### 追加されたエンドポイント
```csharp
// Health Check API
GET /api/health
GET /api/health/detailed
```

---

## 🔄 次のステップ

1. **デプロイ実行**
   - Visual Studio から発行
   - デプロイ完了を待つ（3-5分）

2. **動作確認**
   - ブラウザでURLにアクセス
   - Swagger UI の確認
   - Health Check API のテスト

3. **データベース接続テスト**
   - API から Azure SQL Database への接続
   - 接続文字列の設定

---

## ⚠️ 注意事項

1. 技術検証用の一時的なリソースです
2. 本番環境では異なる設定を使用してください
3. 検証完了後は削除を検討してください
4. コストは日割り計算されます

---

## 📌 参考リンク
- [Azure SQL Database 設定記録](./azure-sql-setup-record.md)
- [技術検証計画書](../../01-project-management/01-planning/technical-validation-plan.md)

---

*このドキュメントは技術検証用の設定記録です。本番環境では異なる設定を使用してください。* 