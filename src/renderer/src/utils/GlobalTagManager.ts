/**
 * 全局标签管理器
 * 负责管理全局标签的获取、缓存和同步
 */
import { LRUCache } from 'lru-cache'

// 全局标签数据接口
export interface GlobalTagsData {
  topTags: Array<{ tag: string; count: number }>
  tagRelations: Array<{ source: string; target: string; strength: number }>
  documentTags: Array<{ filePath: string; tags: string[] }>
}

// 缓存项接口
interface CacheItem {
  data: GlobalTagsData
  timestamp: number
  fingerprint: string // 用于数据完整性检查
}

// 标签变更监听器类型
type TagChangeListener = (tags: GlobalTagsData) => void

// 缓存键常量
const CACHE_KEYS = {
  GLOBAL_TAGS: 'global_tags_main',
  TAG_FILTER: 'tag_filter_',
  TAG_SUGGESTIONS: 'tag_suggestions_'
} as const

class GlobalTagManager {
  // 主缓存：使用LRU缓存替代简单的对象缓存
  private cache: LRUCache<string, CacheItem>

  // 过滤结果缓存：缓存搜索和过滤结果
  private filterCache: LRUCache<string, Array<{ tag: string; count: number }>>

  // 建议缓存：缓存标签自动完成建议
  private suggestionCache: LRUCache<string, Array<{ tag: string; count: number }>>

  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
  private readonly STORAGE_KEY = 'global_tags_persistent_cache'
  private listeners: Set<TagChangeListener> = new Set()
  private isLoading = false
  private loadPromise: Promise<GlobalTagsData> | null = null

