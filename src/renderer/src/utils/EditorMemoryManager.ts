// 内存使用情况接口
interface MemoryUsage {
  used: number // 已使用内存 (MB)
  total: number // 总内存 (MB)
  percentage: number // 使用百分比
  jsHeapUsed: number // JS堆使用 (MB)
  jsHeapTotal: number // JS堆总量 (MB)
  external: number // 外部内存 (MB)
  rss: number // 常驻集大小 (MB)
}

// 内存压力级别
enum MemoryPressureLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 内存事件类型
type MemoryEventType = 'pressure' | 'cleanup' | 'warning' | 'critical'

// 内存事件监听器
type MemoryEventListener = (
  eventType: MemoryEventType,
  data: {
    level: MemoryPressureLevel
    usage: MemoryUsage
    message: string
    timestamp: number
  }
) => void

// 内存清理策略
interface MemoryCleanupStrategy {
  name: string
  priority: number // 优先级，数字越小越优先
  condition: (usage: MemoryUsage) => boolean
  action: () => Promise<{ success: boolean; memoryFreed: number; description: string }>
}

// 图片优化配置
interface ImageOptimizationConfig {
  enabled: boolean
  maxWidth: number
  maxHeight: number
  quality: number // 0-1
  format: 'webp' | 'jpeg' | 'png' | 'auto'
  enableLazyLoading: boolean
  cacheSize: number // MB
}

// 编辑器缓存项
interface EditorCacheItem {
  id: string
  content: string
  size: number
  lastAccess: number
  accessCount: number
  priority: number // 1-5，5最高
}

/**
 * 编辑器内存管理器
 * 负责监控和优化编辑器内存使用
 */
export class EditorMemoryManager {
  private static instance: EditorMemoryManager | null = null

  // 配置参数
  private readonly warningThreshold = 0.7 // 70%内存使用时警告
  private readonly criticalThreshold = 0.85 // 85%内存使用时严重警告
  private readonly cleanupThreshold = 0.8 // 80%内存使用时触发清理
  private readonly monitorInterval = 5000 // 5秒监控间隔

  // 状态管理
  private isMonitoring = false
  private currentPressureLevel = MemoryPressureLevel.LOW
  private lastCleanupTime = 0
  private cleanupCooldown = 30000 // 30秒清理冷却时间

  // 事件监听器
  private eventListeners: Map<MemoryEventType, Set<MemoryEventListener>> = new Map()

  // 内存清理策略
  private cleanupStrategies: MemoryCleanupStrategy[] = []

  // 编辑器内容缓存
  private contentCache: Map<string, EditorCacheItem> = new Map()
  private maxCacheSize = 50 * 1024 * 1024 // 50MB
  private currentCacheSize = 0

  // 图片缓存和优化
  private imageCache: Map<string, { data: Blob; size: number; lastAccess: number }> = new Map()
  private maxImageCacheSize = 100 * 1024 * 1024 // 100MB
  private currentImageCacheSize = 0

  // 计时器
  private monitorTimer?: NodeJS.Timeout
  private cleanupTimer?: NodeJS.Timeout

  // 图片优化配置
  private imageOptimization: ImageOptimizationConfig = {
    enabled: true,
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'auto',
    enableLazyLoading: true,
    cacheSize: 100 // MB
  }

