import { CloudStorageManager } from '../shared/services/cloud-storage-manager'
import { CloudStorageConfig, CloudSyncResult } from '../shared/types/cloud-storage'
import { mainWindow } from './index'
import {
  testWebDAVConnection as testWebDAV,
  syncLocalToRemote as webdavSyncLocalToRemote,
  syncRemoteToLocal as webdavSyncRemoteToLocal,
  syncBidirectional as webdavSyncBidirectional
} from './webdav'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

const cloudStorageManager = new CloudStorageManager()

// let isSyncCancelled = false

export function resetSyncCancellation(): void {
  // isSyncCancelled = false
}

export function cancelSync(): void {
  // isSyncCancelled = true
}

function notifySyncProgress(config: {
  total: number
  processed: number
  action: 'upload' | 'download' | 'compare'
  phase?: 'collect' | 'compare' | 'upload' | 'download' | 'finalize'
  currentFile?: string
  uploaded?: number
  downloaded?: number
  skipped?: number
  failed?: number
  conflicts?: number
}): void {
  if (mainWindow) {
    mainWindow.webContents.send('cloud-sync-progress', config)
  }
}

export async function testCloudConnection(
  config: CloudStorageConfig
): Promise<{ success: boolean; message: string }> {
  try {
    if (config.provider === 'webdav') {
      const { url = '', username = '', password = '', remotePath = '/notes' } = config as any
      return testWebDAV({ url, username, password, remotePath, localPath: getMarkdownFolderPath() })
    }
    return cloudStorageManager.testConnection(config)
  } catch (error) {
    return { success: false, message: `测试连接失败: ${error}` }
  }
}

export async function authenticateCloudService(
  config: CloudStorageConfig
): Promise<{ success: boolean; message: string; authUrl?: string }> {
  try {
    if (config.provider === 'webdav') {
      return { success: true, message: 'WebDAV使用用户名密码认证，无需OAuth' }
    }
    return cloudStorageManager.authenticate(config)
  } catch (error) {
    return { success: false, message: `认证失败: ${error}` }
  }
}

export async function syncLocalToRemote(config: CloudStorageConfig): Promise<CloudSyncResult> {
  try {
    resetSyncCancellation()

    notifySyncProgress({
      total: 100,
      processed: 0,
      action: 'upload'
    })

    const result: CloudSyncResult = config.provider === 'webdav'
      ? await webdavSyncLocalToRemote({
          url: (config as any).url || '',
          username: (config as any).username || '',
          password: (config as any).password || '',
          remotePath: (config as any).remotePath || '/notes',
          localPath: (config as any).localPath || getMarkdownFolderPath()
        }).then((r) => ({
          success: r.success,
          message: r.message,
          uploaded: r.uploaded ?? 0,
          downloaded: 0,
          failed: r.failed ?? 0,
          skipped: (r as any).skipped ?? 0
        }))
      : await cloudStorageManager.syncLocalToRemote(config)

    notifySyncProgress({
      total: 100,
      processed: 100,
      action: 'upload'
    })

    return result
  } catch (error) {
    return {
      success: false,
      message: `同步失败: ${error}`,
      uploaded: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0
    }
  }
}

export async function syncRemoteToLocal(config: CloudStorageConfig): Promise<CloudSyncResult> {
  try {
    resetSyncCancellation()

    notifySyncProgress({
      total: 100,
      processed: 0,
      action: 'download'
    })

    const result: CloudSyncResult = config.provider === 'webdav'
      ? await webdavSyncRemoteToLocal({
          url: (config as any).url || '',
          username: (config as any).username || '',
          password: (config as any).password || '',
          remotePath: (config as any).remotePath || '/notes',
          localPath: (config as any).localPath || getMarkdownFolderPath()
        }).then((r) => ({
          success: r.success,
          message: r.message,
          uploaded: 0,
          downloaded: r.downloaded ?? 0,
          failed: r.failed ?? 0,
          skipped: (r as any).skipped ?? 0
        }))
      : await cloudStorageManager.syncRemoteToLocal(config)

    notifySyncProgress({
      total: 100,
      processed: 100,
      action: 'download'
    })

    return result
  } catch (error) {
    return {
      success: false,
      message: `同步失败: ${error}`,
      uploaded: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0
    }
  }
}

export async function syncBidirectional(config: CloudStorageConfig): Promise<CloudSyncResult> {
  try {
    resetSyncCancellation()

    notifySyncProgress({
      total: 100,
      processed: 0,
      action: 'compare'
    })

    const result: CloudSyncResult = config.provider === 'webdav'
      ? await webdavSyncBidirectional({
          url: (config as any).url || '',
          username: (config as any).username || '',
          password: (config as any).password || '',
          remotePath: (config as any).remotePath || '/notes',
          localPath: (config as any).localPath || getMarkdownFolderPath()
        }).then((r) => ({
          success: r.success,
          message: r.message,
          uploaded: r.uploaded ?? 0,
          downloaded: r.downloaded ?? 0,
          failed: r.failed ?? 0,
          skipped: ((r as any).skippedUpload ?? 0) + ((r as any).skippedDownload ?? 0)
        }))
      : await cloudStorageManager.syncBidirectional(config)

    notifySyncProgress({
      total: 100,
      processed: 100,
      action: 'compare'
    })

    return result
  } catch (error) {
    return {
      success: false,
      message: `同步失败: ${error}`,
      uploaded: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0
    }
  }
}

export function getAvailableProviders(): Array<{ id: string; name: string; description: string }> {
  return cloudStorageManager.getSupportedProviders()
}

export async function handleOAuthCallback(
  provider: string,
  code: string
): Promise<{ success: boolean; message: string; tokens?: any }> {
  try {
    const service = cloudStorageManager.getService(provider)
    if (!service) {
      return { success: false, message: `不支持的云存储提供商: ${provider}` }
    }

    return { success: true, message: '认证成功', tokens: { accessToken: code } }
  } catch (error) {
    return { success: false, message: `处理OAuth回调失败: ${error}` }
  }
}

// 获取markdown文件夹路径（与主进程一致）
function getMarkdownFolderPath(): string {
  let markdownPath: string
  if (is.dev) {
    markdownPath = path.resolve(app.getAppPath(), 'markdown')
  } else {
    markdownPath = path.resolve(app.getPath('exe'), '..', 'markdown')
  }
  try {
    if (!fs.existsSync(markdownPath)) {
      fs.mkdirSync(markdownPath, { recursive: true })
    }
    const defaultAssetsFolderPath = path.join(markdownPath, '.assets')
    if (!fs.existsSync(defaultAssetsFolderPath)) {
      fs.mkdirSync(defaultAssetsFolderPath, { recursive: true })
    }
  } catch {
    // ignore
  }
  return markdownPath
}
