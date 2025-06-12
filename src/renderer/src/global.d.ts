// 历史记录项接口
interface HistoryItem {
  id: number
  filePath: string
  content: string
  timestamp: number
}

interface Window {
  api: {
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
    // 数据分析相关API
    analytics: {
      // 获取笔记历史统计数据
      getNoteHistoryStats: () => Promise<{
        success: boolean
        stats: StatsData
        error?: string
      }>
      // 获取用户活动数据
      getUserActivityData: (days: number) => Promise<{
        success: boolean
        activityData: ActivityData
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
    // OpenAI相关API
    openai: {
      // 测试连接
      testConnection: (AiApiConfig: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<{ success: boolean; message: string }>

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
      ) => Promise<{ success: boolean; streamId?: string; error?: string }>

      // 生成内容
      generateContent: (request: {
        apiKey: string
        apiUrl: string
        modelName: string
        prompt: string
        maxTokens?: number
      }) => Promise<{
        success: boolean
        content?: string
        error?: string
      }>

      // 停止流式生成
      stopStreamGenerate: (streamId: string) => Promise<{
        success: boolean
        error?: string
      }>
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
      }) => Promise<{ success: boolean; error?: string }>
      // 删除配置
      deleteConfig: (configId: string) => Promise<{ success: boolean; error?: string }>
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
      save: (
        filePath: string,
        content: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>

      // 检查文件是否存在
      checkFileExists: (
        filePath: string
      ) => Promise<{ success: boolean; exists: boolean; error?: string }>

      // 获取文件夹列表
      getFolders: () => Promise<{ success: boolean; folders?: string[]; error?: string }>

      // 获取特定文件夹中的文件列表
      getFiles: (
        folderName: string
      ) => Promise<{ success: boolean; files?: string[]; error?: string }>

      // 读取Markdown文件内容
      readFile: (
        filePath: string
      ) => Promise<{ success: boolean; content?: string; error?: string }>

      // 创建新文件夹
      createFolder: (
        folderName: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>

      // 删除文件夹
      deleteFolder: (folderName: string) => Promise<{ success: boolean; error?: string }>

      // 重命名文件夹
      renameFolder: (
        oldFolderName: string,
        newFolderName: string
      ) => Promise<{ success: boolean; error?: string }>

      // 创建新笔记
      createNote: (
        folderName: string,
        fileName: string,
        content: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>

      // 删除笔记文件
      deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>

      // 重命名笔记文件
      renameFile: (
        oldFilePath: string,
        newFilePath: string
      ) => Promise<{ success: boolean; error?: string }>

      // 上传文件（用于图片等资源文件）
      uploadFile: (
        filePath: string,
        fileContent: string,
        fileName: string
      ) => Promise<{ success: boolean; url?: string; error?: string }>

      // 获取文件历史记录列表
      getHistory: (
        filePath: string
      ) => Promise<{ success: boolean; history?: HistoryItem[]; error?: string }>

      // 获取指定ID的历史记录
      getHistoryById: (
        historyId: number
      ) => Promise<{ success: boolean; history?: HistoryItem; error?: string }>
    }
    // WebDAV同步相关API
    webdav: {
      // 测试WebDAV连接
      testConnection: (config: {
        url: string
        username: string
        password: string
        remotePath: string
      }) => Promise<{ success: boolean; message: string }>

      // 同步本地到远程
      syncLocalToRemote: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
        useCustomEncryption?: boolean // 是否使用自定义加密
        masterPassword?: string // 主密码，仅在useCustomEncryption为true时需要
      }) => Promise<{
        success: boolean
        message: string
        uploaded: number
        failed: number
        skipped?: number
      }>

      // 同步远程到本地
      syncRemoteToLocal: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
        useCustomEncryption?: boolean // 是否使用自定义加密
        masterPassword?: string // 主密码，仅在useCustomEncryption为true时需要
      }) => Promise<{
        success: boolean
        message: string
        downloaded: number
        failed: number
        skipped?: number
      }>

      // 双向同步
      syncBidirectional: (config: {
        url: string
        username: string
        password: string
        remotePath: string
        localPath?: string
        useCustomEncryption?: boolean // 是否使用自定义加密
        masterPassword?: string // 主密码，仅在useCustomEncryption为true时需要
      }) => Promise<{
        success: boolean
        message: string
        uploaded: number
        downloaded: number
        failed: number
        skippedUpload: number
        skippedDownload: number
        cancelled?: boolean
      }>

      // 取消同步
      cancelSync: () => void

      // 清除同步缓存
      clearSyncCache: () => Promise<{
        success: boolean
        message?: string
        error?: string
      }>

      // 监听同步进度
      onSyncProgress: (
        callback: (progress: {
          total: number
          processed: number
          action: 'upload' | 'download' | 'compare'
        }) => void
      ) => () => void

      // 验证主密码
      verifyMasterPassword: (password: string) => Promise<{
        success: boolean
        message?: string
        error?: string
      }>

      // 设置主密码
      setMasterPassword: (config: {
        password: string
        webdavConfig: Record<string, unknown>
      }) => Promise<{
        success: boolean
        message?: string
        error?: string
      }>

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
      save: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>
      load: () => Promise<{ success: boolean; data?: string; cancelled?: boolean; error?: string }>
      exportHtml: (
        imageDataUrl: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<string | undefined>
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<string | undefined>
    }
    // RAG相关API
    RAG: {
      embedDocument: (
        filePath: string,
        content: string,
        title?: string,
        embeddingConfigId?: string
      ) => Promise<any>
      searchDocuments: (
        query: string,
        maxResults?: number,
        similarityThreshold?: number,
        embeddingConfigId?: string
      ) => Promise<any>
      embedAllDocuments: () => Promise<any>
      removeDocument: (filePath: string) => Promise<any>
      getStats: () => Promise<any>
      getEmbeddingModels: () => Promise<any>
      getAllDocuments: () => Promise<any>
      onEmbedProgress: (
        callback: (progress: { current: number; total: number; filePath: string }) => void
      ) => void
      removeEmbedProgressListener: () => void
    }
  }
}
