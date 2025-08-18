/**
 * 分析缓存管理器
 * 使用LRU缓存来管理数据分析结果的缓存
 */
import { LRUCache } from 'lru-cache'
import type { AnalysisCacheItem } from '../../../main/database'

// 缓存项包装器
interface CacheEntry {
  data: AnalysisCacheItem
  timestamp: number
  fingerprint: string
}

// 数据指纹计算函数
const calculateFingerprint = (stats: unknown, activityData: unknown): string => {
  interface StatsData {
    totalNotes?: number
    totalEdits?: number
    editsByDate?: Array<{ date: string }>
  }
  
  interface ActivityData {
    dailyActivity?: Record<string, unknown>
  }

  const statsTyped = stats as StatsData
  const activityTyped = activityData as ActivityData
  
  const data = {
    totalNotes: statsTyped?.totalNotes || 0,
    totalEdits: statsTyped?.totalEdits || 0,
    lastEditTime: Math.max(
      ...(statsTyped?.editsByDate || []).map((item: { date: string }) => 
        new Date(item.date).getTime()
      ),
      0
    ),
    dailyActivityKeys: Object.keys(activityTyped?.dailyActivity || {}).sort()
  }

  return JSON.stringify(data)
}

class AnalysisCacheManager {
  // 主缓存：存储分析结果
  private cache: LRUCache<string, CacheEntry>

  // 快速查找缓存：按日期和模型ID查找
  private quickLookup: LRUCache<string, string>

  // 配置常量
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30分钟缓存
  private readonly STORAGE_KEY = 'analysis_cache_persistent'

  constructor() {
    // 主缓存配置
    this.cache = new LRUCache<string, CacheEntry>({
      max: 20, // 最多20个分析结果
      ttl: this.CACHE_DURATION,
      allowStale: true,
      updateAgeOnGet: true,
      sizeCalculation: (entry: CacheEntry) => {
        // 估算缓存项大小
        return JSON.stringify(entry.data).length + 200
      },
      maxSize: 10 * 1024 * 1024, // 最大10MB缓存
      dispose: () => {
        // 分析缓存项被移除
      }
    })

    // 快速查找缓存
    this.quickLookup = new LRUCache<string, string>({
      max: 100,
      ttl: this.CACHE_DURATION,
      allowStale: false
    })

    // 初始化时加载持久化缓存
    this.loadPersistentCache()

    // 监听窗口卸载，保存缓存
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.savePersistentCache()
      })
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(date: string, modelId: string): string {
    return `analysis_${date}_${modelId}`
  }

  /**
   * 生成查找键
   */
  private generateLookupKey(date: string, modelId: string): string {
    return `lookup_${date}_${modelId}`
  }

  /**
   * 获取分析缓存
   */
  async getCachedAnalysis(
    date: string,
    modelId: string,
    stats?: unknown,
    activityData?: unknown
  ): Promise<AnalysisCacheItem | null> {
    const lookupKey = this.generateLookupKey(date, modelId)
    const cacheKey = this.quickLookup.get(lookupKey)

    if (!cacheKey) {
      return null
    }

    const cached = this.cache.get(cacheKey)
    if (!cached) {
      // 清理无效的快速查找条目
      this.quickLookup.delete(lookupKey)
      return null
    }

    // 如果提供了数据，检查数据指纹是否匹配
    if (stats && activityData) {
      const currentFingerprint = calculateFingerprint(stats, activityData)
      if (cached.fingerprint !== currentFingerprint) {
        // 数据已变更，删除过期缓存
        this.cache.delete(cacheKey)
        this.quickLookup.delete(lookupKey)
        return null
      }
    }

    return cached.data
  }

  /**
   * 保存分析结果到缓存
   */
  async setCachedAnalysis(item: AnalysisCacheItem, stats: unknown, activityData: unknown): Promise<void> {
    const cacheKey = this.generateCacheKey(item.date, item.modelId)
    const lookupKey = this.generateLookupKey(item.date, item.modelId)

    const entry: CacheEntry = {
      data: item,
      timestamp: Date.now(),
      fingerprint: calculateFingerprint(stats, activityData)
    }

    this.cache.set(cacheKey, entry)
    this.quickLookup.set(lookupKey, cacheKey)

    // 异步保存到持久化存储
    this.savePersistentCache()
  }

  /**
   * 获取最新的缓存分析结果
   */
  async getLatestCachedAnalysis(): Promise<AnalysisCacheItem | null> {
    // 按时间戳排序，获取最新的缓存
    const entries = Array.from(this.cache.values()).sort((a, b) => b.timestamp - a.timestamp)

    return entries.length > 0 ? entries[0].data : null
  }

  /**
   * 清除指定日期和模型的缓存
   */
  async clearAnalysisCache(date: string, modelId: string): Promise<void> {
    const lookupKey = this.generateLookupKey(date, modelId)
    const cacheKey = this.quickLookup.get(lookupKey)

    if (cacheKey) {
      this.cache.delete(cacheKey)
      this.quickLookup.delete(lookupKey)
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAllCache(): Promise<void> {
    this.cache.clear()
    this.quickLookup.clear()

    // 清除持久化存储
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    mainCache: { size: number; maxSize: number; calculatedSize: number }
    lookupCache: { size: number; maxSize: number }
  } {
    return {
      mainCache: {
        size: this.cache.size,
        maxSize: this.cache.max,
        calculatedSize: this.cache.calculatedSize
      },
      lookupCache: {
        size: this.quickLookup.size,
        maxSize: this.quickLookup.max
      }
    }
  }

  /**
   * 预热缓存 - 从数据库加载最新的分析结果
   */
  async preloadCache(): Promise<void> {
    try {
      const result = await window.api.analytics.getAnalysisCache()
      if (result?.success && result.cache) {
        // 将数据库中的结果加载到LRU缓存中
        const item = result.cache

        // 计算指纹时需要有stats和activityData
        if (item.stats && item.activityData) {
          await this.setCachedAnalysis(item, item.stats, item.activityData)
        }
      }
    } catch {
      // 预热分析缓存失败
    }
  }

  /**
   * 加载持久化缓存
   */
  private loadPersistentCache(): void {
    try {
      if (typeof localStorage === 'undefined') return

      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return

      const data = JSON.parse(stored)
      if (!data.version || data.version !== '1.0') return

      // 恢复缓存数据
      if (data.entries && Array.isArray(data.entries)) {
        for (const entryData of data.entries) {
          if (entryData.key && entryData.entry) {
            const age = Date.now() - entryData.entry.timestamp
            if (age < this.CACHE_DURATION) {
              this.cache.set(entryData.key, entryData.entry)

              // 恢复快速查找缓存
              const lookupKey = this.generateLookupKey(
                entryData.entry.data.date,
                entryData.entry.data.modelId
              )
              this.quickLookup.set(lookupKey, entryData.key)
            }
          }
        }
      }
    } catch {
      // 加载持久化分析缓存失败
    }
  }

  /**
   * 保存持久化缓存
   */
  private savePersistentCache(): void {
    try {
      if (typeof localStorage === 'undefined') return

      const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        entry
      }))

      const data = {
        version: '1.0',
        timestamp: Date.now(),
        entries
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch {
      // 保存持久化分析缓存失败
    }
  }
}

// 导出单例实例
export const analysisCacheManager = new AnalysisCacheManager()
