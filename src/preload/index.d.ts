import { ElectronAPI } from '@electron-toolkit/preload'
import type { CloudStorageConfig } from '../shared/types/cloud-storage'
import type { AiApiConfig } from '../shared/types/common'
import type { Result } from '../shared/types/result'
import type { AnalysisCacheItem } from '../shared/types/dto'

type R<T = Record<string, unknown>> = Result<T>
import type { AnalysisCacheItem } from '../shared/types/dto'

// API配置接口
// Moved to shared/types/common

// 设置API接口定义
interface SettingsAPI {
  getAll: () => Promise<Record<string, unknown>>
  setAll: (settings: Record<string, unknown>) => Promise<boolean>
  get: <T>(key: string, defaultValue?: T) => Promise<T>
  set: <T>(key: string, value: T) => Promise<boolean>
}

// 更新检查API接口定义
interface UpdatesAPI {
  checkForUpdates: () => Promise<
    R<{
      hasUpdate: boolean
      latestVersion: string
      currentVersion: string
    }>
  >
  onUpdateAvailable: (
    callback: (updateInfo: { latestVersion: string; currentVersion: string }) => void
  ) => void
}

// OpenAI API接口定义
interface OpenAIAPI {
  testConnection: (AiApiConfig: AiApiConfig) => Promise<R<{ message: string }>>
  generateContent: (request: {
    apiKey: string
    apiUrl: string
    modelName: string
    prompt: string
    maxTokens?: number
    stream?: boolean
  }) => Promise<R<{ content?: string }>>

  streamGenerateContent: (
    request: {
      apiKey: string
      apiUrl: string
      modelName: string
      prompt: string
      maxTokens?: number
    },
    callbacks: {
      onData: (chunk: string) => void
      onDone: (content: string) => void
      onError: (error: string) => void
    }
  ) => Promise<R<{ streamId?: string }>>

  stopStreamGenerate: (streamId: string) => Promise<R<{}>>
}

// API配置管理接口定义
interface ApiConfigAPI {
  saveConfig: (config: AiApiConfig) => Promise<R<{}>>
  deleteConfig: (configId: string) => Promise<R<{}>>
}

// 分析缓存项接口
/* AnalysisCacheItem moved to shared/types/dto */
interface _LegacyAnalysisCacheItem_DoNotUse {
  date: string
  stats: {
    totalNotes: number
    totalEdits: number
    averageEditLength: number
    mostEditedNotes: Array<{
      filePath: string
      editCount: number
      count?: number
    }>
    notesByDate: Array<{
      date: string
      count: number
    }>
    editsByDate: Array<{
      date: string
      count: number
    }>
    editTimeDistribution: Array<{
      hour: number
      count: number
    }>
    topFolders?: Array<{
      folder: string
      count: number
    }>
  }
  activityData: {
    dailyActivity: Record<
      string,
      {
        createdNotes: number
        editedNotes: number
        totalEdits: number
        charactersAdded: number
        activeHours: number[]
      }
    >
    noteDetails: Array<{
      filePath: string
      firstEdit: number
      lastEdit: number
      editCount: number
      averageEditSize: number
    }>
  }
  result: {
    summary: string
    writingHabits: {
      title: string
      content: string
    }
    writingRhythm: {
      title: string
      content: string
    }
    topics: {
      title: string
      content: string
    }
    writingBehavior: {
      title: string
      content: string
    }
    recommendations: {
      title: string
      items: string[]
    }
    efficiencyTips: {
      title: string
      items: string[]
    }
    suggestedGoals: {
      title: string
      items: string[]
    }
  }
  modelId: string
  dataFingerprint?: {
    totalNotes: number
    totalEdits: number
    lastEditTimestamp: number
    contentHash: string
    notesCountHash: string
  }
}

// 数据分析API接口定义
interface AnalyticsAPI {
  // 获取笔记历史统计数据
  getNoteHistoryStats: () => Promise<
    R<{
      stats?: {
        totalNotes: number
        totalEdits: number
        averageEditLength: number
        mostEditedNotes: Array<{
          filePath: string
          count: number
          lastEditTime: number
        }>
        notesByDate: Array<{
          date: string
          count: number
        }>
        editsByDate: Array<{
          date: string
          count: number
        }>
        editTimeDistribution: Array<{
          hour: number
          count: number
        }>
        topFolders: Array<{
          folder: string
          count: number
        }>
      }
    }>
  >

  // 获取用户活动数据
  getUserActivityData: (days?: number) => Promise<
    R<{
      activityData?: {
        dailyActivity: Record<
          string,
          {
            createdNotes: number
            editedNotes: number
            totalEdits: number
            charactersAdded: number
            activeHours: number[]
          }
        >
        noteDetails: Array<{
          filePath: string
          firstEdit: number
          lastEdit: number
          editCount: number
          averageEditSize: number
        }>
      }
    }>
  >

