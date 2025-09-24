import { createClient, WebDAVClient, FileStat, ResponseDataDetailed } from 'webdav'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as fsTypes from 'fs'
import {
  getWebDAVSyncRecord,
  saveWebDAVSyncRecord,
  getLastGlobalSyncTime,
  updateLastGlobalSyncTime,
  WebDAVSyncRecord
} from './webdav-cache'
import { mainWindow } from './index'
import { app } from 'electron'

// 添加同步进度通知函数
function notifySyncProgress(config: {
  total: number
  processed: number
  action: 'upload' | 'download' | 'compare'
}): void {
  if (mainWindow) {
    // 原有的 WebDAV 专用进度事件
    mainWindow.webContents.send('webdav-sync-progress', config)
    // 同步桥接到云存储通用进度事件，便于云存储页面显示细粒度进度
    try {
      mainWindow.webContents.send('cloud-sync-progress', config)
    } catch {
      // ignore bridge send failures
    }
  }
}

// 清除同步缓存
export async function clearSyncCache(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const syncRecordFile = path.join(app.getPath('userData'), 'webdav-sync-record.json')
    if (fsTypes.existsSync(syncRecordFile)) {
      fsTypes.unlinkSync(syncRecordFile)
    }

    const lastSyncTimeFile = path.join(app.getPath('userData'), 'webdav-last-sync-time.json')
    if (fsTypes.existsSync(lastSyncTimeFile)) {
      fsTypes.unlinkSync(lastSyncTimeFile)
    }

    return {
      success: true,
      message: '同步缓存已清除'
    }
  } catch (error) {
    return {
      success: false,
      error: String(error)
    }
  }
}

// 定义一个更兼容的 WebDAV 文件信息类型
type WebDAVFileInfo =
  | FileStat
  | ResponseDataDetailed<FileStat>
  | {
      lastmod?: string | Date
      data?: FileStat | { lastmod?: string | Date }
      [key: string]: unknown
    }

// 获取远程文件修改时间(处理可能的不同返回类型)
function getRemoteModTime(fileInfo: WebDAVFileInfo): number {
  // 处理不同的返回类型，尝试提取 lastmod 字段
  if (fileInfo && typeof fileInfo === 'object') {
    if ('lastmod' in fileInfo) {
      return new Date(fileInfo.lastmod as string).getTime()
    } else if (fileInfo.data && 'lastmod' in fileInfo.data) {
      return new Date(fileInfo.data.lastmod as string).getTime()
    }
  }
  // 如果无法获取时间戳，返回当前时间
  return Date.now()
}

// 同步取消标志
let isSyncCancelled = false

// 重置取消标志
export function resetSyncCancellation(): void {
  isSyncCancelled = false
}

// 设置取消标志
export function cancelSync(): void {
  isSyncCancelled = true
}

// 检查是否取消同步
function checkSyncCancelled(): boolean {
  return isSyncCancelled
}

// 更新WebDAV配置接口，使其与settings.ts中的兼容
export interface WebDAVConfig {
  url: string
  username: string
  password: string
  remotePath: string
  enabled?: boolean
  syncOnStartup?: boolean
  syncDirection?: 'localToRemote' | 'remoteToLocal' | 'bidirectional'
  localPath: string // 本地路径，由调用代码指定
}

let webdavClient: WebDAVClient | null = null

export function initWebDAVClient(config: WebDAVConfig): boolean {
  try {
    webdavClient = createClient(config.url, {
      username: config.username,
      password: config.password
    })
    return true
  } catch {
    return false
  }
}

