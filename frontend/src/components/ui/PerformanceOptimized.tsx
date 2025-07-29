/**
 * パフォーマンス最適化コンポーネント集
 * 
 * @author Claude-kun (Anthropic AI Assistant)
 * @date 2025-07-27
 * @description 再利用可能なパフォーマンス最適化UIコンポーネント
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Loader2 } from 'lucide-react';

// ==========================================
// 1. スケルトンローダー実装
// ==========================================
export const TableSkeleton = ({ rows = 10, columns = 5 }) => {
  return (
    <div className="w-full animate-pulse">
      {/* ヘッダー */}
      <div className="flex space-x-4 p-4 border-b-2 border-gray-200">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      
      {/* 行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 p-4 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={`h-4 bg-gray-200 rounded flex-1 ${
                colIndex === 0 ? 'w-1/3' : 'w-1/6'
              }`} 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
};

// ==========================================
// 2. プログレッシブローディング
// ==========================================
export const ProgressiveLoader = ({ 
  current, 
  total, 
  message,
  subMessage 
}: {
  current: number;
  total: number;
  message: string;
  subMessage?: string;
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-sm font-medium text-gray-700">{message}</span>
        </div>
        <span className="text-sm font-bold text-blue-600">{percentage}%</span>
      </div>
      
      <Progress value={percentage} className="h-2 mb-3" />
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{current.toLocaleString()} / {total.toLocaleString()} 件</span>
        {subMessage && <span>{subMessage}</span>}
      </div>
    </div>
  );
};

// ==========================================
// 3. 段階的データローダー
// ==========================================
export const IncrementalDataLoader = ({
  data,
  initialCount = 50,
  incrementSize = 50,
  renderItem,
  className = ""
}: {
  data: any[];
  initialCount?: number;
  incrementSize?: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}) => {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const displayedData = data.slice(0, displayCount);
  const hasMore = displayCount < data.length;
  
  const loadMore = useCallback(() => {
    setIsLoadingMore(true);
    
    // UIの応答性を保つために非同期で実行
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + incrementSize, data.length));
      setIsLoadingMore(false);
    }, 100);
  }, [data.length, incrementSize]);
  
  return (
    <div className={className}>
      {/* データ表示 */}
      {displayedData.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
      
      {/* もっと見るボタン */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
          >
            {isLoadingMore ? (
              <span className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>読み込み中...</span>
              </span>
            ) : (
              <span>
                さらに表示（残り {data.length - displayCount} 件）
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. パフォーマンス計測ユーティリティ
// ==========================================
export const usePerformanceTracker = (componentName: string) => {
  const renderCount = useRef(0);
  const mountTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current++;
    
    const renderTime = performance.now() - mountTime.current;
    
    // 開発環境でのみログ出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [${componentName}] Render #${renderCount.current} - ${renderTime.toFixed(2)}ms`);
    }
    
    // パフォーマンスマーク
    performance.mark(`${componentName}-render-${renderCount.current}`);
    
    if (renderCount.current > 1) {
      performance.measure(
        `${componentName}-render`,
        `${componentName}-render-${renderCount.current - 1}`,
        `${componentName}-render-${renderCount.current}`
      );
    }
  });
  
  return {
    renderCount: renderCount.current,
    getTotalTime: () => performance.now() - mountTime.current
  };
};

// ==========================================
// 5. エラーバウンダリー with パフォーマンス
// ==========================================
export class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Performance Error:', error, errorInfo);
    
    // エラーをトラッキング
    if (typeof window !== 'undefined' && (window as any).appInsights) {
      (window as any).appInsights.trackException({
        exception: error,
        properties: {
          componentStack: errorInfo.componentStack,
          type: 'PerformanceError'
        }
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">パフォーマンスエラーが発生しました</h3>
              <p className="text-sm text-red-600 mt-1">
                {this.state.error?.message || 'データの表示中に問題が発生しました'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-sm text-red-700 underline hover:no-underline"
              >
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// ==========================================
// 6. メモリ効率的なリスト表示
// ==========================================
export const VirtualizedList = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  overscan?: number;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div
      ref={scrollElementRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: 'auto' }}
      className="relative"
    >
      <div style={{ height: totalHeight }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 使用例
// ==========================================
export const PerformanceDemo = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { renderCount, getTotalTime } = usePerformanceTracker('PerformanceDemo');
  
  useEffect(() => {
    // 擬似データ生成
    setTimeout(() => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.random() * 1000
      }));
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);
  
  if (loading) {
    return <TableSkeleton rows={10} columns={3} />;
  }
  
  return (
    <PerformanceErrorBoundary>
      <div className="space-y-6">
        <div className="text-sm text-gray-500">
          Render Count: {renderCount} | Total Time: {getTotalTime().toFixed(2)}ms
        </div>
        
        <IncrementalDataLoader
          data={data}
          initialCount={20}
          incrementSize={20}
          renderItem={(item) => (
            <div className="p-3 border-b">
              {item.name} - {item.value.toFixed(2)}
            </div>
          )}
        />
      </div>
    </PerformanceErrorBoundary>
  );
};