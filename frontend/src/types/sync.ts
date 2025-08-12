export type SyncStatus = 'synced' | 'syncing' | 'error' | 'pending';

export interface SyncItemStatus {
  status: SyncStatus;
  count: number;
  lastSyncAt: string | null;
  nextSyncAt?: string | null;
  error?: string | null;
}

export interface ActiveSync {
  type: 'all' | 'products' | 'customers' | 'orders';
  progress: number;
  total: number;
  current: number;
  startedAt: string;
}

export interface SyncStatusData {
  products: SyncItemStatus;
  customers: SyncItemStatus;
  orders: SyncItemStatus;
  activeSync?: ActiveSync | null;
  lastFullSyncAt: string | null;
  nextScheduledSyncAt: string | null;
}

export interface SyncHistoryItem {
  id: string;
  type: 'all' | 'products' | 'customers' | 'orders';
  status: 'success' | 'error' | 'warning';
  startedAt: string;
  completedAt: string;
  duration: number; // in milliseconds
  recordsProcessed: number;
  message?: string;
  error?: string;
}

export interface TriggerSyncRequest {
  type: 'all' | 'products' | 'customers' | 'orders';
}

export interface TriggerSyncResponse {
  success: boolean;
  message: string;
  syncId?: string;
}