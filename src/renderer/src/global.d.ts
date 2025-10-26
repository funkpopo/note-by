import type { ChatSession, ChatMessage, AnalysisCacheItem } from '../../shared/types/dto'
import type { AiApiConfig, HistoryItem } from '../../shared/types/common'
import type { Result } from '../../shared/types/result'

type R<T = Record<string, unknown>> = Result<T>

// 历史记录项接口
// HistoryItem moved to shared/types/common

// AiApiConfig moved to shared/types/common

interface ChatAPI {
  createSession: (title?: string) => Promise<string | null>
  saveMessage: (message: Omit<ChatMessage, 'id'>) => Promise<boolean>
  getSessions: () => Promise<ChatSession[]>
  getSessionMessages: (sessionId: string) => Promise<ChatMessage[]>
  updateSessionTitle: (sessionId: string, title: string) => Promise<boolean>
  deleteSession: (sessionId: string) => Promise<boolean>
  deleteMessage: (messageId: string) => Promise<boolean>
}

interface Window {
  api: {
    chat: ChatAPI
    // 设置相关API
    settings: {
      // 获取所有设置
      getAll: () => Promise<Record<string, unknown>>
      // 保存所有设置
      setAll: (settings: Record<string, unknown>) => Promise<boolean>
      // 获取单个设置
      get: <T>(key: string, defaultValue?: T) => Promise<T>
      // 设置单个设置
      set: <T>(key: string, value: T) => Promise<boolean>
    }
    tags: {
      getGlobalTags: () => Promise<
        R<{
          tagsData?: {
            topTags: Array<{ tag: string; count: number }>
            tagRelations: Array<{ source: string; target: string; strength: number }>
            documentTags: Array<{ filePath: string; tags: string[] }>
          }
        }>
      >
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
    // 数据分析相关API
    analytics: {
      // 获取笔记历史统计数据
      getNoteHistoryStats: () => Promise<R<{ stats: StatsData }>>
      // 获取用户活动数据
      getUserActivityData: (days: number) => Promise<R<{ activityData: ActivityData }>>
      // 获取分析缓存
      getAnalysisCache: () => Promise<R<{ cache?: AnalysisCacheItem }>>
      // 保存分析缓存
      saveAnalysisCache: (cacheData: AnalysisCacheItem) => Promise<R<{}>>
      // 重置分析缓存
      resetAnalysisCache: () => Promise<R<{}>>
    }
    // OpenAI相关API
    openai: {
      // 测试连接
      testConnection: (AiApiConfig: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<R<{ message: string }>>

      // AI生成（支持消息格式）
      generate: (request: {
        config: AiApiConfig
        messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
        maxTokens?: number
        temperature?: number
      }) => Promise<R<{ content?: string }>>

      // 流式生成内容
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

      // 生成内容
      generateContent: (request: {
        apiKey: string
        apiUrl: string
        modelName: string
        prompt: string
        maxTokens?: number
      }) => Promise<R<{ content?: string }>>

      // 停止流式生成
      stopStreamGenerate: (streamId: string) => Promise<R<{}>>
    }
    // API配置管理
    api: {
      // 保存配置
      saveConfig: (config: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<R<{}>>
      // 删除配置
      deleteConfig: (configId: string) => Promise<R<{}>>
    }
    // 更新检查相关API
    updates: {
      // 检查更新
      checkForUpdates: () => Promise<{
        hasUpdate: boolean
        latestVersion: string
        currentVersion: string
        error?: string
      }>
      // 监听更新通知
      onUpdateAvailable: (
        callback: (updateInfo: { latestVersion: string; currentVersion: string }) => void
      ) => void
    }
    // Markdown文件管理
    markdown: {
      // 保存Markdown文件
      save: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      // 导出PDF文件
      exportToPdf: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      // 导出DOCX文件
      exportToDocx: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      // 导出HTML文件
      exportToHtml: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      // 导出为Notion格式
      exportToNotion: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      // 导出为Obsidian格式
      exportToObsidian: (filePath: string, content: string) => Promise<R<{ path?: string }>>

      // 检查文件是否存在
      checkFileExists: (filePath: string) => Promise<R<{ exists: boolean }>>

      // 获取文件夹列表
      getFolders: () => Promise<R<{ folders?: string[] }>>

      // 获取特定文件夹中的文件列表
      getFiles: (folderName: string) => Promise<R<{ files?: string[] }>>

      // 读取Markdown文件内容
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

      // 上传文件（用于图片等资源文件）
      uploadFile: (
        filePath: string,
        fileContent: string,
        fileName: string
      ) => Promise<R<{ url?: string }>>

      // 获取文件历史记录列表
      getHistory: (filePath: string) => Promise<R<{ history?: HistoryItem[] }>>

      // 获取指定ID的历史记录
      getHistoryById: (historyId: number) => Promise<R<{ history?: HistoryItem }>>
    }
    // WebDAV同步相关API
    webdav: {
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
        useCustomEncryption?: boolean // 是否使用自定义加密
        masterPassword?: string // 主密码，仅在useCustomEncryption为true时需要
      }) => Promise<R<{ message: string; uploaded: number; failed: number; skipped?: number }>>

      // 同步远程到本地
      syncRemoteToLocal: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
        useCustomEncryption?: boolean // 是否使用自定义加密
        masterPassword?: string // 主密码，仅在useCustomEncryption为true时需要
      }) => Promise<R<{ message: string; downloaded: number; failed: number; skipped?: number }>>

      // 双向同步
      syncBidirectional: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
        useCustomEncryption?: boolean // 是否使用自定义加密
        masterPassword?: string // 主密码，仅在useCustomEncryption为true时需要
      }) => Promise<
        R<{
          message: string
          uploaded: number
          downloaded: number
          failed: number
          skippedUpload: number
          skippedDownload: number
          cancelled?: boolean
        }>
      >

      // 取消同步
      cancelSync: () => void

      // 清除同步缓存
      clearSyncCache: () => Promise<R<{ message?: string }>>

      // 监听同步进度
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

      // 验证主密码
      verifyMasterPassword: (password: string) => Promise<R<{ message?: string }>>

      // 设置主密码
      setMasterPassword: (config: {
        password: string
        webdavConfig: Record<string, unknown>
      }) => Promise<R<{ message?: string }>>

      // 通知WebDAV配置已变更
      notifyConfigChanged: () => Promise<{
        success: boolean
        message?: string
        error?: string
      }>
    }
    // 应用程序操作API
    app: {
      close: () => void
      minimize: () => void
      maximize: () => void
      isMaximized: () => Promise<boolean>
      version: () => Promise<string>
    }
    // 思维导图相关API
    mindmap: {
      save: (content: string) => Promise<R<{ path?: string }>>
      load: () => Promise<R<{ data?: string; cancelled?: boolean }>>
      exportHtml: (imageDataUrl: string) => Promise<R<{ path?: string }>>
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<string | undefined>
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<string | undefined>
    }
    // 窗口相关API
    window: {
      setBackgroundColor: (backgroundColor: string) => Promise<R<{}>>
    }
    // 应用导航相关API
    navigation: {
      // 导航到指定视图
      navigateToView: (viewKey: string) => Promise<R<{}>>
      // 监听导航事件
      onNavigate: (callback: (viewKey: string) => void) => () => void
    }
  }
}
