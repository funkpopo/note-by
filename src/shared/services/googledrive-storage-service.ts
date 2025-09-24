import {
  ICloudStorageService,
  CloudStorageConfig,
  CloudFileInfo,
  CloudSyncResult
} from '../types/cloud-storage'
import { google } from 'googleapis'
import * as fs from 'fs/promises'
import * as fsNode from 'fs'
import * as crypto from 'crypto'
import * as path from 'path'

export class GoogleDriveStorageService implements ICloudStorageService {
  private drive: any = null
  private auth: any = null

  async initialize(config: CloudStorageConfig): Promise<boolean> {
    try {
      // 初始化Google Auth
      this.auth = new google.auth.OAuth2(
        config.auth.clientId as string,
        config.auth.clientSecret as string,
        config.auth.redirectUri as string
      )

      // 如果有访问令牌，设置凭据
      if (config.auth.accessToken) {
        this.auth.setCredentials({
          access_token: config.auth.accessToken,
          refresh_token: config.auth.refreshToken
        })
      }

      // 初始化Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth })

      return true
    } catch (error) {
      console.error('Google Drive初始化失败:', error)
      return false
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.drive) {
      return { success: false, message: '服务未初始化' }
    }

    try {
      // 测试连接 - 获取用户信息
      const response = await this.drive.about.get({ fields: 'user' })
      if (response.data.user) {
        return {
          success: true,
          message: `连接成功，用户: ${response.data.user.displayName || response.data.user.emailAddress}`
        }
      }
      return { success: false, message: '无法获取用户信息' }
    } catch (error) {
      return { success: false, message: `连接失败: ${error}` }
    }
  }