export async function testWebDAVConnection(
  config: WebDAVConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(config.url, {
      username: config.username,
      password: config.password
    })

    // 尝试列出根目录
    await client.getDirectoryContents('/')

    // 检查远程目标目录的访问权限
    try {
      const remotePathExists = await client.exists(config.remotePath)
      if (!remotePathExists) {
        // 尝试创建远程目录
        await client.createDirectory(config.remotePath)
        return { success: true, message: `连接成功，已创建远程目录: ${config.remotePath}` }
      } else {
        // 尝试列出远程目录内容以验证访问权限
        await client.getDirectoryContents(config.remotePath)
        return { success: true, message: `连接成功，远程目录访问正常: ${config.remotePath}` }
      }
    } catch (remotePathError) {
      return {
        success: false,
        message: `连接成功但无法访问远程目录 ${config.remotePath}: ${remotePathError}`
      }
    }
  } catch (error) {
    return { success: false, message: `连接失败: ${error}` }
  }
}

async function ensureRemoteDirectory(remotePath: string): Promise<boolean> {
  if (!webdavClient) return false

  try {
    // 检查目录是否存在
    const exists = await webdavClient.exists(remotePath)
    if (!exists) {
      // 创建目录
      await webdavClient.createDirectory(remotePath)
    }
    return true
  } catch {
    return false
  }
}

async function uploadFile(localFilePath: string, remoteFilePath: string): Promise<boolean> {
  if (!webdavClient) return false

  try {
    const fileContent = await fs.readFile(localFilePath)
    await webdavClient.putFileContents(remoteFilePath, fileContent)

    // 上传成功后，更新同步缓存
    try {
      // 获取本地文件状态
      const localStats = await fs.stat(localFilePath)
      const localModTime = localStats.mtime.getTime()
      const fileSize = localStats.size

      // 计算文件哈希
      const contentHash = await calculateFileHash(localFilePath)

      // 获取远程文件最新修改时间
      const remoteInfo = await webdavClient.stat(remoteFilePath)
      const remoteModTime = getRemoteModTime(remoteInfo)

      // 保存同步记录
      await saveWebDAVSyncRecord({
        filePath: localFilePath,
        remotePath: remoteFilePath,
        lastSyncTime: Date.now(),
        lastModifiedLocal: localModTime,
        lastModifiedRemote: remoteModTime,
        contentHash,
        fileSize
      })
    } catch {
      // 缓存更新失败不影响上传结果
    }

    return true
  } catch {
    return false
  }
}

async function downloadFile(remoteFilePath: string, localFilePath: string): Promise<boolean> {
  if (!webdavClient) return false

  try {
    // 确保本地目录存在
    const localDir = path.dirname(localFilePath)
    await fs.mkdir(localDir, { recursive: true })

    // 下载文件，直接以字符串形式获取
    const content = (await webdavClient.getFileContents(remoteFilePath, {
      format: 'text'
    })) as string

    // 写入文件
    await fs.writeFile(localFilePath, content)

    // 下载成功后，更新同步缓存
    try {
      // 获取本地文件状态
      const localStats = await fs.stat(localFilePath)
      const localModTime = localStats.mtime.getTime()
      const fileSize = localStats.size

      // 计算文件哈希
      const contentHash = await calculateFileHash(localFilePath)

      // 获取远程文件最新修改时间
      const remoteInfo = await webdavClient.stat(remoteFilePath)
      const remoteModTime = getRemoteModTime(remoteInfo)

      // 保存同步记录
      await saveWebDAVSyncRecord({
        filePath: localFilePath,
        remotePath: remoteFilePath,
        lastSyncTime: Date.now(),
        lastModifiedLocal: localModTime,
        lastModifiedRemote: remoteModTime,
        contentHash,
        fileSize
      })
    } catch {
      // 缓存更新失败不影响下载结果
    }

    return true
  } catch {
    return false
  }
}

async function getRemoteFiles(remotePath: string): Promise<FileStat[]> {
  if (!webdavClient) return []

  try {
    const contents = await webdavClient.getDirectoryContents(remotePath)
    return Array.isArray(contents) ? contents : []
  } catch {
    return []
  }
}

// 判断文件是否需要上传：新文件或修改过的文件


// 判断文件是否需要下载：新文件或远程有更新的文件


