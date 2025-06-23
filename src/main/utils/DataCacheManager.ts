import { databaseErrorHandler } from './DatabaseErrorHandler'

// 缓存项接口
interface CacheItem<T> {
  key: string
  data: T
  timestamp: number
  accessCount: number
  lastAccess: number
  ttl: number // 生存时间（毫秒）
  priority: CachePriority
  size: number // 估算的内存大小（字节）
  dependencies?: string[] // 依赖的其他缓存键
}

// 缓存优先级
enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

// 缓存策略接口
interface CacheStrategy {
  maxSize: number // 最大缓存大小（字节）
  maxItems: number // 最大缓存项数
  defaultTTL: number // 默认TTL（毫秒）
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO' | 'PRIORITY' // 淘汰策略
  compressionEnabled: boolean // 是否启用压缩
  persistToDisk: boolean // 是否持久化到磁盘
}

// 缓存统计信息
interface CacheStats {
  totalItems: number
  totalSize: number
  hitCount: number
  missCount: number
  evictionCount: number
  hitRate: number
  averageAccessTime: number
  memoryUsage: number
}

// 缓存事件类型
type CacheEventType = 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'expire'

// 缓存事件监听器
type CacheEventListener<T> = (
  eventType: CacheEventType,
  key: string,
  data?: T,
  metadata?: { [key: string]: unknown }
) => void

/**
 * 智能数据缓存管理器
 * 提供多级缓存、智能淘汰、依赖管理等功能
 */
export class DataCacheManager {
  private memoryCache: Map<string, CacheItem<unknown>> = new Map()
  private strategy: CacheStrategy
  private stats: CacheStats = {
    totalItems: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0,
    averageAccessTime: 0,
    memoryUsage: 0
  }

  private eventListeners: Map<CacheEventType, Set<CacheEventListener<unknown>>> = new Map()
  private maintenanceInterval?: NodeJS.Timeout
  private isMaintenanceRunning: boolean = false

  constructor(strategy?: Partial<CacheStrategy>) {
    this.strategy = {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxItems: 10000,
      defaultTTL: 30 * 60 * 1000, // 30分钟
      evictionPolicy: 'LRU',
      compressionEnabled: true,
      persistToDisk: false,
      ...strategy
    }

    this.startMaintenance()
  }

  /**
   * 设置缓存项
   */
  async set<T>(
    key: string,
    data: T,
    options?: {
      ttl?: number
      priority?: CachePriority
      dependencies?: string[]
    }
  ): Promise<boolean> {
    try {
      const safeOperation = databaseErrorHandler.createSafeOperation(
        async () => {
          const size = this.estimateSize(data)
          const ttl = options?.ttl || this.strategy.defaultTTL
          const priority = options?.priority || CachePriority.NORMAL

          // 检查是否需要腾出空间
          await this.ensureSpace(size)

          const cacheItem: CacheItem<T> = {
            key,
            data,
            timestamp: Date.now(),
            accessCount: 0,
            lastAccess: Date.now(),
            ttl,
            priority,
            size,
            dependencies: options?.dependencies
          }

          // 删除旧项（如果存在）
          const oldItem = this.memoryCache.get(key)
          if (oldItem) {
            this.stats.totalSize -= oldItem.size
            this.stats.totalItems--
          }

          // 添加新项
          this.memoryCache.set(key, cacheItem as CacheItem<unknown>)
          this.stats.totalItems++
          this.stats.totalSize += size

          this.emitEvent('set', key, data, { ttl, priority, size })
          return true
        },
        { operation: 'cache_set', table: 'memory_cache' }
      )

      return (await safeOperation()) || false
    } catch (error) {
      console.error(`Failed to set cache item ${key}:`, error)
      return false
    }
  }

