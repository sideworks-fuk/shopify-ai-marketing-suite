# GDPR 文書参照化プラン（旧 → 正本 対応表）

## 方針
- 正本は `docs/00-production-release/03-gdpr-compliance/*`
- 旧ドキュメントは参照化（内容は正本へ統合し、旧には参照リンクのみ残す）

## 対応表（章レベル）
| 旧 | 正本 | 備考 |
|---|---|---|
| docs/06-shopify/04-GDPR対応/GDPR_Webhook仕様.md#エンドポイント仕様 | 00-production-release/gdpr-compliance/GDPR_Webhook仕様.md#エンドポイント仕様 | 旧は参照化、最新は /api/webhook/... 表記 |
| docs/06-shopify/03-GDPR/実装計画書.md#ddl設計 | 00-production-release/gdpr-compliance/実装計画書.md#ddl設計 | 差分は正本へ吸収 |
| docs/06-shopify/04-GDPR対応/GDPR_Webhook仕様.md#テスト | 00-production-release/gdpr-compliance/GDPR_Webhook仕様.md#テスト方法 | 旧は参照化 |

## 変更点
- /api/webhook/... への表記統一。旧表記 /api/webhooks/... は注記のみ
- 見出しスラッグは既存見出しを尊重（アンカー安定化）

## 次のアクション
- 参照化PRを小分割で作成（各旧ファイルごと）
- 正本側の索引（README等）に参照元を追記
