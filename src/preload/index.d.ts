import { ElectronAPI } from '@electron-toolkit/preload'

// API配置接口
interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

// 设置API接口定义
interface SettingsAPI {
  getAll: () => Promise<Record<string, unknown>>
  setAll: (settings: Record<string, unknown>) => Promise<boolean>
  get: <T>(key: string, defaultValue?: T) => Promise<T>
  set: <T>(key: string, value: T) => Promise<boolean>
}

// 更新检查API接口定义
interface UpdatesAPI {
  checkForUpdates: () => Promise<{
    hasUpdate: boolean
    latestVersion: string
    currentVersion: string
    error?: string
  }>
  onUpdateAvailable: (
    callback: (updateInfo: { latestVersion: string; currentVersion: string }) => void
  ) => void
}

// OpenAI API接口定义
interface OpenAIAPI {
  testConnection: (AiApiConfig: AiApiConfig) => Promise<{ success: boolean; message: string }>
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
    callbacks: {
      onData: (chunk: string) => void
      onDone: (content: string) => void
      onError: (error: string) => void
    }
  ) => Promise<{ success: boolean; streamId?: string; error?: string }>
}

// API配置管理接口定义
interface ApiConfigAPI {
  saveConfig: (config: AiApiConfig) => Promise<{ success: boolean; error?: string }>
  deleteConfig: (configId: string) => Promise<{ success: boolean; error?: string }>
}

// 分析缓存项接口
interface AnalysisCacheItem {
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
}

// 数据分析API接口定义
interface AnalyticsAPI {
  // 获取笔记历史统计数据
  getNoteHistoryStats: () => Promise<{
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
  }>

  // 获取用户活动数据
  getUserActivityData: (days?: number) => Promise<{
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
  }>

  // 获取分析缓存
  getAnalysisCache: () => Promise<{
    success: boolean
    cache?: AnalysisCacheItem
    error?: string
  }>

  // 保存分析缓存
  saveAnalysisCache: (cacheData: AnalysisCacheItem) => Promise<{
    success: boolean
    error?: string
  }>

  // 重置分析缓存
  resetAnalysisCache: () => Promise<{
    success: boolean
    error?: string
  }>
}

// 全局API接口定义
interface API {
  settings: SettingsAPI
  openai: OpenAIAPI
  api: ApiConfigAPI
  updates: UpdatesAPI
  markdown: {
    save: (
      filePath: string,
      content: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    exportToPdf: (
      filePath: string,
      content: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    exportToDocx: (
      filePath: string,
      content: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    exportToHtml: (
      filePath: string,
      content: string
    ) => Promise<{ success: boolean; path?: string; error?: string }>
    getFolders: () => Promise<{ success: boolean; folders?: string[]; error?: string }>
    getFiles: (
      folderName: string
    ) => Promise<{ success: boolean; files?: string[]; error?: string }>
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>

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
    ) => Promise<{ success: boolean; url?: string; path?: string; error?: string }>
  }
  analytics: AnalyticsAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
