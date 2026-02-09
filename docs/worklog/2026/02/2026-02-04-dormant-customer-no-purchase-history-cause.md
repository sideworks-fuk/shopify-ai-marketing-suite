# 作業ログ: 休眠顧客「購入履歴なし」誤表示の原因調査・修正

## 作業情報
- 開始日時: 2026-02-04
- 完了日時: 2026-02-04
- 担当: 福田＋AI Assistant

## 作業概要
休眠顧客分析画面で、実際には注文がある顧客（例: 顧客ID 8967186808999）が「購入履歴なし」と表示される事象の原因を調査し、修正した。

## 原因（結論）

**顧客の最終購入日（LastOrderDate）を更新する際に、「ShopifyProcessedAt が NULL の注文」を除外していたため。**

- **ShopifyProcessedAt** は Shopify の「決済完了日時」で、**FinancialStatus が pending の注文では多くの場合 NULL** のまま。
- 該当顧客の注文は status=pending であり、DB 上で `ShopifyProcessedAt` が NULL と想定される。
- そのため「注文はあるが LastOrderDate が更新されない」→ 画面では「購入履歴なし」と表示されていた。

### 該当コード（修正前）

- **ShopifyOrderSyncJob.UpdateCustomerLastOrderDatesAsync**
  - 条件: `o.ShopifyProcessedAt != null` の注文のみで最終購入日を算出していた。
- **DormantCustomerQueryService.GetDormantCustomerByIdAsync**
  - 同様に `o.ShopifyProcessedAt != null` の注文のみから最終購入日を取得していた。

### 他サービスとの整合性

- **CustomerDataMaintenanceService** および **Order モデルの OrderDate** では、  
  `ShopifyProcessedAt ?? ShopifyCreatedAt ?? CreatedAt` のフォールバックで「注文日」を算出している。
- 注文同期ジョブと休眠顧客クエリだけが ProcessedAt 必須になっており、ここが不整合の原因。

## 実施内容

1. 休眠顧客API・フロントの「購入履歴なし」判定経路の確認（Customer.LastOrderDate / TotalOrders / TotalSpent の参照元を追跡）。
2. 注文同期ジョブの `UpdateCustomerLastOrderDatesAsync` の条件を、  
   **注文日 = ShopifyProcessedAt ?? ShopifyCreatedAt ?? CreatedAt** で算出するように変更（Order の OrderDate と同一ロジックに統一）。
3. `DormantCustomerQueryService.GetDormantCustomerByIdAsync` の最終購入日取得を、上記と同じフォールバックで算出するように変更。
4. 既存データの修復: **顧客データメンテナンス**（CustomerDataMaintenanceService の TotalOrders/LastOrderDate 再計算）を実行すると、当該顧客の LastOrderDate も正しく更新される。

## 成果物

- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs` … LastOrderDate 算出条件の修正
- `backend/ShopifyAnalyticsApi/Services/Dormant/DormantCustomerQueryService.cs` … 単一顧客取得時の最終購入日算出の修正
- `frontend/src/components/dashboards/dormant/DormantCustomerList.tsx` … 購入履歴なし判定から totalSpent === 0 を削除
- `frontend/src/components/dashboards/dormant/DormantCustomerTableVirtual.tsx` … 同上
- 本作業ログ

## 補足: Customer テーブルの状態とフロント判定（例: 8967186808999）

該当顧客の実データ例（確認済み）:

- **LastOrderDate**: 2025-02-04 09:38:20（過去の決済済み注文で更新済み）
- **TotalOrders**: 2
- **TotalSpent**: 0.00（未集計や pending 注文のみの場合は 0 のことがある）

**表示が「購入履歴なし」になった理由（二重の要因）**  
1. バックエンド: 注文同期で `ShopifyProcessedAt != null` のみ対象にしていたため、pending 注文で LastOrderDate が更新されないことがあった（上記で修正済み）。  
2. フロント: 「購入履歴なし」判定に `totalSpent === 0` を含めていたため、TotalOrders=2 かつ LastOrderDate ありでも、TotalSpent=0 のときに「購入履歴なし」と表示されていた。

**フロントの修正**: `hasNoPurchaseHistory` から `totalSpent === 0` を削除。  
「購入履歴なし」は **totalOrders === 0** または **lastPurchaseDate が未設定・無効値** の場合のみとし、TotalSpent が 0 でも注文があれば最終購入日を表示するようにした（DormantCustomerList / DormantCustomerTableVirtual の両方）。

## 課題・注意点

- 修正後も、**既に同期済みで LastOrderDate が NULL のままの顧客**、または **LastOrderDate はあるが TotalOrders/TotalSpent が 0 の顧客**は、  
  **「顧客データメンテナンス」の実行**で修復可能（注文の再同期でも LastOrderDate は修復されるが、TotalOrders/TotalSpent はメンテナンスで更新される）。
- 分析上の「注文日」は Order モデルと同様、ProcessedAt 優先・なければ CreatedAt 系で統一する方針を維持。

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs` … Order.OrderDate / ShopifyProcessedAt の定義
- `backend/ShopifyAnalyticsApi/Services/CustomerDataMaintenanceService.cs` … メンテナンス時の注文日算出（参考）
- `frontend/src/components/dashboards/dormant/DormantCustomerList.tsx` … 「購入履歴なし」表示条件
