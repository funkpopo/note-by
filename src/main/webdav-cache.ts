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
}

// 缓存文件结构
interface SyncCacheData {
  version: string
  lastSync: number
  files: Record<string, Omit<WebDAVSyncRecord, 'filePath'>>
}

// 内存中的缓存数据
let cacheData: SyncCacheData | null = null
let cacheLoaded = false

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
        files: {}
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
      files: {}
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

    // 存储记录，排除filePath字段（作为键使用）
    cache.files[record.filePath] = {
      remotePath: record.remotePath,
      lastSyncTime: record.lastSyncTime,
      lastModifiedLocal: record.lastModifiedLocal,
      lastModifiedRemote: record.lastModifiedRemote,
      contentHash: record.contentHash,
      fileSize: record.fileSize
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
    return false
  }
}