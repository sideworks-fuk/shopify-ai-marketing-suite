/**
 * パフォーマンス測定ユーティリティ
 * 休眠顧客分析・前年同月比画面のパフォーマンス測定用
 */

import React from 'react'

interface PerformanceMetric {
  name: string
  duration: number
  startTime: number
  endTime: number
  metadata?: Record<string, any>
}

class PerformanceMeasurement {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private marks: Map<string, number> = new Map()

  /**
   * 測定開始
   */
  start(label: string, metadata?: Record<string, any>): void {
    const startTime = performance.now()
    this.marks.set(`${label}-start`, startTime)
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${label}-start`)
    }
    
    console.log(`🚀 [Performance] ${label} started`, metadata)
  }

  /**
   * 測定終了
   */
  end(label: string): PerformanceMetric | null {
    const endTime = performance.now()
    const startTime = this.marks.get(`${label}-start`)
    
    if (!startTime) {
      console.warn(`⚠️ [Performance] No start mark found for ${label}`)
      return null
    }
    
    const duration = endTime - startTime
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${label}-end`)
      performance.measure(label, `${label}-start`, `${label}-end`)
    }
    
    const metric: PerformanceMetric = {
      name: label,
      duration,
      startTime,
      endTime,
    }
    
    this.metrics.set(label, metric)
    this.marks.delete(`${label}-start`)
    
    console.log(`✅ [Performance] ${label}: ${duration.toFixed(2)}ms`)
    
    return metric
  }

  /**
   * メモリ使用量測定
   */
  measureMemory(): { used: number; total: number } | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null
    }
    
    const perf = performance as any
    if (perf.memory) {
      return {
        used: perf.memory.usedJSHeapSize / 1024 / 1024, // MB
        total: perf.memory.totalJSHeapSize / 1024 / 1024, // MB
      }
    }
    
    return null
  }

  /**
   * レンダリング回数測定用フック
   */
  useRenderCount(componentName: string): number {
    const renderCount = React.useRef(0)
    
    React.useEffect(() => {
      renderCount.current += 1
      console.log(`🔄 [Render] ${componentName}: ${renderCount.current} times`)
    })
    
    return renderCount.current
  }

  /**
   * API呼び出し測定ラッパー
   */
  async measureApiCall<T>(
    apiCall: () => Promise<T>,
    label: string
  ): Promise<T> {
    this.start(`api-${label}`)
    
    try {
      const result = await apiCall()
      const metric = this.end(`api-${label}`)
      
      // 遅いAPIコールを警告
      if (metric && metric.duration > 2000) {
        console.warn(`⚠️ [Performance] Slow API call: ${label} took ${metric.duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      this.end(`api-${label}`)
      throw error
    }
  }

  /**
   * コンポーネントマウント時間測定
   */
  useMountTime(componentName: string): void {
    React.useEffect(() => {
      const mountTime = performance.now()
      console.log(`📊 [Mount] ${componentName} mounted at ${mountTime.toFixed(2)}ms`)
      
      return () => {
        const unmountTime = performance.now()
        const lifetime = unmountTime - mountTime
        console.log(`📊 [Unmount] ${componentName} lived for ${lifetime.toFixed(2)}ms`)
      }
    }, [componentName])
  }

  /**
   * 全メトリクスのサマリー取得
   */
  getSummary(): {
    metrics: PerformanceMetric[]
    memory: { used: number; total: number } | null
    totalDuration: number
  } {
    const metrics = Array.from(this.metrics.values())
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0)
    
    return {
      metrics,
      memory: this.measureMemory(),
      totalDuration,
    }
  }

  /**
   * レポート生成
   */
  generateReport(): string {
    const summary = this.getSummary()
    
    let report = '📊 Performance Report\n'
    report += '===================\n\n'
    
    // メトリクス
    report += '⏱️ Timing Metrics:\n'
    summary.metrics.forEach(metric => {
      report += `  ${metric.name}: ${metric.duration.toFixed(2)}ms\n`
    })
    report += `  Total: ${summary.totalDuration.toFixed(2)}ms\n\n`
    
    // メモリ
    if (summary.memory) {
      report += '💾 Memory Usage:\n'
      report += `  Used: ${summary.memory.used.toFixed(2)}MB\n`
      report += `  Total: ${summary.memory.total.toFixed(2)}MB\n`
      report += `  Usage: ${((summary.memory.used / summary.memory.total) * 100).toFixed(1)}%\n\n`
    }
    
    // 警告
    const slowMetrics = summary.metrics.filter(m => m.duration > 1000)
    if (slowMetrics.length > 0) {
      report += '⚠️ Warnings:\n'
      slowMetrics.forEach(metric => {
        report += `  ${metric.name} is slow (${metric.duration.toFixed(2)}ms)\n`
      })
    }
    
    return report
  }

  /**
   * コンソールにレポート出力
   */
  logReport(): void {
    console.log(this.generateReport())
  }

  /**
   * メトリクスをクリア
   */
  clear(): void {
    this.metrics.clear()
    this.marks.clear()
  }
}

// シングルトンインスタンス
export const performanceMeasure = new PerformanceMeasurement()

// React hooks
export const usePerformance = () => {
  const measure = React.useRef(performanceMeasure)
  
  React.useEffect(() => {
    return () => {
      // コンポーネントアンマウント時にレポート出力
      if (measure.current.getSummary().metrics.length > 0) {
        measure.current.logReport()
      }
    }
  }, [])
  
  return measure.current
}

// 使用例
/*
// コンポーネント内で使用
const MyComponent = () => {
  const perf = usePerformance()
  
  useEffect(() => {
    perf.start('component-initialization')
    // 初期化処理
    perf.end('component-initialization')
  }, [])
  
  const fetchData = async () => {
    const data = await perf.measureApiCall(
      () => api.getDormantCustomers(),
      'get-dormant-customers'
    )
    return data
  }
  
  perf.useMountTime('MyComponent')
  const renderCount = perf.useRenderCount('MyComponent')
  
  return <div>Render count: {renderCount}</div>
}
*/

export default performanceMeasure