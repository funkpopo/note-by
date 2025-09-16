import {
  ICloudStorageService,
  CloudStorageConfig,
  CloudFileInfo,
  CloudSyncResult
} from '../types/cloud-storage'
import { Dropbox } from 'dropbox'
import * as fs from 'fs/promises'
import * as path from 'path'

export class DropboxStorageService implements ICloudStorageService {
  private dbx: Dropbox | null = null
  private config: CloudStorageConfig | null = null

  async initialize(config: CloudStorageConfig): Promise<boolean> {
    this.config = config

    try {
      // 初始化Dropbox客户端
      this.dbx = new Dropbox({
        clientId: config.auth.clientId as string,
        clientSecret: config.auth.clientSecret as string,
        accessToken: config.auth.accessToken as string,
        refreshToken: config.auth.refreshToken as string
      })

      return true
    } catch (error) {
      console.error('Dropbox初始化失败:', error)
      return false
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.dbx) {
      return { success: false, message: '服务未初始化' }
    }

    try {
      // 测试连接 - 获取用户信息
      const response = await this.dbx.usersGetCurrentAccount()
      if (response.result) {
        return {
          success: true,
          message: `连接成功，用户: ${response.result.name.display_name || response.result.email}`
        }
      }
      return { success: false, message: '无法获取用户信息' }
    } catch (error) {
      return { success: false, message: `连接失败: ${error}` }
    }
  }

  private normalizePath(filePath: string): string {
    // Dropbox路径必须以/开头，不能以/结尾
    let normalized = filePath.replace(/\\/g, '/')
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized
    }
    if (normalized !== '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  async uploadFile(localPath: string, remotePath: string): Promise<boolean> {
    if (!this.dbx) return false

    try {
      // 读取本地文件
      const fileContent = await fs.readFile(localPath)
      const normalizedRemotePath = this.normalizePath(remotePath)

      // 上传文件
      await this.dbx.filesUpload({
        path: normalizedRemotePath,
        contents: fileContent,
        mode: 'overwrite' as any,
        autorename: false
      })

      return true
    } catch (error) {
      console.error('Dropbox上传失败:', error)
      return false
    }
  }

  async downloadFile(remotePath: string, localPath: string): Promise<boolean> {
    if (!this.dbx) return false

    try {
      const normalizedRemotePath = this.normalizePath(remotePath)

      // 下载文件
      const response = await this.dbx.filesDownload({ path: normalizedRemotePath })

      // 确保本地目录存在
      const localDir = path.dirname(localPath)
      await fs.mkdir(localDir, { recursive: true })

      // 保存文件
      const fileData = (response.result as any).fileBinary
      await fs.writeFile(localPath, fileData)

      return true
    } catch (error) {
      console.error('Dropbox下载失败:', error)
      return false
    }
  }

  async deleteFile(remotePath: string): Promise<boolean> {
    if (!this.dbx) return false

    try {
      const normalizedRemotePath = this.normalizePath(remotePath)
      await this.dbx.filesDeleteV2({ path: normalizedRemotePath })
      return true
    } catch (error) {
      console.error('Dropbox删除失败:', error)
      return false
    }
  }

  async createDirectory(remotePath: string): Promise<boolean> {
    if (!this.dbx) return false

    try {
      const normalizedRemotePath = this.normalizePath(remotePath)
      await this.dbx.filesCreateFolderV2({
        path: normalizedRemotePath,
        autorename: false
      })
      return true
    } catch (error: any) {
      // 如果文件夹已存在，也认为成功
      if (
        error.error &&
        error.error['.tag'] === 'path' &&
        error.error.path &&
        error.error.path['.tag'] === 'conflict'
      ) {
        return true
      }
      console.error('Dropbox创建目录失败:', error)
      return false
    }
  }

