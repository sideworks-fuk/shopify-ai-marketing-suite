"use client"

import { useStore } from '@/contexts/StoreContext'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Store, Loader2 } from 'lucide-react'

interface StoreSelectorProps {
  showDetails?: boolean
}

export function StoreSelector({ showDetails = false }: StoreSelectorProps) {
  const { currentStore, availableStores, switchStore, isLoading } = useStore()

  return (
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">ストア:</span>
      
      <Select
        value={currentStore.id.toString()}
        onValueChange={(value) => switchStore(parseInt(value))}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>切り替え中...</span>
            </div>
          ) : (
            <SelectValue>
              <div className="flex items-center gap-2">
                <span>{currentStore.name}</span>
                <Badge 
                  variant={currentStore.dataType === 'production' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {currentStore.dataType === 'production' ? '本番' : 'テスト'}
                </Badge>
              </div>
            </SelectValue>
          )}
        </SelectTrigger>
        
        <SelectContent>
          {availableStores.map((store) => (
            <SelectItem key={store.id} value={store.id.toString()}>
              <div className="flex items-center justify-between w-full">
                <span>{store.name}</span>
                <Badge 
                  variant={store.dataType === 'production' ? 'default' : 'secondary'}
                  className="ml-2 text-xs"
                >
                  {store.dataType === 'production' ? '本番' : 'テスト'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {store.description}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {showDetails && currentStore && (
        <div className="ml-4 text-sm space-y-1 text-muted-foreground">
          <p>ID: {currentStore.id}</p>
          <p>タイプ: {currentStore.dataType}</p>
        </div>
      )}
    </div>
  )
}