import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Package, Users, ShoppingCart, Loader2 } from 'lucide-react';

interface SyncProgressProps {
  type: 'all' | 'products' | 'customers' | 'orders';
  progress: number;
  total: number;
  current: number;
}

export function SyncProgress({ type, progress, total, current }: SyncProgressProps) {
  const getIcon = () => {
    switch (type) {
      case 'products':
        return <Package className="h-4 w-4" />;
      case 'customers':
        return <Users className="h-4 w-4" />;
      case 'orders':
        return <ShoppingCart className="h-4 w-4" />;
      case 'all':
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'products':
        return '商品データを同期中';
      case 'customers':
        return '顧客データを同期中';
      case 'orders':
        return '注文データを同期中';
      case 'all':
        return 'すべてのデータを同期中';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-medium">{getLabel()}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {current.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.toFixed(1)}% 完了</span>
          <span>残り {(total - current).toLocaleString()} 件</span>
        </div>
      </div>

      {progress > 0 && (
        <div className="text-xs text-muted-foreground">
          推定残り時間: {estimateRemainingTime(current, total, progress)}
        </div>
      )}
    </div>
  );
}

function estimateRemainingTime(current: number, total: number, progress: number): string {
  if (progress === 0 || current === 0) return '計算中...';
  
  const remaining = total - current;
  const rate = current / (progress / 100);
  const secondsRemaining = Math.round(remaining / rate * 60);
  
  if (secondsRemaining < 60) {
    return `${secondsRemaining}秒`;
  } else if (secondsRemaining < 3600) {
    const minutes = Math.round(secondsRemaining / 60);
    return `${minutes}分`;
  } else {
    const hours = Math.round(secondsRemaining / 3600);
    return `${hours}時間`;
  }
}