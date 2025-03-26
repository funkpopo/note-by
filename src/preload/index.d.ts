import { ElectronAPI } from '@electron-toolkit/preload'

// API配置接口
interface ApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
}

// 设置API接口定义
interface SettingsAPI {
  getAll: () => Promise<Record<string, unknown>>
  setAll: (settings: Record<string, unknown>) => Promise<boolean>
  get: <T>(key: string, defaultValue?: T) => Promise<T>
  set: <T>(key: string, value: T) => Promise<boolean>
}

// OpenAI API接口定义
interface OpenAIAPI {
  testConnection: (apiConfig: ApiConfig) => Promise<{ success: boolean; message: string }>
}

// API配置管理接口定义
interface ApiConfigAPI {
  saveConfig: (config: ApiConfig) => Promise<{ success: boolean; error?: string }>
  deleteConfig: (configId: string) => Promise<{ success: boolean; error?: string }>
}

// 全局API接口定义
interface API {
  settings: SettingsAPI
  openai: OpenAIAPI
  api: ApiConfigAPI
  markdown: {
    save: (
      filePath: string,
      content: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    getFolders: () => Promise<{ success: boolean; folders?: string[]; error?: string }>
    getFiles: (
      folderName: string
    ) => Promise<{ success: boolean; files?: string[]; error?: string }>
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
