// 云存储服务的通用接口定义
export interface CloudFileInfo {
  id: string
  name: string
  path: string
  size: number
  modifiedTime: number
  isDirectory: boolean
  parentId?: string
}

export interface CloudSyncProgress {
  total: number
  processed: number
  action: 'upload' | 'download' | 'compare'
}

export interface CloudSyncResult {
  success: boolean
  message: string
  uploaded: number
  downloaded: number
  failed: number
  skipped: number
}

export interface CloudAuthConfig {
  // OAuth相关配置
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  // Access Token相关
  accessToken?: string
  refreshToken?: string
  // 其他认证信息
  [key: string]: unknown
}

export interface CloudStorageConfig {
  provider: 'webdav' | 'googledrive' | 'dropbox'
  enabled: boolean
  remotePath: string
  localPath: string
  syncOnStartup: boolean
  syncDirection: 'localToRemote' | 'remoteToLocal' | 'bidirectional'
  // 认证配置
  auth: CloudAuthConfig
  // WebDAV特有配置
  url?: string
  username?: string
  password?: string
  // 加密相关
  useCustomEncryption?: boolean
  encryptionTest?: string
  encryptionTestPlain?: string
}

// 云存储服务的抽象接口
export interface ICloudStorageService {
  // 初始化客户端
  initialize(config: CloudStorageConfig): Promise<boolean>

  // 测试连接
  testConnection(): Promise<{ success: boolean; message: string }>

  // 文件操作
  uploadFile(localPath: string, remotePath: string): Promise<boolean>
  downloadFile(remotePath: string, localPath: string): Promise<boolean>
  deleteFile(remotePath: string): Promise<boolean>

  // 目录操作
  createDirectory(remotePath: string): Promise<boolean>
  listFiles(remotePath: string): Promise<CloudFileInfo[]>
  
  // 文件信息
  getFileInfo(remotePath: string): Promise<CloudFileInfo | null>
  
  // 同步操作
  syncLocalToRemote(config: CloudStorageConfig): Promise<CloudSyncResult>
  syncRemoteToLocal(config: CloudStorageConfig): Promise<CloudSyncResult>
  syncBidirectional(config: CloudStorageConfig): Promise<CloudSyncResult>

  // 认证相关
  authenticate(): Promise<{ success: boolean; message: string; authUrl?: string }>
  refreshAuth(): Promise<boolean>
  
  // 服务名称
  getServiceName(): string
}

// 认证流程状态
export interface AuthFlowState {
  step: 'initial' | 'pending' | 'success' | 'error'
  authUrl?: string
  error?: string
  token?: string
}

// 云存储提供商枚举
export enum CloudProvider {
  WebDAV = 'webdav',
  GoogleDrive = 'googledrive',
  Dropbox = 'dropbox'
}

// 支持的文件类型
export const SYNC_FILE_EXTENSIONS = ['.md'] as const
export const SYNC_DIRECTORY_NAMES = ['.assets'] as const