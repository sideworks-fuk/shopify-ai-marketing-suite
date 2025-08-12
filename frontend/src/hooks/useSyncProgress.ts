import { useState, useEffect, useCallback, useRef } from 'react';
import { syncApi } from '@/lib/api/sync';
import { SyncStatusData, ActiveSync } from '@/types/sync';

interface SyncProgress {
  dataType: string;
  progressPercentage: number;
  currentCount: number;
  totalCount: number;
  estimatedTimeRemaining?: number;
  startedAt?: string;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  errorMessage?: string;
}

interface UseSyncProgressReturn {
  progress: SyncProgress | undefined;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  refreshProgress: () => Promise<void>;
}

export const useSyncProgress = (
  storeId: string,
  dataType: 'all' | 'products' | 'customers' | 'orders'
): UseSyncProgressReturn => {
  const [progress, setProgress] = useState<SyncProgress>();
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateEstimatedTime = (activeSync: ActiveSync): number => {
    const elapsed = Date.now() - new Date(activeSync.startedAt).getTime();
    const progressRate = activeSync.progress / 100;
    
    if (progressRate === 0) return 0;
    
    const totalEstimated = elapsed / progressRate;
    const remaining = totalEstimated - elapsed;
    
    return Math.max(0, Math.round(remaining / 1000)); // Convert to seconds
  };

  const fetchProgress = useCallback(async () => {
    try {
      const data = await syncApi.getStatus();
      
      // Handle active sync
      if (data.activeSync && 
          (dataType === 'all' || data.activeSync.type === dataType)) {
        const estimatedTime = calculateEstimatedTime(data.activeSync);
        
        setProgress({
          dataType: data.activeSync.type,
          progressPercentage: Math.round(data.activeSync.progress),
          currentCount: data.activeSync.current,
          totalCount: data.activeSync.total,
          estimatedTimeRemaining: estimatedTime,
          startedAt: data.activeSync.startedAt,
          status: 'syncing'
        });
        
        // Stop polling if sync is complete
        if (data.activeSync.progress >= 100) {
          setIsPolling(false);
          setProgress(prev => prev ? { ...prev, status: 'completed' } : undefined);
        }
      } else {
        // Check status of specific data type
        const typeStatus = data[dataType as keyof SyncStatusData];
        
        if (typeStatus && typeof typeStatus === 'object' && 'status' in typeStatus) {
          setProgress({
            dataType,
            progressPercentage: typeStatus.status === 'synced' ? 100 : 0,
            currentCount: typeStatus.count,
            totalCount: typeStatus.count,
            status: typeStatus.status === 'syncing' ? 'syncing' :
                   typeStatus.status === 'synced' ? 'completed' :
                   typeStatus.status === 'error' ? 'error' : 'idle',
            errorMessage: typeStatus.error || undefined
          });
          
          // Stop polling if not syncing
          if (typeStatus.status !== 'syncing') {
            setIsPolling(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch sync progress:', error);
      setProgress(prev => prev ? { 
        ...prev, 
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      } : undefined);
      setIsPolling(false);
    }
  }, [dataType]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refreshProgress = useCallback(async () => {
    await fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    if (!isPolling) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    // Initial fetch
    fetchProgress();
    
    // Set up 30-second polling interval
    intervalRef.current = setInterval(fetchProgress, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPolling, fetchProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { 
    progress, 
    isPolling, 
    startPolling,
    stopPolling,
    refreshProgress
  };
};