  constructor() {
    // 主缓存：存储全局标签数据
    this.cache = new LRUCache<string, CacheItem>({
      max: 50, // 最多50个不同的缓存项
      ttl: this.CACHE_DURATION,
      allowStale: true, // 允许返回过期数据
      updateAgeOnGet: true, // 访问时更新年龄
      sizeCalculation: (item: CacheItem) => {
        // 计算缓存项的大小（字节数的近似值）
        return JSON.stringify(item.data).length + 100 // 加上元数据开销
      },
      maxSize: 5 * 1024 * 1024, // 最大5MB缓存
      dispose: (value, key, reason) => {
        console.debug(`缓存项被移除: ${key}, 原因: ${reason}`)
      }
    })

    // 过滤结果缓存：存储标签过滤结果
    this.filterCache = new LRUCache<string, Array<{ tag: string; count: number }>>({
      max: 100, // 最多100个过滤结果
      ttl: 2 * 60 * 1000, // 2分钟TTL，比主缓存短
      allowStale: false
    })

    // 建议缓存：存储标签建议结果
    this.suggestionCache = new LRUCache<string, Array<{ tag: string; count: number }>>({
      max: 200, // 最多200个建议结果
      ttl: 30 * 1000, // 30秒TTL，用于快速响应
      allowStale: false
    })

    // 初始化时尝试恢复持久化缓存
    this.loadPersistentCache()

    // 监听窗口卸载，保存缓存
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.savePersistentCache()
      })
    }
  }

  async getGlobalTags(forceRefresh = false): Promise<GlobalTagsData> {
    // 如果正在加载中，返回当前的加载Promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    // 检查缓存是否有效
    if (!forceRefresh) {
      const cached = this.cache.get(CACHE_KEYS.GLOBAL_TAGS)
      if (cached && this.isCacheValid(cached)) {
        return cached.data
      }
    }

    // 开始加载数据
    this.isLoading = true
    this.loadPromise = this.loadTagsFromAPI()

    try {
      const data = await this.loadPromise
      this.updateCache(data)
      this.notifyListeners(data)
      return data
    } finally {
      this.isLoading = false
      this.loadPromise = null
    }
  }

  /**
   * 刷新全局标签数据
   * @returns 全局标签数据
   */
  async refreshGlobalTags(): Promise<GlobalTagsData> {
    return this.getGlobalTags(true)
  }

  /**
   * 获取缓存的标签列表（仅标签名）
   * @returns 标签名数组
   */
  getCachedTagNames(): string[] {
    const cached = this.cache.get(CACHE_KEYS.GLOBAL_TAGS)
    if (!cached) {
      return []
    }
    return cached.data.topTags.map((tag) => tag.tag)
  }

  /**
   * 检查标签是否存在于全局标签库中
   * @param tagName 标签名
   * @returns 是否存在
   */
  hasTag(tagName: string): boolean {
    const cached = this.cache.get(CACHE_KEYS.GLOBAL_TAGS)
    if (!cached) {
      return false
    }
    return cached.data.topTags.some((tag) => tag.tag === tagName)
  }

  /**
   * 获取标签的使用次数
   * @param tagName 标签名
   * @returns 使用次数，如果不存在返回0
   */
  getTagCount(tagName: string): number {
    const cached = this.cache.get(CACHE_KEYS.GLOBAL_TAGS)
    if (!cached) {
      return 0
    }
    const tag = cached.data.topTags.find((tag) => tag.tag === tagName)
    return tag ? tag.count : 0
  }

  /**
   * 根据查询过滤标签（使用缓存优化）
   * @param query 查询字符串
   * @param limit 返回数量限制
   * @returns 过滤后的标签数组
   */
  filterTags(query: string, limit = 10): Array<{ tag: string; count: number }> {
    const cacheKey = `${CACHE_KEYS.TAG_FILTER}${query.toLowerCase()}_${limit}`

    // 检查过滤结果缓存
    const cachedResult = this.filterCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    const cached = this.cache.get(CACHE_KEYS.GLOBAL_TAGS)
    if (!cached) {
      return []
    }

    const lowerQuery = query.toLowerCase()
    const result = cached.data.topTags
      .filter((tag) => tag.tag.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        // 优先显示以查询开头的标签
        const aStartsWith = a.tag.toLowerCase().startsWith(lowerQuery)
        const bStartsWith = b.tag.toLowerCase().startsWith(lowerQuery)

        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1

        // 然后按使用次数排序
        return b.count - a.count
      })
      .slice(0, limit)

    // 缓存结果
    this.filterCache.set(cacheKey, result)
    return result
  }

  /**
   * 获取标签建议（智能缓存）
   * @param partial 部分输入
   * @param limit 建议数量
   * @returns 建议标签列表
   */
  getTagSuggestions(partial: string, limit = 5): Array<{ tag: string; count: number }> {
    const cacheKey = `${CACHE_KEYS.TAG_SUGGESTIONS}${partial.toLowerCase()}_${limit}`

    // 检查建议缓存
    const cachedResult = this.suggestionCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    // 如果缓存未命中，使用filterTags并缓存结果
    const result = this.filterTags(partial, limit)
    this.suggestionCache.set(cacheKey, result)
    return result
  }

  /**
   * 添加标签变更监听器
   * @param listener 监听器函数
   * @returns 移除监听器的函数
   */
  addChangeListener(listener: TagChangeListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear()
    this.filterCache.clear()
    this.suggestionCache.clear()

    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.warn('清除持久化缓存失败:', error)
    }
  }

  /**
   * 内存清理（响应内存压力）
   */
  performMemoryCleanup(): {
    clearedItems: number
    freedSpace: number
  } {
    let clearedItems = 0
    let freedSpace = 0

    // 获取清理前的大小
    const beforeSize =
      this.cache.calculatedSize +
      this.filterCache.size * 1000 + // 估算每项1KB
      this.suggestionCache.size * 500 // 估算每项0.5KB

    // 清理过滤缓存（最不重要）
    if (this.filterCache.size > 0) {
      clearedItems += this.filterCache.size
      this.filterCache.clear()
    }

    // 清理建议缓存
    if (this.suggestionCache.size > 0) {
      clearedItems += this.suggestionCache.size
      this.suggestionCache.clear()
    }

    // 如果内存压力很大，清理主缓存中的旧项
    const cacheItem = this.cache.get(CACHE_KEYS.GLOBAL_TAGS)
    if (cacheItem && !this.isCacheValid(cacheItem)) {
      this.cache.delete(CACHE_KEYS.GLOBAL_TAGS)
      clearedItems += 1
    }

    // 计算释放的空间
    const afterSize =
      this.cache.calculatedSize + this.filterCache.size * 1000 + this.suggestionCache.size * 500

    freedSpace = beforeSize - afterSize

    return {
      clearedItems,
      freedSpace
    }
  }

  /**
   * 预加载标签数据（后台加载，不阻塞）
   */
  preloadTags(): void {
    // 异步加载，不等待结果
    this.getGlobalTags().catch((error) => {
      console.warn('预加载标签数据失败:', error)
    })
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    mainCache: { size: number; maxSize: number; calculatedSize: number }
    filterCache: { size: number; maxSize: number }
    suggestionCache: { size: number; maxSize: number }
  } {
    return {
      mainCache: {
        size: this.cache.size,
        maxSize: this.cache.max,
        calculatedSize: this.cache.calculatedSize
      },
      filterCache: {
        size: this.filterCache.size,
        maxSize: this.filterCache.max
      },
      suggestionCache: {
        size: this.suggestionCache.size,
        maxSize: this.suggestionCache.max
      }
    }
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cacheItem: CacheItem): boolean {
    const now = Date.now()
    return now - cacheItem.timestamp < this.CACHE_DURATION
  }

  /**
   * 从API加载标签数据
   */
  private async loadTagsFromAPI(): Promise<GlobalTagsData> {
    try {
      const response = await (window.api as any).tags.getGlobalTags()

      if (!response.success) {
        throw new Error(response.error || '获取全局标签数据失败')
      }

      if (!response.tagsData) {
        // 返回空数据而不是抛出错误
        return {
          topTags: [],
          tagRelations: [],
          documentTags: []
        }
      }

      return response.tagsData
    } catch (error) {
      // 返回空数据作为降级处理
      return {
        topTags: [],
        tagRelations: [],
        documentTags: []
      }
    }
  }

  /**
   * 更新缓存
   */
  private updateCache(data: GlobalTagsData): void {
    const cacheItem: CacheItem = {
      data,
      timestamp: Date.now(),
      fingerprint: this.generateFingerprint(data)
    }

    this.cache.set(CACHE_KEYS.GLOBAL_TAGS, cacheItem)

    // 清除相关的过滤和建议缓存
    this.filterCache.clear()
    this.suggestionCache.clear()

    // 保存到持久化存储
    this.savePersistentCache()
  }

  /**
   * 生成数据指纹用于完整性检查
   */
  private generateFingerprint(data: GlobalTagsData): string {
    const content = JSON.stringify({
      tagCount: data.topTags.length,
      relationCount: data.tagRelations.length,
      docCount: data.documentTags.length,
      topTagsHash: data.topTags
        .slice(0, 10)
        .map((t) => `${t.tag}:${t.count}`)
        .join(',')
    })

    // 简单的哈希函数
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }

  /**
   * 加载持久化缓存
   */
  private loadPersistentCache(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const cacheItem: CacheItem = JSON.parse(stored)

        // 验证数据完整性
        if (cacheItem.data && cacheItem.timestamp && Array.isArray(cacheItem.data.topTags)) {
          this.cache.set(CACHE_KEYS.GLOBAL_TAGS, cacheItem)
        }
      }
    } catch (error) {
      console.warn('加载持久化缓存失败:', error)
      // 清除损坏的缓存
      try {
        localStorage.removeItem(this.STORAGE_KEY)
      } catch (cleanupError) {
        // 忽略清理错误
      }
    }
  }

  /**
   * 保存持久化缓存
   */
  private savePersistentCache(): void {
    try {
      const cacheItem = this.cache.get(CACHE_KEYS.GLOBAL_TAGS)
      if (cacheItem) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheItem))
      }
    } catch (error) {
      console.warn('保存持久化缓存失败:', error)
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(data: GlobalTagsData): void {
    this.listeners.forEach((listener) => {
      try {
        listener(data)
      } catch (error) {
        console.error('标签变更监听器执行失败:', error)
      }
    })
  }
}

// 单例实例
export const globalTagManager = new GlobalTagManager()

// 导出类型和实例
export default globalTagManager
export { GlobalTagManager }
