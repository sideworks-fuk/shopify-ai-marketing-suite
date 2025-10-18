import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { syncApi } from '@/lib/api/sync';
import { SyncStatusData } from '@/types/sync';
import { 
  RefreshCw, 
  Database, 
  Users, 
  ShoppingCart, 
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface SyncStatusWidgetProps {
  compact?: boolean;
  onSyncTrigger?: (type: 'all' | 'products' | 'customers' | 'orders') => void;
}

export const SyncStatusWidget: React.FC<SyncStatusWidgetProps> = ({ 
  compact = false,
  onSyncTrigger 
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true);
      const data = await syncApi.getStatus();
      setSyncStatus(data);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleQuickSync = async (type: 'all' | 'products' | 'customers' | 'orders') => {
    if (onSyncTrigger) {
      onSyncTrigger(type);
    } else {
      try {
        await syncApi.triggerSync(type);
        await fetchStatus();
      } catch (error) {
        console.error('Failed to trigger sync:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-500 text-white">同期済み</Badge>;
      case 'syncing':
        return <Badge variant="default" className="bg-blue-500">同期中</Badge>;
      case 'error':
        return <Badge variant="destructive">エラー</Badge>;
      default:
        return <Badge variant="secondary">待機中</Badge>;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return `${Math.floor(hours / 24)}日前`;
    } else if (hours > 0) {
      return `${hours}時間前`;
    } else {
      return `${minutes}分前`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">同期ステータス</CardTitle>
            {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {syncStatus?.activeSync ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {syncStatus.activeSync.type === 'all' ? '全データ' :
                   syncStatus.activeSync.type === 'products' ? '商品' :
                   syncStatus.activeSync.type === 'customers' ? '顧客' : '注文'}
                  同期中
                </span>
                <span>{Math.round(syncStatus.activeSync.progress)}%</span>
              </div>
              <Progress value={syncStatus.activeSync.progress} className="h-1.5" />
              <div className="text-xs text-muted-foreground">
                {syncStatus.activeSync.current.toLocaleString()} / {syncStatus.activeSync.total.toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  <span className="text-xs">商品</span>
                </div>
                {getStatusIcon(syncStatus?.products.status || 'pending')}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">顧客</span>
                </div>
                {getStatusIcon(syncStatus?.customers.status || 'pending')}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="text-xs">注文</span>
                </div>
                {getStatusIcon(syncStatus?.orders.status || 'pending')}
              </div>
            </div>
          )}
          
          <div className="pt-2 flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs"
              onClick={() => handleQuickSync('all')}
              disabled={!!syncStatus?.activeSync}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              同期
            </Button>
            <Link href="/sync" className="flex-1">
              <Button size="sm" variant="ghost" className="w-full text-xs">
                詳細
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>データ同期ステータス</CardTitle>
          <div className="flex items-center gap-2">
            {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Link href="/sync">
              <Button size="sm" variant="outline">
                同期管理
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {syncStatus?.activeSync ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="font-medium">
                    {syncStatus.activeSync.type === 'all' ? '全データ' :
                     syncStatus.activeSync.type === 'products' ? '商品データ' :
                     syncStatus.activeSync.type === 'customers' ? '顧客データ' : '注文データ'}
                    を同期中
                  </span>
                </div>
                <span className="text-sm font-medium">{Math.round(syncStatus.activeSync.progress)}%</span>
              </div>
              <Progress value={syncStatus.activeSync.progress} className="mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{syncStatus.activeSync.current.toLocaleString()} / {syncStatus.activeSync.total.toLocaleString()} 件</span>
                <span>開始: {formatTime(syncStatus.activeSync.startedAt)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">商品</span>
                </div>
                {getStatusBadge(syncStatus?.products.status || 'pending')}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>件数:</span>
                  <span>{syncStatus?.products.count.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>最終同期:</span>
                  <span>{formatTime(syncStatus?.products.lastSyncAt || null)}</span>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleQuickSync('products')}
                disabled={syncStatus?.products.status === 'syncing'}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                同期
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">顧客</span>
                </div>
                {getStatusBadge(syncStatus?.customers.status || 'pending')}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>件数:</span>
                  <span>{syncStatus?.customers.count.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>最終同期:</span>
                  <span>{formatTime(syncStatus?.customers.lastSyncAt || null)}</span>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleQuickSync('customers')}
                disabled={syncStatus?.customers.status === 'syncing'}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                同期
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">注文</span>
                </div>
                {getStatusBadge(syncStatus?.orders.status || 'pending')}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>件数:</span>
                  <span>{syncStatus?.orders.count.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>最終同期:</span>
                  <span>{formatTime(syncStatus?.orders.lastSyncAt || null)}</span>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleQuickSync('orders')}
                disabled={syncStatus?.orders.status === 'syncing'}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                同期
              </Button>
            </div>
          </div>
        )}

        {syncStatus?.lastFullSyncAt && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>最終完全同期: {formatTime(syncStatus.lastFullSyncAt)}</span>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => handleQuickSync('all')}
              disabled={!!syncStatus?.activeSync}
            >
              全データ同期
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};