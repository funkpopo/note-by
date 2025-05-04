import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// API配置接口
interface ApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

// 设置的IPC通信频道
const IPC_CHANNELS = {
  GET_SETTINGS: 'setting:get-all',
  SET_SETTINGS: 'setting:set-all',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  GENERATE_CONTENT: 'openai:generate-content',
  STREAM_GENERATE_CONTENT: 'openai:stream-generate-content',
  SAVE_API_CONFIG: 'api:save-config',
  DELETE_API_CONFIG: 'api:delete-config',
  SAVE_MARKDOWN: 'markdown:save',
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
  CHECK_FILE_EXISTS: 'markdown:checkFileExists',
  TEST_WEBDAV_CONNECTION: 'webdav:test-connection',
  SYNC_LOCAL_TO_REMOTE: 'webdav:sync-local-to-remote',
  SYNC_REMOTE_TO_LOCAL: 'webdav:sync-remote-to-local',
  SYNC_BIDIRECTIONAL: 'webdav:sync-bidirectional',
  CHECK_FOR_UPDATES: 'app:check-for-updates',
  CANCEL_SYNC: 'webdav:cancel-sync'
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
      ipcRenderer.invoke(IPC_CHANNELS.SET_SETTING, key, value)
  },
  // OpenAI相关API
  openai: {
    // 测试连接
    testConnection: (apiConfig: ApiConfig): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_OPENAI_CONNECTION, apiConfig),

    // 生成内容
    generateContent: (
      request: ContentGenerationRequest
    ): Promise<{ success: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.GENERATE_CONTENT, request),

    // 流式生成内容
    streamGenerateContent: (
      request: ContentGenerationRequest,
      callbacks: StreamCallbacks
    ): Promise<{ success: boolean; streamId?: string; error?: string }> => {
      return new Promise((resolve) => {
        // 发送流式生成请求
        ipcRenderer
          .invoke(IPC_CHANNELS.STREAM_GENERATE_CONTENT, {
            ...request,
            stream: true // 确保stream标志为true
          })
          .then((result: { success: boolean; streamId?: string; error?: string }) => {
            if (result.success && result.streamId) {
              const streamId = result.streamId

              // 设置监听器接收数据块
              const dataListener = (
                _event: Electron.IpcRendererEvent,
                data: { chunk: string }
              ): void => {
                callbacks.onData(data.chunk)
              }

              // 设置监听器接收完成事件
              const doneListener = (
                _event: Electron.IpcRendererEvent,
                data: { content: string }
              ): void => {
                callbacks.onDone(data.content)

                // 清理所有监听器
                ipcRenderer.removeListener(`stream-data-${streamId}`, dataListener)
                ipcRenderer.removeListener(`stream-done-${streamId}`, doneListener)
                ipcRenderer.removeListener(`stream-error-${streamId}`, errorListener)
              }

              // 设置监听器接收错误事件
              const errorListener = (
                _event: Electron.IpcRendererEvent,
                data: { error: string }
              ): void => {
                callbacks.onError(data.error)

                // 清理所有监听器
                ipcRenderer.removeListener(`stream-data-${streamId}`, dataListener)
                ipcRenderer.removeListener(`stream-done-${streamId}`, doneListener)
                ipcRenderer.removeListener(`stream-error-${streamId}`, errorListener)
              }

              // 添加所有监听器
              ipcRenderer.on(`stream-data-${streamId}`, dataListener)
              ipcRenderer.on(`stream-done-${streamId}`, doneListener)
              ipcRenderer.on(`stream-error-${streamId}`, errorListener)

              resolve(result)
            } else {
              // 请求失败，直接调用错误回调
              if (result.error) {
                callbacks.onError(result.error)
              } else {
                callbacks.onError('未知错误')
              }
              resolve(result)
            }
          })
          .catch((error) => {
            // 处理请求过程中的异常
            const errorMessage = error instanceof Error ? error.message : '未知错误'
            callbacks.onError(errorMessage)
            resolve({ success: false, error: errorMessage })
          })
      })
    }
  },
  // API配置管理
  api: {
    // 保存配置
    saveConfig: (config: ApiConfig): Promise<{ success: boolean; error?: string }> =>
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
    }> => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_SYNC)
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
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
