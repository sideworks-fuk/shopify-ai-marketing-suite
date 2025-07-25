# 🔧 技術的負債分析・改善ガイド

## 📋 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [詳細分析結果](#詳細分析結果)
3. [リファクタリングロードマップ](#リファクタリングロードマップ)
4. [改善手順](#改善手順)
5. [実行チェックリスト](#実行チェックリスト)

---

## 📊 エグゼクティブサマリー

### 発見された主要な問題
- **Critical**: 0件
- **High**: 5件（データ層の抽象化不足、型定義の不整合など）
- **Medium**: 8件（コンポーネントの重複、状態管理の分散など）
- **Low**: 6件（コードスタイル、命名規則の不統一など）

### 推奨アクションプラン
1. **即座に対応すべき事項**：データサービス層の完全な抽象化
2. **API実装前に対応**：型定義の統一、共通コンポーネントの抽出
3. **段階的改善**：状態管理の最適化、パフォーマンスチューニング

---

## 📈 技術的負債改善状況

### 概要
詳細な技術的負債分析を実施し、Critical 0件、High 5件、Medium 8件、Low 6件の問題を特定しました。

### 改善完了状況
- **重複ファイル解消**: ✅ 完了 - UI部品を `src/components/ui/` に集約済み
- **大規模コンポーネント分割**: 🟡 進行中 - サブディレクトリ分割実施中
- **ハードコードデータ分離**: ✅ 完了 - `src/data/mock/` に集約済み
- **パフォーマンス最適化**: 🟡 進行中 - React.memo等を積極活用

---

## 🔍 詳細分析結果

### 1. アーキテクチャレベルの問題

#### 1.1 データ層の抽象化不足（High Priority）
**問題点**：
- 各コンポーネントで直接モックデータをインポートしている
- API切り替えの準備が不十分
- データ取得ロジックがUIコンポーネントに混在

**該当ファイル**：
- `components/analytics/f-hierarchy-trend/FHierarchyTrendChart.tsx`
- `components/analytics/customer-purchase/CustomerList.tsx`
- 他多数のコンポーネント

**解決策**：
```typescript
// services/dataService.ts の完全実装
interface IDataService {
  getCustomers(filters: CustomerFilters): Promise<CustomerResponse>;
  getFHierarchyData(params: FHierarchyParams): Promise<FHierarchyData>;
  // 他のメソッド
}

class DataService implements IDataService {
  private useMockData = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  
  async getCustomers(filters: CustomerFilters) {
    if (this.useMockData) {
      return mockCustomerService.getCustomers(filters);
    }
    return apiCustomerService.getCustomers(filters);
  }
}
```

#### 1.2 重複したKPIカード実装（High Priority）
**問題点**：
- 各画面で独自のKPIカード実装
- スタイルとロジックの重複
- 一貫性のないデザイン

**該当箇所**：
- 売上ダッシュボード
- 顧客購買画面
- F階層傾向画面

**解決策**：
```typescript
// components/common/KPICard.tsx
interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  loading?: boolean;
  error?: Error;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  change,
  icon,
  loading,
  error
}) => {
  // 統一された実装
};
```

### 2. 型定義の問題

#### 2.1 型定義の重複と不整合（High Priority）
**問題点**：
- 同じデータ構造に対する複数の型定義
- `any`型の使用
- オプショナルプロパティの不適切な使用

**例**：
```typescript
// 現状の問題
// types/customer.ts
interface Customer {
  id: string;
  name?: string; // 本当にオプショナル？
  email: any;    // any型の使用
}

// components/CustomerList.tsx
type CustomerData = {
  id: number;  // string vs number の不整合
  name: string;
  email: string;
};
```

**解決策**：
```typescript
// types/models/customer.ts
export interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  // 他のプロパティ
}

// types/api/responses.ts
export interface CustomerListResponse {
  data: Customer[];
  pagination: Pagination;
  meta: ResponseMeta;
}
```

### 3. エラーハンドリングの問題

#### 3.1 統一されていないエラー処理（High Priority）
**問題点**：
- エラー表示の不統一
- エラーバウンダリの欠如
- API エラーの適切な処理不足

**解決策**：
```typescript
// components/common/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  // 実装
}

// hooks/useApiError.ts
export const useApiError = () => {
  const [error, setError] = useState<ApiError | null>(null);
  
  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      setError(error);
      // トースト通知など
    }
  }, []);
  
  return { error, handleError, clearError };
};
```

---

## 🚀 リファクタリングロードマップ

### Phase 1: 基盤整備（1-2週間）
1. **データサービス層の完全実装**
   - すべてのAPI呼び出しをDataService経由に統一
   - モック/実APIの切り替え機構実装
   
2. **型定義の統一**
   - 重複した型定義の削除
   - 厳密な型付け（strict mode有効化）
   - API レスポンス型の定義

3. **エラーハンドリングの統一**
   - グローバルエラーハンドラーの実装
   - エラーバウンダリの設置

### Phase 2: コンポーネント最適化（2-3週間）
1. **共通コンポーネントの抽出**
   - KPICard
   - DataTable
   - FilterBar
   - LoadingState
   - EmptyState

2. **状態管理の最適化**
   - Zustand or Redux Toolkitの導入
   - Context APIの適切な活用
   - グローバル状態とローカル状態の整理

3. **パフォーマンス改善**
   - React.memoの適用
   - useMemo/useCallbackの活用
   - コード分割とLazy loading

### Phase 3: 品質向上（継続的）
1. **テストの追加**
   - ユニットテスト（Jest + React Testing Library）
   - 統合テスト
   - E2Eテスト（Cypress or Playwright）

2. **ドキュメントの整備**
   - コンポーネントのStorybook化
   - API ドキュメント
   - アーキテクチャドキュメント

3. **CI/CDの強化**
   - 自動テスト
   - コード品質チェック
   - パフォーマンス監視

---

## 🔄 改善手順

### 🔴 重複ファイル解消手順

#### 現状
- UI部品は `src/components/ui/` に集約済み。
- インポートパスは `@/components/ui/` で統一。
- 旧来の重複ディレクトリ・ファイルは削除済み。

#### チェックリスト
- [x] 重複ファイルリストの作成
- [x] インポートパスの調査・修正
- [x] 重複ディレクトリの削除
- [x] ビルドテストの成功
- [ ] 本番環境でのテスト

### 🟡 大規模コンポーネント分割手順

#### 現状
- `src/components/dashboards/` 配下でサブディレクトリ分割（`customers/`, `sales/`, `dormant/`等）を推進。
- 1000行超の大規模ファイルは段階的に分割中。
- サブコンポーネント・カスタムフック（例: `useCustomerTable.ts`）を抽出。

#### チェックリスト
- [x] 分割計画の策定
- [x] カスタムフックの抽出
- [x] サブコンポーネントの作成
- [~] メインコンポーネントの簡素化
- [~] 型定義の整備
- [ ] テストの作成

### 🟡 ハードコードデータ分離手順

#### 現状
- モックデータは `src/data/mock/customerData.ts` に集約。
- 型定義も同ファイルで一元管理。
- DataService/ShopifyAPIで開発/本番切替が可能。

#### チェックリスト
- [x] モックデータディレクトリの作成
- [x] モックデータファイルの作成
- [x] データプロバイダーの実装
- [x] 環境変数の設定
- [ ] 開発/本番環境での動作確認

### 🟢 パフォーマンス最適化手順

#### 現状
- 動的インポート（Next.js dynamic）・React.memo等を積極活用。
- サブコンポーネント単位でメモ化・useMemo/useCallbackを適用。

#### チェックリスト
- [x] React.memoの適用
- [x] useMemo / useCallbackの適用
- [x] 動的インポートの追加
- [ ] 大規模リストの仮想化

---

## 📋 ベストプラクティス

- UI部品は `src/components/ui/` に集約し、再利用性・保守性を高める
- サブディレクトリ分割・型安全性・モックデータ管理を徹底
- コードレビュー時は重複・ハードコード・粒度・パフォーマンスを重点確認
- DataService/ShopifyAPIの役割分担を明確化し、API/データ層の責務を分離

---

## 🛠️ 推奨ツールとライブラリ

### 状態管理
- **Zustand**: シンプルで軽量な状態管理
- 代替: Redux Toolkit（より複雑な要件の場合）

### データフェッチング
- **SWR**: データフェッチングとキャッシング
- 代替: React Query（より高度な機能が必要な場合）

### 開発ツール
- **TypeScript**: strict modeを有効化
- **ESLint + Prettier**: コード品質の統一
- **Husky + lint-staged**: コミット前チェック

### テスト
- **Jest + React Testing Library**: ユニットテスト
- **MSW**: APIモック
- **Cypress**: E2Eテスト

---

## ✅ 実行チェックリスト

### 重複ファイル解消完了チェック
- [x] 重複ファイルリストの作成
- [x] インポートパスの調査・修正
- [x] 重複ディレクトリの削除
- [x] ビルドテストの成功
- [ ] 本番環境でのテスト

### コンポーネント分割完了チェック
- [x] 分割計画の策定
- [x] カスタムフックの抽出
- [x] サブコンポーネントの作成
- [~] メインコンポーネントの簡素化
- [~] 型定義の整備
- [ ] テストの作成

### データ分離完了チェック
- [x] モックデータディレクトリの作成
- [x] モックデータファイルの作成
- [x] データプロバイダーの実装
- [x] 環境変数の設定
- [ ] 開発/本番環境での動作確認

### 技術的負債対応チェック（新規）
- [ ] DataService完全実装
- [ ] 共通KPICard作成
- [ ] 型定義統一（types/models/作成）
- [ ] ErrorBoundary実装
- [ ] 状態管理最適化（Zustand検討）

---

## 🚨 優先対応タスク

### 即座に対応（今週中）
1. **DataService完全実装**
   ```typescript
   // services/dataService.ts
   interface IDataService {
     getCustomers(filters: CustomerFilters): Promise<CustomerResponse>;
     // 他のメソッド
   }
   ```

2. **共通KPICard作成**
   ```typescript
   // components/common/KPICard.tsx
   interface KPICardProps {
     title: string;
     value: string | number;
     change?: ChangeData;
     // 他のプロパティ
   }
   ```

### API実装前に対応（来週）
1. **型定義統一**
   - `types/models/` ディレクトリ作成
   - 重複型定義の削除
   - strict mode有効化

2. **エラーハンドリング統一**
   - ErrorBoundary実装
   - グローバルエラーハンドラー

### 段階的対応（今月中）
1. **状態管理最適化**
   - Zustand導入検討
   - Props Drilling解消

2. **パフォーマンス改善**
   - 仮想スクロール導入
   - メモ化強化

---

## 📊 結論

現在のコードベースは基本的な機能は実装されていますが、本格的なAPI連携前に解決すべき技術的負債がいくつか存在します。特に優先すべきは：

1. **データ層の抽象化**：API切り替えの準備
2. **型定義の統一**：保守性の向上
3. **共通コンポーネントの抽出**：重複コードの削減

これらの改善により、将来的な機能追加やメンテナンスが大幅に容易になり、チーム開発の効率も向上します。

---

*最終更新: 2025年6月16日（統合版）*
*作成者: AI Assistant*
*次回レビュー: 月次* 