/**
 * 性能监控器 - 用于监控编辑器性能、内存使用和用户操作统计
 * 作为方案2全面重构的第四阶段组件
 */

export interface PerformanceMetrics {
  // 内存性能
  memoryUsage: {
    used: number
    total: number
    percentage: number
    timestamp: number
  }

  // 编辑器性能
  editorPerformance: {
    loadTime: number
    saveTime: number
    renderTime: number
    timestamp: number
  }

  // 用户操作统计
  userActions: {
    editorChanges: number
    saves: number
    loads: number
    searches: number
    timestamp: number
  }

  // 网络性能（WebDAV同步等）
  networkPerformance: {
    uploadSpeed: number
    downloadSpeed: number
    latency: number
    timestamp: number
  }
}

export interface PerformanceEvent {
  type: 'memory' | 'editor' | 'user' | 'network' | 'error'
  data: Record<string, unknown>
  timestamp: number
  source: string
}

type PerformanceEventListener = (event: PerformanceEvent) => void

class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null
  private metrics: PerformanceMetrics
  private listeners: PerformanceEventListener[] = []
  private historySize = 100 // 保留最近100个数据点
  private metricsHistory: PerformanceMetrics[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private isMonitoring = false

  private constructor() {
    this.metrics = this.initializeMetrics()
    // 不在构造函数中自动启动监控，由外部控制启动时机
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0,
        timestamp: Date.now()
      },
      editorPerformance: {
        loadTime: 0,
        saveTime: 0,
        renderTime: 0,
        timestamp: Date.now()
      },
      userActions: {
        editorChanges: 0,
        saves: 0,
        loads: 0,
        searches: 0,
        timestamp: Date.now()
      },
      networkPerformance: {
        uploadSpeed: 0,
        downloadSpeed: 0,
        latency: 0,
        timestamp: Date.now()
      }
    }
  }

  /**
   * 开始性能监控
   */
  startMonitoring(immediate = false): void {
    if (this.isMonitoring) return

    this.isMonitoring = true

    // 如果需要立即执行首次更新
    if (immediate) {
      this.updateMemoryMetrics()
    }

    // 每1分钟更新一次内存使用统计
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryMetrics()
    }, 60000)

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  /**
   * 页面可见性变化处理
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // 页面隐藏时暂停监控以节省资源
      this.isMonitoring = false
    } else {
      // 页面显示时恢复监控
      this.isMonitoring = true
    }
  }

  /**
   * 更新内存使用指标
   */
  private updateMemoryMetrics(): void {
    if (!this.isMonitoring) return

    try {
      // 使用Performance API获取内存信息（如果可用）
      if ('memory' in performance) {
        const memory = (
          performance as Performance & {
            memory?: {
              usedJSHeapSize: number
              totalJSHeapSize: number
              jsHeapSizeLimit: number
            }
          }
        ).memory
        if (memory) {
          this.metrics.memoryUsage = {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
            timestamp: Date.now()
          }
        }
      } else {
        // 备用方案：估算内存使用
        const estimated = this.estimateMemoryUsage()
        this.metrics.memoryUsage = {
          used: estimated,
          total: estimated * 2, // 估算总量
          percentage: 50, // 估算使用率
          timestamp: Date.now()
        }
      }

      // 发出内存更新事件
      this.emitEvent({
        type: 'memory',
        data: this.metrics.memoryUsage,
        timestamp: Date.now(),
        source: 'PerformanceMonitor'
      })

      // 检查内存压力
      this.checkMemoryPressure()
    } catch (error) {
      this.emitEvent({
        type: 'error',
        data: { message: 'Failed to update memory metrics', error },
        timestamp: Date.now(),
        source: 'PerformanceMonitor'
      })
    }
  }

  /**
   * 估算内存使用（备用方案）
   */
  private estimateMemoryUsage(): number {
    // 简单的内存使用估算
    const domNodes = document.querySelectorAll('*').length
    const estimatedPerNode = 100 // 每个DOM节点估算100字节
    return domNodes * estimatedPerNode
  }

  /**
   * 检查内存压力
   */
  private checkMemoryPressure(): void {
    const { percentage } = this.metrics.memoryUsage

    if (percentage > 90) {
      this.emitEvent({
        type: 'memory',
        data: {
          level: 'critical',
          message: '内存使用率超过90%，建议立即清理',
          percentage
        },
        timestamp: Date.now(),
        source: 'PerformanceMonitor'
      })
    } else if (percentage > 75) {
      this.emitEvent({
        type: 'memory',
        data: {
          level: 'warning',
          message: '内存使用率较高，建议适当清理',
          percentage
        },
        timestamp: Date.now(),
        source: 'PerformanceMonitor'
      })
    }
  }

  /**
   * 记录编辑器性能指标
   */
  recordEditorPerformance(type: 'load' | 'save' | 'render', duration: number): void {
    const timestamp = Date.now()

    switch (type) {
      case 'load':
        this.metrics.editorPerformance.loadTime = duration
        this.metrics.userActions.loads++
        break
      case 'save':
        this.metrics.editorPerformance.saveTime = duration
        this.metrics.userActions.saves++
        break
      case 'render':
        this.metrics.editorPerformance.renderTime = duration
        break
    }

    this.metrics.editorPerformance.timestamp = timestamp
    this.metrics.userActions.timestamp = timestamp

    this.emitEvent({
      type: 'editor',
      data: { type, duration, metrics: this.metrics.editorPerformance },
      timestamp,
      source: 'PerformanceMonitor'
    })
  }

  /**
   * 记录用户操作
   */
  recordUserAction(action: 'edit' | 'save' | 'load' | 'search'): void {
    const timestamp = Date.now()

    switch (action) {
      case 'edit':
        this.metrics.userActions.editorChanges++
        break
      case 'save':
        this.metrics.userActions.saves++
        break
      case 'load':
        this.metrics.userActions.loads++
        break
      case 'search':
        this.metrics.userActions.searches++
        break
    }

    this.metrics.userActions.timestamp = timestamp

    this.emitEvent({
      type: 'user',
      data: { action, metrics: this.metrics.userActions },
      timestamp,
      source: 'PerformanceMonitor'
    })
  }

  /**
   * 记录网络性能
   */
  recordNetworkPerformance(
    type: 'upload' | 'download',
    bytes: number,
    duration: number,
    latency?: number
  ): void {
    const speed = bytes / (duration / 1000) // bytes per second
    const timestamp = Date.now()

    if (type === 'upload') {
      this.metrics.networkPerformance.uploadSpeed = speed
    } else {
      this.metrics.networkPerformance.downloadSpeed = speed
    }

    if (latency !== undefined) {
      this.metrics.networkPerformance.latency = latency
    }

    this.metrics.networkPerformance.timestamp = timestamp

    this.emitEvent({
      type: 'network',
      data: { type, speed, latency, metrics: this.metrics.networkPerformance },
      timestamp,
      source: 'PerformanceMonitor'
    })
  }

  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 获取历史性能数据
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory]
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): {
    summary: {
      averageMemoryUsage: number
      averageLoadTime: number
      averageSaveTime: number
      totalUserActions: number
    }
    trends: {
      memoryTrend: 'increasing' | 'decreasing' | 'stable'
      performanceTrend: 'improving' | 'declining' | 'stable'
    }
    recommendations: string[]
  } {
    const history = this.metricsHistory.slice(-10) // 最近10个数据点

    if (history.length === 0) {
      return {
        summary: {
          averageMemoryUsage: 0,
          averageLoadTime: 0,
          averageSaveTime: 0,
          totalUserActions: 0
        },
        trends: {
          memoryTrend: 'stable',
          performanceTrend: 'stable'
        },
        recommendations: ['暂无足够数据生成建议']
      }
    }

    // 计算平均值
    const avgMemory = history.reduce((sum, m) => sum + m.memoryUsage.percentage, 0) / history.length
    const avgLoadTime =
      history.reduce((sum, m) => sum + m.editorPerformance.loadTime, 0) / history.length
    const avgSaveTime =
      history.reduce((sum, m) => sum + m.editorPerformance.saveTime, 0) / history.length
    const totalActions =
      this.metrics.userActions.editorChanges +
      this.metrics.userActions.saves +
      this.metrics.userActions.loads +
      this.metrics.userActions.searches

    // 分析趋势
    const memoryTrend = this.analyzeTrend(history.map((h) => h.memoryUsage.percentage))
    const loadTimeTrend = this.analyzeTrend(history.map((h) => h.editorPerformance.loadTime))

    let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (loadTimeTrend === 'decreasing') {
      performanceTrend = 'improving' // 加载时间减少表示性能提升
    } else if (loadTimeTrend === 'increasing') {
      performanceTrend = 'declining'
    }

    // 生成建议
    const recommendations: string[] = []

    if (avgMemory > 75) {
      recommendations.push('内存使用率较高，建议定期清理浏览器缓存')
    }

    if (avgLoadTime > 2000) {
      recommendations.push('文件加载时间较长，建议优化大文件处理')
    }

    if (avgSaveTime > 1000) {
      recommendations.push('文件保存时间较长，建议检查网络连接')
    }

    if (memoryTrend === 'increasing') {
      recommendations.push('内存使用呈上升趋势，可能存在内存泄露')
    }

    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，继续保持')
    }

    return {
      summary: {
        averageMemoryUsage: Math.round(avgMemory),
        averageLoadTime: Math.round(avgLoadTime),
        averageSaveTime: Math.round(avgSaveTime),
        totalUserActions: totalActions
      },
      trends: {
        memoryTrend,
        performanceTrend
      },
      recommendations
    }
  }

  /**
   * 分析数据趋势
   */
  private analyzeTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 3) return 'stable'

    const recentAvg = data.slice(-3).reduce((sum, val) => sum + val, 0) / 3
    const earlierAvg = data.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3

    const threshold = Math.abs(earlierAvg) * 0.1 // 10%变化阈值

    if (recentAvg > earlierAvg + threshold) {
      return 'increasing'
    } else if (recentAvg < earlierAvg - threshold) {
      return 'decreasing'
    } else {
      return 'stable'
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: PerformanceEventListener): void {
    this.listeners.push(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: PerformanceEventListener): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 发出事件
   */
  private emitEvent(event: PerformanceEvent): void {
    // 更新历史记录
    this.metricsHistory.push({ ...this.metrics })

    // 保持历史记录大小限制
    if (this.metricsHistory.length > this.historySize) {
      this.metricsHistory.shift()
    }

    // 通知监听器
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        // Performance monitor listener error
      }
    })
  }

  /**
   * 重置统计数据
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
    this.metricsHistory = []

    this.emitEvent({
      type: 'user',
      data: { action: 'reset', message: 'Performance metrics reset' },
      timestamp: Date.now(),
      source: 'PerformanceMonitor'
    })
  }

  /**
   * 导出性能数据
   */
  exportData(): string {
    const exportData = {
      currentMetrics: this.metrics,
      history: this.metricsHistory,
      report: this.generatePerformanceReport(),
      exportTime: new Date().toISOString()
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopMonitoring()
    this.listeners = []
    this.metricsHistory = []
    PerformanceMonitor.instance = null
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance()
export default performanceMonitor
