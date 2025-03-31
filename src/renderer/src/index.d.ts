import { ElectronAPI } from '@electron-toolkit/preload'

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
      testConnection: (apiConfig: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<{ success: boolean; message: string }>
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
    }
  }
}
