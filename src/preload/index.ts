import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// API配置接口
interface ApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
}

// 设置的IPC通信频道
const IPC_CHANNELS = {
  GET_SETTINGS: 'setting:get-all',
  SET_SETTINGS: 'setting:set-all',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  GENERATE_CONTENT: 'openai:generate-content',
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
  DIAGNOSE_ENVIRONMENT: 'system:diagnose-environment',
  GET_ALL_SETTINGS: 'settings:getAll',
  CHECK_FILE_EXISTS: 'markdown:checkFileExists',
  TEST_WEBDAV_CONNECTION: 'webdav:test-connection',
  SYNC_LOCAL_TO_REMOTE: 'webdav:sync-local-to-remote',
  SYNC_REMOTE_TO_LOCAL: 'webdav:sync-remote-to-local',
  SYNC_BIDIRECTIONAL: 'webdav:sync-bidirectional'
}

// 内容生成请求接口
interface ContentGenerationRequest {
  apiKey: string
  apiUrl: string
  modelName: string
  prompt: string
  maxTokens?: number
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
      ipcRenderer.invoke(IPC_CHANNELS.GENERATE_CONTENT, request)
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
      ipcRenderer.invoke(IPC_CHANNELS.RENAME_MARKDOWN_FILE, oldFilePath, newFilePath)
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
    }> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_BIDIRECTIONAL, config)
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