// 计算文件的MD5哈希
async function calculateFileHash(filePath: string): Promise<string> {
  try {
    // 使用流式处理，避免一次性读取大文件导致内存问题
    return new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const stream = fsTypes.createReadStream(filePath)

      stream.on('data', (data) => {
        hash.update(data)
      })

      stream.on('end', () => {
        resolve(hash.digest('hex'))
      })

      stream.on('error', (err) => {
        reject(err)
      })
    })
  } catch {
    // 出错时返回时间戳作为备选哈希值
    return Date.now().toString()
  }
}

// 比较本地和远程文件内容
async function compareFileContent(localFilePath: string, remoteFilePath: string): Promise<boolean> {
  if (!webdavClient) return false

  try {
    // 计算本地文件哈希
    const localHash = await calculateFileHash(localFilePath)
    if (!localHash) return true // 如果无法计算本地哈希，保守返回不同

    // 获取远程文件内容
    const remoteContent = await webdavClient.getFileContents(remoteFilePath, { format: 'binary' })
    if (!remoteContent) return true

    // 计算远程文件哈希
    const remoteHash = crypto
      .createHash('md5')
      .update(remoteContent as Buffer)
      .digest('hex')

    // 返回是否相同 (false表示内容相同，不需要同步)
    return localHash !== remoteHash
  } catch {
    return true // 出错时保守返回需要同步
  }
}

// 并行处理工具函数 - 用于批量并行处理文件操作
async function processBatchesInParallel<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize = 10,
  concurrency = 3
): Promise<R[]> {
  const results: R[] = []
  const batches: T[][] = []

  // 将项目分成批次
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  // 按照并行度处理批次
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchPromises = batches.slice(i, i + concurrency).map(async (batch) => {
      const batchResults: R[] = []
      for (const item of batch) {
        if (checkSyncCancelled()) {
          throw new Error('用户取消了同步')
        }
        const result = await processFn(item)
        batchResults.push(result)
      }
      return batchResults
    })

    // 等待当前并发批次完成
    const batchesResults = await Promise.all(batchPromises)
    // 合并结果
    for (const batchResult of batchesResults) {
      results.push(...batchResult)
    }
  }

  return results
}