  /**
   * 获取缓存项
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()

    try {
      const item = this.memoryCache.get(key) as CacheItem<T> | undefined

      if (!item) {
        this.stats.missCount++
        this.emitEvent('miss', key)
        this.updateAverageAccessTime(Date.now() - startTime)
        return null
      }

      // 检查是否过期
      if (this.isExpired(item)) {
        await this.delete(key)
        this.stats.missCount++
        this.emitEvent('expire', key)
        this.updateAverageAccessTime(Date.now() - startTime)
        return null
      }

      // 更新访问统计
      item.accessCount++
      item.lastAccess = Date.now()

      this.stats.hitCount++
      this.emitEvent('hit', key, item.data)
      this.updateAverageAccessTime(Date.now() - startTime)
      this.updateHitRate()

      return item.data
    } catch (error) {
      console.error(`Failed to get cache item ${key}:`, error)
      this.stats.missCount++
      this.updateAverageAccessTime(Date.now() - startTime)
      return null
    }
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<boolean> {
    try {
      const item = this.memoryCache.get(key)
      if (!item) {
        return false
      }

      this.memoryCache.delete(key)
      this.stats.totalItems--
      this.stats.totalSize -= item.size

      this.emitEvent('delete', key, item.data)

      // 删除依赖此项的其他缓存项
      await this.invalidateDependents(key)

      return true
    } catch (error) {
      console.error(`Failed to delete cache item ${key}:`, error)
      return false
    }
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.memoryCache.get(key)
    return item !== undefined && !this.isExpired(item)
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    try {
      const keys = Array.from(this.memoryCache.keys())
      this.memoryCache.clear()
      
      this.stats.totalItems = 0
      this.stats.totalSize = 0

      for (const key of keys) {
        this.emitEvent('delete', key)
      }
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.memoryCache.keys())
  }

  /**
   * 根据前缀获取缓存项
   */
  async getByPrefix<T>(prefix: string): Promise<Map<string, T>> {
    const result = new Map<string, T>()

    for (const [key, item] of this.memoryCache) {
      if (key.startsWith(prefix) && !this.isExpired(item)) {
        result.set(key, item.data as T)
        
        // 更新访问统计
        item.accessCount++
        item.lastAccess = Date.now()
      }
    }

    return result
  }

  /**
   * 批量设置缓存项
   */
  async setMultiple<T>(
    items: Map<string, T>,
    options?: {
      ttl?: number
      priority?: CachePriority
      dependencies?: string[]
    }
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    for (const [key, data] of items) {
      const success = await this.set(key, data, options)
      results.set(key, success)
    }

    return results
  }

  /**
   * 批量获取缓存项
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>()

    for (const key of keys) {
      const data = await this.get<T>(key)
      results.set(key, data)
    }

    return results
  }

  /**
   * 使缓存项失效
   */
  async invalidate(pattern: string | RegExp): Promise<number> {
    let invalidatedCount = 0
    const keysToDelete: string[] = []

    for (const key of this.memoryCache.keys()) {
      let shouldInvalidate = false

      if (typeof pattern === 'string') {
        shouldInvalidate = key.includes(pattern)
      } else {
        shouldInvalidate = pattern.test(key)
      }

      if (shouldInvalidate) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key)
      invalidatedCount++
    }

