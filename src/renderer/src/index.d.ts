import { ElectronAPI } from '@electron-toolkit/preload'
import type { Result } from '../../shared/types/result'

type R<T = Record<string, unknown>> = Result<T>

// 流式内容回调接口
interface StreamCallbacks {
  onData: (chunk: string) => void
  onDone: (content: string) => void
  onError: (error: string) => void
}

interface Window {
  electron: ElectronAPI
  api: {
    settings: {
      getAll: () => Promise<Record<string, unknown>>
      setAll: (settings: Record<string, unknown>) => Promise<boolean>
      get: <T>(key: string, defaultValue?: T) => Promise<T>
      set: <T>(key: string, value: T) => Promise<boolean>
      update: <T>(key: string, value: T) => Promise<boolean>
    }
    openai: {
      testConnection: (AiApiConfig: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<R<{ message: string }>>

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
        callbacks: StreamCallbacks
      ) => Promise<R<{ streamId?: string }>>
    }
    api: {
      saveConfig: (config: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<R<{}>>
      deleteConfig: (configId: string) => Promise<R<{}>>
    }
    markdown: {
      save: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      exportToPdf: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      exportToDocx: (filePath: string, content: string) => Promise<R<{ path?: string }>>
      checkFileExists: (filePath: string) => Promise<R<{ exists: boolean }>>
      getFolders: () => Promise<R<{ folders?: string[] }>>
      getFiles: (folderName: string) => Promise<R<{ files?: string[] }>>
      readFile: (filePath: string) => Promise<R<{ content?: string }>>
      createFolder: (folderName: string) => Promise<R<{ path?: string }>>
      deleteFolder: (folderName: string) => Promise<R<{}>>
      renameFolder: (oldFolderName: string, newFolderName: string) => Promise<R<{}>>
      createNote: (
        folderName: string,
        fileName: string,
        content: string
      ) => Promise<R<{ path?: string }>>
      deleteFile: (filePath: string) => Promise<R<{}>>
      renameFile: (oldFilePath: string, newFilePath: string) => Promise<R<{}>>
      uploadFile: (
        filePath: string,
        fileData: string,
        fileName: string
      ) => Promise<R<{ url?: string; path?: string }>>
      getHistory: (
        filePath: string
      ) => Promise<
        R<{ history?: Array<{ id: number; filePath: string; content: string; timestamp: number }> }>
      >
      getHistoryById: (
        historyId: number
      ) => Promise<
        R<{ history?: { id: number; filePath: string; content: string; timestamp: number } }>
      >
    }
    webdav: {
      testConnection: (config: {
        url: string
        username: string
        password: string
        remotePath: string
      }) => Promise<R<{ message: string }>>
      syncLocalToRemote: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
      }) => Promise<R<{ message: string; uploaded: number; failed: number }>>
      syncRemoteToLocal: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
      }) => Promise<R<{ message: string; downloaded: number; failed: number }>>
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
        }>
      >
      cancelSync: () => Promise<R<{ message: string }>>
    }
    system: {
      diagnoseEnvironment: () => Promise<
        R<{
          systemInfo: {
            os: string
            arch: string
            electronVersion: string
            nodeVersion: string
            chromiumVersion: string
          }
        }>
      >
    }
    mindmap: {
      save: (content: string) => Promise<R<{ path?: string }>>
      load: () => Promise<R<{ data?: string; cancelled?: boolean }>>
      exportHtml: (imageDataUrl: string) => Promise<R<{ path?: string }>>
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<string | undefined>
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<string | undefined>
    }
  }
}