  private constructor() {
    this.initializeCleanupStrategies()
    this.startMonitoring()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EditorMemoryManager {
    if (!EditorMemoryManager.instance) {
      EditorMemoryManager.instance = new EditorMemoryManager()
    }
    return EditorMemoryManager.instance
  }

  /**
   * 获取当前内存使用情况
   */
  async getCurrentMemoryUsage(): Promise<MemoryUsage> {
    const performance = (window as any).performance

    // 获取基本内存信息
    let memoryInfo: any = {}

    if (performance?.memory) {
      memoryInfo = performance.memory
    } else if ((navigator as any).deviceMemory) {
      // 使用设备内存信息作为估算
      const deviceMemory = (navigator as any).deviceMemory * 1024 * 1024 * 1024 // GB to bytes
      memoryInfo = {
        usedJSHeapSize: 0,
        totalJSHeapSize: deviceMemory * 0.1, // 估算JS堆为设备内存的10%
        jsHeapSizeLimit: deviceMemory * 0.2
      }
    }

    const jsHeapUsed = (memoryInfo.usedJSHeapSize || 0) / (1024 * 1024) // MB
    const jsHeapTotal = (memoryInfo.totalJSHeapSize || 0) / (1024 * 1024) // MB
    const jsHeapLimit = (memoryInfo.jsHeapSizeLimit || 0) / (1024 * 1024) // MB

    // 估算总内存使用（包括缓存等）
    const cacheMemory =
      this.currentCacheSize / (1024 * 1024) + this.currentImageCacheSize / (1024 * 1024)
    const totalUsed = jsHeapUsed + cacheMemory
    const totalAvailable = Math.max(jsHeapLimit, totalUsed * 1.5) // 估算总可用内存

    return {
      used: totalUsed,
      total: totalAvailable,
      percentage: totalAvailable > 0 ? totalUsed / totalAvailable : 0,
      jsHeapUsed,
      jsHeapTotal,
      external: cacheMemory,
      rss: totalUsed // 在浏览器环境中，RSS近似为总使用量
    }
  }

  /**
   * 开始内存监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitorTimer = setInterval(async () => {
      await this.performMemoryCheck()
    }, this.monitorInterval)

    console.log('Editor memory monitoring started')
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.monitorTimer) {
      clearInterval(this.monitorTimer)
      this.monitorTimer = undefined
    }

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = undefined
    }

    console.log('Editor memory monitoring stopped')
  }

  /**
   * 执行内存检查
   */
  private async performMemoryCheck(): Promise<void> {
    try {
      const usage = await this.getCurrentMemoryUsage()
      const newPressureLevel = this.calculatePressureLevel(usage)

      // 检查压力级别变化
      if (newPressureLevel !== this.currentPressureLevel) {
        this.currentPressureLevel = newPressureLevel
        this.emitEvent('pressure', {
          level: newPressureLevel,
          usage,
          message: `Memory pressure level changed to ${newPressureLevel}`,
          timestamp: Date.now()
        })
      }

      // 根据压力级别采取行动
      await this.handleMemoryPressure(usage, newPressureLevel)
    } catch (error) {
      console.error('Memory check failed:', error)
    }
  }

  /**
   * 计算内存压力级别
   */
  private calculatePressureLevel(usage: MemoryUsage): MemoryPressureLevel {
    if (usage.percentage >= this.criticalThreshold) {
      return MemoryPressureLevel.CRITICAL
    } else if (usage.percentage >= this.cleanupThreshold) {
      return MemoryPressureLevel.HIGH
    } else if (usage.percentage >= this.warningThreshold) {
      return MemoryPressureLevel.MODERATE
    } else {
      return MemoryPressureLevel.LOW
    }
  }

  /**
   * 处理内存压力
   */
  private async handleMemoryPressure(
    usage: MemoryUsage,
    level: MemoryPressureLevel
  ): Promise<void> {
    switch (level) {
      case MemoryPressureLevel.MODERATE:
        this.emitEvent('warning', {
          level,
          usage,
          message: 'Memory usage is getting high. Consider saving your work.',
          timestamp: Date.now()
        })
        break

      case MemoryPressureLevel.HIGH:
        if (this.canPerformCleanup()) {
          await this.performMemoryCleanup()
        }
        break

      case MemoryPressureLevel.CRITICAL:
        this.emitEvent('critical', {
          level,
          usage,
          message: 'Critical memory usage detected. Performing emergency cleanup.',
          timestamp: Date.now()
        })
        await this.performEmergencyCleanup()
        break
    }
  }

  /**
   * 执行内存清理
   */
  async performMemoryCleanup(force = false): Promise<{
    success: boolean
    memoryFreed: number
    strategiesUsed: string[]
  }> {
    if (!force && !this.canPerformCleanup()) {
      return { success: false, memoryFreed: 0, strategiesUsed: [] }
    }

    const startUsage = await this.getCurrentMemoryUsage()
    const strategiesUsed: string[] = []
    let totalMemoryFreed = 0

    // 按优先级执行清理策略
    const sortedStrategies = [...this.cleanupStrategies].sort((a, b) => a.priority - b.priority)

    for (const strategy of sortedStrategies) {
      if (strategy.condition(startUsage)) {
        try {
          const result = await strategy.action()
          if (result.success) {
            strategiesUsed.push(strategy.name)
            totalMemoryFreed += result.memoryFreed
            console.log(`Memory cleanup strategy "${strategy.name}": ${result.description}`)
          }
        } catch (error) {
          console.error(`Memory cleanup strategy "${strategy.name}" failed:`, error)
        }
      }
    }

    // 执行垃圾回收（如果可用）
    if ((window as any).gc) {
      try {
        ;(window as any).gc()
        strategiesUsed.push('Garbage Collection')
      } catch (error) {
        console.warn('Manual garbage collection failed:', error)
      }
    }

    this.lastCleanupTime = Date.now()

    const endUsage = await this.getCurrentMemoryUsage()
    const actualMemoryFreed = (startUsage.used - endUsage.used) * 1024 * 1024 // MB to bytes

    this.emitEvent('cleanup', {
      level: this.currentPressureLevel,
      usage: endUsage,
      message: `Memory cleanup completed. Freed ${(actualMemoryFreed / (1024 * 1024)).toFixed(2)}MB`,
      timestamp: Date.now()
    })

    return {
      success: strategiesUsed.length > 0,
      memoryFreed: actualMemoryFreed,
      strategiesUsed
    }
  }

  /**
   * 执行紧急清理
   */
  private async performEmergencyCleanup(): Promise<void> {
    // 清空所有缓存
    this.contentCache.clear()
    this.currentCacheSize = 0

    this.imageCache.clear()
    this.currentImageCacheSize = 0

    // 强制执行清理
    await this.performMemoryCleanup(true)

    console.warn('Emergency memory cleanup performed')
  }

  /**
   * 检查是否可以执行清理
   */
  private canPerformCleanup(): boolean {
    return Date.now() - this.lastCleanupTime > this.cleanupCooldown
  }

  /**
   * 缓存编辑器内容
   */
  cacheContent(id: string, content: string, priority = 3): void {
    const size = new Blob([content]).size

    // 检查缓存大小限制
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictCacheItems(size)
    }

    // 删除旧的缓存项
    const oldItem = this.contentCache.get(id)
    if (oldItem) {
      this.currentCacheSize -= oldItem.size
    }

    // 添加新的缓存项
    const cacheItem: EditorCacheItem = {
      id,
      content,
      size,
      lastAccess: Date.now(),
      accessCount: 1,
      priority
    }

    this.contentCache.set(id, cacheItem)
    this.currentCacheSize += size
  }

