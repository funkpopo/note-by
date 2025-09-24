import {
  ICloudStorageService,
  CloudStorageConfig,
  CloudFileInfo,
  CloudSyncResult
} from '../types/cloud-storage'

export class WebDAVStorageService implements ICloudStorageService {
  private config: CloudStorageConfig | null = null

  async initialize(config: CloudStorageConfig): Promise<boolean> {
    this.config = config
    // WebDAV初始化逻辑将在主进程中实际实现
    return true
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      return { success: false, message: '服务未初始化' }
    }
    // 通过预加载暴露的IPC桥接至主进程执行连接测试
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (globalThis as any).api
      if (api && api.webdav && typeof api.webdav.testConnection === 'function') {
        const { url, username, password, remotePath } = this.config
        return await api.webdav.testConnection({ url, username, password, remotePath })
      }
    } catch {
      // ignore and fall back to message below
    }
    return { success: false, message: 'WebDAV测试需由主进程处理' }
  }

  async uploadFile(_localPath: string, _remotePath: string): Promise<boolean> {
    // WebDAV的uploadFile功能在syncLocalToRemote中实现
    throw new Error('WebDAV服务暂不支持单个文件上传，请使用同步功能')
  }

  async downloadFile(_remotePath: string, _localPath: string): Promise<boolean> {
    // WebDAV的downloadFile功能在syncRemoteToLocal中实现
    throw new Error('WebDAV服务暂不支持单个文件下载，请使用同步功能')
  }

  async deleteFile(_remotePath: string): Promise<boolean> {
    throw new Error('WebDAV服务暂不支持文件删除功能')
  }

  async createDirectory(_remotePath: string): Promise<boolean> {
    // WebDAV的创建目录功能在现有代码中已实现
    return true
  }

  async listFiles(_remotePath: string): Promise<CloudFileInfo[]> {
    // 实现文件列表功能，需要调用WebDAV客户端
    throw new Error('WebDAV服务暂不支持文件列表功能')
  }

  async getFileInfo(_remotePath: string): Promise<CloudFileInfo | null> {
    throw new Error('WebDAV服务暂不支持获取文件信息功能')
  }

  async syncLocalToRemote(config: CloudStorageConfig): Promise<CloudSyncResult> {
    // 通过预加载暴露的IPC桥接至主进程执行同步
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (globalThis as any).api
      if (api && api.webdav && typeof api.webdav.syncLocalToRemote === 'function') {
        const { url, username, password, remotePath, localPath } = config
        const result = await api.webdav.syncLocalToRemote({
          url,
          username,
          password,
          remotePath,
          localPath
        })
        return {
          success: result.success,
          message: result.message,
          uploaded: result.uploaded ?? 0,
          downloaded: 0,
          failed: result.failed ?? 0,
          skipped: (result as any).skipped ?? 0
        }
      }
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
    return {
      success: false,
      message: 'WebDAV同步需要在主进程中执行',
      uploaded: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0
    }
  }

  async syncRemoteToLocal(config: CloudStorageConfig): Promise<CloudSyncResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (globalThis as any).api
      if (api && api.webdav && typeof api.webdav.syncRemoteToLocal === 'function') {
        const { url, username, password, remotePath, localPath } = config
        const result = await api.webdav.syncRemoteToLocal({
          url,
          username,
          password,
          remotePath,
          localPath
        })
        return {
          success: result.success,
          message: result.message,
          uploaded: 0,
          downloaded: result.downloaded ?? 0,
          failed: result.failed ?? 0,
          skipped: (result as any).skipped ?? 0
        }
      }
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
    return {
      success: false,
      message: 'WebDAV同步需要在主进程中执行',
      uploaded: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0
    }
  }

  async syncBidirectional(config: CloudStorageConfig): Promise<CloudSyncResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (globalThis as any).api
      if (api && api.webdav && typeof api.webdav.syncBidirectional === 'function') {
        const { url, username, password, remotePath, localPath } = config
        const result = await api.webdav.syncBidirectional({
          url,
          username,
          password,
          remotePath,
          localPath
        })
        return {
          success: result.success,
          message: result.message,
          uploaded: result.uploaded ?? 0,
          downloaded: result.downloaded ?? 0,
          failed: result.failed ?? 0,
          skipped: (result as any).skipped ?? 0
        }
      }
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
    return {
      success: false,
      message: 'WebDAV同步需要在主进程中执行',
      uploaded: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0
    }
  }

  async authenticate(): Promise<{ success: boolean; message: string; authUrl?: string }> {
    // WebDAV使用用户名密码认证，不需要OAuth流程
    return { success: true, message: 'WebDAV使用用户名密码认证' }
  }

  async refreshAuth(): Promise<boolean> {
    // WebDAV不需要刷新认证
    return true
  }

  getServiceName(): string {
    return 'WebDAV'
  }
}
