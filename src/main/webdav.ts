import { createClient, WebDAVClient, FileStat } from 'webdav'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as fsTypes from 'fs'

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
  } catch (error) {
    console.error('初始化WebDAV客户端失败:', error)
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
    return { success: true, message: '连接成功' }
  } catch (error) {
    console.error('测试WebDAV连接失败:', error)
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
  } catch (error) {
    console.error(`确保远程目录存在失败: ${remotePath}`, error)
    return false
  }
}

async function uploadFile(localFilePath: string, remoteFilePath: string): Promise<boolean> {
  if (!webdavClient) return false

  try {
    const fileContent = await fs.readFile(localFilePath)
    await webdavClient.putFileContents(remoteFilePath, fileContent)
    return true
  } catch (error) {
    console.error(`上传文件失败: ${localFilePath} -> ${remoteFilePath}`, error)
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

    return true
  } catch (error) {
    console.error(`下载文件失败: ${remoteFilePath} -> ${localFilePath}`, error)
    return false
  }
}

async function getRemoteFiles(remotePath: string): Promise<FileStat[]> {
  if (!webdavClient) return []

  try {
    const contents = await webdavClient.getDirectoryContents(remotePath)
    return Array.isArray(contents) ? contents : []
  } catch (error) {
    console.error(`获取远程文件列表失败: ${remotePath}`, error)
    return []
  }
}

// 判断文件是否需要上传：新文件或修改过的文件
async function needUpload(
  localFilePath: string,
  remoteFilePath: string,
  remoteFiles: FileStat[]
): Promise<boolean> {
  if (!webdavClient) return false

  try {
    // 检查远程文件是否存在
    const remoteFile = remoteFiles.find((file) => file.filename === remoteFilePath)
    if (!remoteFile) {
      // 远程文件不存在，需要上传
      return true
    }

    // 检查本地文件的最后修改时间
    const localStats = await fs.stat(localFilePath)
    const localModTime = localStats.mtime.getTime()

    // 远程文件的最后修改时间
    const remoteModTime = new Date(remoteFile.lastmod).getTime()

    // 时间戳阈值，用于判断时间戳相近的情况（3秒内）
    const TIME_THRESHOLD = 3000 // 毫秒

    // 如果时间戳相近，通过内容比较判断
    if (Math.abs(localModTime - remoteModTime) < TIME_THRESHOLD) {
      return await compareFileContent(localFilePath, remoteFilePath)
    }

    // 如果本地文件更新，则需要上传
    return localModTime > remoteModTime
  } catch (error) {
    console.error(`检查文件是否需要上传失败: ${localFilePath}`, error)
    // 出错时保守处理，上传文件
    return true
  }
}

// 判断文件是否需要下载：新文件或远程有更新的文件
async function needDownload(localFilePath: string, remoteFile: FileStat): Promise<boolean> {
  try {
    // 检查本地文件是否存在
    try {
      await fs.access(localFilePath)
    } catch {
      // 本地文件不存在，需要下载
      return true
    }

    // 检查本地文件的最后修改时间
    const localStats = await fs.stat(localFilePath)
    const localModTime = localStats.mtime.getTime()

    // 远程文件的最后修改时间
    const remoteModTime = new Date(remoteFile.lastmod).getTime()

    // 时间戳阈值，用于判断时间戳相近的情况（3秒内）
    const TIME_THRESHOLD = 3000 // 毫秒

    // 如果时间戳相近，通过内容比较判断
    if (Math.abs(localModTime - remoteModTime) < TIME_THRESHOLD) {
      return await compareFileContent(localFilePath, remoteFile.filename)
    }

    // 如果远程文件更新，则需要下载
    return remoteModTime > localModTime
  } catch (error) {
    console.error(`检查文件是否需要下载失败: ${localFilePath}`, error)
    // 出错时保守处理，下载文件
    return true
  }
}