    return invalidatedCount
  }

  /**
   * 刷新缓存项（重新计算TTL）
   */
  async refresh<T>(
    key: string,
    dataLoader: () => Promise<T>,
    options?: {
      ttl?: number
      priority?: CachePriority
    }
  ): Promise<T | null> {
    try {
      const data = await dataLoader()
      await this.set(key, data, options)
      return data
    } catch (error) {
      console.error(`Failed to refresh cache item ${key}:`, error)
      return null
    }
  }

  /**
   * 获取或设置缓存项（如果不存在则加载）
   */
  async getOrSet<T>(
    key: string,
    dataLoader: () => Promise<T>,
    options?: {
      ttl?: number
      priority?: CachePriority
      dependencies?: string[]
    }
  ): Promise<T | null> {
    const cachedData = await this.get<T>(key)
    if (cachedData !== null) {
      return cachedData
    }

    try {
      const data = await dataLoader()
      await this.set(key, data, options)
      return data
    } catch (error) {
      console.error(`Failed to load data for cache key ${key}:`, error)
      return null
    }
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: unknown): number {
    try {
      // 简单的大小估算，实际可以使用更精确的方法
      const jsonString = JSON.stringify(data)
      return new Blob([jsonString]).size
    } catch {
      // 如果无法序列化，返回默认大小
      return 1024 // 1KB
    }
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem<unknown>): boolean {
    return Date.now() > item.timestamp + item.ttl
  }

  /**
   * 确保有足够空间
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    // 检查项目数量限制
    while (this.stats.totalItems >= this.strategy.maxItems) {
      await this.evictOne()
    }

    // 检查大小限制
    while (this.stats.totalSize + requiredSize > this.strategy.maxSize) {
      await this.evictOne()
    }
  }

  /**
   * 淘汰一个缓存项
   */
  private async evictOne(): Promise<void> {
    let keyToEvict: string | null = null

    switch (this.strategy.evictionPolicy) {
      case 'LRU':
        keyToEvict = this.findLRUKey()
        break
      case 'LFU':
        keyToEvict = this.findLFUKey()
        break
      case 'FIFO':
        keyToEvict = this.findFIFOKey()
        break
      case 'PRIORITY':
        keyToEvict = this.findLowestPriorityKey()
        break
    }

    if (keyToEvict) {
      await this.delete(keyToEvict)
      this.stats.evictionCount++
      this.emitEvent('evict', keyToEvict)
    }
  }

  /**
   * 查找最近最少使用的键
   */
  private findLRUKey(): string | null {
    let oldestKey: string | null = null
    let oldestAccess = Date.now()

    for (const [key, item] of this.memoryCache) {
      if (item.lastAccess < oldestAccess && item.priority !== CachePriority.CRITICAL) {
        oldestAccess = item.lastAccess
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * 查找最少使用的键
   */
  private findLFUKey(): string | null {
    let leastUsedKey: string | null = null
    let lowestCount = Infinity

    for (const [key, item] of this.memoryCache) {
      if (item.accessCount < lowestCount && item.priority !== CachePriority.CRITICAL) {
        lowestCount = item.accessCount
        leastUsedKey = key
      }
    }

    return leastUsedKey
  }

  /**
   * 查找最先进入的键
   */
  private findFIFOKey(): string | null {
    let oldestKey: string | null = null
    let oldestTimestamp = Date.now()

    for (const [key, item] of this.memoryCache) {
      if (item.timestamp < oldestTimestamp && item.priority !== CachePriority.CRITICAL) {
        oldestTimestamp = item.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * 查找优先级最低的键
   */
  private findLowestPriorityKey(): string | null {
    let lowestPriorityKey: string | null = null
    let lowestPriority = CachePriority.CRITICAL

    for (const [key, item] of this.memoryCache) {
      if (item.priority < lowestPriority) {
        lowestPriority = item.priority
        lowestPriorityKey = key
      }
    }

    return lowestPriorityKey
  }

  /**
   * 使依赖项失效
   */
  private async invalidateDependents(key: string): Promise<void> {
    const dependentsToInvalidate: string[] = []

    for (const [itemKey, item] of this.memoryCache) {
      if (item.dependencies?.includes(key)) {
        dependentsToInvalidate.push(itemKey)
      }
    }

    for (const dependentKey of dependentsToInvalidate) {
      await this.delete(dependentKey)
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const totalRequests = this.stats.hitCount + this.stats.missCount
    this.stats.hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0
  }

  /**
   * 更新平均访问时间
   */
  private updateAverageAccessTime(accessTime: number): void {
    const totalRequests = this.stats.hitCount + this.stats.missCount
    if (totalRequests === 1) {
      this.stats.averageAccessTime = accessTime
    } else {
      this.stats.averageAccessTime = 
        (this.stats.averageAccessTime * (totalRequests - 1) + accessTime) / totalRequests
    }
  }

  /**
   * 触发缓存事件
   */
  private emitEvent<T>(
    eventType: CacheEventType,
    key: string,
    data?: T,
    metadata?: { [key: string]: unknown }
  ): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(eventType, key, data, metadata)
        } catch (error) {
          console.error(`Cache event listener error for ${eventType}:`, error)
        }
      }
    }
  }

  /**
   * 添加事件监听器
   */
  on<T>(eventType: CacheEventType, listener: CacheEventListener<T>): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener as CacheEventListener<unknown>)
  }

  /**
   * 移除事件监听器
   */
  off<T>(eventType: CacheEventType, listener: CacheEventListener<T>): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener as CacheEventListener<unknown>)
    }
  }

  /**
   * 开始维护任务
   */
  private startMaintenance(): void {
    this.maintenanceInterval = setInterval(async () => {
      if (this.isMaintenanceRunning) {
        return
      }

      this.isMaintenanceRunning = true
      try {
        await this.performMaintenance()
      } finally {
        this.isMaintenanceRunning = false
      }
    }, 60000) // 每分钟执行一次维护
  }

  /**
   * 执行维护任务
   */
  private async performMaintenance(): Promise<void> {
    // 清理过期项
    const expiredKeys: string[] = []
    for (const [key, item] of this.memoryCache) {
      if (this.isExpired(item)) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key)
      this.emitEvent('expire', key)
    }

    // 更新内存使用统计
    this.updateMemoryUsage()

    // 如果内存使用过高，执行额外的清理
    if (this.stats.memoryUsage > 0.8) { // 超过80%
      await this.performEmergencyCleanup()
    }
  }

  /**
   * 更新内存使用统计
   */
  private updateMemoryUsage(): void {
    this.stats.memoryUsage = this.stats.totalSize / this.strategy.maxSize
  }

  /**
   * 执行紧急清理
   */
  private async performEmergencyCleanup(): Promise<void> {
    const targetSize = this.strategy.maxSize * 0.6 // 清理到60%

    while (this.stats.totalSize > targetSize && this.memoryCache.size > 0) {
      await this.evictOne()
    }

    console.warn('Emergency cache cleanup performed', {
      remainingItems: this.stats.totalItems,
      remainingSize: this.stats.totalSize,
      memoryUsage: this.stats.memoryUsage
    })
  }

  /**
   * 停止维护任务
   */
  stopMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval)
      this.maintenanceInterval = undefined
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 获取缓存配置
   */
  getStrategy(): CacheStrategy {
    return { ...this.strategy }
  }

  /**
   * 更新缓存策略
   */
  updateStrategy(newStrategy: Partial<CacheStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy }
  }

  /**
   * 执行内存清理
   */
  async performMemoryCleanup(): Promise<{
    itemsEvicted: number
    sizeReclaimed: number
    memoryUsageBefore: number
    memoryUsageAfter: number
  }> {
    const initialItems = this.stats.totalItems
    const initialSize = this.stats.totalSize
    const initialUsage = this.stats.memoryUsage

    // 清理过期项
    await this.performMaintenance()

    // 如果仍然需要更多空间，强制清理
    const targetSize = this.strategy.maxSize * 0.5 // 清理到50%
    while (this.stats.totalSize > targetSize && this.memoryCache.size > 0) {
      await this.evictOne()
    }

    return {
      itemsEvicted: initialItems - this.stats.totalItems,
      sizeReclaimed: initialSize - this.stats.totalSize,
      memoryUsageBefore: initialUsage,
      memoryUsageAfter: this.stats.memoryUsage
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopMaintenance()
    this.clear()
    this.eventListeners.clear()
  }
}

// 导出全局实例
export const globalDataCache = new DataCacheManager({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxItems: 5000,
  defaultTTL: 15 * 60 * 1000, // 15分钟
  evictionPolicy: 'LRU'
}) 