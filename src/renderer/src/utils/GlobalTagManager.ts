/**
 * 全局标签管理器
 * 负责管理全局标签的获取、缓存和同步
 */

// 全局标签数据接口
export interface GlobalTagsData {
  topTags: Array<{ tag: string; count: number }>
  tagRelations: Array<{ source: string; target: string; strength: number }>
  documentTags: Array<{ filePath: string; tags: string[] }>
}

// 标签缓存项接口
interface TagCacheItem {
  data: GlobalTagsData
  timestamp: number
  version: number
}

// 标签变更监听器类型
type TagChangeListener = (tags: GlobalTagsData) => void

class GlobalTagManager {
  private cache: TagCacheItem | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
  private readonly CACHE_KEY = 'global_tags_cache'
  private listeners: Set<TagChangeListener> = new Set()
  private isLoading = false
  private loadPromise: Promise<GlobalTagsData> | null = null

  async getGlobalTags(forceRefresh = false): Promise<GlobalTagsData> {
    // 如果正在加载中，返回当前的加载Promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    // 检查缓存是否有效
    if (!forceRefresh && this.isCacheValid()) {
      return this.cache!.data
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
    if (!this.cache) {
      return []
    }
    return this.cache.data.topTags.map((tag) => tag.tag)
  }

  /**
   * 检查标签是否存在于全局标签库中
   * @param tagName 标签名
   * @returns 是否存在
   */
  hasTag(tagName: string): boolean {
    if (!this.cache) {
      return false
    }
    return this.cache.data.topTags.some((tag) => tag.tag === tagName)
  }

  /**
   * 获取标签的使用次数
   * @param tagName 标签名
   * @returns 使用次数，如果不存在返回0
   */
  getTagCount(tagName: string): number {
    if (!this.cache) {
      return 0
    }
    const tag = this.cache.data.topTags.find((tag) => tag.tag === tagName)
    return tag ? tag.count : 0
  }

  /**
   * 根据查询过滤标签
   * @param query 查询字符串
   * @param limit 返回数量限制
   * @returns 过滤后的标签数组
   */
  filterTags(query: string, limit = 10): Array<{ tag: string; count: number }> {
    if (!this.cache) {
      return []
    }

    const lowerQuery = query.toLowerCase()
    return this.cache.data.topTags
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
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null
    try {
      localStorage.removeItem(this.CACHE_KEY)
    } catch (error) {
      console.warn('清除标签缓存失败:', error)
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
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    if (!this.cache) {
      // 尝试从localStorage恢复缓存
      this.loadCacheFromStorage()
    }

    if (!this.cache) {
      return false
    }

    const now = Date.now()
    return now - this.cache.timestamp < this.CACHE_DURATION
  }

  /**   * 从API加载标签数据   */ private async loadTagsFromAPI(): Promise<GlobalTagsData> {
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
    const cacheItem: TagCacheItem = {
      data,
      timestamp: Date.now(),
      version: 1
    }

    this.cache = cacheItem

    // 保存到localStorage
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('保存标签缓存失败:', error)
    }
  }

  /**
   * 从localStorage加载缓存
   */
  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (cached) {
        const cacheItem: TagCacheItem = JSON.parse(cached)
        // 验证缓存数据结构
        if (cacheItem.data && cacheItem.timestamp && Array.isArray(cacheItem.data.topTags)) {
          this.cache = cacheItem
        }
      }
    } catch (error) {
      console.warn('加载标签缓存失败:', error)
      // 清除损坏的缓存
      try {
        localStorage.removeItem(this.CACHE_KEY)
      } catch (e) {
        // 忽略清除失败
      }
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(data: GlobalTagsData): void {
    this.listeners.forEach((listener) => {
      try {
        listener(data)
      } catch (error) {
        
      }
    })
  }
}

// 创建全局单例实例
export const globalTagManager = new GlobalTagManager()

// 导出类型和实例
export default globalTagManager
export { GlobalTagManager }
