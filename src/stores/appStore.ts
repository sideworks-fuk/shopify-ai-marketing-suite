import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// =============================================================================
// 型定義
// =============================================================================

export type TabType = "sales" | "customers" | "ai" | "purchase"
export type ThemeType = 'light' | 'dark' | 'system'

export interface RecentItem {
  id: string
  type: 'customer' | 'product' | 'order' | 'report'
  name?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface UserPreferences {
  theme: ThemeType
  sidebarCollapsed: boolean
  defaultItemsPerPage: number
  preferredChartType: 'bar' | 'line' | 'pie'
  autoRefreshInterval: number // minutes
}

export interface UIState {
  isLoading: boolean
  isExporting: boolean
  sidebarOpen: boolean
  activeToast: {
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  } | null
}

export interface SelectionState {
  selectedCustomerId: string | null
  selectedProductIds: string[]
  selectedOrderIds: string[]
  lastSelectedType: 'customer' | 'product' | 'order' | null
}

// =============================================================================
// AppStore Interface
// =============================================================================

export interface AppState {
  // 基本状態
  activeTab: TabType
  userPreferences: UserPreferences
  uiState: UIState
  
  // 選択状態
  selectionState: SelectionState
  
  // 共有データ
  recentItems: RecentItem[]
  favoriteReports: string[]
  quickActions: string[]
  
  // =============================================================================
  // UI操作アクション
  // =============================================================================
  
  setActiveTab: (tab: TabType) => void
  setLoading: (loading: boolean) => void
  setExporting: (exporting: boolean) => void
  setSidebarOpen: (open: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
  clearToast: () => void
  
  // =============================================================================
  // 選択状態操作
  // =============================================================================
  
  selectCustomer: (id: string | null) => void
  toggleProductSelection: (id: string) => void
  toggleOrderSelection: (id: string) => void
  clearAllSelections: () => void
  clearSelectionByType: (type: 'customer' | 'product' | 'order') => void
  
  // =============================================================================
  // ユーザー設定操作
  // =============================================================================
  
  setTheme: (theme: ThemeType) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setDefaultItemsPerPage: (count: number) => void
  setPreferredChartType: (type: 'bar' | 'line' | 'pie') => void
  setAutoRefreshInterval: (minutes: number) => void
  
  // =============================================================================
  // 履歴・お気に入り操作
  // =============================================================================
  
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void
  removeRecentItem: (id: string) => void
  clearRecentItems: () => void
  toggleFavoriteReport: (reportId: string) => void
  addQuickAction: (actionId: string) => void
  removeQuickAction: (actionId: string) => void
  
  // =============================================================================
  // ユーティリティアクション
  // =============================================================================
  
  refreshData: () => void
  exportData: () => void
  resetToDefaults: () => void
}

// =============================================================================
// デフォルト値
// =============================================================================

const defaultUserPreferences: UserPreferences = {
  theme: 'light',
  sidebarCollapsed: false,
  defaultItemsPerPage: 10,
  preferredChartType: 'bar',
  autoRefreshInterval: 5
}

const defaultUIState: UIState = {
  isLoading: false,
  isExporting: false,
  sidebarOpen: true,
  activeToast: null
}

const defaultSelectionState: SelectionState = {
  selectedCustomerId: null,
  selectedProductIds: [],
  selectedOrderIds: [],
  lastSelectedType: null
}

// =============================================================================
// AppStore実装
// =============================================================================

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // 初期状態
        activeTab: "sales",
        userPreferences: defaultUserPreferences,
        uiState: defaultUIState,
        selectionState: defaultSelectionState,
        recentItems: [],
        favoriteReports: [],
        quickActions: [],
        
        // =============================================================================
        // UI操作アクション実装
        // =============================================================================
        
        setActiveTab: (tab) =>
          set((state) => {
            state.activeTab = tab
          }),
          
        setLoading: (loading) =>
          set((state) => {
            state.uiState.isLoading = loading
          }),
          
        setExporting: (exporting) =>
          set((state) => {
            state.uiState.isExporting = exporting
          }),
          
        setSidebarOpen: (open) =>
          set((state) => {
            state.uiState.sidebarOpen = open
          }),
          
        showToast: (message, type) =>
          set((state) => {
            state.uiState.activeToast = {
              id: Date.now().toString(),
              message,
              type
            }
          }),
          
        clearToast: () =>
          set((state) => {
            state.uiState.activeToast = null
          }),
        
        // =============================================================================
        // 選択状態操作実装
        // =============================================================================
        
        selectCustomer: (id) =>
          set((state) => {
            state.selectionState.selectedCustomerId = id
            state.selectionState.lastSelectedType = id ? 'customer' : null
            
            // 最近表示したアイテムに追加
            if (id) {
              const existingIndex = state.recentItems.findIndex((item: RecentItem) => 
                item.id === id && item.type === 'customer'
              )
              
              const newItem: RecentItem = {
                id,
                type: 'customer',
                timestamp: new Date().toISOString()
              }
              
              if (existingIndex > -1) {
                // 既存の項目を更新
                state.recentItems[existingIndex] = newItem
              } else {
                // 新規追加（最大10件）
                state.recentItems.unshift(newItem)
                state.recentItems.splice(10)
              }
            }
          }),
          
        toggleProductSelection: (id) =>
          set((state) => {
            const index = state.selectionState.selectedProductIds.indexOf(id)
            if (index > -1) {
              state.selectionState.selectedProductIds.splice(index, 1)
            } else {
              state.selectionState.selectedProductIds.push(id)
            }
            state.selectionState.lastSelectedType = 'product'
          }),
          
