/**
 * LocalStorage変数マイグレーションユーティリティ
 * 
 * @author YUKI & Kenji
 * @date 2025-08-13
 * @description LocalStorage変数の統一と移行を管理 - Phase 2完全移行
 */

const MIGRATION_PHASE2_KEY = 'localStorageMigrationPhase2Completed';

/**
 * LocalStorage変数のマイグレーションを実行
 * selectedStoreId → currentStoreIdへの移行
 */
export function migrateLocalStorageVariables(): void {
  if (typeof window === 'undefined') return;

  try {
    // Phase 2移行が完了済みかチェック
    const phase2Completed = localStorage.getItem(MIGRATION_PHASE2_KEY);
    if (phase2Completed === 'true') {
      return; // 既に移行済み
    }

    // selectedStoreId → currentStoreId への移行
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    const currentStoreId = localStorage.getItem('currentStoreId');
    
    if (selectedStoreId && !currentStoreId) {
      // selectedStoreIdがあり、currentStoreIdがない場合は移行
      localStorage.setItem('currentStoreId', selectedStoreId);
      console.log('✅ LocalStorage移行: selectedStoreId → currentStoreId');
    }

    // Phase 2: 自動クリーンアップを実行
    cleanupDeprecatedVariables();
    
    // 移行完了マーカーを設定
    localStorage.setItem(MIGRATION_PHASE2_KEY, 'true');
    console.log('✅ LocalStorage Phase 2移行完了');
    
  } catch (error) {
    console.error('LocalStorageマイグレーションエラー:', error);
  }
}

/**
 * 廃止予定のLocalStorage変数をクリーンアップ
 * 注意: 十分な移行期間後に実行すること
 */
export function cleanupDeprecatedVariables(): void {
  if (typeof window === 'undefined') return;

  try {
    // 廃止予定の変数を削除
    const deprecatedVariables = [
      'selectedStoreId',      // currentStoreIdに統一
      'currentShopDomain',    // 現在使用されていない
    ];

    deprecatedVariables.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        console.log(`🗑️ LocalStorage変数削除: ${key}`);
      }
    });
    
  } catch (error) {
    console.error('LocalStorageクリーンアップエラー:', error);
  }
}

/**
 * 現在のLocalStorage状態をデバッグ出力
 */
export function debugLocalStorageState(): void {
  if (typeof window === 'undefined') return;

  const relevantKeys = [
    'currentStoreId',
    'selectedStoreId',
    'currentShopDomain',
    'accessToken',
    'refreshToken'
  ];

  console.group('📦 LocalStorage状態');
  relevantKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      // トークンは一部のみ表示
      const displayValue = key.includes('Token') 
        ? `${value.substring(0, 20)}...` 
        : value;
      console.log(`${key}: ${displayValue}`);
    }
  });
  console.groupEnd();
}

// 開発環境でのデバッグヘルパー
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).localStorageMigration = {
    migrate: migrateLocalStorageVariables,
    cleanup: cleanupDeprecatedVariables,
    debug: debugLocalStorageState
  };
}