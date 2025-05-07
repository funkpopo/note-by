import { ElectronAPI } from '@electron-toolkit/preload'

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
    }
    openai: {
      testConnection: (AiApiConfig: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<{ success: boolean; message: string }>

      generateContent: (request: {
        apiKey: string
        apiUrl: string
        modelName: string
        prompt: string
        maxTokens?: number
        stream?: boolean
      }) => Promise<{ success: boolean; content?: string; error?: string }>

      streamGenerateContent: (
        request: {
          apiKey: string
          apiUrl: string
          modelName: string
          prompt: string
          maxTokens?: number
        },
        callbacks: StreamCallbacks
      ) => Promise<{ success: boolean; streamId?: string; error?: string }>
    }
    api: {
      saveConfig: (config: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<{ success: boolean; error?: string }>
      deleteConfig: (configId: string) => Promise<{ success: boolean; error?: string }>
    }
    markdown: {
      save: (
        filePath: string,
        content: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>
      checkFileExists: (
        filePath: string
      ) => Promise<{ success: boolean; exists: boolean; error?: string }>
      getFolders: () => Promise<{ success: boolean; folders?: string[]; error?: string }>
      getFiles: (
        folderName: string
      ) => Promise<{ success: boolean; files?: string[]; error?: string }>
      readFile: (
        filePath: string
      ) => Promise<{ success: boolean; content?: string; error?: string }>
      createFolder: (
        folderName: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>
      deleteFolder: (folderName: string) => Promise<{ success: boolean; error?: string }>
      renameFolder: (
        oldFolderName: string,
        newFolderName: string
      ) => Promise<{ success: boolean; error?: string }>
      createNote: (
        folderName: string,
        fileName: string,
        content: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>
      deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
      renameFile: (
        oldFilePath: string,
        newFilePath: string
      ) => Promise<{ success: boolean; error?: string }>
      uploadFile: (
        filePath: string,
        fileData: string,
        fileName: string
      ) => Promise<{ success: boolean; url?: string; path?: string; error?: string }>
    }
    webdav: {
      testConnection: (config: {
        url: string
        username: string
        password: string
        remotePath: string
      }) => Promise<{ success: boolean; message: string }>
      syncLocalToRemote: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
      }) => Promise<{
        success: boolean
        message: string
        uploaded: number
        failed: number
      }>
      syncRemoteToLocal: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
      }) => Promise<{
        success: boolean
        message: string
        downloaded: number
        failed: number
      }>
      syncBidirectional: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
      }) => Promise<{
        success: boolean
        message: string
        uploaded: number
        downloaded: number
        failed: number
        cancelled?: boolean
      }>
      cancelSync: () => Promise<{
        success: boolean
        message: string
      }>
    }
    system: {
      diagnoseEnvironment: () => Promise<{
        success: boolean
        systemInfo: {
          os: string
          arch: string
          electronVersion: string
          nodeVersion: string
          chromiumVersion: string
        }
        error?: string
      }>
    }
  }
}