  // 获取分析缓存
  getAnalysisCache: () => Promise<R<{ cache?: AnalysisCacheItem }>>

  // 保存分析缓存
  saveAnalysisCache: (cacheData: AnalysisCacheItem) => Promise<R<{}>>

  // 重置分析缓存
  resetAnalysisCache: () => Promise<R<{}>>
}

// 全局标签API接口定义
interface TagsAPI {
  // 获取全局标签数据
  getGlobalTags: () => Promise<
    R<{
      tagsData?: {
        topTags: Array<{ tag: string; count: number }>
        tagRelations: Array<{ source: string; target: string; strength: number }>
        documentTags: Array<{ filePath: string; tags: string[] }>
      }
    }>
  >

  // 刷新全局标签数据
  refreshGlobalTags: () => Promise<
    R<{
      tagsData?: {
        topTags: Array<{ tag: string; count: number }>
        tagRelations: Array<{ source: string; target: string; strength: number }>
        documentTags: Array<{ filePath: string; tags: string[] }>
      }
    }>
  >

  getFileTags: (filePath: string) => Promise<R<{ tags?: string[] }>>

  setFileTags: (filePath: string, tags: string[]) => Promise<R<{}>>
}

// 应用导航API接口定义
interface NavigationAPI {
  // 导航到指定视图
  navigateToView: (viewKey: string) => Promise<R<{}>>

  // 监听导航事件
  onNavigate: (callback: (viewKey: string) => void) => () => void
}

// 聊天历史API接口定义
interface ChatAPI {
  // 创建新的聊天会话
  createSession: (title?: string) => Promise<string | null>

  // 保存聊天消息
  saveMessage: (message: {
    id: string
    sessionId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
    parentId?: string
    createdAt: number
    modelId?: string
  }) => Promise<boolean>

  // 获取所有聊天会话
  getSessions: () => Promise<
    Array<{
      id: string
      title?: string
      createdAt: number
      updatedAt: number
      messageCount: number
      isArchived: boolean
    }>
  >

  // 获取指定会话的消息
  getSessionMessages: (sessionId: string) => Promise<
    Array<{
      id: string
      sessionId: string
      role: 'user' | 'assistant' | 'system'
      content: string
      status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
      parentId?: string
      createdAt: number
      modelId?: string
    }>
  >

  // 更新会话标题
  updateSessionTitle: (sessionId: string, title: string) => Promise<boolean>

  // 删除聊天会话
  deleteSession: (sessionId: string) => Promise<boolean>

  // 删除单条聊天消息
  deleteMessage: (messageId: string) => Promise<boolean>

  // 获取会话统计信息
  getSessionStats: () => Promise<{
    totalSessions: number
    totalMessages: number
    activeSessions: number
  }>

  // 清理旧的会话
  cleanupOldSessions: (keepCount?: number) => Promise<number>
}

// WebDAV同步API接口定义
interface WebDAVAPI {
  // 测试WebDAV连接
  testConnection: (config: {
    url: string
    username: string
    password: string
    remotePath: string
  }) => Promise<R<{ message: string }>>

  // 同步本地到远程
  syncLocalToRemote: (config: {
    url: string
    username: string
    password: string
    remotePath: string
    localPath?: string
  }) => Promise<R<{ message: string; uploaded: number; failed: number; skipped: number }>>

  // 同步远程到本地
  syncRemoteToLocal: (config: {
    url: string
    username: string
    password: string
    remotePath: string
    localPath?: string
  }) => Promise<R<{ message: string; downloaded: number; failed: number; skipped: number }>>

  // 双向同步
  syncBidirectional: (config: {
    url: string
    username: string
    password: string
    remotePath: string
    localPath?: string
  }) => Promise<
    R<{
      message: string
      uploaded: number
      downloaded: number
      failed: number
      cancelled?: boolean
      skippedUpload: number
      skippedDownload: number
    }>
  >

  // 取消同步
  cancelSync: () => Promise<R<{ message: string }>>

  // 清除同步缓存
  clearSyncCache: () => Promise<R<{ message?: string }>>

  // 验证主密码
  verifyMasterPassword: (password: string) => Promise<R<{ message?: string }>>

  // 设置主密码
  setMasterPassword: (config: {
    password: string
    webdavConfig: Record<string, unknown>
  }) => Promise<R<{ message?: string }>>

  // 通知WebDAV配置已变更
  notifyConfigChanged: () => Promise<R<{ message?: string }>>

