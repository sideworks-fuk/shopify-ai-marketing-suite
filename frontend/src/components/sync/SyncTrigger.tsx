import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Package, Users, ShoppingCart, ChevronDown, Loader2 } from 'lucide-react';

interface SyncTriggerProps {
  onSync: (type: 'all' | 'products' | 'customers' | 'orders') => Promise<void>;
}

export function SyncTrigger({ onSync }: SyncTriggerProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingType, setSyncingType] = useState<string | null>(null);

  const handleSync = async (type: 'all' | 'products' | 'customers' | 'orders') => {
    setIsSyncing(true);
    setSyncingType(type);
    try {
      await onSync(type);
    } finally {
      setIsSyncing(false);
      setSyncingType(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          手動同期
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>同期対象を選択</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleSync('all')}
          disabled={isSyncing}
          className="gap-2"
        >
          {syncingType === 'all' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          すべて同期
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleSync('products')}
          disabled={isSyncing}
          className="gap-2"
        >
          {syncingType === 'products' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          商品データのみ
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleSync('customers')}
          disabled={isSyncing}
          className="gap-2"
        >
          {syncingType === 'customers' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          顧客データのみ
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleSync('orders')}
          disabled={isSyncing}
          className="gap-2"
        >
          {syncingType === 'orders' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          注文データのみ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}