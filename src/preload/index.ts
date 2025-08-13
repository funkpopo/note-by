import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 简单的错误处理函数
function logError(message: string, error?: unknown, context?: string): void {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [PRELOAD] ${context ? `[${context}] ` : ''}${message}`

  if (error) {
    console.error(logMessage, error)
  } else {
    console.error(logMessage)
  }
}

// API配置接口
interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
  isThinkingModel?: boolean // 是否为思维模型
}

// 设置的IPC通信频道
const IPC_CHANNELS = {
  GET_SETTINGS: 'setting:get-all',
  SET_SETTINGS: 'setting:set-all',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  GENERATE_CONTENT: 'openai:generate-content',
  GENERATE_WITH_MESSAGES: 'openai:generate-with-messages',
  STREAM_GENERATE_CONTENT: 'openai:stream-generate-content',
  STOP_STREAM_GENERATE: 'openai:stop-stream-generate',
  SAVE_API_CONFIG: 'api:save-config',
  DELETE_API_CONFIG: 'api:delete-config',
  SAVE_MARKDOWN: 'markdown:save',
  EXPORT_PDF: 'markdown:export-pdf',
  EXPORT_DOCX: 'markdown:export-docx',
  EXPORT_HTML: 'markdown:export-html',
  GET_MARKDOWN_FOLDERS: 'markdown:get-folders',
  GET_MARKDOWN_FILES: 'markdown:get-files',
  READ_MARKDOWN_FILE: 'markdown:read-file',
  CREATE_MARKDOWN_FOLDER: 'markdown:create-folder',
  DELETE_MARKDOWN_FOLDER: 'markdown:delete-folder',
  RENAME_MARKDOWN_FOLDER: 'markdown:rename-folder',
  CREATE_MARKDOWN_NOTE: 'markdown:create-note',
  DELETE_MARKDOWN_FILE: 'markdown:delete-file',
  RENAME_MARKDOWN_FILE: 'markdown:rename-file',
  UPLOAD_FILE: 'markdown:upload-file',
  DIAGNOSE_ENVIRONMENT: 'system:diagnose-environment',
  GET_ALL_SETTINGS: 'settings:getAll',
  UPDATE_SETTING: 'settings:update',
  CHECK_FILE_EXISTS: 'markdown:checkFileExists',
  TEST_WEBDAV_CONNECTION: 'webdav:test-connection',
  SYNC_LOCAL_TO_REMOTE: 'webdav:sync-local-to-remote',
  SYNC_REMOTE_TO_LOCAL: 'webdav:sync-remote-to-local',
  SYNC_BIDIRECTIONAL: 'webdav:sync-bidirectional',
  CHECK_FOR_UPDATES: 'app:check-for-updates',
  CANCEL_SYNC: 'webdav:cancel-sync',
  CLEAR_WEBDAV_SYNC_CACHE: 'webdav:clear-sync-cache',
  WEBDAV_CONFIG_CHANGED: 'webdav:config-changed',
  // 添加主密码验证相关IPC通道
  VERIFY_MASTER_PASSWORD: 'webdav:verify-master-password',
  SET_MASTER_PASSWORD: 'webdav:set-master-password',
  // 添加历史记录相关IPC通道
  GET_NOTE_HISTORY: 'markdown:get-history',
  GET_NOTE_HISTORY_BY_ID: 'markdown:get-history-by-id',
  // 添加数据分析相关IPC通道
  GET_NOTE_HISTORY_STATS: 'analytics:get-note-history-stats',
  GET_USER_ACTIVITY_DATA: 'analytics:get-user-activity-data',
  GET_ANALYSIS_CACHE: 'analytics:get-analysis-cache',
  SAVE_ANALYSIS_CACHE: 'analytics:save-analysis-cache',
  RESET_ANALYSIS_CACHE: 'analytics:reset-analysis-cache',
  CHECK_DATABASE_STATUS: 'analytics:check-database-status',
  // 添加全局标签相关IPC通道
  GET_GLOBAL_TAGS: 'tags:get-global-tags',
  REFRESH_GLOBAL_TAGS: 'tags:refresh-global-tags',
  // + Mindmap IPC Channels
  MINDMAP_SAVE_FILE: 'mindmap:save-file',
  MINDMAP_LOAD_FILE: 'mindmap:load-file',
  MINDMAP_EXPORT_HTML: 'mindmap:export-html',
  DIALOG_SHOW_SAVE: 'dialog:showSaveDialog', // Re-using if a generic one is better, or make specific
  DIALOG_SHOW_OPEN: 'dialog:showOpenDialog', // Re-using if a generic one is better, or make specific
  // 添加主题相关IPC通道
  SET_WINDOW_BACKGROUND: 'window:set-background',
  // 添加应用导航IPC通道
  NAVIGATE_TO_VIEW: 'app:navigate-to-view',
  // 添加聊天历史相关IPC通道
  CHAT_CREATE_SESSION: 'chat:create-session',
  CHAT_SAVE_MESSAGE: 'chat:save-message',
  CHAT_GET_SESSIONS: 'chat:get-sessions',
  CHAT_GET_SESSION_MESSAGES: 'chat:get-session-messages',
  CHAT_UPDATE_SESSION_TITLE: 'chat:update-session-title',
  CHAT_DELETE_SESSION: 'chat:delete-session',
  CHAT_DELETE_MESSAGE: 'chat:delete-message',
  CHAT_GET_SESSION_STATS: 'chat:get-session-stats',
  CHAT_CLEANUP_OLD_SESSIONS: 'chat:cleanup-old-sessions'
}

// 内容生成请求接口
interface ContentGenerationRequest {
  apiKey: string
  apiUrl: string
  modelName: string
  prompt: string
  maxTokens?: number
  stream?: boolean
}

// 流式内容回调接口
interface StreamCallbacks {
  onData: (chunk: string) => void
  onDone: (content: string) => void
  onError: (error: string) => void
}

// 分析缓存项接口定义
interface AnalysisCacheItem {
  date: string // 分析日期，格式：YYYY-MM-DD
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
}

// Custom APIs for renderer
const api = {
  // 设置相关API
  settings: {
    // 获取所有设置
    getAll: (): Promise<Record<string, unknown>> =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_SETTINGS),
    // 保存所有设置
    setAll: (settings: Record<string, unknown>): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, settings),
    // 获取单个设置
    get: <T>(key: string, defaultValue?: T): Promise<T> =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_SETTING, key, defaultValue),
    // 设置单个设置
    set: <T>(key: string, value: T): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SET_SETTING, key, value),
    // 更新单个设置
    update: <T>(key: string, value: T): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTING, key, value)
  },
  // OpenAI相关API
  openai: {
    // 测试连接
    testConnection: (AiApiConfig: AiApiConfig): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_OPENAI_CONNECTION, AiApiConfig),

    // 生成内容
    generateContent: (
      request: ContentGenerationRequest
    ): Promise<{ success: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.GENERATE_CONTENT, request),
    
    // AI生成（支持消息格式）
    generate: (
      request: { 
        config: AiApiConfig; 
        messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>; 
        maxTokens?: number; 
        temperature?: number 
      }
    ): Promise<{ success: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.GENERATE_WITH_MESSAGES, request),

    // 流式生成内容
    streamGenerateContent: (
      request: ContentGenerationRequest,
      callbacks: StreamCallbacks,
      retryOptions: { maxRetries?: number; retryDelay?: number; currentAttempt?: number } = {}
    ): Promise<{ success: boolean; streamId?: string; error?: string }> => {
      // 允许配置重试参数
      const maxRetries = retryOptions.maxRetries || 2
      const baseRetryDelay = retryOptions.retryDelay || 1000
      const currentAttempt = retryOptions.currentAttempt || 0

      return new Promise((resolve) => {
        // 添加超时处理
        const timeoutMs = 30000 // 30秒超时
        const timeoutId = setTimeout(() => {
          // 检查是否已经有监听器并清理
          if (typeof dataListener === 'function') {
            try {
              ipcRenderer.removeListener(`stream-data-${streamId}`, dataListener)
            } catch (err) {
              logError('Failed to remove stream data listener', err, 'timeout-cleanup')
            }
          }

          if (typeof doneListener === 'function') {
            try {
              ipcRenderer.removeListener(`stream-done-${streamId}`, doneListener)
            } catch (err) {
              logError('Failed to remove stream done listener', err, 'timeout-cleanup')
            }
          }

          if (typeof errorListener === 'function') {
            try {
              ipcRenderer.removeListener(`stream-error-${streamId}`, errorListener)
            } catch (err) {
              logError('Failed to remove stream error listener', err, 'timeout-cleanup')
            }
          }

          callbacks.onError(`请求超时 (${timeoutMs / 1000}秒)`)
        }, timeoutMs)

        // 变量声明提前，使其在超时处理中可访问
        let streamId: string
        let dataListener:
          | ((_event: Electron.IpcRendererEvent, data: { chunk: string }) => void)
          | undefined
        let doneListener:
          | ((_event: Electron.IpcRendererEvent, data: { content: string }) => void)
          | undefined
        let errorListener:
          | ((_event: Electron.IpcRendererEvent, data: { error: string }) => void)
          | undefined

        // 清理所有监听器的函数
        const cleanupListeners = (): void => {
          clearTimeout(timeoutId)

          if (streamId) {
            if (typeof dataListener === 'function') {
              try {
                ipcRenderer.removeListener(`stream-data-${streamId}`, dataListener)
              } catch (err) {
                logError('Failed to remove data listener in cleanup', err, 'cleanup')
              }
            }

            if (typeof doneListener === 'function') {
              try {
                ipcRenderer.removeListener(`stream-done-${streamId}`, doneListener)
              } catch (err) {
                logError('Failed to remove done listener in cleanup', err, 'cleanup')
              }
            }

            if (typeof errorListener === 'function') {
              try {
                ipcRenderer.removeListener(`stream-error-${streamId}`, errorListener)
              } catch (err) {
                logError('Failed to remove error listener in cleanup', err, 'cleanup')
              }
            }
          }
        }

        // 发送流式生成请求

        ipcRenderer
          .invoke(IPC_CHANNELS.STREAM_GENERATE_CONTENT, {
            ...request,
            stream: true // 确保stream标志为true
          })
          .then((result: { success: boolean; streamId?: string; error?: string }) => {
            if (result.success && result.streamId) {
              streamId = result.streamId

              // 设置监听器接收数据块
              dataListener = (_event: Electron.IpcRendererEvent, data: { chunk: string }): void => {
                callbacks.onData(data.chunk)
              }

              // 设置监听器接收完成事件
              doneListener = (
                _event: Electron.IpcRendererEvent,
                data: { content: string }
              ): void => {
                callbacks.onDone(data.content)
                cleanupListeners()
              }

              // 设置监听器接收错误事件
              errorListener = (
                _event: Electron.IpcRendererEvent,
                data: { error: string }
              ): void => {
                callbacks.onError(data.error)
                cleanupListeners()
              }

              // 添加所有监听器

              ipcRenderer.on(`stream-data-${streamId}`, dataListener)
              ipcRenderer.on(`stream-done-${streamId}`, doneListener)
              ipcRenderer.on(`stream-error-${streamId}`, errorListener)

              resolve(result)
            } else {
              // 请求失败，直接调用错误回调

              clearTimeout(timeoutId)

              if (result.error) {
                callbacks.onError(result.error)
              } else {
                callbacks.onError('调用错误')
              }
              resolve(result)
            }
          })
          .catch((error) => {
            // 处理请求过程中的异常
            const errorMessage = error instanceof Error ? error.message : '调用错误'

            clearTimeout(timeoutId)

            // 添加自动重试逻辑
            if (currentAttempt < maxRetries) {
              // 使用指数退避策略计算延迟
              const retryDelay = baseRetryDelay * Math.pow(2, currentAttempt)

              // 延迟后重试
              setTimeout(() => {
                // 递归调用自身，传递更新后的重试计数
                api.openai
                  .streamGenerateContent(request, callbacks, {
                    maxRetries,
                    retryDelay: baseRetryDelay,
                    currentAttempt: currentAttempt + 1
                  })
                  .then((retryResult) => {
                    // 将重试结果传递给原始promise
                    resolve(retryResult)
                  })
              }, retryDelay)
            } else {
              callbacks.onError(`${errorMessage} (已尝试 ${maxRetries + 1} 次)`)
              resolve({ success: false, error: errorMessage })
            }
          })

        // 返回一个清理函数，允许调用者在组件卸载时手动清理
        return (): void => {
          cleanupListeners()
          // 通知主进程停止流式请求
          if (streamId) {
            ipcRenderer.invoke(IPC_CHANNELS.STOP_STREAM_GENERATE, streamId).catch(() => {
              // 忽略停止请求的错误
            })
          }
        }
      })
    },

    // 停止流式生成
    stopStreamGenerate: (streamId: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.STOP_STREAM_GENERATE, streamId)
    }
  },
  // API配置管理
  api: {
    // 保存配置
    saveConfig: (config: AiApiConfig): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_API_CONFIG, config),
    // 删除配置
    deleteConfig: (configId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_API_CONFIG, configId)
  },
  // 更新检查相关API
  updates: {
    // 检查更新
    checkForUpdates: (): Promise<{
      hasUpdate: boolean
      latestVersion: string
      currentVersion: string
      error?: string
    }> => {
      return ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES)
    },
    // 监听更新通知
    onUpdateAvailable: (
      callback: (updateInfo: { latestVersion: string; currentVersion: string }) => void
    ): void => {
      ipcRenderer.on('update-available', (_event, updateInfo) => {
        callback(updateInfo)
      })
    }
  },
  // Markdown文件管理
  markdown: {
    // 保存Markdown文件
    save: (
      filePath: string,
      content: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_MARKDOWN, filePath, content),

    // 导出PDF文件
    exportToPdf: (
      filePath: string,
      content: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PDF, filePath, content),

    // 导出DOCX文件
    exportToDocx: (
      filePath: string,
      content: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_DOCX, filePath, content),

    // 导出HTML文件
    exportToHtml: (
      filePath: string,
      content: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_HTML, filePath, content),

    // 检查文件是否存在
    checkFileExists: (
      filePath: string
    ): Promise<{ success: boolean; exists: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHECK_FILE_EXISTS, filePath),

    // 获取文件夹列表
    getFolders: (): Promise<{ success: boolean; folders?: string[]; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_MARKDOWN_FOLDERS),

    // 获取特定文件夹中的文件列表
    getFiles: (
      folderName: string
    ): Promise<{ success: boolean; files?: string[]; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_MARKDOWN_FILES, folderName),

    // 读取Markdown文件内容
    readFile: (filePath: string): Promise<{ success: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.READ_MARKDOWN_FILE, filePath),

    // 获取文档历史记录
    getHistory: (
      filePath: string
    ): Promise<{
      success: boolean
      history?: Array<{
        id: number
        filePath: string
        content: string
        timestamp: number
      }>
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.GET_NOTE_HISTORY, filePath),

    // 获取特定ID的历史记录
    getHistoryById: (
      id: number
    ): Promise<{
      success: boolean
      history?: {
        id: number
        filePath: string
        content: string
        timestamp: number
      }
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.GET_NOTE_HISTORY_BY_ID, id),

    // 创建新文件夹
    createFolder: (
      folderName: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.CREATE_MARKDOWN_FOLDER, folderName),

    // 删除文件夹
    deleteFolder: (folderName: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_MARKDOWN_FOLDER, folderName),

    // 重命名文件夹
    renameFolder: (
      oldFolderName: string,
      newFolderName: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.RENAME_MARKDOWN_FOLDER, oldFolderName, newFolderName),

    // 创建新笔记
    createNote: (
      folderName: string,
      fileName: string,
      content: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.CREATE_MARKDOWN_NOTE, folderName, fileName, content),

    // 删除笔记文件
    deleteFile: (filePath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_MARKDOWN_FILE, filePath),

    // 重命名笔记文件
    renameFile: (
      oldFilePath: string,
      newFilePath: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.RENAME_MARKDOWN_FILE, oldFilePath, newFilePath),

    // 上传文件
    uploadFile: (
      filePath: string,
      fileData: string,
      fileName: string
    ): Promise<{ success: boolean; url?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_FILE, filePath, fileData, fileName)
  },
  // WebDAV同步相关API
  webdav: {
    // 测试WebDAV连接
    testConnection: (config: {
      url: string
      username: string
      password: string
      remotePath: string
    }): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WEBDAV_CONNECTION, config),

    // 同步本地到远程
    syncLocalToRemote: (config: {
      url: string
      username: string
      password: string
      remotePath: string
      localPath?: string
    }): Promise<{
      success: boolean
      message: string
      uploaded: number
      failed: number
    }> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_LOCAL_TO_REMOTE, config),

    // 同步远程到本地
    syncRemoteToLocal: (config: {
      url: string
      username: string
      password: string
      remotePath: string
      localPath?: string
    }): Promise<{
      success: boolean
      message: string
      downloaded: number
      failed: number
    }> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_REMOTE_TO_LOCAL, config),

    // 双向同步
    syncBidirectional: (config: {
      url: string
      username: string
      password: string
      remotePath: string
      localPath?: string
    }): Promise<{
      success: boolean
      message: string
      uploaded: number
      downloaded: number
      failed: number
      cancelled?: boolean
    }> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_BIDIRECTIONAL, config),

    // 取消同步
    cancelSync: (): Promise<{
      success: boolean
      message: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_SYNC),

    // 清除同步缓存
    clearSyncCache: (): Promise<{
      success: boolean
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_WEBDAV_SYNC_CACHE),

    // 验证主密码
    verifyMasterPassword: (
      password: string
    ): Promise<{
      success: boolean
      message?: string
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.VERIFY_MASTER_PASSWORD, password),

    // 设置主密码
    setMasterPassword: (config: {
      password: string
      webdavConfig: Record<string, unknown>
    }): Promise<{
      success: boolean
      message?: string
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.SET_MASTER_PASSWORD, config),

    // 通知WebDAV配置已变更
    notifyConfigChanged: (): Promise<{
      success: boolean
      message?: string
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.WEBDAV_CONFIG_CHANGED),

    // 监听同步进度
    onSyncProgress: (
      callback: (progress: {
        total: number
        processed: number
        action: 'upload' | 'download' | 'compare'
      }) => void
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        progress: {
          total: number
          processed: number
          action: 'upload' | 'download' | 'compare'
        }
      ): void => {
        callback(progress)
      }
      ipcRenderer.on('webdav-sync-progress', listener)
      return () => {
        ipcRenderer.removeListener('webdav-sync-progress', listener)
      }
    }
  },
  // 数据分析相关API
  analytics: {
    // 获取笔记历史统计数据
    getNoteHistoryStats: (): Promise<{
      success: boolean
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
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.GET_NOTE_HISTORY_STATS),

    // 获取用户活动数据
    getUserActivityData: (
      days: number = 30
    ): Promise<{
      success: boolean
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
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.GET_USER_ACTIVITY_DATA, days),

    // 获取分析缓存
    getAnalysisCache: (): Promise<{
      success: boolean
      cache?: AnalysisCacheItem
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.GET_ANALYSIS_CACHE),

    // 保存分析缓存
    saveAnalysisCache: (
      cacheData: AnalysisCacheItem
    ): Promise<{
      success: boolean
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.SAVE_ANALYSIS_CACHE, cacheData),

    // 重置分析缓存
    resetAnalysisCache: (): Promise<{
      success: boolean
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.RESET_ANALYSIS_CACHE),

    // 检查数据库状态
    checkDatabaseStatus: (): Promise<{
      success: boolean
      status: string
      error?: string
    }> => ipcRenderer.invoke(IPC_CHANNELS.CHECK_DATABASE_STATUS)
  },
  // 全局标签相关API
  tags: {
    // 获取全局标签数据
    getGlobalTags: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_GLOBAL_TAGS),

    // 刷新全局标签数据
    refreshGlobalTags: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.REFRESH_GLOBAL_TAGS)
  },
  // + Mindmap API
  mindmap: {
    save: (content: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MINDMAP_SAVE_FILE, content),
    load: (): Promise<{ success: boolean; data?: string; cancelled?: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MINDMAP_LOAD_FILE),
    exportHtml: (
      imageDataUrl: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MINDMAP_EXPORT_HTML, imageDataUrl),
    showSaveDialog: (options: Electron.SaveDialogOptions): Promise<string | undefined> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SHOW_SAVE, options),
    showOpenDialog: (options: Electron.OpenDialogOptions): Promise<string | undefined> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SHOW_OPEN, options)
  },
  // 窗口相关API
  window: {
    setBackgroundColor: (backgroundColor: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SET_WINDOW_BACKGROUND, backgroundColor)
  },
  // 应用导航相关API
  navigation: {
    // 导航到指定视图
    navigateToView: (viewKey: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.NAVIGATE_TO_VIEW, viewKey),

    // 监听导航事件
    onNavigate: (callback: (viewKey: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, viewKey: string): void => {
        callback(viewKey)
      }
      ipcRenderer.on('navigate-to-view', listener)
      return () => {
        ipcRenderer.removeListener('navigate-to-view', listener)
      }
    }
  },
  // 更新相关API
  updater: {
    // 检查更新
    checkForUpdates: (): Promise<{
      status: string
      updateInfo?: unknown
      error?: string
    }> => ipcRenderer.invoke('updater:check-for-updates'),

    // 下载更新
    downloadUpdate: (): Promise<{
      status: string
      error?: string
    }> => ipcRenderer.invoke('updater:download-update'),

    // 安装更新
    installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install-update'),

    // 获取当前版本
    getVersion: (): Promise<string> => ipcRenderer.invoke('updater:get-version'),

    // 监听更新状态变化
    onStatusChanged: (
      callback: (info: {
        status: string
        version?: string
        progress?: number
        error?: string
      }) => void
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        info: {
          status: string
          version?: string
          progress?: number
          error?: string
        }
      ): void => {
        callback(info)
      }
      ipcRenderer.on('updater:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('updater:status-changed', listener)
      }
    }
  },
  // 聊天历史相关API
  chat: {
    // 创建新的聊天会话
    createSession: (title?: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_CREATE_SESSION, title),

    // 保存聊天消息
    saveMessage: (message: {
      id: string
      sessionId: string
      role: 'user' | 'assistant' | 'system'
      content: string
      status?: string
      parentId?: string
      modelId?: string
    }): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.CHAT_SAVE_MESSAGE, message),

    // 获取所有聊天会话
    getSessions: (): Promise<
      Array<{
        id: string
        title?: string
        createdAt: number
        updatedAt: number
        messageCount: number
        isArchived: boolean
      }>
    > => ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SESSIONS),

    // 获取指定会话的消息
    getSessionMessages: (
      sessionId: string
    ): Promise<
      Array<{
        id: string
        sessionId: string
        role: 'user' | 'assistant' | 'system'
        content: string
        status?: string
        parentId?: string
        createdAt: number
        modelId?: string
      }>
    > => ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SESSION_MESSAGES, sessionId),

    // 更新会话标题
    updateSessionTitle: (sessionId: string, title: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_UPDATE_SESSION_TITLE, sessionId, title),

    // 删除聊天会话
    deleteSession: (sessionId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_DELETE_SESSION, sessionId),

    // 删除单条聊天消息
    deleteMessage: (messageId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_DELETE_MESSAGE, messageId),

    // 获取会话统计信息
    getSessionStats: (): Promise<{
      totalSessions: number
      totalMessages: number
      activeSessions: number
    }> => ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_SESSION_STATS),

    // 清理旧的会话
    cleanupOldSessions: (keepCount?: number): Promise<number> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_CLEANUP_OLD_SESSIONS, keepCount)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    logError('Failed to expose context bridge APIs', error, 'contextBridge')
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
