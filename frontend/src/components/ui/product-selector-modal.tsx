'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { SAMPLE_PRODUCTS, PRODUCT_CATEGORIES, getCategoryStyle, type SampleProduct } from '@/lib/sample-products'
import { Search, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProductSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProducts: string[]
  onSelectionChange: (selectedIds: string[]) => void
  title?: string
  description?: string
}

export function ProductSelectorModal({
  isOpen,
  onClose,
  selectedProducts,
  onSelectionChange,
  title = "商品選択",
  description = "分析対象の商品を選択してください"
}: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tempSelected, setTempSelected] = useState<string[]>(selectedProducts)

  // フィルタリング
  const filteredProducts = SAMPLE_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // 全選択/全解除
  const handleSelectAll = () => {
    const filteredIds = filteredProducts.map(p => p.id)
    const allSelected = filteredIds.every(id => tempSelected.includes(id))
    
    if (allSelected) {
      setTempSelected(tempSelected.filter(id => !filteredIds.includes(id)))
    } else {
      const newSelected = [...new Set([...tempSelected, ...filteredIds])]
      setTempSelected(newSelected)
    }
  }

  // 商品選択切替
  const handleProductToggle = (productId: string) => {
    if (tempSelected.includes(productId)) {
      setTempSelected(tempSelected.filter(id => id !== productId))
    } else {
      setTempSelected([...tempSelected, productId])
    }
  }

  // 確定
  const handleConfirm = () => {
    onSelectionChange(tempSelected)
    onClose()
  }

  // キャンセル
  const handleCancel = () => {
    setTempSelected(selectedProducts)
    onClose()
  }

  const filteredIds = filteredProducts.map(p => p.id)
  const isAllSelected = filteredIds.length > 0 && filteredIds.every(id => tempSelected.includes(id))
  const isPartiallySelected = filteredIds.some(id => tempSelected.includes(id)) && !isAllSelected

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 検索・フィルター */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>商品名検索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="商品名を入力..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Label>カテゴリー</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {PRODUCT_CATEGORIES.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 統計・操作 */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {filteredProducts.length}件中 {tempSelected.filter(id => filteredIds.includes(id)).length}件選択
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {isAllSelected ? '全解除' : '全選択'}
            </Button>
          </div>

          {/* 商品リスト */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-2 p-4">
                {filteredProducts.map(product => {
                  const categoryStyle = getCategoryStyle(product.category)
                  const isSelected = tempSelected.includes(product.id)
                  
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleProductToggle(product.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${categoryStyle.bgColor} ${categoryStyle.textColor} border-0`}>
                            {categoryStyle.name}
                          </Badge>
                          <span className="font-medium">{product.name}</span>
                        </div>
                        {product.price && (
                          <div className="text-sm text-muted-foreground mt-1">
                            ¥{product.price.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 選択中商品の表示 */}
          {tempSelected.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <Label className="text-sm font-medium">選択中の商品 ({tempSelected.length}件)</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {tempSelected.map(id => {
                  const product = SAMPLE_PRODUCTS.find(p => p.id === id)
                  if (!product) return null
                  
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-300"
                      onClick={() => handleProductToggle(id)}
                    >
                      {product.name}
                      <span className="ml-1 text-xs">×</span>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm}>
            確定 ({tempSelected.length}件選択)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 