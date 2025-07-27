import React, { memo, useCallback } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { Eye, Mail, Phone, MapPin } from 'lucide-react'

// =============================================================================
// 型定義
// =============================================================================

export interface CustomerItemProps {
  customer: {
    id: string
    name: string
    email: string
    phone?: string
    status: 'active' | 'inactive' | 'dormant'
    ltv: number
    purchaseCount: number
    lastPurchase?: string
    segment?: string
    location?: string
  }
  isSelected?: boolean
  onSelect?: (customerId: string) => void
  onContact?: (customerId: string, method: 'email' | 'phone') => void
  onViewDetails?: (customerId: string) => void
}

// =============================================================================
// メモ化された顧客アイテム - パフォーマンス最適化
// =============================================================================

/**
 * メモ化された顧客アイテムコンポーネント
 * 
 * React.memoによって顧客データが変更されない限り再レンダリングを防ぐ
 * 大量の顧客リストでのパフォーマンス向上に寄与
 */
export const MemoizedCustomerItem = memo<CustomerItemProps>(({
  customer,
  isSelected = false,
  onSelect,
  onContact,
  onViewDetails
}) => {
  // コールバック関数をメモ化
  const handleSelect = useCallback(() => {
    onSelect?.(customer.id)
  }, [customer.id, onSelect])
  
  const handleContact = useCallback((method: 'email' | 'phone') => {
    onContact?.(customer.id, method)
  }, [customer.id, onContact])
  
  const handleViewDetails = useCallback(() => {
    onViewDetails?.(customer.id)
  }, [customer.id, onViewDetails])
  
  // ステータス表示の最適化
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary' 
      case 'dormant': return 'destructive'
      default: return 'outline'
    }
  }
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'アクティブ'
      case 'inactive': return '非アクティブ'
      case 'dormant': return '休眠'
      default: return status
    }
  }
  
  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  // 日付フォーマット
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未購入'
    return new Date(dateString).toLocaleDateString('ja-JP')
  }
  
  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={handleSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* 顧客基本情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {customer.name}
              </h3>
              <Badge variant={getStatusVariant(customer.status) as any}>
                {getStatusLabel(customer.status)}
              </Badge>
              {customer.segment && (
                <Badge variant="outline">
                  {customer.segment}
                </Badge>
              )}
            </div>
            
            {/* 連絡先情報 */}
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span className="truncate">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{customer.location}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 購入統計 */}
          <div className="text-right space-y-1 mx-4">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(customer.ltv)}
            </div>
            <div className="text-xs text-gray-500">
              {customer.purchaseCount}回購入
            </div>
            <div className="text-xs text-gray-500">
              最終: {formatDate(customer.lastPurchase)}
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="flex flex-col gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleViewDetails()
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
            {customer.email && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleContact('email')
                }}
              >
                <Mail className="h-3 w-3" />
              </Button>
            )}
            {customer.phone && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleContact('phone')
                }}
              >
                <Phone className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

MemoizedCustomerItem.displayName = 'MemoizedCustomerItem'

export default MemoizedCustomerItem