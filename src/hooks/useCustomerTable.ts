import { useState, useMemo, useCallback } from "react";
import { CustomerDetail } from "../data/mock/customerData";

// ソート方向の型定義
export type SortDirection = "asc" | "desc";

// ソート可能なカラムの型定義
export type SortableColumn = keyof CustomerDetail;

// カスタムHookの戻り値の型定義
interface UseCustomerTableReturn {
  // 状態
  searchQuery: string;
  sortColumn: SortableColumn;
  sortDirection: SortDirection;
  currentPage: number;
  
  // 計算された値
  filteredCustomers: CustomerDetail[];
  paginatedCustomers: CustomerDetail[];
  totalPages: number;
  
  // アクション関数
  setSearchQuery: (query: string) => void;
  handleSort: (column: SortableColumn) => void;
  handlePageChange: (page: number) => void;
  resetFilters: () => void;
}

// カスタムHookのオプション型定義
interface UseCustomerTableOptions {
  data: CustomerDetail[];
  itemsPerPage?: number;
  selectedSegment?: string;
  initialSortColumn?: SortableColumn;
  initialSortDirection?: SortDirection;
}

/**
 * 顧客テーブルの状態管理とデータ操作を行うカスタムHook
 * @param options - テーブルの設定オプション
 * @returns テーブル操作用の状態と関数
 */
export const useCustomerTable = ({
  data,
  itemsPerPage = 5,
  selectedSegment = "全顧客",
  initialSortColumn = "purchaseCount",
  initialSortDirection = "desc"
}: UseCustomerTableOptions): UseCustomerTableReturn => {
  
  // ローカル状態の管理
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<SortableColumn>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [currentPage, setCurrentPage] = useState<number>(1);

  /**
   * ソート処理を行う関数（メモ化）
   */
  const handleSort = useCallback((column: SortableColumn) => {
    if (sortColumn === column) {
      // 同じカラムがクリックされた場合は方向を切り替え
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // 異なるカラムがクリックされた場合は降順から開始
      setSortColumn(column);
      setSortDirection("desc");
    }
    // ソート変更時はページを1に戻す
    setCurrentPage(1);
  }, [sortColumn, sortDirection]);

  /**
   * ページ変更処理（メモ化）
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /**
   * フィルタリセット処理（メモ化）
   */
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSortColumn(initialSortColumn);
    setSortDirection(initialSortDirection);
    setCurrentPage(1);
  }, [initialSortColumn, initialSortDirection]);

  /**
   * フィルタリングされた顧客データ（メモ化）
   */
  const filteredCustomers = useMemo(() => {
    return data.filter((customer) => {
      // 検索クエリでのフィルタリング
      const matchesSearch = customer.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      
      // セグメントでのフィルタリング
      const matchesSegment = 
        selectedSegment === "全顧客" || customer.status === selectedSegment;
      
      return matchesSearch && matchesSegment;
    });
  }, [data, searchQuery, selectedSegment]);

  /**
   * ソートされた顧客データ（メモ化）
   */
  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // 数値型の比較
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // 文字列型の比較
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [filteredCustomers, sortColumn, sortDirection]);

  /**
   * ページネーションされた顧客データ（メモ化）
   */
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedCustomers.slice(startIndex, endIndex);
  }, [sortedCustomers, currentPage, itemsPerPage]);

  /**
   * 総ページ数（メモ化）
   */
  const totalPages = useMemo(() => {
    return Math.ceil(sortedCustomers.length / itemsPerPage);
  }, [sortedCustomers.length, itemsPerPage]);

  return {
    // 状態
    searchQuery,
    sortColumn,
    sortDirection,
    currentPage,
    
    // 計算された値
    filteredCustomers: sortedCustomers,
    paginatedCustomers,
    totalPages,
    
    // アクション関数
    setSearchQuery,
    handleSort,
    handlePageChange,
    resetFilters,
  };
}; 