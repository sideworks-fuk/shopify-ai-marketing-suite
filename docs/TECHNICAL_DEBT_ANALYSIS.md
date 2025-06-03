# 技術的負債分析レポート - Shopify ECマーケティングアプリ

## エグゼクティブサマリー

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

## 詳細分析結果

### 1. アーキテクチャレベルの問題

#### 1.1 データ層の抽象化不足（High）
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

#### 1.2 ディレクトリ構造の不整合（Medium）
**問題点**：
- `app/`ディレクトリと`components/`ディレクトリの役割が不明確
- ビジネスロジックの配置場所が統一されていない
- ユーティリティ関数の散在

**推奨構造**：
```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── common/            # 共通UIコンポーネント
│   ├── features/          # 機能別コンポーネント
│   └── layouts/           # レイアウトコンポーネント
├── services/              # APIサービス、ビジネスロジック
├── hooks/                 # カスタムフック
├── types/                 # 型定義
├── utils/                 # ユーティリティ関数
└── constants/             # 定数定義
```

### 2. コンポーネントレベルの問題

#### 2.1 重複したKPIカード実装（High）
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

#### 2.2 Props Drillingの問題（Medium）
**問題点**：
- フィルター状態が複数階層を通じて渡されている
- 深いコンポーネント階層での状態管理

**解決策**：
```typescript
// contexts/FilterContext.tsx
interface FilterContextValue {
  dateRange: DateRange;
  categories: string[];
  searchTerm: string;
  updateFilter: (key: string, value: any) => void;
}

export const FilterProvider: React.FC = ({ children }) => {
  // Context実装
};

// hooks/useFilters.ts
export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
};
```

### 3. 型定義の問題

#### 3.1 型定義の重複と不整合（High）
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

### 4. 状態管理の問題

#### 4.1 ローカル状態の過剰使用（Medium）
**問題点**：
- 同じデータを複数のコンポーネントで別々に管理
- グローバルに必要な状態のローカル管理

**解決策**：
```typescript
// stores/customerStore.ts (Zustand使用例)
interface CustomerStore {
  customers: Customer[];
  selectedCustomer: Customer | null;
  filters: CustomerFilters;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  fetchCustomers: (filters?: CustomerFilters) => Promise<void>;
  selectCustomer: (id: string) => void;
  updateFilters: (filters: Partial<CustomerFilters>) => void;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  // 実装
}));
```

### 5. パフォーマンスの問題

#### 5.1 不要な再レンダリング（Medium）
**問題点**：
- メモ化されていないコンポーネント
- インライン関数の多用
- 大きなリストの非効率的なレンダリング

**解決策**：
```typescript
// メモ化の適用
export const CustomerListItem = React.memo(({ customer, onSelect }) => {
  // コンポーネント実装
}, (prevProps, nextProps) => {
  return prevProps.customer.id === nextProps.customer.id;
});

// useCallbackの活用
const handleSelect = useCallback((customerId: string) => {
  // 処理
}, [依存配列]);

// 仮想スクロールの導入
import { FixedSizeList } from 'react-window';
```

### 6. エラーハンドリングの問題

#### 6.1 統一されていないエラー処理（High）
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

## リファクタリングロードマップ

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

## 推奨ツールとライブラリ

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

## 結論

現在のコードベースは基本的な機能は実装されていますが、本格的なAPI連携前に解決すべき技術的負債がいくつか存在します。特に優先すべきは：

1. **データ層の抽象化**：API切り替えの準備
2. **型定義の統一**：保守性の向上
3. **共通コンポーネントの抽出**：重複コードの削減

これらの改善により、将来的な機能追加やメンテナンスが大幅に容易になり、チーム開発の効率も向上します。

---

*最終更新: 2025年5月25日（技術的負債分析レポート）*
*作成者: AI Assistant* 