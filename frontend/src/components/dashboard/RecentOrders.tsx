import React from 'react';
import { Badge } from '@/components/ui/badge';

interface Order {
  id: string;
  customer: string;
  total: number;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled';
  date: string;
  items: number;
}

interface RecentOrdersProps {
  orders: Order[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}分前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}日前`;
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { label: '保留中', variant: 'secondary' as const },
      processing: { label: '処理中', variant: 'default' as const },
      fulfilled: { label: '完了', variant: 'outline' as const },
      cancelled: { label: 'キャンセル', variant: 'destructive' as const },
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">
                    {order.customer}
                  </p>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs text-gray-500">
                    {order.id}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {order.items} 商品
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {formatDate(order.date)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>
      ))}
      
      {orders.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">注文データがありません</p>
        </div>
      )}
    </div>
  );
}