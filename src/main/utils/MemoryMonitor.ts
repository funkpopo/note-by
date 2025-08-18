import { EventEmitter } from 'events'

interface MemoryStats {
  heapUsed: number // MB
  heapTotal: number // MB
  external: number // MB
  rss: number // MB
  timestamp: number
}

interface MemoryThresholds {
  warning: number // MB - 警告阈值
  critical: number // MB - 严重阈值
  gcTrigger: number // MB - 触发GC的阈值
}

interface MemoryMonitorConfig {
  interval: number // 监控间隔（毫秒）
  historySize: number // 历史记录大小
  thresholds: MemoryThresholds
  enableAutoGC: boolean // 是否启用自动垃圾回收
  enableLogging: boolean // 是否启用日志
}

class MemoryMonitor extends EventEmitter {
  private config: MemoryMonitorConfig
  private history: MemoryStats[] = []
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    super()

    this.config = {
      interval: 30000, // 30秒
      historySize: 100, // 保留100条记录
      thresholds: {
        warning: 512, // 512MB
        critical: 1024, // 1GB
        gcTrigger: 768 // 768MB
      },
      enableAutoGC: true,
      enableLogging: false,
      ...config
    }
  }

  /**
   * 开始监控
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.checkMemory()
    }, this.config.interval)

    // 立即执行一次检查
    this.checkMemory()

    if (this.config.enableLogging) {
      console.log('内存监控已启动')
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false

    if (this.config.enableLogging) {
      console.log('内存监控已停止')
    }
  }

  /**
   * 检查内存使用情况
   */
  private checkMemory(): void {
    const memoryUsage = process.memoryUsage()
    const stats: MemoryStats = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      timestamp: Date.now()
    }

    // 添加到历史记录
    this.addToHistory(stats)

    // 检查阈值
    this.checkThresholds(stats)

    // 触发事件
    this.emit('memoryUpdate', stats)

    if (this.config.enableLogging) {
      console.log('内存使用情况:', {
        heapUsed: `${stats.heapUsed}MB`,
        heapTotal: `${stats.heapTotal}MB`,
        rss: `${stats.rss}MB`
      })
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(stats: MemoryStats): void {
    this.history.push(stats)

    // 保持历史记录大小在限制范围内
    if (this.history.length > this.config.historySize) {
      this.history.shift()
    }
  }

  /**
   * 检查内存阈值
   */
  private checkThresholds(stats: MemoryStats): void {
    const { warning, critical, gcTrigger } = this.config.thresholds

    if (stats.heapUsed >= critical) {
      this.emit('memoryAlert', {
        level: 'critical',
        message: `内存使用达到严重阈值: ${stats.heapUsed}MB >= ${critical}MB`,
        stats
      })

      // 立即执行垃圾回收
      if (this.config.enableAutoGC) {
        this.forceGarbageCollection()
      }
    } else if (stats.heapUsed >= warning) {
      this.emit('memoryAlert', {
        level: 'warning',
        message: `内存使用达到警告阈值: ${stats.heapUsed}MB >= ${warning}MB`,
        stats
      })
    }

    // 自动垃圾回收
    if (this.config.enableAutoGC && stats.heapUsed >= gcTrigger) {
      this.suggestGarbageCollection()
    }
  }

  /**
   * 建议垃圾回收
   */
  private suggestGarbageCollection(): void {
    this.emit('gcSuggestion', {
      message: '建议执行垃圾回收以释放内存',
      timestamp: Date.now()
    })

    // 延迟执行GC，避免影响性能
    setTimeout(() => {
      this.forceGarbageCollection()
    }, 1000)
  }

  /**
   * 强制垃圾回收
   */
  forceGarbageCollection(): void {
    try {
      if (global.gc) {
        const beforeStats = process.memoryUsage()
        global.gc()
        const afterStats = process.memoryUsage()

        const freed = Math.round((beforeStats.heapUsed - afterStats.heapUsed) / 1024 / 1024)

        this.emit('gcExecuted', {
          beforeHeapUsed: Math.round(beforeStats.heapUsed / 1024 / 1024),
          afterHeapUsed: Math.round(afterStats.heapUsed / 1024 / 1024),
          freedMemory: freed,
          timestamp: Date.now()
        })

        if (this.config.enableLogging) {
          console.log(`垃圾回收完成，释放内存: ${freed}MB`)
        }
      } else {
        if (this.config.enableLogging) {
          console.warn('global.gc 不可用，无法执行垃圾回收')
        }
      }
    } catch {
      this.emit('error', Error)
    }
  }

  /**
   * 获取当前内存统计
   */
  getCurrentStats(): MemoryStats {
    const memoryUsage = process.memoryUsage()
    return {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      timestamp: Date.now()
    }
  }

  /**
   * 获取内存历史记录
   */
  getHistory(): MemoryStats[] {
    return [...this.history]
  }

  /**
   * 获取内存趋势分析
   */
  getTrendAnalysis(): {
    trend: 'increasing' | 'decreasing' | 'stable'
    avgGrowthRate: number // MB/分钟
    peakUsage: number // MB
    currentUsage: number // MB
  } {
    if (this.history.length < 2) {
      return {
        trend: 'stable',
        avgGrowthRate: 0,
        peakUsage: 0,
        currentUsage: 0
      }
    }

    const recent = this.history.slice(-10) // 最近10条记录
    const first = recent[0]
    const last = recent[recent.length - 1]

    const timeDiff = (last.timestamp - first.timestamp) / 1000 / 60 // 分钟
    const memoryDiff = last.heapUsed - first.heapUsed
    const avgGrowthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (avgGrowthRate > 1) {
      trend = 'increasing'
    } else if (avgGrowthRate < -1) {
      trend = 'decreasing'
    }

    const peakUsage = Math.max(...this.history.map((s) => s.heapUsed))

    return {
      trend,
      avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
      peakUsage,
      currentUsage: last.heapUsed
    }
  }

  /**
   * 清理内存（手动）
   * 这个方法提供一些通用的内存清理建议
   */
  async cleanupMemory(): Promise<{
    success: boolean
    actions: string[]
    freedMemory?: number
  }> {
    const actions: string[] = []
    const beforeStats = this.getCurrentStats()

    try {
      // 1. 强制垃圾回收
      if (global.gc) {
        global.gc()
        actions.push('执行垃圾回收')
      }

      // 2. 清理V8优化缓存
      if (global.gc && typeof global.gc === 'function') {
        // 运行多次GC以确保彻底清理
        for (let i = 0; i < 3; i++) {
          global.gc()
        }
        actions.push('深度垃圾回收')
      }

      // 3. 发出内存清理事件，让其他模块响应
      this.emit('memoryCleanup', {
        timestamp: Date.now(),
        beforeStats
      })
      actions.push('通知其他模块清理内存')

      const afterStats = this.getCurrentStats()
      const freedMemory = beforeStats.heapUsed - afterStats.heapUsed

      return {
        success: true,
        actions,
        freedMemory
      }
    } catch {
      return {
        success: false,
        actions
      }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MemoryMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // 如果正在运行，重启监控以应用新配置
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }

  /**
   * 导出内存报告
   */
  generateReport(): {
    currentStats: MemoryStats
    config: MemoryMonitorConfig
    history: MemoryStats[]
    trendAnalysis: {
      trend: 'increasing' | 'decreasing' | 'stable'
      avgGrowthRate: number
      peakUsage: number
      currentUsage: number
    }
    recommendations: string[]
  } {
    const currentStats = this.getCurrentStats()
    const trendAnalysis = this.getTrendAnalysis()
    const recommendations: string[] = []

    // 生成建议
    if (currentStats.heapUsed > this.config.thresholds.warning) {
      recommendations.push('内存使用率较高，建议检查是否有内存泄漏')
    }

    if (trendAnalysis.trend === 'increasing' && trendAnalysis.avgGrowthRate > 5) {
      recommendations.push('内存使用量持续增长，建议进行内存分析')
    }

    if (currentStats.heapUsed / currentStats.heapTotal > 0.8) {
      recommendations.push('堆内存使用率超过80%，建议增加堆大小或优化内存使用')
    }

    return {
      currentStats,
      config: this.config,
      history: this.getHistory(),
      trendAnalysis,
      recommendations
    }
  }
}

// 创建默认实例
export const memoryMonitor = new MemoryMonitor({
  interval: 30000, // 30秒检查一次
  enableAutoGC: true,
  enableLogging: false,
  thresholds: {
    warning: 512, // 512MB
    critical: 1024, // 1GB
    gcTrigger: 768 // 768MB
  }
})

export { MemoryMonitor, type MemoryStats, type MemoryThresholds, type MemoryMonitorConfig }
