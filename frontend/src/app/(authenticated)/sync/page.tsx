'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncStatus } from '@/components/sync/SyncStatus';
import { SyncProgress } from '@/components/sync/SyncProgress';
import { SyncTrigger } from '@/components/sync/SyncTrigger';
import { SyncHistory } from '@/components/sync/SyncHistory';
import InitialSyncModal, { SyncConfig } from '@/components/sync/InitialSyncModal';
import { syncApi } from '@/lib/api/sync';
import { SyncStatusData, SyncHistoryItem } from '@/types/sync';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInitialSyncModal, setShowInitialSyncModal] = useState(false);
  const [isFirstSync, setIsFirstSync] = useState(false);
  const [storeId, setStoreId] = useState<string>('default-store');
  
  const { toast } = useToast();
  
  // Use our custom hook for real-time sync progress
  const { 
    progress: allProgress, 
    isPolling: isPollingAll,
    startPolling: startPollingAll,
    stopPolling: stopPollingAll,
    refreshProgress: refreshAllProgress
  } = useSyncProgress(storeId, 'all');
  
  const { 
    progress: productsProgress, 
    isPolling: isPollingProducts,
    startPolling: startPollingProducts
  } = useSyncProgress(storeId, 'products');
  
  const { 
    progress: customersProgress, 
    isPolling: isPollingCustomers,
    startPolling: startPollingCustomers
  } = useSyncProgress(storeId, 'customers');
  
  const { 
    progress: ordersProgress, 
    isPolling: isPollingOrders,
    startPolling: startPollingOrders
  } = useSyncProgress(storeId, 'orders');

  const checkInitialSync = useCallback(() => {
    // Check if this is the first sync (no sync history)
    if (syncHistory.length === 0 && !syncStatus?.lastFullSyncAt) {
      setIsFirstSync(true);
      setShowInitialSyncModal(true);
    }
  }, [syncHistory, syncStatus]);

  const fetchSyncData = async () => {
    try {
      setIsRefreshing(true);
      const [statusData, historyData] = await Promise.all([
        syncApi.getStatus(),
        syncApi.getHistory()
      ]);
      setSyncStatus(statusData);
      setSyncHistory(historyData);
      
      // Check if any sync is active and start polling
      if (statusData.activeSync) {
        const type = statusData.activeSync.type;
        if (type === 'all') startPollingAll();
        else if (type === 'products') startPollingProducts();
        else if (type === 'customers') startPollingCustomers();
        else if (type === 'orders') startPollingOrders();
      }
    } catch (error) {
      console.error('Failed to fetch sync data:', error);
      toast({
        title: 'エラー',
        description: '同期データの取得に失敗しました',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSyncData();
    
    // Auto-refresh every 30 seconds for status data
    const interval = setInterval(fetchSyncData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    checkInitialSync();
  }, [checkInitialSync]);

  const handleManualSync = async (type: 'all' | 'products' | 'customers' | 'orders') => {
    try {
      const response = await syncApi.triggerSync(type);
      
      if (response.success) {
        toast({
          title: '同期開始',
          description: response.message,
        });
        
        // Start polling for the appropriate type
        if (type === 'all') startPollingAll();
        else if (type === 'products') startPollingProducts();
        else if (type === 'customers') startPollingCustomers();
        else if (type === 'orders') startPollingOrders();
      }
      
      // Immediately refresh data after triggering sync
      await fetchSyncData();
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      toast({
        title: 'エラー',
        description: '同期の開始に失敗しました',
        variant: 'destructive'
      });
    }
  };
  
  const handleInitialSyncStart = async (config: SyncConfig) => {
    try {
      // Start initial sync with configured settings
      const response = await syncApi.triggerSync('all');
      
      if (response.success) {
        toast({
          title: '初回同期開始',
          description: `${config.estimatedRecords.toLocaleString()}件のデータ同期を開始しました`,
        });
        
        startPollingAll();
        setShowInitialSyncModal(false);
        await fetchSyncData();
      }
    } catch (error) {
      console.error('Failed to start initial sync:', error);
      toast({
        title: 'エラー',
        description: '初回同期の開始に失敗しました',
        variant: 'destructive'
      });
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

        {/* Active Sync Progress with real-time updates */}
        {(syncStatus?.activeSync || allProgress || productsProgress || customersProgress || ordersProgress) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                同期中
                <RefreshCw className="h-4 w-4 animate-spin" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allProgress && allProgress.status === 'syncing' && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>全データ同期</span>
                      <span>{allProgress.progressPercentage}%</span>
                    </div>
                    <SyncProgress
                      type="all"
                      progress={allProgress.progressPercentage}
                      total={allProgress.totalCount}
                      current={allProgress.currentCount}
                    />
                    {allProgress.estimatedTimeRemaining && (
                      <p className="text-sm text-muted-foreground mt-1">
                        残り時間: 約{Math.ceil(allProgress.estimatedTimeRemaining / 60)}分
                      </p>
                    )}
                  </div>
                )}
                
                {productsProgress && productsProgress.status === 'syncing' && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>商品データ同期</span>
                      <span>{productsProgress.progressPercentage}%</span>
                    </div>
                    <SyncProgress
                      type="products"
                      progress={productsProgress.progressPercentage}
                      total={productsProgress.totalCount}
                      current={productsProgress.currentCount}
                    />
                  </div>
                )}
                
                {customersProgress && customersProgress.status === 'syncing' && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>顧客データ同期</span>
                      <span>{customersProgress.progressPercentage}%</span>
                    </div>
                    <SyncProgress
                      type="customers"
                      progress={customersProgress.progressPercentage}
                      total={customersProgress.totalCount}
                      current={customersProgress.currentCount}
                    />
                  </div>
                )}
                
                {ordersProgress && ordersProgress.status === 'syncing' && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>注文データ同期</span>
                      <span>{ordersProgress.progressPercentage}%</span>
                    </div>
                    <SyncProgress
                      type="orders"
                      progress={ordersProgress.progressPercentage}
                      total={ordersProgress.totalCount}
                      current={ordersProgress.currentCount}
                    />
                  </div>
                )}
                
                {syncStatus?.activeSync && !allProgress && !productsProgress && !customersProgress && !ordersProgress && (
                  <SyncProgress
                    type={syncStatus.activeSync.type}
                    progress={syncStatus.activeSync.progress}
                    total={syncStatus.activeSync.total}
                    current={syncStatus.activeSync.current}
                  />
                )}
              </div>
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
        
        {/* Sync Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>同期ステータスサマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncStatus?.lastFullSyncAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    最終完全同期: {new Date(syncStatus.lastFullSyncAt).toLocaleString('ja-JP')}
                  </span>
                </div>
              )}
              
              {syncStatus?.nextScheduledSyncAt && (
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    次回予定同期: {new Date(syncStatus.nextScheduledSyncAt).toLocaleString('ja-JP')}
                  </span>
                </div>
              )}
              
              {(syncStatus?.orders.status === 'error' || 
                syncStatus?.products.status === 'error' || 
                syncStatus?.customers.status === 'error') && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">
                    エラーが発生しています。詳細は個別のステータスをご確認ください。
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Initial Sync Modal */}
      <InitialSyncModal
        isOpen={showInitialSyncModal}
        onClose={() => setShowInitialSyncModal(false)}
        onStartSync={handleInitialSyncStart}
        isFirstSync={isFirstSync}
        estimatedRecords={50000}
        estimatedTime={120}
      />
    </div>
  );
}