  /**
   * 获取缓存的内容
   */
  getCachedContent(id: string): string | null {
    const item = this.contentCache.get(id)
    if (item) {
      item.lastAccess = Date.now()
      item.accessCount++
      return item.content
    }
    return null
  }

  /**
   * 清除缓存项
   */
  clearCachedContent(id: string): boolean {
    const item = this.contentCache.get(id)
    if (item) {
      this.contentCache.delete(id)
      this.currentCacheSize -= item.size
      return true
    }
    return false
  }

  /**
   * 淘汰缓存项以腾出空间
   */
  private evictCacheItems(requiredSpace: number): void {
    const itemsToEvict: EditorCacheItem[] = []
    let spaceToFree = requiredSpace

    // 获取所有缓存项并按优先级和访问时间排序
    const allItems = Array.from(this.contentCache.values()).sort((a, b) => {
      // 先按优先级排序（低优先级先淘汰）
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // 再按最后访问时间排序（旧的先淘汰）
      return a.lastAccess - b.lastAccess
    })

    for (const item of allItems) {
      if (spaceToFree <= 0) break

      itemsToEvict.push(item)
      spaceToFree -= item.size
    }

    // 淘汰选中的项目
    for (const item of itemsToEvict) {
      this.contentCache.delete(item.id)
      this.currentCacheSize -= item.size
    }
  }

