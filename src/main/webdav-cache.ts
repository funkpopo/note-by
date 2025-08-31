import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

// WebDAV同步记录类型定义
export interface WebDAVSyncRecord {
  filePath: string
  remotePath: string
  lastSyncTime: number
  lastModifiedLocal: number
  lastModifiedRemote: number
  contentHash: string
  fileSize: number
  expiresAt?: number // 缓存过期时间戳
}

// 缓存文件结构
interface SyncCacheData {
  version: string
  lastSync: number
  files: Record<string, Omit<WebDAVSyncRecord, 'filePath'>>
  cacheConfig?: {
    defaultTTL: number // 默认过期时间 (毫秒)
    maxEntries: number // 最大缓存条目数
    enableExpiration: boolean // 是否启用过期机制
  }
}

// 内存中的缓存数据
let cacheData: SyncCacheData | null = null
let cacheLoaded = false

// 默认缓存配置
const DEFAULT_CACHE_CONFIG = {
  defaultTTL: 24 * 60 * 60 * 1000, // 24小时 (毫秒)
  maxEntries: 1000, // 最大缓存条目数
  enableExpiration: true // 启用过期机制
}

// 检查缓存记录是否过期
function isExpired(record: Omit<WebDAVSyncRecord, 'filePath'>, config: SyncCacheData['cacheConfig']): boolean {
  if (!config?.enableExpiration || !record.expiresAt) {
    return false // 如果未启用过期机制或没有过期时间，则不过期
  }
  return Date.now() > record.expiresAt
}

// 清理过期缓存条目
function cleanExpiredEntries(data: SyncCacheData): void {
  if (!data.cacheConfig?.enableExpiration) return

  const now = Date.now()
  const filesToRemove: string[] = []

  for (const [filePath, record] of Object.entries(data.files)) {
    if (record.expiresAt && now > record.expiresAt) {
      filesToRemove.push(filePath)
    }
  }

  for (const filePath of filesToRemove) {
    delete data.files[filePath]
  }
}

// 限制缓存条目数量（LRU策略）
function limitCacheEntries(data: SyncCacheData): void {
  const maxEntries = data.cacheConfig?.maxEntries || DEFAULT_CACHE_CONFIG.maxEntries
  const entries = Object.entries(data.files)

  if (entries.length <= maxEntries) return

  // 按lastSyncTime排序，移除最旧的条目
  entries.sort((a, b) => (a[1].lastSyncTime || 0) - (b[1].lastSyncTime || 0))
  
  const entriesToRemove = entries.slice(0, entries.length - maxEntries)
  for (const [filePath] of entriesToRemove) {
    delete data.files[filePath]
  }
}

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
      
      // 确保缓存配置存在
      if (!cacheData.cacheConfig) {
        cacheData.cacheConfig = { ...DEFAULT_CACHE_CONFIG }
      }
      
      // 清理过期条目
      cleanExpiredEntries(cacheData)
      
      // 限制缓存条目数量
      limitCacheEntries(cacheData)
      
    } else {
      // 创建默认缓存
      cacheData = {
        version: '1.0',
        lastSync: Date.now(),
        files: {},
        cacheConfig: { ...DEFAULT_CACHE_CONFIG }
      }
      // 将默认缓存保存到文件
      await saveCache(cacheData)
    }

    cacheLoaded = true
    return cacheData
  } catch {
    // 出错时返回新的空缓存
    cacheData = {
      version: '1.0',
      lastSync: Date.now(),
      files: {},
      cacheConfig: { ...DEFAULT_CACHE_CONFIG }
    }
    cacheLoaded = true
    return cacheData
  }
}

// 保存缓存数据到文件
async function saveCache(data: SyncCacheData): Promise<boolean> {
  const cacheFilePath = getCacheFilePath()

  try {
    // 清理过期条目
    cleanExpiredEntries(data)
    
    // 限制缓存条目数量
    limitCacheEntries(data)
    
    // 更新最后同步时间
    data.lastSync = Date.now()
    // 将数据写入文件
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
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

    // 检查记录是否过期
    if (isExpired(record, cache.cacheConfig)) {
      // 记录已过期，删除并返回null
      delete cache.files[filePath]
      await saveCache(cache)
      return null
    }

    // 转换回完整的WebDAVSyncRecord
    return {
      filePath,
      remotePath: record.remotePath,
      lastSyncTime: record.lastSyncTime,
      lastModifiedLocal: record.lastModifiedLocal,
      lastModifiedRemote: record.lastModifiedRemote,
      contentHash: record.contentHash,
      fileSize: record.fileSize,
      expiresAt: record.expiresAt
    }
  } catch {
    return null
  }
}

