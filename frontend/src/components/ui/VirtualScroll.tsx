/**
 * 仮想スクロールコンポーネント
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description 大量データを効率的に表示するための仮想スクロール実装
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  scrollToIndex?: number;
  estimatedItemHeight?: number; // 可変高さの場合の推定値
}

interface ItemPosition {
  index: number;
  offset: number;
  height: number;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
  scrollToIndex,
  estimatedItemHeight = 50,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const itemPositionsRef = useRef<ItemPosition[]>([]);
  const isVariableHeight = typeof itemHeight === 'function';

  // アイテムの位置情報を計算（可変高さ対応）
  const calculateItemPositions = useCallback(() => {
    const positions: ItemPosition[] = [];
    let offset = 0;

    for (let i = 0; i < items.length; i++) {
      const height = isVariableHeight 
        ? (itemHeight as (index: number) => number)(i)
        : itemHeight as number;
      
      positions.push({
        index: i,
        offset,
        height,
      });
      
      offset += height;
    }

    itemPositionsRef.current = positions;
    return positions;
  }, [items.length, itemHeight, isVariableHeight]);

  // 可視範囲のアイテムを計算
  const visibleRange = useMemo(() => {
    const positions = isVariableHeight ? calculateItemPositions() : itemPositionsRef.current;
    
    if (!isVariableHeight && positions.length === 0) {
      // 固定高さの場合の簡易計算
      const fixedHeight = itemHeight as number;
      const startIndex = Math.max(0, Math.floor(scrollTop / fixedHeight) - overscan);
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / fixedHeight) + overscan
      );
      
      return { startIndex, endIndex, totalHeight: items.length * fixedHeight };
    }

    // 可変高さの場合の計算
    let startIndex = 0;
    let endIndex = items.length - 1;
    let totalHeight = 0;

    // バイナリサーチで開始インデックスを見つける
    let low = 0;
    let high = positions.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midPos = positions[mid];
      
      if (midPos.offset + midPos.height < scrollTop - overscan * estimatedItemHeight) {
        low = mid + 1;
      } else if (midPos.offset > scrollTop - overscan * estimatedItemHeight) {
        high = mid - 1;
      } else {
        startIndex = mid;
        break;
      }
    }
    
    startIndex = Math.max(0, low - overscan);

    // 終了インデックスを見つける
    for (let i = startIndex; i < positions.length; i++) {
      const pos = positions[i];
      if (pos.offset > scrollTop + containerHeight + overscan * estimatedItemHeight) {
        endIndex = i;
        break;
      }
    }

    // 総高さを計算
    if (positions.length > 0) {
      const lastPos = positions[positions.length - 1];
      totalHeight = lastPos.offset + lastPos.height;
    }

    return { startIndex, endIndex: Math.min(endIndex + overscan, items.length - 1), totalHeight };
  }, [scrollTop, containerHeight, items.length, itemHeight, overscan, isVariableHeight, calculateItemPositions, estimatedItemHeight]);

  // スクロールハンドラー
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // 特定のインデックスへスクロール
  useEffect(() => {
    if (scrollToIndex !== undefined && scrollElementRef.current) {
      if (!isVariableHeight) {
        const offset = scrollToIndex * (itemHeight as number);
        scrollElementRef.current.scrollTop = offset;
      } else {
        const positions = calculateItemPositions();
        if (positions[scrollToIndex]) {
          scrollElementRef.current.scrollTop = positions[scrollToIndex].offset;
        }
      }
    }
  }, [scrollToIndex, itemHeight, isVariableHeight, calculateItemPositions]);

  // 可視アイテムのレンダリング
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const visibleItemsList = [];

    for (let i = startIndex; i <= endIndex; i++) {
      if (i < items.length) {
        const item = items[i];
        let top = 0;
        let height = 0;

        if (!isVariableHeight) {
          height = itemHeight as number;
          top = i * height;
        } else {
          const positions = itemPositionsRef.current;
          if (positions[i]) {
            top = positions[i].offset;
            height = positions[i].height;
          }
        }

        visibleItemsList.push(
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: 0,
              right: 0,
              height: `${height}px`,
            }}
          >
            {renderItem(item, i)}
          </div>
        );
      }
    }

    return visibleItemsList;
  }, [items, visibleRange, renderItem, itemHeight, isVariableHeight]);

  return (
    <div
      ref={scrollElementRef}
      onScroll={handleScroll}
      className={cn(
        "relative overflow-auto",
        className
      )}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: visibleRange.totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

// テーブル用の仮想スクロール
interface VirtualTableProps<T> {
  items: T[];
  columns: {
    key: string;
    header: string;
    render: (item: T) => React.ReactNode;
    width?: string;
  }[];
  itemHeight?: number;
  containerHeight: number;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  onRowClick?: (item: T, index: number) => void;
}

export function VirtualTable<T>({
  items,
  columns,
  itemHeight = 48,
  containerHeight,
  className,
  headerClassName,
  rowClassName,
  onRowClick,
}: VirtualTableProps<T>) {
  const headerHeight = 48;
  const scrollContainerHeight = containerHeight - headerHeight;

  const renderRow = useCallback((item: T, index: number) => {
    const rowClass = typeof rowClassName === 'function' 
      ? rowClassName(item, index)
      : rowClassName;

    return (
      <div
        className={cn(
          "flex items-center border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer",
          rowClass
        )}
        onClick={() => onRowClick?.(item, index)}
        style={{ height: itemHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ width: column.width || `${100 / columns.length}%` }}
          >
            {column.render(item)}
          </div>
        ))}
      </div>
    );
  }, [columns, itemHeight, rowClassName, onRowClick]);

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden", className)}>
      {/* ヘッダー */}
      <div
        className={cn(
          "flex items-center bg-gray-50 border-b border-gray-200 font-medium",
          headerClassName
        )}
        style={{ height: headerHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 text-left"
            style={{ width: column.width || `${100 / columns.length}%` }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* 仮想スクロール本体 */}
      <VirtualScroll
        items={items}
        itemHeight={itemHeight}
        containerHeight={scrollContainerHeight}
        renderItem={renderRow}
        className="bg-white"
      />
    </div>
  );
}

// パフォーマンス測定フック
export function useVirtualScrollPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current++;
    const currentTime = performance.now();
    const renderTime = currentTime - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [${componentName}] Virtual Scroll Render #${renderCount.current} - ${renderTime.toFixed(2)}ms`);
    }
    
    lastRenderTime.current = currentTime;
  });
  
  return {
    renderCount: renderCount.current,
    measureScrollPerformance: (callback: () => void) => {
      const startTime = performance.now();
      callback();
      const endTime = performance.now();
      console.log(`📊 [${componentName}] Scroll operation took ${(endTime - startTime).toFixed(2)}ms`);
    }
  };
}