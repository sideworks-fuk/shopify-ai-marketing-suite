'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncStatus } from '@/components/sync/SyncStatus';
import { SyncProgress } from '@/components/sync/SyncProgress';
import { SyncTrigger } from '@/components/sync/SyncTrigger';
import { SyncHistory } from '@/components/sync/SyncHistory';
import { syncApi } from '@/lib/api/sync';
import { SyncStatusData, SyncHistoryItem } from '@/types/sync';
import { RefreshCw } from 'lucide-react';

export default function SyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSyncData = async () => {
    try {
      setIsRefreshing(true);
      const [statusData, historyData] = await Promise.all([
        syncApi.getStatus(),
        syncApi.getHistory()
      ]);
      setSyncStatus(statusData);
      setSyncHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch sync data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSyncData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSyncData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async (type: 'all' | 'products' | 'customers' | 'orders') => {
    try {
      await syncApi.triggerSync(type);
      // Immediately refresh data after triggering sync
      await fetchSyncData();
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">同期ステータス</h1>
        <div className="flex items-center gap-4">
          {isRefreshing && (
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          <SyncTrigger onSync={handleManualSync} />
        </div>
      </div>

      <div className="grid gap-6">
        {/* Sync Status Cards */}
        {syncStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SyncStatus
              type="products"
              status={syncStatus.products}
            />
            <SyncStatus
              type="customers"
              status={syncStatus.customers}
            />
            <SyncStatus
              type="orders"
              status={syncStatus.orders}
            />
          </div>
        )}

        {/* Active Sync Progress */}
        {syncStatus?.activeSync && (
          <Card>
            <CardHeader>
              <CardTitle>同期中</CardTitle>
            </CardHeader>
            <CardContent>
              <SyncProgress
                type={syncStatus.activeSync.type}
                progress={syncStatus.activeSync.progress}
                total={syncStatus.activeSync.total}
                current={syncStatus.activeSync.current}
              />
            </CardContent>
          </Card>
        )}

        {/* Sync History */}
        <Card>
          <CardHeader>
            <CardTitle>同期履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <SyncHistory items={syncHistory} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}