  // 监听同步进度（增强：包含当前文件、阶段、计数等）
  onSyncProgress: (
    callback: (progress: {
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
    }) => void
  ) => () => void
  // 监听冲突事件（WebDAV）
  onConflict: (
    callback: (payload: { localPath: string; conflictFilePath: string; timestamp?: number }) => void
  ) => () => void
}

// 云存储API接口定义
interface CloudStorageAPI {
  testConnection: (config: CloudStorageConfig) => Promise<R<{ message: string }>>
  authenticate: (config: CloudStorageConfig) => Promise<R<{ message: string; authUrl?: string }>>
  syncLocalToRemote: (
    config: CloudStorageConfig
  ) => Promise<
    R<{ message: string; uploaded: number; downloaded: number; failed: number; skipped: number }>
  >
  syncRemoteToLocal: (
    config: CloudStorageConfig
  ) => Promise<
    R<{ message: string; uploaded: number; downloaded: number; failed: number; skipped: number }>
  >
  syncBidirectional: (
    config: CloudStorageConfig
  ) => Promise<
    R<{ message: string; uploaded: number; downloaded: number; failed: number; skipped: number }>
  >
  cancelSync: () => Promise<R<{ message: string }>>
  getProviders: () => Promise<Array<{ id: string; name: string; description: string }>>
  notifyConfigChanged: () => Promise<R<{ message: string }>>
  onSyncProgress: (
    callback: (progress: {
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
    }) => void
  ) => () => void
  // 监听冲突事件（云存储统一）
  onConflict: (
    callback: (payload: { localPath: string; conflictFilePath: string; timestamp?: number }) => void
  ) => () => void
}

// 窗口API接口定义
interface WindowAPI {
  setBackgroundColor: (backgroundColor: string) => Promise<R<{}>>
}

// 全局API接口定义
interface API {
  getNotesPath: () => Promise<string>
  settings: SettingsAPI
  openai: OpenAIAPI
  api: ApiConfigAPI
  updates: UpdatesAPI
  markdown: {
    save: (filePath: string, content: string) => Promise<R<{ path?: string }>>
    exportToPdf: (filePath: string, content: string) => Promise<R<{ path?: string }>>
    exportToDocx: (filePath: string, content: string) => Promise<R<{ path?: string }>>
    exportToHtml: (filePath: string, content: string) => Promise<R<{ path?: string }>>
    exportToNotion: (filePath: string, content: string) => Promise<R<{ path?: string }>>
    exportToObsidian: (filePath: string, content: string) => Promise<R<{ path?: string }>>
    getFolders: () => Promise<R<{ folders?: string[] }>>
    getFiles: (folderName: string) => Promise<R<{ files?: string[] }>>
    readFile: (filePath: string) => Promise<R<{ content?: string }>>

    // 创建新文件夹
    createFolder: (folderName: string) => Promise<R<{ path?: string }>>

    // 删除文件夹
    deleteFolder: (folderName: string) => Promise<R<{}>>

    // 重命名文件夹
    renameFolder: (oldFolderName: string, newFolderName: string) => Promise<R<{}>>

    // 创建新笔记
    createNote: (
      folderName: string,
      fileName: string,
      content: string
    ) => Promise<R<{ path?: string }>>

    // 删除笔记文件
    deleteFile: (filePath: string) => Promise<R<{}>>

    // 重命名笔记文件
    renameFile: (oldFilePath: string, newFilePath: string) => Promise<R<{}>>

    /**
     * 获取文档历史记录
     * @param filePath 文件路径
     */
    getHistory: (filePath: string) => Promise<{
      success: boolean
      history?: Array<{
        id: number
        filePath: string
        content: string
        timestamp: number
      }>
      error?: string
    }>

    /**
     * 获取特定ID的历史记录
     * @param id 历史记录ID
     */
    getHistoryById: (id: number) => Promise<{
      success: boolean
      history?: {
        id: number
        filePath: string
        content: string
        timestamp: number
      }
      error?: string
    }>

    /**
     * 重命名笔记文件
     * @param oldFilePath 旧文件路径
     * @param newFilePath 新文件路径
     */
    renameFile: (
      oldFilePath: string,
      newFilePath: string
    ) => Promise<{ success: boolean; error?: string }>

    /**
     * 上传文件
     * @param filePath 当前markdown文件路径
     * @param fileData 文件数据（base64或其他格式）
     * @param fileName 文件名
     */
    uploadFile: (
      filePath: string,
      fileData: string,
      fileName: string
    ) => Promise<R<{ url?: string; path?: string }>>
  }
  webdav: WebDAVAPI
  cloudStorage: CloudStorageAPI
  analytics: AnalyticsAPI
  tags: TagsAPI
  navigation: NavigationAPI
  chat: ChatAPI
  window: WindowAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
