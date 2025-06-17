import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { mainErrorHandler, ErrorCategory } from './utils/ErrorHandler'

// WebDAV同步记录类型定义
export interface WebDAVSyncRecord {
  filePath: string
  remotePath: string
  lastSyncTime: number
  lastModifiedLocal: number
  lastModifiedRemote: number
  contentHash: string
  fileSize: number
}

// 缓存文件结构
interface SyncCacheData {
  version: string
  lastSync: number
  files: Record<string, Omit<WebDAVSyncRecord, 'filePath'> & {
    lastAccessTime?: number // 最后访问时间
    createdTime?: number // 创建时间
  }>
  settings?: {
    maxCacheAgeMs?: number // 最大缓存时间（毫秒）
    maxCacheEntries?: number // 最大缓存条目数
    cleanupIntervalMs?: number // 清理检查间隔
  }
}

// 内存中的缓存数据
let cacheData: SyncCacheData | null = null
let cacheLoaded = false

// 默认缓存设置
const DEFAULT_CACHE_SETTINGS = {
  maxCacheAgeMs: 30 * 24 * 60 * 60 * 1000, // 30天
  maxCacheEntries: 1000, // 最大1000个条目
  cleanupIntervalMs: 24 * 60 * 60 * 1000 // 每24小时检查一次
}

// 定时清理定时器
let cleanupTimer: NodeJS.Timeout | null = null

// 获取缓存文件路径
function getCacheFilePath(): string {
  // 使用与settings.json相同的目录存储缓存文件
  if (is.dev) {
    // 开发环境，使用项目根目录
    return path.join(process.cwd(), 'webdav_sync_cache.json')
  } else {
    // 生产环境，使用应用程序所在目录
    return path.join(path.dirname(app.getPath('exe')), 'webdav_sync_cache.json')
  }
}

// 加载缓存数据
async function loadCache(): Promise<SyncCacheData> {
  if (cacheLoaded && cacheData) {
    return cacheData
  }

  const cacheFilePath = getCacheFilePath()

  try {
    // 检查文件是否存在
    if (fs.existsSync(cacheFilePath)) {
      const data = await fs.promises.readFile(cacheFilePath, 'utf-8')
      cacheData = JSON.parse(data) as SyncCacheData
    } else {
      // 创建默认缓存
      cacheData = {
        version: '1.0',
        lastSync: Date.now(),
        files: {},
        settings: { ...DEFAULT_CACHE_SETTINGS }
      }
      // 将默认缓存保存到文件
      await saveCache(cacheData)
    }

    cacheLoaded = true
    return cacheData
  } catch (error) {
    // 出错时返回新的空缓存
    cacheData = {
      version: '1.0',
      lastSync: Date.now(),
      files: {},
      settings: { ...DEFAULT_CACHE_SETTINGS }
    }
    cacheLoaded = true
    return cacheData
  }
}

// 保存缓存数据到文件
async function saveCache(data: SyncCacheData): Promise<boolean> {
  const cacheFilePath = getCacheFilePath()

  try {
    // 更新最后同步时间
    data.lastSync = Date.now()
    // 将数据写入文件
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    return false
  }
}

// 获取特定文件的WebDAV同步记录
export async function getWebDAVSyncRecord(filePath: string): Promise<WebDAVSyncRecord | null> {
  try {
    const cache = await loadCache()
    const record = cache.files[filePath]

    if (!record) {
      return null
    }

    // 更新最后访问时间
    const now = Date.now()
    record.lastAccessTime = now
    cache.files[filePath] = record
    await saveCache(cache)

    // 转换回完整的WebDAVSyncRecord
    return {
      filePath,
      remotePath: record.remotePath,
      lastSyncTime: record.lastSyncTime,
      lastModifiedLocal: record.lastModifiedLocal,
      lastModifiedRemote: record.lastModifiedRemote,
      contentHash: record.contentHash,
      fileSize: record.fileSize
    }
  } catch (error) {
    return null
  }
}