// 保存或更新WebDAV同步记录
export async function saveWebDAVSyncRecord(record: WebDAVSyncRecord): Promise<boolean> {
  try {
    const cache = await loadCache()

    // 如果没有设置过期时间且启用了过期机制，则设置默认过期时间
    let expiresAt = record.expiresAt
    if (cache.cacheConfig?.enableExpiration && !expiresAt) {
      expiresAt = Date.now() + (cache.cacheConfig.defaultTTL || DEFAULT_CACHE_CONFIG.defaultTTL)
    }

    // 存储记录，排除filePath字段（作为键使用）
    cache.files[record.filePath] = {
      remotePath: record.remotePath,
      lastSyncTime: record.lastSyncTime,
      lastModifiedLocal: record.lastModifiedLocal,
      lastModifiedRemote: record.lastModifiedRemote,
      contentHash: record.contentHash,
      fileSize: record.fileSize,
      expiresAt
    }

    // 保存更新后的缓存
    return saveCache(cache)
  } catch {
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
      return saveCache(cache)
    }

    return true // 记录不存在也视为成功
  } catch {
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
      files: {},
      cacheConfig: { ...DEFAULT_CACHE_CONFIG }
    }

    // 保存空缓存
    return saveCache(cacheData)
  } catch {
    return false
  }
}

// 获取所有WebDAV同步记录（用于调试）
export async function getAllWebDAVSyncRecords(): Promise<WebDAVSyncRecord[]> {
  try {
    const cache = await loadCache()

    // 将缓存中的记录转换为WebDAVSyncRecord数组，过滤掉过期记录
    const records: WebDAVSyncRecord[] = []
    const expiredFiles: string[] = []

    for (const [filePath, record] of Object.entries(cache.files)) {
      if (isExpired(record, cache.cacheConfig)) {
        expiredFiles.push(filePath)
      } else {
        records.push({
          filePath,
          ...record
        })
      }
    }

    // 删除过期记录
    if (expiredFiles.length > 0) {
      for (const filePath of expiredFiles) {
        delete cache.files[filePath]
      }
      await saveCache(cache)
    }

    return records
  } catch {
    return []
  }
}

// 获取上次全局同步时间
export async function getLastGlobalSyncTime(): Promise<number> {
  try {
    const cache = await loadCache()
    return cache.lastSync || 0
  } catch {
    return 0
  }
}

// 更新上次全局同步时间
export async function updateLastGlobalSyncTime(): Promise<boolean> {
  try {
    const cache = await loadCache()
    cache.lastSync = Date.now()
    return saveCache(cache)
  } catch {
    return false
  }
}

// 设置缓存配置
export async function setCacheConfig(config: Partial<SyncCacheData['cacheConfig']>): Promise<boolean> {
  try {
    const cache = await loadCache()
    cache.cacheConfig = { ...cache.cacheConfig, ...config }
    return saveCache(cache)
  } catch {
    return false
  }
}

// 获取缓存配置
export async function getCacheConfig(): Promise<SyncCacheData['cacheConfig'] | null> {
  try {
    const cache = await loadCache()
    return cache.cacheConfig || null
  } catch {
    return null
  }
}

// 手动清理过期缓存
export async function cleanExpiredCache(): Promise<{ success: boolean; removedCount: number }> {
  try {
    const cache = await loadCache()
    const beforeCount = Object.keys(cache.files).length
    
    cleanExpiredEntries(cache)
    
    const afterCount = Object.keys(cache.files).length
    const removedCount = beforeCount - afterCount
    
    if (removedCount > 0) {
      await saveCache(cache)
    }
    
    return { success: true, removedCount }
  } catch {
    return { success: false, removedCount: 0 }
  }
}

// 获取缓存统计信息
export async function getCacheStats(): Promise<{
  totalEntries: number
  expiredEntries: number
  cacheSize: number
  oldestEntry?: number
  newestEntry?: number
}> {
  try {
    const cache = await loadCache()
    const entries = Object.values(cache.files)
    const now = Date.now()
    
    let expiredCount = 0
    let oldestSync = Infinity
    let newestSync = 0
    
    for (const entry of entries) {
      if (isExpired(entry, cache.cacheConfig)) {
        expiredCount++
      }
      if (entry.lastSyncTime < oldestSync) {
        oldestSync = entry.lastSyncTime
      }
      if (entry.lastSyncTime > newestSync) {
        newestSync = entry.lastSyncTime
      }
    }
    
    return {
      totalEntries: entries.length,
      expiredEntries: expiredCount,
      cacheSize: JSON.stringify(cache).length,
      oldestEntry: oldestSync === Infinity ? undefined : oldestSync,
      newestEntry: newestSync === 0 ? undefined : newestSync
    }
  } catch {
    return {
      totalEntries: 0,
      expiredEntries: 0,
      cacheSize: 0
    }
  }
}
