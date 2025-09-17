import { 
  SyncStatusData, 
  SyncHistoryItem, 
  TriggerSyncRequest, 
  TriggerSyncResponse 
} from '@/types/sync';

// Mock data for development
const mockSyncStatus: SyncStatusData = {
  products: {
    status: 'synced',
    count: 1234,
    lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    nextSyncAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
  },
  customers: {
    status: 'syncing',
    count: 5678,
    lastSyncAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    nextSyncAt: null,
  },
  orders: {
    status: 'error',
    count: 9012,
    lastSyncAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    nextSyncAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    error: 'API rate limit exceeded. Retrying in 30 minutes.',
  },
  activeSync: {
    type: 'customers',
    progress: 45.2,
    total: 5678,
    current: 2566,
    startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
  lastFullSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
  nextScheduledSyncAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
};

const mockSyncHistory: SyncHistoryItem[] = [
  {
    id: '1',
    type: 'all',
    status: 'success',
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
    duration: 30 * 60 * 1000, // 30 minutes
    recordsProcessed: 15924,
    message: '全データの同期が正常に完了しました',
  },
  {
    id: '2',
    type: 'products',
    status: 'success',
    startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 11.9 * 60 * 60 * 1000).toISOString(),
    duration: 6 * 60 * 1000, // 6 minutes
    recordsProcessed: 1234,
    message: '商品データの同期が完了しました',
  },
  {
    id: '3',
    type: 'orders',
    status: 'error',
    startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5.95 * 60 * 60 * 1000).toISOString(),
    duration: 3 * 60 * 1000, // 3 minutes
    recordsProcessed: 2500,
    error: 'API rate limit exceeded at record 2500',
  },
  {
    id: '4',
    type: 'customers',
    status: 'warning',
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2.8 * 60 * 60 * 1000).toISOString(),
    duration: 12 * 60 * 1000, // 12 minutes
    recordsProcessed: 5500,
    message: '178件のレコードでデータ検証警告が発生しました',
  },
  {
    id: '5',
    type: 'products',
    status: 'success',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1.95 * 60 * 60 * 1000).toISOString(),
    duration: 3 * 60 * 1000, // 3 minutes
    recordsProcessed: 1234,
  },
];

class SyncApi {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
  private useMockData = false; // Using real backend API now

  async getStatus(): Promise<SyncStatusData> {
    if (this.useMockData) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Randomly update progress for demo
      if (mockSyncStatus.activeSync) {
        mockSyncStatus.activeSync.progress = Math.min(
          100,
          mockSyncStatus.activeSync.progress + Math.random() * 5
        );
        mockSyncStatus.activeSync.current = Math.floor(
          (mockSyncStatus.activeSync.progress / 100) * mockSyncStatus.activeSync.total
        );
        
        // Complete sync if progress reaches 100%
        if (mockSyncStatus.activeSync.progress >= 100) {
          mockSyncStatus.customers.status = 'synced';
          mockSyncStatus.customers.lastSyncAt = new Date().toISOString();
          mockSyncStatus.activeSync = null;
        }
      }
      
      return mockSyncStatus;
    }

    const response = await fetch(`${this.baseUrl}/api/sync/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync status');
    }

    return response.json();
  }

  async getHistory(limit: number = 10): Promise<SyncHistoryItem[]> {
    if (this.useMockData) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockSyncHistory.slice(0, limit);
    }

    const response = await fetch(`${this.baseUrl}/api/sync/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync history');
    }

    return response.json();
  }

  async triggerSync(type: TriggerSyncRequest['type']): Promise<TriggerSyncResponse> {
    if (this.useMockData) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update mock data to show syncing state
      if (type === 'all' || type === 'products') {
        mockSyncStatus.products.status = 'syncing';
      }
      if (type === 'all' || type === 'customers') {
        mockSyncStatus.customers.status = 'syncing';
      }
      if (type === 'all' || type === 'orders') {
        mockSyncStatus.orders.status = 'syncing';
      }
      
      // Set active sync
      mockSyncStatus.activeSync = {
        type,
        progress: 0,
        total: type === 'all' ? 15924 : 
               type === 'products' ? 1234 :
               type === 'customers' ? 5678 : 9012,
        current: 0,
        startedAt: new Date().toISOString(),
      };
      
      return {
        success: true,
        message: `${type === 'all' ? 'すべてのデータ' : 
                  type === 'products' ? '商品データ' :
                  type === 'customers' ? '顧客データ' : '注文データ'}の同期を開始しました`,
        syncId: `sync-${Date.now()}`,
      };
    }

    const response = await fetch(`${this.baseUrl}/api/sync/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ type }),
    });

    if (!response.ok) {
      throw new Error('Failed to trigger sync');
    }

    return response.json();
  }

  async getProgress(type: string = 'all'): Promise<any> {
    if (this.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        status: 'syncing',
        type,
        progressPercentage: Math.random() * 100,
        currentCount: Math.floor(Math.random() * 1000),
        totalCount: 1000,
        estimatedTimeRemaining: Math.floor(Math.random() * 600)
      };
    }

    const response = await fetch(`${this.baseUrl}/api/sync/progress?type=${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync progress');
    }

    return response.json();
  }
}

export const syncApi = new SyncApi();