// 保存或更新WebDAV同步记录
export async function saveWebDAVSyncRecord(record: WebDAVSyncRecord): Promise<boolean> {
  try {
    const cache = await loadCache()

    const now = Date.now()
    
    // 存储记录，排除filePath字段（作为键使用）
    cache.files[record.filePath] = {
      remotePath: record.remotePath,
      lastSyncTime: record.lastSyncTime,
      lastModifiedLocal: record.lastModifiedLocal,
      lastModifiedRemote: record.lastModifiedRemote,
      contentHash: record.contentHash,
      fileSize: record.fileSize,
      lastAccessTime: now,
      createdTime: cache.files[record.filePath]?.createdTime || now
    }

    // 保存更新后的缓存
    return await saveCache(cache)
  } catch (error) {
    return false
  }
}

// 删除特定文件的同步记录
export async function deleteWebDAVSyncRecord(filePath: string): Promise<boolean> {
  try {
    const cache = await loadCache()

    // 如果记录存在，则删除
    if (cache.files[filePath]) {
      delete cache.files[filePath]
      return await saveCache(cache)
    }

    return true // 记录不存在也视为成功
  } catch (error) {
    return false
  }
}

// 清除所有WebDAV同步缓存
export async function clearWebDAVSyncCache(): Promise<boolean> {
  try {
    // 重置缓存数据
    cacheData = {
      version: '1.0',
      lastSync: Date.now(),
      files: {}
    }

    // 保存空缓存
    return await saveCache(cacheData)
  } catch (error) {
    return false
  }
}

// 获取所有WebDAV同步记录（用于调试）
export async function getAllWebDAVSyncRecords(): Promise<WebDAVSyncRecord[]> {
  try {
    const cache = await loadCache()

    // 将缓存中的记录转换为WebDAVSyncRecord数组
    return Object.entries(cache.files).map(([filePath, record]) => ({
      filePath,
      ...record
    }))
  } catch (error) {
    return []
  }
}

// 获取上次全局同步时间
export async function getLastGlobalSyncTime(): Promise<number> {
  try {
    const cache = await loadCache()
    return cache.lastSync || 0
  } catch (error) {
    return 0
  }
}

// 更新上次全局同步时间
export async function updateLastGlobalSyncTime(): Promise<boolean> {
  try {
    const cache = await loadCache()
    cache.lastSync = Date.now()
    return await saveCache(cache)
  } catch (error) {
    mainErrorHandler.error('Failed to update global sync time', error, ErrorCategory.WEBDAV, 'updateLastGlobalSyncTime')
    return false
  }
}

