import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Users, ShoppingCart, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { SyncItemStatus } from '@/types/sync';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SyncStatusProps {
  type: 'products' | 'customers' | 'orders';
  status: SyncItemStatus;
}

export function SyncStatus({ type, status }: SyncStatusProps) {
  const getIcon = () => {
    switch (type) {
      case 'products':
        return <Package className="h-5 w-5" />;
      case 'customers':
        return <Users className="h-5 w-5" />;
      case 'orders':
        return <ShoppingCart className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'products':
        return '商品データ';
      case 'customers':
        return '顧客データ';
      case 'orders':
        return '注文データ';
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = () => {
    switch (status.status) {
      case 'synced':
        return 'default' as const;
      case 'syncing':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      case 'pending':
        return 'outline' as const;
      default:
        return 'default' as const;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'synced':
        return '同期済み';
      case 'syncing':
        return '同期中';
      case 'error':
        return 'エラー';
      case 'pending':
        return '待機中';
      default:
        return '不明';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle className="text-base">{getTitle()}</CardTitle>
          </div>
          <Badge variant={getStatusBadgeVariant()} className="flex items-center gap-1">
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">件数:</span>
            <span className="font-medium">{status.count.toLocaleString()}件</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">最終同期:</span>
            <span className="font-medium">
              {status.lastSyncAt
                ? formatDistanceToNow(new Date(status.lastSyncAt), {
                    addSuffix: true,
                    locale: ja,
                  })
                : '未実行'}
            </span>
          </div>
          {status.nextSyncAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">次回同期:</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(status.nextSyncAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            </div>
          )}
          {status.error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded text-red-600 dark:text-red-400 text-xs">
              {status.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}