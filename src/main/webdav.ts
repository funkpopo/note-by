import { createClient, WebDAVClient, FileStat } from 'webdav'
import { promises as fs } from 'fs'
import * as path from 'path'

interface WebDAVConfig {
  url: string
  username: string
  password: string
  remotePath: string
  localPath: string
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

    // 下载文件
    const content = await webdavClient.getFileContents(remoteFilePath)

    // 将内容写入本地文件
    if (content instanceof ArrayBuffer) {
      await fs.writeFile(localFilePath, Buffer.from(content))
    } else if (typeof content === 'string') {
      await fs.writeFile(localFilePath, content)
    } else if (content && typeof content === 'object' && 'data' in content) {
      // 处理ResponseDataDetailed类型
      const data = content.data
      if (data instanceof ArrayBuffer) {
        await fs.writeFile(localFilePath, Buffer.from(data))
      } else {
        await fs.writeFile(localFilePath, data as string)
      }
    } else {
      throw new Error(`不支持的内容类型: ${typeof content}`)
    }

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

export async function syncLocalToRemote(config: WebDAVConfig): Promise<{
  success: boolean
  message: string
  uploaded: number
  failed: number
}> {
  if (!webdavClient) {
    const initResult = initWebDAVClient(config)
    if (!initResult) {
      return { success: false, message: 'WebDAV客户端初始化失败', uploaded: 0, failed: 0 }
    }
  }

  let uploaded = 0
  let failed = 0

  try {
    // 确保远程根目录存在
    const remoteRootExists = await ensureRemoteDirectory(config.remotePath)
    if (!remoteRootExists) {
      return {
        success: false,
        message: `无法确保远程目录存在: ${config.remotePath}`,
        uploaded,
        failed
      }
    }

    // 递归同步函数
    async function syncDirectory(localDir: string, remoteDir: string): Promise<void> {
      // 确保远程目录存在
      await ensureRemoteDirectory(remoteDir)

      // 获取本地文件列表
      const localEntries = await fs.readdir(localDir, { withFileTypes: true })

      for (const entry of localEntries) {
        const localPath = path.join(localDir, entry.name)
        const remotePath = path.join(remoteDir, entry.name).replace(/\\/g, '/')

        if (entry.isDirectory()) {
          // 递归同步子目录
          await syncDirectory(localPath, remotePath)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // 上传markdown文件
          const success = await uploadFile(localPath, remotePath)
          if (success) {
            uploaded++
          } else {
            failed++
          }
        }
      }
    }

    // 开始同步
    await syncDirectory(config.localPath, config.remotePath)

    return {
      success: true,
      message: `同步完成: 上传了 ${uploaded} 个文件，失败 ${failed} 个文件`,
      uploaded,
      failed
    }
  } catch (error) {
    console.error('同步本地到远程失败:', error)
    return {
      success: false,
      message: `同步失败: ${error}`,
      uploaded,
      failed
    }
  }
}

export async function syncRemoteToLocal(config: WebDAVConfig): Promise<{
  success: boolean
  message: string
  downloaded: number
  failed: number
}> {
  if (!webdavClient) {
    const initResult = initWebDAVClient(config)
    if (!initResult) {
      return { success: false, message: 'WebDAV客户端初始化失败', downloaded: 0, failed: 0 }
    }
  }

  let downloaded = 0
  let failed = 0

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

        if (entry.type === 'directory') {
          // 递归同步子目录
          await syncDirectory(entryRemotePath, entryLocalPath)
        } else if (entry.type === 'file' && entryName.endsWith('.md')) {
          // 下载markdown文件
          const success = await downloadFile(entryRemotePath, entryLocalPath)
          if (success) {
            downloaded++
          } else {
            failed++
          }
        }
      }
    }

    // 开始同步
    await syncDirectory(config.remotePath, config.localPath)

    return {
      success: true,
      message: `同步完成: 下载了 ${downloaded} 个文件，失败 ${failed} 个文件`,
      downloaded,
      failed
    }
  } catch (error) {
    console.error('同步远程到本地失败:', error)
    return {
      success: false,
      message: `同步失败: ${error}`,
      downloaded,
      failed
    }
  }
}

export async function syncBidirectional(config: WebDAVConfig): Promise<{
  success: boolean
  message: string
  uploaded: number
  downloaded: number
  failed: number
}> {
  if (!webdavClient) {
    const initResult = initWebDAVClient(config)
    if (!initResult) {
      return {
        success: false,
        message: 'WebDAV客户端初始化失败',
        uploaded: 0,
        downloaded: 0,
        failed: 0
      }
    }
  }

  try {
    // 先同步远程到本地
    const remoteToLocalResult = await syncRemoteToLocal(config)

    // 然后同步本地到远程
    const localToRemoteResult = await syncLocalToRemote(config)

    return {
      success: remoteToLocalResult.success && localToRemoteResult.success,
      message: `双向同步完成: 上传 ${localToRemoteResult.uploaded} 个，下载 ${remoteToLocalResult.downloaded} 个，失败 ${remoteToLocalResult.failed + localToRemoteResult.failed} 个`,
      uploaded: localToRemoteResult.uploaded,
      downloaded: remoteToLocalResult.downloaded,
      failed: remoteToLocalResult.failed + localToRemoteResult.failed
    }
  } catch (error) {
    console.error('双向同步失败:', error)
    return {
      success: false,
      message: `双向同步失败: ${error}`,
      uploaded: 0,
      downloaded: 0,
      failed: 0
    }
  }
}