export async function syncLocalToRemote(config: WebDAVConfig): Promise<{
  success: boolean
  message: string
  uploaded: number
  failed: number
  skipped: number
}> {
  if (!webdavClient) {
    const initResult = initWebDAVClient(config)
    if (!initResult) {
      return {
        success: false,
        message: 'WebDAV客户端初始化失败',
        uploaded: 0,
        failed: 0,
        skipped: 0
      }
    }
  }

  let uploaded = 0
  let failed = 0
  let skipped = 0
  let totalFiles = 0
  let processedFiles = 0

  try {
    // 确保远程根目录存在
    const remoteRootExists = await ensureRemoteDirectory(config.remotePath)
    if (!remoteRootExists) {
      return {
        success: false,
        message: `无法确保远程目录存在: ${config.remotePath}`,
        uploaded,
        failed,
        skipped
      }
    }

    // 缓存远程文件列表(按目录)
    const remoteFilesCache = new Map<string, FileStat[]>()

    // 初始进度通知
    notifySyncProgress({
      total: totalFiles,
      processed: processedFiles,
      action: 'upload'
    })

    // 递归同步函数 - 合并了收集和处理
    async function syncDirectory(localDir: string, remoteDir: string): Promise<void> {
      // 确保远程目录存在
      await ensureRemoteDirectory(remoteDir)

      // 获取远程文件列表并缓存
      if (!remoteFilesCache.has(remoteDir)) {
        const remoteFiles = await getRemoteFiles(remoteDir)
        remoteFilesCache.set(remoteDir, remoteFiles)
      }
      const remoteFiles = remoteFilesCache.get(remoteDir) || []

      // 获取本地文件列表
      const localEntries = await fs.readdir(localDir, { withFileTypes: true })
      const isInAssetsDir = path.basename(localDir) === '.assets'

      // 动态更新文件总数
      totalFiles += localEntries.filter(
        (entry) => entry.isFile() && (entry.name.endsWith('.md') || isInAssetsDir)
      ).length

      for (const entry of localEntries) {
        const localPath = path.join(localDir, entry.name)
        const remotePath = path.join(remoteDir, entry.name).replace(/\\/g, '/')

        // 检查是否在.assets目录内
        // const isInAssetsDir = path.basename(localDir) === '.assets'

        if (entry.isDirectory()) {
          // 递归同步子目录
          await syncDirectory(localPath, remotePath)
        } else if (entry.isFile() && (entry.name.endsWith('.md') || isInAssetsDir)) {
          // 同步markdown文件及.assets目录中的所有文件
          // 检查文件是否需要上传
          let shouldUpload = false
          const remoteFile = remoteFiles.find((f) => f.filename === remotePath)
          const localStats = await fs.stat(localPath)
          const localModTime = localStats.mtime.getTime()
          const localSize = localStats.size
          if (!remoteFile) {
            shouldUpload = true
          } else {
            const remoteModTime = getRemoteModTime(remoteFile)
            const remoteSize = remoteFile.size || 0
            const syncRecord = await getWebDAVSyncRecord(localPath)
            if (
              syncRecord &&
              syncRecord.lastModifiedLocal === localModTime &&
              syncRecord.fileSize === localSize &&
              syncRecord.lastModifiedRemote === remoteModTime &&
              syncRecord.fileSize === remoteSize
            ) {
              shouldUpload = false
            } else if (localSize !== remoteSize) {
              shouldUpload = true
            } else {
              shouldUpload = await compareFileContent(localPath, remotePath)
            }
          }

          if (shouldUpload) {
            // 上传文件
            const success = await uploadFile(localPath, remotePath)
            if (success) {
              uploaded++
            } else {
              failed++
            }
          } else {
            // 文件不需要上传，跳过
            skipped++
          }

          // 更新处理进度
          processedFiles++
          notifySyncProgress({
            total: totalFiles,
            processed: processedFiles,
            action: 'upload'
          })
        }
      }
    }

    // 开始同步
    await syncDirectory(config.localPath, config.remotePath)

    // 最后一次进度更新，确保UI显示100%
    if (totalFiles > 0 && processedFiles < totalFiles) {
      processedFiles = totalFiles
    }
    notifySyncProgress({
      total: totalFiles,
      processed: totalFiles,
      action: 'upload'
    })

    return {
      success: true,
      message: `同步完成: 上传了 ${uploaded} 个文件，跳过 ${skipped} 个未修改文件，失败 ${failed} 个文件`,
      uploaded,
      failed,
      skipped
    }
  } catch (error) {
    return {
      success: false,
      message: `同步失败: ${error}`,
      uploaded,
      failed,
      skipped
    }
  }
}

