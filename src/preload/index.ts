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
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  SAVE_API_CONFIG: 'api:save-config',
  DELETE_API_CONFIG: 'api:delete-config'
}

// Custom APIs for renderer
const api = {
  // 设置相关API
  settings: {
    // 获取所有设置
    getAll: (): Promise<Record<string, unknown>> => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
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
      ipcRenderer.invoke(IPC_CHANNELS.TEST_OPENAI_CONNECTION, apiConfig)
  },
  // API配置管理
  api: {
    // 保存配置
    saveConfig: (config: ApiConfig): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_API_CONFIG, config),
    // 删除配置
    deleteConfig: (configId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_API_CONFIG, configId)
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
