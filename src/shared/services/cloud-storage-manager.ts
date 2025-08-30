import { ICloudStorageService, CloudStorageConfig, CloudSyncResult } from '../types/cloud-storage'
import { WebDAVStorageService } from './webdav-storage-service'
import { GoogleDriveStorageService } from './googledrive-storage-service'
import { DropboxStorageService } from './dropbox-storage-service'

export class CloudStorageManager {
  private services: Map<string, ICloudStorageService> = new Map()

  constructor() {
    // 注册所有支持的云存储服务
    this.registerService('webdav', new WebDAVStorageService())
    this.registerService('googledrive', new GoogleDriveStorageService())
    this.registerService('dropbox', new DropboxStorageService())
  }

  private registerService(provider: string, service: ICloudStorageService): void {
    this.services.set(provider, service)
  }

  public getService(provider: string): ICloudStorageService | null {
    return this.services.get(provider) || null
  }

  public async initializeService(config: CloudStorageConfig): Promise<boolean> {
    const service = this.getService(config.provider)
    if (!service) {
      throw new Error(`不支持的云存储提供商: ${config.provider}`)
    }

    return await service.initialize(config)
  }

  public async testConnection(config: CloudStorageConfig): Promise<{ success: boolean; message: string }> {
    const service = this.getService(config.provider)
    if (!service) {
      return { success: false, message: `不支持的云存储提供商: ${config.provider}` }
    }

    try {
      await service.initialize(config)
      return await service.testConnection()
    } catch (error) {
      return { success: false, message: `连接失败: ${error}` }
    }
  }

  public async syncLocalToRemote(config: CloudStorageConfig): Promise<CloudSyncResult> {
    const service = this.getService(config.provider)
    if (!service) {
      return {
        success: false,
        message: `不支持的云存储提供商: ${config.provider}`,
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }

    try {
      await service.initialize(config)
      return await service.syncLocalToRemote(config)
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

  public async syncRemoteToLocal(config: CloudStorageConfig): Promise<CloudSyncResult> {
    const service = this.getService(config.provider)
    if (!service) {
      return {
        success: false,
        message: `不支持的云存储提供商: ${config.provider}`,
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }

    try {
      await service.initialize(config)
      return await service.syncRemoteToLocal(config)
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

  public async syncBidirectional(config: CloudStorageConfig): Promise<CloudSyncResult> {
    const service = this.getService(config.provider)
    if (!service) {
      return {
        success: false,
        message: `不支持的云存储提供商: ${config.provider}`,
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }

    try {
      await service.initialize(config)
      return await service.syncBidirectional(config)
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

  public async authenticate(config: CloudStorageConfig): Promise<{ success: boolean; message: string; authUrl?: string }> {
    const service = this.getService(config.provider)
    if (!service) {
      return { success: false, message: `不支持的云存储提供商: ${config.provider}` }
    }

    try {
      await service.initialize(config)
      return await service.authenticate()
    } catch (error) {
      return { success: false, message: `认证失败: ${error}` }
    }
  }

  public getAvailableProviders(): string[] {
    return Array.from(this.services.keys())
  }

  public getSupportedProviders(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'webdav',
        name: 'WebDAV',
        description: '支持Nextcloud、ownCloud等WebDAV协议的云存储服务'
      },
      {
        id: 'googledrive',
        name: 'Google Drive',
        description: 'Google提供的云存储服务'
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'Dropbox云存储服务'
      }
    ]
  }
}