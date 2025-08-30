import { CloudStorageManager } from '../shared/services/cloud-storage-manager'
import { CloudStorageConfig, CloudSyncResult } from '../shared/types/cloud-storage'
import { mainWindow } from './index'

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
}): void {
  if (mainWindow) {
    mainWindow.webContents.send('cloud-sync-progress', config)
  }
}

export async function testCloudConnection(
  config: CloudStorageConfig
): Promise<{ success: boolean; message: string }> {
  try {
    return cloudStorageManager.testConnection(config)
  } catch (error) {
    return { success: false, message: `测试连接失败: ${error}` }
  }
}

export async function authenticateCloudService(
  config: CloudStorageConfig
): Promise<{ success: boolean; message: string; authUrl?: string }> {
  try {
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

    const result = await cloudStorageManager.syncLocalToRemote(config)

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

    const result = await cloudStorageManager.syncRemoteToLocal(config)

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

    const result = await cloudStorageManager.syncBidirectional(config)

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
