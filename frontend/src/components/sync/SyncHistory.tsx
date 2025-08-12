import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, Users, ShoppingCart, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { SyncHistoryItem } from '@/types/sync';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SyncHistoryProps {
  items: SyncHistoryItem[];
}

export function SyncHistory({ items }: SyncHistoryProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'products':
        return <Package className="h-4 w-4" />;
      case 'customers':
        return <Users className="h-4 w-4" />;
      case 'orders':
        return <ShoppingCart className="h-4 w-4" />;
      case 'all':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'products':
        return '商品';
      case 'customers':
        return '顧客';
      case 'orders':
        return '注文';
      case 'all':
        return 'すべて';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default' as const;
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'error':
        return 'エラー';
      case 'warning':
        return '警告';
      default:
        return status;
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}秒`;
    } else {
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}分${seconds}秒`;
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        同期履歴がありません
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">日時</TableHead>
            <TableHead className="w-[100px]">種類</TableHead>
            <TableHead className="w-[100px]">ステータス</TableHead>
            <TableHead className="w-[100px] text-right">件数</TableHead>
            <TableHead className="w-[100px] text-right">処理時間</TableHead>
            <TableHead>詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {format(new Date(item.startedAt), 'MM/dd HH:mm', { locale: ja })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getTypeIcon(item.type)}
                  <span className="text-sm">{getTypeLabel(item.type)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(item.status)} className="gap-1">
                  {getStatusIcon(item.status)}
                  {getStatusText(item.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {item.recordsProcessed.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {formatDuration(item.duration)}
              </TableCell>
              <TableCell>
                {item.message && (
                  <span className="text-sm text-muted-foreground">
                    {item.message}
                  </span>
                )}
                {item.error && (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {item.error}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}