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
    // OpenAI相关API
    openai: {
      // 测试连接
      testConnection: (apiConfig: {
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }) => Promise<{ success: boolean; message: string }>

      // 生成内容
      generateContent: (request: {
        apiKey: string
        apiUrl: string
        modelName: string
        prompt: string
        maxTokens?: number
      }) => Promise<{ success: boolean; content?: string; error?: string }>
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
      }) => Promise<{
        success: boolean
        message: string
        uploaded: number
        failed: number
      }>

      // 同步远程到本地
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

      // 双向同步
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
      }>
    }
  }
}