  private async findOrCreateFolder(folderPath: string): Promise<string> {
    const pathParts = folderPath.split('/').filter((part) => part)
    let parentId = 'root'

    for (const folderName of pathParts) {
      // 查找文件夹是否存在
      const response = await this.drive.files.list({
        q: `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        spaces: 'drive'
      })

      if (response.data.files && response.data.files.length > 0) {
        // 文件夹存在
        parentId = response.data.files[0].id
      } else {
        // 创建文件夹
        const createResponse = await this.drive.files.create({
          resource: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
          },
          fields: 'id'
        })
        parentId = createResponse.data.id
      }
    }

    return parentId
  }

  async uploadFile(localPath: string, remotePath: string): Promise<boolean> {
    if (!this.drive) return false

    try {
      // 读取本地文件
      const fileContent = await fs.readFile(localPath)
      const fileName = path.basename(remotePath)
      const folderPath = path.dirname(remotePath)

      // 确保远程文件夹存在
      const parentId = await this.findOrCreateFolder(folderPath)

      // 检查文件是否已存在
      const existingFiles = await this.drive.files.list({
        q: `name='${fileName}' and parents in '${parentId}'`,
        fields: 'files(id, name)',
        spaces: 'drive'
      })

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        // 更新现有文件
        await this.drive.files.update({
          fileId: existingFiles.data.files[0].id,
          media: {
            body: fileContent
          }
        })
      } else {
        // 创建新文件
        await this.drive.files.create({
          resource: {
            name: fileName,
            parents: [parentId]
          },
          media: {
            body: fileContent
          }
        })
      }

      return true
    } catch (error) {
      console.error('Google Drive上传失败:', error)
      return false
    }
  }

  async downloadFile(remotePath: string, localPath: string): Promise<boolean> {
    if (!this.drive) return false

    try {
      const fileName = path.basename(remotePath)
      const folderPath = path.dirname(remotePath)

      // 查找文件
      const folderId = await this.findOrCreateFolder(folderPath)
      const response = await this.drive.files.list({
        q: `name='${fileName}' and parents in '${folderId}'`,
        fields: 'files(id, name)',
        spaces: 'drive'
      })

      if (!response.data.files || response.data.files.length === 0) {
        return false
      }

      // 下载文件
      const fileResponse = await this.drive.files.get({
        fileId: response.data.files[0].id,
        alt: 'media'
      })

      // 确保本地目录存在
      const localDir = path.dirname(localPath)
      await fs.mkdir(localDir, { recursive: true })

      // 保存文件
      await fs.writeFile(localPath, fileResponse.data)
      return true
    } catch (error) {
      console.error('Google Drive下载失败:', error)
      return false
    }
  }

  async deleteFile(remotePath: string): Promise<boolean> {
    if (!this.drive) return false

    try {
      const fileName = path.basename(remotePath)
      const folderPath = path.dirname(remotePath)

      // 查找文件
      const folderId = await this.findOrCreateFolder(folderPath)
      const response = await this.drive.files.list({
        q: `name='${fileName}' and parents in '${folderId}'`,
        fields: 'files(id, name)',
        spaces: 'drive'
      })

      if (!response.data.files || response.data.files.length === 0) {
        return false
      }

      // 删除文件
      await this.drive.files.delete({
        fileId: response.data.files[0].id
      })

      return true
    } catch (error) {
      console.error('Google Drive删除失败:', error)
      return false
    }
  }

  async createDirectory(remotePath: string): Promise<boolean> {
    if (!this.drive) return false

    try {
      await this.findOrCreateFolder(remotePath)
      return true
    } catch (error) {
      console.error('Google Drive创建目录失败:', error)
      return false
    }
  }

  private async computeFileMd5(localPath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const hash = crypto.createHash('md5')
        const stream = fsNode.createReadStream(localPath)
        stream.on('data', (chunk) => hash.update(chunk))
        stream.on('end', () => resolve(hash.digest('hex')))
        stream.on('error', (err) => reject(err))
      } catch (err) {
        reject(err)
      }
    })
  }

  async listFiles(remotePath: string): Promise<CloudFileInfo[]> {
    if (!this.drive) return []

    try {
      const folderId = await this.findOrCreateFolder(remotePath)
      const response = await this.drive.files.list({
        q: `parents in '${folderId}'`,
        fields: 'files(id, name, size, modifiedTime, mimeType, parents)',
        spaces: 'drive'
      })

      const files: CloudFileInfo[] = []
      if (response.data.files) {
        for (const file of response.data.files) {
          files.push({
            id: file.id,
            name: file.name,
            path: path.join(remotePath, file.name),
            size: parseInt(file.size || '0'),
            modifiedTime: new Date(file.modifiedTime).getTime(),
            isDirectory: file.mimeType === 'application/vnd.google-apps.folder',
            parentId: file.parents ? file.parents[0] : undefined
          })
        }
      }

      return files
    } catch (error) {
      console.error('Google Drive列表文件失败:', error)
      return []
    }
  }

  async getFileInfo(remotePath: string): Promise<CloudFileInfo | null> {
    if (!this.drive) return null

    try {
      const fileName = path.basename(remotePath)
      const folderPath = path.dirname(remotePath)

      const folderId = await this.findOrCreateFolder(folderPath)
      const response = await this.drive.files.list({
        q: `name='${fileName}' and parents in '${folderId}'`,
        fields: 'files(id, name, size, modifiedTime, mimeType, parents)',
        spaces: 'drive'
      })

      if (!response.data.files || response.data.files.length === 0) {
        return null
      }

      const file = response.data.files[0]
      return {
        id: file.id,
        name: file.name,
        path: remotePath,
        size: parseInt(file.size || '0'),
        modifiedTime: new Date(file.modifiedTime).getTime(),
        isDirectory: file.mimeType === 'application/vnd.google-apps.folder',
        parentId: file.parents ? file.parents[0] : undefined
      }
    } catch (error) {
      console.error('Google Drive获取文件信息失败:', error)
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
      if (direction === 'upload' || direction === 'bidirectional') {
        // 上传本地文件到远程
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
            let success = false
            try {
              const localStat = await fs.stat(localPath)
              const localSize = localStat.size
              const info = await this.getFileInfo(remotePath)
              if (info && info.size === localSize) {
                const meta = await this.drive.files.get({ fileId: info.id, fields: 'md5Checksum' })
                const remoteMd5 = meta.data.md5Checksum as string | undefined
                if (remoteMd5) {
                  const localMd5 = await this.computeFileMd5(localPath)
                  if (localMd5 === remoteMd5) {
                    skipped++
                    continue
                  }
                }
              }
            } catch {}
            success = await this.uploadFile(localPath, remotePath)
            if (success) {
              uploaded++
            } else {
              failed++
            }
          }
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
            let success = false
            try {
              const meta = await this.drive.files.get({ fileId: remoteFile.id, fields: 'md5Checksum, size' })
              const remoteMd5 = meta.data.md5Checksum as string | undefined
              const remoteSize = parseInt((meta.data.size as string) || '0')
              let same = false
              try {
                const stat = await fs.stat(localPath)
                if (stat.size === remoteSize && remoteMd5) {
                  const localMd5 = await this.computeFileMd5(localPath)
                  same = localMd5 === remoteMd5
                }
              } catch {}
              if (same) {
                skipped++
              } else {
                success = await this.downloadFile(remoteFile.path, localPath)
              }
            } catch {
              success = await this.downloadFile(remoteFile.path, localPath)
            }
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
    if (!this.drive) {
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
    if (!this.drive) {
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
    if (!this.drive) {
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
    if (!this.auth) {
      return { success: false, message: '认证客户端未初始化' }
    }

    try {
      const authUrl = this.auth.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive']
      })

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
    if (!this.auth) return false

    try {
      const { credentials } = await this.auth.refreshAccessToken()
      this.auth.setCredentials(credentials)
      return true
    } catch (error) {
      console.error('刷新Google Drive认证失败:', error)
      return false
    }
  }

  getServiceName(): string {
    return 'Google Drive'
  }
}