        toggleOrderSelection: (id) =>
          set((state) => {
            const index = state.selectionState.selectedOrderIds.indexOf(id)
            if (index > -1) {
              state.selectionState.selectedOrderIds.splice(index, 1)
            } else {
              state.selectionState.selectedOrderIds.push(id)
            }
            state.selectionState.lastSelectedType = 'order'
          }),
          
        clearAllSelections: () =>
          set((state) => {
            state.selectionState.selectedCustomerId = null
            state.selectionState.selectedProductIds = []
            state.selectionState.selectedOrderIds = []
            state.selectionState.lastSelectedType = null
          }),
          
        clearSelectionByType: (type) =>
          set((state) => {
            switch (type) {
              case 'customer':
                state.selectionState.selectedCustomerId = null
                break
              case 'product':
                state.selectionState.selectedProductIds = []
                break
              case 'order':
                state.selectionState.selectedOrderIds = []
                break
            }
            if (state.selectionState.lastSelectedType === type) {
              state.selectionState.lastSelectedType = null
            }
          }),
        
        // =============================================================================
        // ユーザー設定操作実装
        // =============================================================================
        
        setTheme: (theme) =>
          set((state) => {
            state.userPreferences.theme = theme
          }),
          
        setSidebarCollapsed: (collapsed) =>
          set((state) => {
            state.userPreferences.sidebarCollapsed = collapsed
          }),
          
        setDefaultItemsPerPage: (count) =>
          set((state) => {
            state.userPreferences.defaultItemsPerPage = count
          }),
          
        setPreferredChartType: (type) =>
          set((state) => {
            state.userPreferences.preferredChartType = type
          }),
          
        setAutoRefreshInterval: (minutes) =>
          set((state) => {
            state.userPreferences.autoRefreshInterval = minutes
          }),
        
        // =============================================================================
        // 履歴・お気に入り操作実装
        // =============================================================================
        
        addRecentItem: (item: Omit<RecentItem, 'timestamp'>) =>
          set((state) => {
            const newItem: RecentItem = {
              ...item,
              timestamp: new Date().toISOString()
            }
            
            // 重複削除
            const filtered = state.recentItems.filter((existing: RecentItem) => 
              !(existing.id === item.id && existing.type === item.type)
            )
            
            // 先頭に追加（最大10件）
            state.recentItems = [newItem, ...filtered].slice(0, 10)
          }),
          
        removeRecentItem: (id: string) =>
          set((state) => {
            state.recentItems = state.recentItems.filter((item: RecentItem) => item.id !== id)
          }),
          
        clearRecentItems: () =>
          set((state) => {
            state.recentItems = []
          }),
          
        toggleFavoriteReport: (reportId) =>
          set((state) => {
            const index = state.favoriteReports.indexOf(reportId)
            if (index > -1) {
              state.favoriteReports.splice(index, 1)
            } else {
              state.favoriteReports.push(reportId)
            }
          }),
          
        addQuickAction: (actionId) =>
          set((state) => {
            if (!state.quickActions.includes(actionId)) {
              state.quickActions.push(actionId)
            }
          }),
          
        removeQuickAction: (actionId: string) =>
          set((state) => {
            state.quickActions = state.quickActions.filter((id: string) => id !== actionId)
          }),
        
        // =============================================================================
        // ユーティリティアクション実装
        // =============================================================================
        
        refreshData: () =>
          set((state) => {
            state.uiState.isLoading = true
            // 実際のデータ更新処理は各コンポーネントで実装
            setTimeout(() => {
              set((state) => {
                state.uiState.isLoading = false
              })
            }, 1000)
          }),
          
        exportData: () =>
          set((state) => {
            state.uiState.isExporting = true
            // 実際のエクスポート処理は各コンポーネントで実装
            setTimeout(() => {
              set((state) => {
                state.uiState.isExporting = false
              })
            }, 2000)
          }),
          
        resetToDefaults: () =>
          set((state) => {
            state.userPreferences = defaultUserPreferences
            state.uiState = defaultUIState
            state.selectionState = defaultSelectionState
            state.recentItems = []
            state.favoriteReports = []
            state.quickActions = []
          }),
      })),
      {
        name: 'app-storage',
        // 永続化する項目を制限
        partialize: (state) => ({
          userPreferences: state.userPreferences,
          favoriteReports: state.favoriteReports,
          quickActions: state.quickActions,
          recentItems: state.recentItems.slice(0, 10) // 最大10件まで保存
        }),
        // SSR対応: ハイドレーション問題を解決
        onRehydrateStorage: () => (state) => {
          // ハイドレーション完了後の処理
          if (state) {
            console.log('App state hydrated:', state)
          }
        },
      }
    ),
    {
      name: 'app-store', // Redux DevTools での識別名
    }
  )
)

// =============================================================================
// 便利なセレクター
// =============================================================================

// 選択状態のセレクター
export const useSelectionState = () => 
  useAppStore((state) => state.selectionState)

// ユーザー設定のセレクター
export const useUserPreferences = () => 
  useAppStore((state) => state.userPreferences)

// UI状態のセレクター
export const useUIState = () => 
  useAppStore((state) => state.uiState)

// 選択されたアイテム数を取得
export const useSelectedCount = () => 
  useAppStore((state) => {
    const { selectedCustomerId, selectedProductIds, selectedOrderIds } = state.selectionState
    return {
      customers: selectedCustomerId ? 1 : 0,
      products: selectedProductIds.length,
      orders: selectedOrderIds.length,
      total: (selectedCustomerId ? 1 : 0) + selectedProductIds.length + selectedOrderIds.length
    }
  }) 