export async function syncRemoteToLocal(config: WebDAVConfig): Promise<{
  success: boolean
  message: string
  downloaded: number
  failed: number
  skipped: number
}> {
  if (!webdavClient) {
    const initResult = initWebDAVClient(config)
    if (!initResult) {
      return {
        success: false,
        message: 'WebDAV客户端初始化失败',
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }
  }

  let downloaded = 0
  let failed = 0
  let skipped = 0
  let totalFiles = 0
  let processedFiles = 0

  try {
    // 确保远程根目录存在
    const remoteRootExists = await ensureRemoteDirectory(config.remotePath)
    if (!remoteRootExists) {
      return {
        success: false,
        message: `无法确保远程目录存在: ${config.remotePath}`,
        downloaded,
        failed,
        skipped
      }
    }

    // 确保本地根目录存在
    await fs.mkdir(config.localPath, { recursive: true })

    // 初始进度通知
    notifySyncProgress({
      total: totalFiles,
      processed: processedFiles,
      action: 'download'
    })

    // 递归同步函数 - 合并了收集和处理
    async function syncDirectory(remotePath: string, localPath: string): Promise<void> {
      // 获取远程文件列表
      const remoteEntries = await getRemoteFiles(remotePath)

      // 动态更新总文件数
      totalFiles += remoteEntries.filter(
        (entry) =>
          entry.type === 'file' &&
          (path.basename(entry.filename).endsWith('.md') ||
            path.basename(path.dirname(entry.filename)) === '.assets')
      ).length

      for (const entry of remoteEntries) {
        const entryRemotePath = entry.filename
        const entryName = path.basename(entryRemotePath)
        const entryLocalPath = path.join(localPath, entryName)

        // 检查是否在.assets目录内
        const isInAssetsDir = path.basename(remotePath) === '.assets'

        if (entry.type === 'directory') {
          // 递归同步子目录
          await syncDirectory(entryRemotePath, entryLocalPath)
        } else if (entry.type === 'file' && (entryName.endsWith('.md') || isInAssetsDir)) {
          // 同步markdown文件及.assets目录中的所有文件
          // 检查文件是否需要下载
          let shouldDownload = false
          try {
            await fs.access(entryLocalPath)
            const localStats = await fs.stat(entryLocalPath)
            const localModTime = localStats.mtime.getTime()
            const localSize = localStats.size
            const remoteModTime = getRemoteModTime(entry)
            const remoteSize = entry.size || 0
            const syncRecord = await getWebDAVSyncRecord(entryLocalPath)
            if (
              syncRecord &&
              syncRecord.lastModifiedLocal === localModTime &&
              syncRecord.fileSize === localSize &&
              syncRecord.lastModifiedRemote === remoteModTime &&
              syncRecord.fileSize === remoteSize
            ) {
              shouldDownload = false
            } else if (localSize !== remoteSize) {
              shouldDownload = true
            } else {
              shouldDownload = await compareFileContent(entryLocalPath, entryRemotePath)
            }
          } catch {
            shouldDownload = true
          }

          if (shouldDownload) {
            // 下载文件
            const success = await downloadFile(entryRemotePath, entryLocalPath)
            if (success) {
              downloaded++
            } else {
              failed++
            }
          } else {
            // 文件不需要下载，跳过
            skipped++
          }

          // 更新处理进度
          processedFiles++
          notifySyncProgress({
            total: totalFiles,
            processed: processedFiles,
            action: 'download'
          })
        }
      }
    }

    // 开始同步
    await syncDirectory(config.remotePath, config.localPath)

    // 最后一次进度更新，确保UI显示100%
    if (totalFiles > 0 && processedFiles < totalFiles) {
      // 在循环结束后，如果仍有未处理的文件（例如在并行场景下），确保进度条达到100%
      processedFiles = totalFiles
    }
    notifySyncProgress({
      total: totalFiles,
      processed: processedFiles,
      action: 'download'
    })

    return {
      success: true,
      message: `同步完成: 下载了 ${downloaded} 个文件，跳过 ${skipped} 个未修改文件，失败 ${failed} 个文件`,
      downloaded,
      failed,
      skipped
    }
  } catch (error) {
    return {
      success: false,
      message: `同步失败: ${error}`,
      downloaded,
      failed,
      skipped
    }
  }
}

export async function syncBidirectional(config: WebDAVConfig): Promise<{
  success: boolean
  message: string
  uploaded: number
  downloaded: number
  failed: number
  skippedUpload: number
  skippedDownload: number
  cancelled?: boolean
}> {
  // 重置取消标志
  resetSyncCancellation()

  if (!webdavClient) {
    const initResult = initWebDAVClient(config)
    if (!initResult) {
      return {
        success: false,
        message: 'WebDAV客户端初始化失败',
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skippedUpload: 0,
        skippedDownload: 0
      }
    }
  }

  let uploaded = 0
  let downloaded = 0
  let failed = 0
  let skippedUpload = 0
  let skippedDownload = 0
  let processedCount = 0
  let totalCount = 0

  try {
    // 确保本地和远程根目录存在
    await fs.mkdir(config.localPath, { recursive: true })
    const remoteRootExists = await ensureRemoteDirectory(config.remotePath)
    if (!remoteRootExists) {
      return {
        success: false,
        message: `无法确保远程目录存在: ${config.remotePath}`,
        uploaded,
        downloaded,
        failed,
        skippedUpload,
        skippedDownload
      }
    }

    // 获取上次同步时间，用于筛选文件
    await getLastGlobalSyncTime()

    // 缓存远程文件列表(按目录)，在整个同步过程中共享
    const remoteFilesCache = new Map<string, FileStat[]>()

    // 待处理的文件集合
    type FileSyncInfo = {
      localPath: string
      remotePath: string
      localExists: boolean
      remoteExists: boolean
      localModTime?: number
      remoteModTime?: number
      syncRecord?: WebDAVSyncRecord
      remoteFile?: FileStat
      action?: 'upload' | 'download' | 'compare' | 'skip'
    }

    const filesToProcess: FileSyncInfo[] = []

    // 收集需要同步的文件信息
    async function collectFilesToSync(localDir: string, remoteDir: string): Promise<void> {
      // 检查是否取消同步
      if (checkSyncCancelled()) {
        throw new Error('用户取消了同步')
      }

      // 确保远程目录存在
      await ensureRemoteDirectory(remoteDir)

      // 确保本地目录存在
      await fs.mkdir(localDir, { recursive: true })

      // 检查是否在.assets目录内
      const isInAssetsDir =
        path.basename(localDir) === '.assets' || path.basename(remoteDir) === '.assets'

      // 1. 获取远程文件列表并缓存
      if (!remoteFilesCache.has(remoteDir)) {
        const remoteFiles = await getRemoteFiles(remoteDir)
        remoteFilesCache.set(remoteDir, remoteFiles)
      }
      const remoteFiles = remoteFilesCache.get(remoteDir) || []

      // 创建远程文件索引映射，便于快速查找
      const remoteFilesMap = new Map<string, FileStat>()
      for (const remoteFile of remoteFiles) {
        const filename = path.basename(remoteFile.filename)
        remoteFilesMap.set(filename, remoteFile)
      }

      // 2. 获取本地文件列表
      const localEntries = await fs.readdir(localDir, { withFileTypes: true })
      // 更新总数
      totalCount += localEntries.length + remoteFilesMap.size

      // 创建本地文件索引映射
      const localFilesMap = new Map<string, fsTypes.Dirent>()
      for (const entry of localEntries) {
        localFilesMap.set(entry.name, entry)
      }

      // 3. 处理所有本地文件
      for (const [filename, entry] of localFilesMap.entries()) {
        if (checkSyncCancelled()) {
          throw new Error('用户取消了同步')
        }

        const localPath = path.join(localDir, filename)
        const remotePath = path.join(remoteDir, filename).replace(/\\/g, '/')

        if (entry.isDirectory()) {
          // 递归处理子目录
          const remoteSubDir = remoteFilesMap.has(filename)
            ? remoteFilesMap.get(filename)!.filename
            : remotePath

          await collectFilesToSync(localPath, remoteSubDir)

          // 从远程文件映射中删除已处理的目录
          remoteFilesMap.delete(filename)
        } else if (entry.isFile() && (filename.endsWith('.md') || isInAssetsDir)) {
          // 处理文件
          try {
            // 获取本地文件状态
            const localStats = await fs.stat(localPath)
            const localModTime = localStats.mtime.getTime()

            // 获取同步记录
            const syncRecord = (await getWebDAVSyncRecord(localPath)) || undefined

            // 检查远程是否存在此文件
            const remoteExists = remoteFilesMap.has(filename)
            let remoteModTime = 0
            let remoteFile: FileStat | undefined

            if (remoteExists) {
              remoteFile = remoteFilesMap.get(filename)!
              remoteModTime = getRemoteModTime(remoteFile)

              // 从远程文件映射中删除已处理的文件
              remoteFilesMap.delete(filename)
            }

            // 预判断同步行为
            let action: 'upload' | 'download' | 'compare' | 'skip' = 'compare'

            if (!remoteExists) {
              // 远程不存在，需要上传
              action = 'upload'
            } else {
              // 远程存在，标记为比较
              action = 'compare'
            }

            // 将文件信息加入处理列表
            filesToProcess.push({
              localPath,
              remotePath,
              localExists: true,
              remoteExists,
              localModTime,
              remoteModTime: remoteExists ? remoteModTime : undefined,
              syncRecord,
              remoteFile,
              action
            })
          } catch {
            failed++
          }
        }
        // 更新进度
        processedCount++
        notifySyncProgress({ total: totalCount, processed: processedCount, action: 'compare' })
      }

      // 4. 处理仅存在于远程的文件
      for (const [filename, remoteEntry] of remoteFilesMap.entries()) {
        if (checkSyncCancelled()) {
          throw new Error('用户取消了同步')
        }

        if (remoteEntry.type === 'directory') {
          // 远程目录，在本地不存在
          const localSubDir = path.join(localDir, filename)
          await fs.mkdir(localSubDir, { recursive: true })

          // 递归处理子目录
          await collectFilesToSync(localSubDir, remoteEntry.filename)
        } else if (remoteEntry.type === 'file' && (filename.endsWith('.md') || isInAssetsDir)) {
          // 远程文件，本地不存在，需要下载
          const localPath = path.join(localDir, filename)

          filesToProcess.push({
            localPath,
            remotePath: remoteEntry.filename,
            localExists: false,
            remoteExists: true,
            remoteModTime: getRemoteModTime(remoteEntry),
            remoteFile: remoteEntry,
            action: 'download'
          })
        }
        // 更新进度
        processedCount++
        notifySyncProgress({ total: totalCount, processed: processedCount, action: 'compare' })
      }
    }

    // 收集所有文件信息, 初始通知
    notifySyncProgress({ total: 0, processed: 0, action: 'compare' })
    await collectFilesToSync(config.localPath, config.remotePath)

    // 比较阶段结束，确保进度条满
    notifySyncProgress({
      total: totalCount,
      processed: totalCount,
      action: 'compare'
    })

    // 并行处理文件
    if (filesToProcess.length > 0) {
      // 按操作类型分组处理
      const uploadFiles = filesToProcess.filter((file) => file.action === 'upload')
      const downloadFiles = filesToProcess.filter((file) => file.action === 'download')
      const compareFiles = filesToProcess.filter((file) => file.action === 'compare')
      let filesProcessedInSecondPhase = 0

      // 处理上传文件
      if (uploadFiles.length > 0) {
        const uploadResults = await processBatchesInParallel(
          uploadFiles,
          async (item) => {
            const success = await uploadFile(item.localPath, item.remotePath)
            filesProcessedInSecondPhase++
            // 更新处理进度
            notifySyncProgress({
              total: uploadFiles.length,
              processed: filesProcessedInSecondPhase,
              action: 'upload'
            })
            return { success, item }
          },
          5,
          2
        )

        for (const result of uploadResults) {
          if (result.success) {
            uploaded++
          } else {
            failed++
          }
        }
      }

      // 处理下载文件
      if (downloadFiles.length > 0) {
        filesProcessedInSecondPhase = 0 // 重置计数器
        const downloadResults = await processBatchesInParallel(
          downloadFiles,
          async (item) => {
            const success = await downloadFile(item.remotePath, item.localPath)
            filesProcessedInSecondPhase++
            // 更新处理进度
            notifySyncProgress({
              total: downloadFiles.length,
              processed: filesProcessedInSecondPhase,
              action: 'download'
            })
            return { success, item }
          },
          5,
          2
        )

        for (const result of downloadResults) {
          if (result.success) {
            downloaded++
          } else {
            failed++
          }
        }
      }

      // 处理需要比较内容的文件
      if (compareFiles.length > 0) {
        filesProcessedInSecondPhase = 0 // 重置计数器
        const compareResults = await processBatchesInParallel(
          compareFiles,
          async (item) => {
            let currentAction: 'upload' | 'download' | 'skip' | 'compare' = 'compare'
            let success = false

            if (!item.remotePath || !item.localPath) {
              currentAction = 'skip'
              success = true
            } else {
              // 比较内容
              const needSync = await compareFileContent(item.localPath, item.remotePath)

              if (needSync) {
                // 内容不同，以最新修改时间为准
                if ((item.localModTime || 0) > (item.remoteModTime || 0)) {
                  // 以本地为准，上传
                  currentAction = 'upload'
                  success = await uploadFile(item.localPath, item.remotePath)
                } else {
                  // 以远程为准，下载
                  currentAction = 'download'
                  success = await downloadFile(item.remotePath, item.localPath)
                }
              } else {
                // 内容相同，不需要同步
                currentAction = 'skip'
                success = true
              }
            }

            filesProcessedInSecondPhase++
            // 更新处理进度
            notifySyncProgress({
              total: compareFiles.length,
              processed: filesProcessedInSecondPhase,
              action: currentAction === 'skip' ? 'compare' : currentAction
            })
            return {
              action: currentAction,
              success,
              item
            }
          },
          3,
          1 // 内容比较较重，降低并发
        )

        for (const result of compareResults) {
          if (result.action === 'skip') {
            skippedUpload++
            skippedDownload++
          } else if (result.action === 'upload') {
            if (result.success) uploaded++
            else failed++
          } else if (result.action === 'download') {
            if (result.success) downloaded++
            else failed++
          }
        }
      }
    }

    // 更新全局同步时间
    await updateLastGlobalSyncTime()

    // 最后一次进度更新，确保UI显示100%
    notifySyncProgress({
      total: 1,
      processed: 1,
      action: 'compare'
    })

    return {
      success: true,
      message: `双向同步完成: 上传 ${uploaded} 个，下载 ${downloaded} 个，跳过 ${skippedUpload} 个上传文件和 ${skippedDownload} 个下载文件，失败 ${failed} 个`,
      uploaded,
      downloaded,
      failed,
      skippedUpload,
      skippedDownload
    }
  } catch (error) {
    // 检查是否是因为用户取消而失败
    if (String(error).includes('用户取消了同步')) {
      return {
        success: false,
        message: '同步已被用户取消',
        uploaded,
        downloaded,
        failed,
        skippedUpload,
        skippedDownload,
        cancelled: true
      }
    }

    return {
      success: false,
      message: `双向同步失败: ${error}`,
      uploaded,
      downloaded,
      failed,
      skippedUpload,
      skippedDownload
    }
  }
}

// 处理WebDAV配置变更
export async function handleConfigChanged(): Promise<{ success: boolean; message: string }> {
  try {
    // 从设置中获取最新的WebDAV配置
    const { getWebDAVConfig } = await import('./settings')
    const settingsConfig = getWebDAVConfig()

    // 重置当前客户端
    webdavClient = null

    // 如果WebDAV未启用，不需要初始化客户端
    if (!settingsConfig.enabled) {
      return {
        success: true,
        message: 'WebDAV已禁用，客户端已清除'
      }
    }

    // 创建符合webdav模块要求的配置对象（添加localPath字段）
    const webdavConfig: WebDAVConfig = {
      ...settingsConfig,
      localPath: '' // 这里暂时设为空字符串，实际使用时会由调用方提供
    }

    // 使用新配置初始化客户端
    const initSuccess = initWebDAVClient(webdavConfig)

    if (initSuccess) {
      return {
        success: true,
        message: 'WebDAV配置已更新，客户端重新初始化成功'
      }
    } else {
      return {
        success: false,
        message: 'WebDAV客户端重新初始化失败，请检查配置'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `配置变更处理失败: ${error}`
    }
  }
}