// 清理陈旧缓存条目
export async function cleanupStaleCache(): Promise<{
  success: boolean
  cleaned: number
  error?: string
}> {
  try {
    const cache = await loadCache()
    const settings = { ...DEFAULT_CACHE_SETTINGS, ...cache.settings }
    const now = Date.now()
    let cleanedCount = 0

    const filesToKeep: typeof cache.files = {}
    const entries = Object.entries(cache.files)

    // 按最后访问时间排序（最近访问的在后面）
    entries.sort((a, b) => {
      const aTime = a[1].lastAccessTime || a[1].lastSyncTime || 0
      const bTime = b[1].lastAccessTime || b[1].lastSyncTime || 0
      return aTime - bTime
    })

    for (const [filePath, record] of entries) {
      const lastAccessTime = record.lastAccessTime || record.lastSyncTime || 0
      const age = now - lastAccessTime

      // 检查是否超过最大缓存时间
      if (age > settings.maxCacheAgeMs!) {
        cleanedCount++
        mainErrorHandler.debug(
          `Cleaned stale cache entry: ${filePath}`,
          ErrorCategory.WEBDAV,
          'cleanupStaleCache',
          { age: age / (24 * 60 * 60 * 1000), maxAge: settings.maxCacheAgeMs! / (24 * 60 * 60 * 1000) }
        )
        continue
      }

      // 检查是否超过最大条目数（保留最近访问的）
      if (Object.keys(filesToKeep).length >= settings.maxCacheEntries!) {
        cleanedCount++
        continue
      }

      filesToKeep[filePath] = record
    }

    // 更新缓存
    cache.files = filesToKeep
    await saveCache(cache)

    mainErrorHandler.info(
      `Cache cleanup completed: ${cleanedCount} entries cleaned`,
      ErrorCategory.WEBDAV,
      'cleanupStaleCache',
      { totalEntries: entries.length, remaining: Object.keys(filesToKeep).length }
    )

    return {
      success: true,
      cleaned: cleanedCount
    }
  } catch (error) {
    mainErrorHandler.error('Failed to cleanup stale cache', error, ErrorCategory.WEBDAV, 'cleanupStaleCache')
    return {
      success: false,
      cleaned: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 初始化自动清理
export function initializeAutoCleanup(): void {
  // 清除现有定时器
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
  }

  // 立即执行一次清理
  cleanupStaleCache().catch(() => {
    // 静默处理错误
  })

  // 设置定时清理
  cleanupTimer = setInterval(() => {
    cleanupStaleCache().catch(() => {
      // 静默处理错误
    })
  }, DEFAULT_CACHE_SETTINGS.cleanupIntervalMs)

  mainErrorHandler.info(
    'WebDAV cache auto-cleanup initialized',
    ErrorCategory.WEBDAV,
    'initializeAutoCleanup',
    { intervalMs: DEFAULT_CACHE_SETTINGS.cleanupIntervalMs }
  )
}

// 停止自动清理
export function stopAutoCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
    mainErrorHandler.info('WebDAV cache auto-cleanup stopped', ErrorCategory.WEBDAV, 'stopAutoCleanup')
  }
}

// 获取缓存统计信息
export async function getCacheStats(): Promise<{
  success: boolean
  stats?: {
    totalEntries: number
    oldestEntry: number
    newestEntry: number
    totalSize: number
    settings: typeof DEFAULT_CACHE_SETTINGS
  }
  error?: string
}> {
  try {
    const cache = await loadCache()
    const entries = Object.values(cache.files)
    
    if (entries.length === 0) {
      return {
        success: true,
        stats: {
          totalEntries: 0,
          oldestEntry: 0,
          newestEntry: 0,
          totalSize: 0,
          settings: { ...DEFAULT_CACHE_SETTINGS, ...cache.settings }
        }
      }
    }

    const times = entries.map(entry => entry.lastAccessTime || entry.lastSyncTime || 0)
    const sizes = entries.map(entry => entry.fileSize || 0)

    return {
      success: true,
      stats: {
        totalEntries: entries.length,
        oldestEntry: Math.min(...times),
        newestEntry: Math.max(...times),
        totalSize: sizes.reduce((sum, size) => sum + size, 0),
        settings: { ...DEFAULT_CACHE_SETTINGS, ...cache.settings }
      }
    }
  } catch (error) {
    mainErrorHandler.error('Failed to get cache stats', error, ErrorCategory.WEBDAV, 'getCacheStats')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 更新缓存设置
export async function updateCacheSettings(newSettings: Partial<typeof DEFAULT_CACHE_SETTINGS>): Promise<boolean> {
  try {
    const cache = await loadCache()
    cache.settings = { ...DEFAULT_CACHE_SETTINGS, ...cache.settings, ...newSettings }
    
    const result = await saveCache(cache)
    
    if (result) {
      // 重新初始化自动清理（如果清理间隔改变了）
      if (newSettings.cleanupIntervalMs) {
        initializeAutoCleanup()
      }
      
      mainErrorHandler.info(
        'Cache settings updated',
        ErrorCategory.WEBDAV,
        'updateCacheSettings',
        newSettings
      )
    }
    
    return result
  } catch (error) {
    mainErrorHandler.error('Failed to update cache settings', error, ErrorCategory.WEBDAV, 'updateCacheSettings')
    return false
  }
}