// 计算文件的MD5哈希
async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath)
    return crypto.createHash('md5').update(content).digest('hex')
  } catch (error) {
    console.error(`计算文件哈希失败: ${filePath}`, error)
    return ''
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
  } catch (error) {
    console.error(`比较文件内容失败: ${localFilePath} vs ${remoteFilePath}`, error)
    return true // 出错时保守返回需要同步
  }
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

    // 递归同步函数
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

      for (const entry of localEntries) {
        const localPath = path.join(localDir, entry.name)
        const remotePath = path.join(remoteDir, entry.name).replace(/\\/g, '/')

        // 检查是否在.assets目录内
        const isInAssetsDir = path.basename(localDir) === '.assets'

        if (entry.isDirectory()) {
          // 递归同步子目录
          await syncDirectory(localPath, remotePath)
        } else if (entry.isFile() && (entry.name.endsWith('.md') || isInAssetsDir)) {
          // 同步markdown文件及.assets目录中的所有文件
          // 检查文件是否需要上传
          const shouldUpload = await needUpload(localPath, remotePath, remoteFiles)

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
        }
      }
    }

    // 开始同步
    await syncDirectory(config.localPath, config.remotePath)

    return {
      success: true,
      message: `同步完成: 上传了 ${uploaded} 个文件，跳过 ${skipped} 个未修改文件，失败 ${failed} 个文件`,
      uploaded,
      failed,
      skipped
    }
  } catch (error) {
    console.error('同步本地到远程失败:', error)
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

  try {
    // 确保本地根目录存在
    await fs.mkdir(config.localPath, { recursive: true })

    // 递归同步函数
    async function syncDirectory(remotePath: string, localPath: string): Promise<void> {
      // 确保本地目录存在
      await fs.mkdir(localPath, { recursive: true })

      // 获取远程文件列表
      const remoteEntries = await getRemoteFiles(remotePath)

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
          const shouldDownload = await needDownload(entryLocalPath, entry)

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
        }
      }
    }

    // 开始同步
    await syncDirectory(config.remotePath, config.localPath)

    return {
      success: true,
      message: `同步完成: 下载了 ${downloaded} 个文件，跳过 ${skipped} 个未修改文件，失败 ${failed} 个文件`,
      downloaded,
      failed,
      skipped
    }
  } catch (error) {
    console.error('同步远程到本地失败:', error)
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

    // 缓存远程文件列表(按目录)，在整个同步过程中共享
    const remoteFilesCache = new Map<string, FileStat[]>()
    // 时间戳阈值，用于判断时间戳相近的情况（3秒内）
    const TIME_THRESHOLD = 3000 // 毫秒

    // 递归同步函数 - 整合了双向同步
    async function syncDirectoryBidirectional(localDir: string, remoteDir: string): Promise<void> {
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

      // 2. 获取本地文件列表
      const localEntries = await fs.readdir(localDir, { withFileTypes: true })
      const localEntriesMap = new Map<string, fsTypes.Dirent>()
      localEntries.forEach((entry) => {
        localEntriesMap.set(entry.name, entry)
      })

      // 3. 处理远程文件 (远程 -> 本地)
      for (const remoteEntry of remoteFiles) {
        // 检查是否取消同步
        if (checkSyncCancelled()) {
          throw new Error('用户取消了同步')
        }

        const remoteFilename = path.basename(remoteEntry.filename)
        const remoteFullPath = remoteEntry.filename
        const localFullPath = path.join(localDir, remoteFilename)

        if (remoteEntry.type === 'directory') {
          // 创建本地目录（如果不存在）
          await fs.mkdir(localFullPath, { recursive: true })

          // 递归处理子目录
          await syncDirectoryBidirectional(localFullPath, remoteFullPath)

          // 从本地文件映射中移除已处理的目录
          localEntriesMap.delete(remoteFilename)
        } else if (
          remoteEntry.type === 'file' &&
          (remoteFilename.endsWith('.md') || isInAssetsDir)
        ) {
          const localEntry = localEntriesMap.get(remoteFilename)

          if (!localEntry) {
            // 本地不存在此文件，需要从远程下载
            const success = await downloadFile(remoteFullPath, localFullPath)
            if (success) {
              downloaded++
            } else {
              failed++
            }
          } else {
            // 本地存在此文件，需要比较修改时间
            try {
              const localStats = await fs.stat(localFullPath)
              const localModTime = localStats.mtime.getTime()
              const remoteModTime = new Date(remoteEntry.lastmod).getTime()

              // 比较修改时间
              if (Math.abs(localModTime - remoteModTime) < TIME_THRESHOLD) {
                // 时间戳相近，通过内容比较判断
                const needSync = await compareFileContent(localFullPath, remoteFullPath)

                if (needSync) {
                  // 内容不同，以最新修改时间为准
                  if (localModTime > remoteModTime) {
                    // 以本地为准，上传到远程
                    const success = await uploadFile(localFullPath, remoteFullPath)
                    if (success) uploaded++
                    else failed++
                  } else {
                    // 以远程为准，下载到本地
                    const success = await downloadFile(remoteFullPath, localFullPath)
                    if (success) downloaded++
                    else failed++
                  }
                } else {
                  // 内容相同，不需要同步
                  skippedUpload++
                  skippedDownload++
                }
              } else if (localModTime > remoteModTime) {
                // 本地文件更新，上传到远程
                const success = await uploadFile(localFullPath, remoteFullPath)
                if (success) uploaded++
                else failed++
              } else if (remoteModTime > localModTime) {
                // 远程文件更新，下载到本地
                const success = await downloadFile(remoteFullPath, localFullPath)
                if (success) downloaded++
                else failed++
              } else {
                // 文件时间相同，不需要同步
                skippedUpload++
                skippedDownload++
              }
            } catch (error) {
              console.error(`比较文件时间失败: ${localFullPath}`, error)
              failed++
            }

            // 从本地文件映射中移除已处理的文件
            localEntriesMap.delete(remoteFilename)
          }
        }
      }

      // 4. 处理剩余的本地文件 (本地 -> 远程)
      for (const [filename, entry] of localEntriesMap.entries()) {
        // 检查是否取消同步
        if (checkSyncCancelled()) {
          throw new Error('用户取消了同步')
        }

        const localFullPath = path.join(localDir, filename)
        const remoteFullPath = path.join(remoteDir, filename).replace(/\\/g, '/')

        if (entry.isDirectory()) {
          // 确保远程目录存在
          await ensureRemoteDirectory(remoteFullPath)

          // 递归处理子目录
          await syncDirectoryBidirectional(localFullPath, remoteFullPath)
        } else if (entry.isFile() && (filename.endsWith('.md') || isInAssetsDir)) {
          // 这是一个只存在于本地的文件，上传到远程
          const success = await uploadFile(localFullPath, remoteFullPath)
          if (success) {
            uploaded++
          } else {
            failed++
          }
        }
      }
    }

    // 开始同步
    await syncDirectoryBidirectional(config.localPath, config.remotePath)

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
    console.error('双向同步失败:', error)

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
