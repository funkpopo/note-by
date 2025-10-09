import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import {
  testWebDAVConnection,
  syncLocalToRemote,
  syncRemoteToLocal,
  syncBidirectional,
  cancelSync,
  clearSyncCache
} from '../webdav'
import {
  testCloudConnection,
  authenticateCloudService,
  syncLocalToRemote as cloudSyncLocalToRemote,
  syncRemoteToLocal as cloudSyncRemoteToLocal,
  syncBidirectional as cloudSyncBidirectional,
  cancelSync as cloudCancelSync,
  getAvailableProviders
} from '../cloud-storage'
import {
  getWebDAVConfig,
  updateWebDAVConfig,
  verifyMasterPassword,
  encryptWebDAVWithMasterPassword
} from '../settings'

export class SyncService {
  private getNotesPath: () => string

  constructor(getNotesPath: () => string) {
    this.getNotesPath = getNotesPath
  }

  public registerIpcHandlers(): void {
    // WebDAV
    ipcMain.handle(IPC_CHANNELS.TEST_WEBDAV_CONNECTION, async (_e, config) => {
      try {
        return await testWebDAVConnection(config)
      } catch (error) {
        return { success: false, message: `测试连接失败: ${error}` }
      }
    })

    ipcMain.handle(IPC_CHANNELS.SYNC_LOCAL_TO_REMOTE, async (_e, config) => {
      try {
        if (!config.localPath) config.localPath = this.getNotesPath()
        return await syncLocalToRemote(config)
      } catch (error) {
        return { success: false, message: `同步失败: ${error}`, uploaded: 0, failed: 0 }
      }
    })

    ipcMain.handle(IPC_CHANNELS.SYNC_REMOTE_TO_LOCAL, async (_e, config) => {
      try {
        if (!config.localPath) config.localPath = this.getNotesPath()
        return await syncRemoteToLocal(config)
      } catch (error) {
        return { success: false, message: `同步失败: ${error}`, downloaded: 0, failed: 0 }
      }
    })

    ipcMain.handle(IPC_CHANNELS.SYNC_BIDIRECTIONAL, async (_e, config) => {
      try {
        if (!config.localPath) config.localPath = this.getNotesPath()
        return await syncBidirectional(config)
      } catch (error) {
        return {
          success: false,
          message: `同步失败: ${error}`,
          uploaded: 0,
          downloaded: 0,
          failed: 0
        }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CANCEL_SYNC, async () => {
      try {
        cancelSync()
        return { success: true, message: '已发送取消同步请求' }
      } catch (error) {
        return { success: false, message: `取消同步失败: ${error}` }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLEAR_WEBDAV_SYNC_CACHE, async () => {
      try {
        return await clearSyncCache()
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    ipcMain.handle(IPC_CHANNELS.VERIFY_MASTER_PASSWORD, async (_e, password: string) => {
      try {
        const webdavConfig = getWebDAVConfig()
        if (!webdavConfig.useCustomEncryption) {
          return { success: false, message: '未启用自定义加密', error: '未启用自定义加密' }
        }
        const isValid = verifyMasterPassword(webdavConfig, password)
        if (isValid) return { success: true, message: '密码验证成功' }
        return { success: false, message: '密码验证失败', error: '密码不正确' }
      } catch (error) {
        return { success: false, message: '验证过程中发生错误', error: String(error) }
      }
    })

    ipcMain.handle(IPC_CHANNELS.SET_MASTER_PASSWORD, async (_e, config) => {
      try {
        const { password, webdavConfig } = config || {}
        if (!password || !webdavConfig) {
          return { success: false, message: '无效的主密码或WebDAV配置', error: '缺少必要参数' }
        }
        webdavConfig.useCustomEncryption = true
        const encryptedConfig = encryptWebDAVWithMasterPassword(webdavConfig, password)
        updateWebDAVConfig(encryptedConfig)
        return { success: true, message: '主密码设置成功' }
      } catch (error) {
        return { success: false, message: '设置过程中发生错误', error: String(error) }
      }
    })

    ipcMain.handle(IPC_CHANNELS.WEBDAV_CONFIG_CHANGED, async () => {
      try {
        const { handleConfigChanged } = await import('../webdav')
        const result = await handleConfigChanged()
        return { success: result.success, message: result.message || 'WebDAV配置已更新' }
      } catch (error) {
        return { success: false, message: '配置更新失败', error: String(error) }
      }
    })

    // Cloud
    ipcMain.handle(IPC_CHANNELS.CLOUD_TEST_CONNECTION, async (_e, config) => {
      try {
        return await testCloudConnection(config)
      } catch (error) {
        return { success: false, message: `测试连接失败: ${error}` }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLOUD_AUTHENTICATE, async (_e, config) => {
      try {
        return await authenticateCloudService(config)
      } catch (error) {
        return { success: false, message: `认证失败: ${error}` }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLOUD_SYNC_LOCAL_TO_REMOTE, async (_e, config) => {
      try {
        return await cloudSyncLocalToRemote(config)
      } catch (error) {
        return { success: false, message: `同步失败: ${error}`, uploaded: 0, downloaded: 0, failed: 0, skipped: 0 }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLOUD_SYNC_REMOTE_TO_LOCAL, async (_e, config) => {
      try {
        return await cloudSyncRemoteToLocal(config)
      } catch (error) {
        return { success: false, message: `同步失败: ${error}`, uploaded: 0, downloaded: 0, failed: 0, skipped: 0 }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLOUD_SYNC_BIDIRECTIONAL, async (_e, config) => {
      try {
        return await cloudSyncBidirectional(config)
      } catch (error) {
        return { success: false, message: `同步失败: ${error}`, uploaded: 0, downloaded: 0, failed: 0, skipped: 0 }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLOUD_CANCEL_SYNC, async () => {
      try {
        cloudCancelSync()
        return { success: true, message: '同步已取消' }
      } catch (error) {
        return { success: false, message: `取消同步失败: ${error}` }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLOUD_GET_PROVIDERS, async () => {
      try {
        return getAvailableProviders()
      } catch {
        return []
      }
    })

    ipcMain.handle(IPC_CHANNELS.CLOUD_CONFIG_CHANGED, async () => {
      try {
        return { success: true, message: '云存储配置已更新' }
      } catch (error) {
        return { success: false, message: '配置更新失败', error: String(error) }
      }
    })
  }
}