  async listFiles(remotePath: string): Promise<CloudFileInfo[]> {
    if (!this.dbx) return []

    try {
      const normalizedRemotePath = this.normalizePath(remotePath)
      const response = await this.dbx.filesListFolder({ path: normalizedRemotePath })

      const files: CloudFileInfo[] = []
      if (response.result.entries) {
        for (const entry of response.result.entries) {
          if (entry['.tag'] === 'file' || entry['.tag'] === 'folder') {
            files.push({
              id: entry.path_lower || entry.name,
              name: entry.name,
              path: entry.path_display || entry.path_lower || entry.name,
              size: entry['.tag'] === 'file' ? (entry as any).size : 0,
              modifiedTime:
                entry['.tag'] === 'file'
                  ? new Date(
                      (entry as any).client_modified || (entry as any).server_modified
                    ).getTime()
                  : Date.now(),
              isDirectory: entry['.tag'] === 'folder'
            })
          }
        }
      }

      return files
    } catch (error) {
      console.error('Dropbox列表文件失败:', error)
      return []
    }
  }

  async getFileInfo(remotePath: string): Promise<CloudFileInfo | null> {
    if (!this.dbx) return null

    try {
      const normalizedRemotePath = this.normalizePath(remotePath)
      const response = await this.dbx.filesGetMetadata({ path: normalizedRemotePath })

      const metadata = response.result
      if (metadata['.tag'] === 'file' || metadata['.tag'] === 'folder') {
        return {
          id: metadata.path_lower || metadata.name,
          name: metadata.name,
          path: metadata.path_display || metadata.path_lower || metadata.name,
          size: metadata['.tag'] === 'file' ? (metadata as any).size : 0,
          modifiedTime:
            metadata['.tag'] === 'file'
              ? new Date(
                  (metadata as any).client_modified || (metadata as any).server_modified
                ).getTime()
              : Date.now(),
          isDirectory: metadata['.tag'] === 'folder'
        }
      }

      return null
    } catch (error) {
      console.error('Dropbox获取文件信息失败:', error)
      return null
    }
  }

  private async syncDirectory(
    localDir: string,
    remoteDir: string,
    direction: 'upload' | 'download' | 'bidirectional'
  ): Promise<{ uploaded: number; downloaded: number; failed: number; skipped: number }> {
    let uploaded = 0,
      downloaded = 0,
      failed = 0,
      skipped = 0

    try {
      // 确保远程目录存在
      if (direction === 'upload' || direction === 'bidirectional') {
        await this.createDirectory(remoteDir)
      }

      if (direction === 'upload' || direction === 'bidirectional') {
        // 上传本地文件到远程
        try {
          const localEntries = await fs.readdir(localDir, { withFileTypes: true })

          for (const entry of localEntries) {
            const localPath = path.join(localDir, entry.name)
            const remotePath = path.join(remoteDir, entry.name).replace(/\\/g, '/')

            if (entry.isDirectory()) {
              if (entry.name === '.assets') {
                // 递归处理.assets目录
                const subResult = await this.syncDirectory(localPath, remotePath, direction)
                uploaded += subResult.uploaded
                downloaded += subResult.downloaded
                failed += subResult.failed
                skipped += subResult.skipped
              }
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
              // 同步markdown文件
              const success = await this.uploadFile(localPath, remotePath)
              if (success) {
                uploaded++
              } else {
                failed++
              }
            }
          }
        } catch (error) {
          // 如果本地目录不存在，跳过上传 - 静默处理
        }
      }

      if (direction === 'download' || direction === 'bidirectional') {
        // 从远程下载文件到本地
        const remoteFiles = await this.listFiles(remoteDir)

        for (const remoteFile of remoteFiles) {
          const localPath = path.join(localDir, remoteFile.name)

          if (remoteFile.isDirectory) {
            if (remoteFile.name === '.assets') {
              // 递归处理.assets目录
              await fs.mkdir(localPath, { recursive: true })
              const subResult = await this.syncDirectory(localPath, remoteFile.path, direction)
              uploaded += subResult.uploaded
              downloaded += subResult.downloaded
              failed += subResult.failed
              skipped += subResult.skipped
            }
          } else if (remoteFile.name.endsWith('.md')) {
            // 同步markdown文件
            const success = await this.downloadFile(remoteFile.path, localPath)
            if (success) {
              downloaded++
            } else {
              failed++
            }
          }
        }
      }
    } catch (error) {
      console.error('同步目录失败:', error)
      failed++
    }

    return { uploaded, downloaded, failed, skipped }
  }