  /**
   * 优化图片并缓存
   */
  async optimizeAndCacheImage(
    url: string,
    blob: Blob,
    options?: Partial<ImageOptimizationConfig>
  ): Promise<Blob> {
    const config = { ...this.imageOptimization, ...options }

    if (!config.enabled) {
      return blob
    }

    try {
      // 检查缓存
      const cached = this.imageCache.get(url)
      if (cached) {
        cached.lastAccess = Date.now()
        return cached.data
      }

      // 优化图片
      const optimizedBlob = await this.optimizeImage(blob, config)

      // 缓存优化后的图片
      const size = optimizedBlob.size
      if (this.currentImageCacheSize + size > this.maxImageCacheSize) {
        this.evictImageCache(size)
      }

      this.imageCache.set(url, {
        data: optimizedBlob,
        size,
        lastAccess: Date.now()
      })
      this.currentImageCacheSize += size

      return optimizedBlob
    } catch (error) {
      console.error('Image optimization failed:', error)
      return blob
    }
  }

  /**
   * 优化图片
   */
  private async optimizeImage(blob: Blob, config: ImageOptimizationConfig): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      img.onload = () => {
        // 计算新的尺寸
        let { width, height } = img
        const aspectRatio = width / height

        if (width > config.maxWidth) {
          width = config.maxWidth
          height = width / aspectRatio
        }

        if (height > config.maxHeight) {
          height = config.maxHeight
          width = height * aspectRatio
        }

        // 设置画布尺寸
        canvas.width = width
        canvas.height = height

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为blob
        canvas.toBlob(
          (optimizedBlob) => {
            if (optimizedBlob) {
              resolve(optimizedBlob)
            } else {
              reject(new Error('Failed to optimize image'))
            }
          },
          this.getOptimalFormat(config.format),
          config.quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(blob)
    })
  }

  /**
   * 获取最优图片格式
   */
  private getOptimalFormat(format: string): string {
    if (format === 'auto') {
      // 检查浏览器支持
      const canvas = document.createElement('canvas')
      const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      return webpSupported ? 'image/webp' : 'image/jpeg'
    }
    return `image/${format}`
  }

  /**
   * 淘汰图片缓存
   */
  private evictImageCache(requiredSpace: number): void {
    const itemsToEvict: Array<{ url: string; lastAccess: number; size: number }> = []
    let spaceToFree = requiredSpace

    // 按最后访问时间排序
    for (const [url, item] of this.imageCache.entries()) {
      itemsToEvict.push({ url, lastAccess: item.lastAccess, size: item.size })
    }

    itemsToEvict.sort((a, b) => a.lastAccess - b.lastAccess)

    for (const item of itemsToEvict) {
      if (spaceToFree <= 0) break

      this.imageCache.delete(item.url)
      this.currentImageCacheSize -= item.size
      spaceToFree -= item.size
    }
  }

  /**
   * 初始化清理策略
   */
  private initializeCleanupStrategies(): void {
    this.cleanupStrategies = [
      {
        name: 'Clear Old Content Cache',
        priority: 1,
        condition: (usage) => usage.percentage > 0.7,
        action: async () => {
          const initialSize = this.currentCacheSize
          const cutoff = Date.now() - 10 * 60 * 1000 // 10分钟前

          let clearedCount = 0
          for (const [id, item] of this.contentCache.entries()) {
            if (item.lastAccess < cutoff && item.priority < 4) {
              this.contentCache.delete(id)
              this.currentCacheSize -= item.size
              clearedCount++
            }
          }

          const memoryFreed = initialSize - this.currentCacheSize
          return {
            success: clearedCount > 0,
            memoryFreed,
            description: `Cleared ${clearedCount} old content cache items, freed ${(memoryFreed / (1024 * 1024)).toFixed(2)}MB`
          }
        }
      },

      {
        name: 'Clear Image Cache',
        priority: 2,
        condition: (usage) => usage.percentage > 0.75,
        action: async () => {
          const initialSize = this.currentImageCacheSize
          const cutoff = Date.now() - 5 * 60 * 1000 // 5分钟前

          let clearedCount = 0
          for (const [url, item] of this.imageCache.entries()) {
            if (item.lastAccess < cutoff) {
              this.imageCache.delete(url)
              this.currentImageCacheSize -= item.size
              clearedCount++
            }
          }

          const memoryFreed = initialSize - this.currentImageCacheSize
          return {
            success: clearedCount > 0,
            memoryFreed,
            description: `Cleared ${clearedCount} old image cache items, freed ${(memoryFreed / (1024 * 1024)).toFixed(2)}MB`
          }
        }
      },

      {
        name: 'Force Garbage Collection',
        priority: 3,
        condition: (usage) => usage.percentage > 0.8,
        action: async () => {
          if ((window as any).gc) {
            try {
              ;(window as any).gc()
              return {
                success: true,
                memoryFreed: 0, // 无法准确测量
                description: 'Forced garbage collection'
              }
            } catch (error) {
              return {
                success: false,
                memoryFreed: 0,
                description: 'Garbage collection failed'
              }
            }
          }
          return {
            success: false,
            memoryFreed: 0,
            description: 'Garbage collection not available'
          }
        }
      }
    ]
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: MemoryEventType, listener: MemoryEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: MemoryEventType, listener: MemoryEventListener): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(eventType: MemoryEventType, data: any): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(eventType, data)
        } catch (error) {
          console.error(`Memory event listener error for ${eventType}:`, error)
        }
      }
    }
  }

  /**
   * 获取内存统计信息
   */
  async getMemoryStats(): Promise<{
    usage: MemoryUsage
    pressureLevel: MemoryPressureLevel
    cacheStats: {
      contentCache: { items: number; size: number }
      imageCache: { items: number; size: number }
    }
    lastCleanupTime: number
  }> {
    const usage = await this.getCurrentMemoryUsage()

    return {
      usage,
      pressureLevel: this.currentPressureLevel,
      cacheStats: {
        contentCache: {
          items: this.contentCache.size,
          size: this.currentCacheSize
        },
        imageCache: {
          items: this.imageCache.size,
          size: this.currentImageCacheSize
        }
      },
      lastCleanupTime: this.lastCleanupTime
    }
  }

  /**
   * 更新配置
   */
  updateConfig(
    config: Partial<{
      warningThreshold: number
      criticalThreshold: number
      cleanupThreshold: number
      monitorInterval: number
      maxCacheSize: number
      imageOptimization: Partial<ImageOptimizationConfig>
    }>
  ): void {
    if (config.warningThreshold !== undefined) {
      ;(this as any).warningThreshold = config.warningThreshold
    }
    if (config.criticalThreshold !== undefined) {
      ;(this as any).criticalThreshold = config.criticalThreshold
    }
    if (config.cleanupThreshold !== undefined) {
      ;(this as any).cleanupThreshold = config.cleanupThreshold
    }
    if (config.monitorInterval !== undefined) {
      ;(this as any).monitorInterval = config.monitorInterval
      // 重启监控以应用新间隔
      if (this.isMonitoring) {
        this.stopMonitoring()
        this.startMonitoring()
      }
    }
    if (config.maxCacheSize !== undefined) {
      this.maxCacheSize = config.maxCacheSize
    }
    if (config.imageOptimization) {
      this.imageOptimization = { ...this.imageOptimization, ...config.imageOptimization }
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopMonitoring()
    this.contentCache.clear()
    this.imageCache.clear()
    this.eventListeners.clear()
    EditorMemoryManager.instance = null
  }
}

// 导出单例实例
export const editorMemoryManager = EditorMemoryManager.getInstance()