  async syncLocalToRemote(config: CloudStorageConfig): Promise<CloudSyncResult> {
    if (!this.dbx) {
      return {
        success: false,
        message: '服务未初始化',
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }

    try {
      const result = await this.syncDirectory(config.localPath, config.remotePath, 'upload')
      return {
        success: true,
        message: `上传完成: 上传了 ${result.uploaded} 个文件，失败 ${result.failed} 个`,
        uploaded: result.uploaded,
        downloaded: 0,
        failed: result.failed,
        skipped: result.skipped
      }
    } catch (error) {
      return {
        success: false,
        message: `上传失败: ${error}`,
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }
  }

  async syncRemoteToLocal(config: CloudStorageConfig): Promise<CloudSyncResult> {
    if (!this.dbx) {
      return {
        success: false,
        message: '服务未初始化',
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }

    try {
      const result = await this.syncDirectory(config.localPath, config.remotePath, 'download')
      return {
        success: true,
        message: `下载完成: 下载了 ${result.downloaded} 个文件，失败 ${result.failed} 个`,
        uploaded: 0,
        downloaded: result.downloaded,
        failed: result.failed,
        skipped: result.skipped
      }
    } catch (error) {
      return {
        success: false,
        message: `下载失败: ${error}`,
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }
  }

  async syncBidirectional(config: CloudStorageConfig): Promise<CloudSyncResult> {
    if (!this.dbx) {
      return {
        success: false,
        message: '服务未初始化',
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }

    try {
      const result = await this.syncDirectory(config.localPath, config.remotePath, 'bidirectional')
      return {
        success: true,
        message: `双向同步完成: 上传了 ${result.uploaded} 个文件，下载了 ${result.downloaded} 个文件，失败 ${result.failed} 个`,
        uploaded: result.uploaded,
        downloaded: result.downloaded,
        failed: result.failed,
        skipped: result.skipped
      }
    } catch (error) {
      return {
        success: false,
        message: `双向同步失败: ${error}`,
        uploaded: 0,
        downloaded: 0,
        failed: 0,
        skipped: 0
      }
    }
  }

  async authenticate(): Promise<{ success: boolean; message: string; authUrl?: string }> {
    if (!this.config || !this.config.auth.clientId) {
      return { success: false, message: '客户端ID未配置' }
    }

    try {
      // 创建临时的Dropbox实例用于认证
      const tempDbx = new Dropbox({ clientId: this.config.auth.clientId as string })

      // Dropbox SDK v10 使用 auth.getAuthenticationUrl()
      const authUrl = await (tempDbx as any).auth.getAuthenticationUrl(
        (this.config.auth.redirectUri as string) || 'http://localhost:3000/auth/callback'
      )

      return {
        success: true,
        message: '请完成OAuth认证',
        authUrl
      }
    } catch (error) {
      return { success: false, message: `生成认证URL失败: ${error}` }
    }
  }

  async refreshAuth(): Promise<boolean> {
    if (!this.dbx || !this.config?.auth.refreshToken) return false

    try {
      // Dropbox SDK会自动处理token刷新
      // 这里可以实现手动刷新逻辑
      return true
    } catch (error) {
      console.error('刷新Dropbox认证失败:', error)
      return false
    }
  }

  getServiceName(): string {
    return 'Dropbox'
  }
}
