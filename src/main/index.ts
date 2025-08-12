import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, Notification } from 'electron'
import path, { join, resolve } from 'path'
import fsSync from 'fs' // 添加同步fs模块
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  readSettings,
  writeSettings,
  updateSetting,
  getSetting,
  AiApiConfig,
  getWebDAVConfig,
  updateWebDAVConfig,
  verifyMasterPassword,
  encryptWebDAVWithMasterPassword
} from './settings'
import { testOpenAIConnection, generateContent, streamGenerateContent } from './openai'
import { promises as fsPromises } from 'fs'
import {
  testWebDAVConnection,
  syncLocalToRemote,
  syncRemoteToLocal,
  syncBidirectional,
  cancelSync,
  clearSyncCache
} from './webdav'
import axios from 'axios'
import http from 'http'
import https from 'https'
import { protocol } from 'electron'
import {
  initDatabase,
  addNoteHistory,
  getNoteHistory,
  getNoteHistoryById,
  getNoteHistoryStats,
  getUserActivityData,
  initWebDAVSyncCacheTable,
  getAnalysisCache,
  saveAnalysisCache,
  resetAnalysisCache,
  getDocumentTagsData,
  checkDatabaseStatus,
  type AnalysisCacheItem,
  createChatSession,
  saveChatMessage,
  getChatSessions,
  getChatMessages,
  updateChatSessionTitle,
  deleteChatSession,
  deleteChatMessage,
  getChatSessionStats,
  cleanupOldChatSessions
} from './database'

import { mdToPdf } from 'md-to-pdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import Showdown from 'showdown'
import { fileStreamManager } from './utils/FileStreamManager'
import { memoryMonitor } from './utils/MemoryMonitor'
import { performDatabaseMemoryCleanup } from './database'
import { updaterService } from './updater'
import { mainErrorHandler, ErrorCategory } from './utils/ErrorHandler'

// 导出mainWindow，用于在其他模块中发送事件
export let mainWindow: BrowserWindow | null = null

// 实现单实例锁，确保只有一个应用实例在运行
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('应用已经在运行中，退出当前实例')
  app.quit()
} else {
  // 监听第二个实例的启动
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // 如果用户尝试打开第二个实例，我们应该聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

let tray: Tray | null = null

// 设置的IPC通信频道
const IPC_CHANNELS = {
  GET_SETTINGS: 'setting:get-all',
  SET_SETTINGS: 'setting:set-all',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  GENERATE_CONTENT: 'openai:generate-content',
  STREAM_GENERATE_CONTENT: 'openai:stream-generate-content',
  STOP_STREAM_GENERATE: 'openai:stop-stream-generate',
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
  // 添加WebDAV相关IPC通道
  TEST_WEBDAV_CONNECTION: 'webdav:test-connection',
  SYNC_LOCAL_TO_REMOTE: 'webdav:sync-local-to-remote',
  SYNC_REMOTE_TO_LOCAL: 'webdav:sync-remote-to-local',
  SYNC_BIDIRECTIONAL: 'webdav:sync-bidirectional',
  CANCEL_SYNC: 'webdav:cancel-sync',
  CLEAR_WEBDAV_SYNC_CACHE: 'webdav:clear-sync-cache',
  WEBDAV_CONFIG_CHANGED: 'webdav:config-changed',
  // 添加主密码验证相关IPC通道
  VERIFY_MASTER_PASSWORD: 'webdav:verify-master-password',
  SET_MASTER_PASSWORD: 'webdav:set-master-password',
  CHECK_FOR_UPDATES: 'app:check-for-updates',
  // 添加历史记录相关IPC通道
  GET_NOTE_HISTORY: 'markdown:get-history',
  GET_NOTE_HISTORY_BY_ID: 'markdown:get-history-by-id',
  UPDATE_SETTING: 'settings:update',
  // 添加数据分析相关IPC通道
  GET_NOTE_HISTORY_STATS: 'analytics:get-note-history-stats',
  GET_USER_ACTIVITY_DATA: 'analytics:get-user-activity-data',
  GET_ANALYSIS_CACHE: 'analytics:get-analysis-cache',
  SAVE_ANALYSIS_CACHE: 'analytics:save-analysis-cache',
  RESET_ANALYSIS_CACHE: 'analytics:reset-analysis-cache',
  CHECK_DATABASE_STATUS: 'analytics:check-database-status',
  EXPORT_PDF: 'markdown:export-pdf',
  EXPORT_DOCX: 'markdown:export-docx',
  EXPORT_HTML: 'markdown:export-html',
  // 添加全局标签相关IPC通道
  GET_GLOBAL_TAGS: 'tags:get-global-tags',
  REFRESH_GLOBAL_TAGS: 'tags:refresh-global-tags',
  // 添加对话框相关IPC通道
  DIALOG_SHOW_SAVE: 'dialog:showSaveDialog',
  DIALOG_SHOW_OPEN: 'dialog:showOpenDialog',
  // 添加思维导图相关IPC通道
  MINDMAP_SAVE_FILE: 'mindmap:save-file',
  MINDMAP_LOAD_FILE: 'mindmap:load-file',
  MINDMAP_EXPORT_HTML: 'mindmap:export-html',
  // 添加主题相关IPC通道
  SET_WINDOW_BACKGROUND: 'window:set-background',
  // 添加批量文件操作IPC通道
  BATCH_READ_FILES: 'files:batch-read',
  BATCH_WRITE_FILES: 'files:batch-write',
  // 添加内存监控IPC通道
  MEMORY_GET_STATS: 'memory:get-stats',
  MEMORY_GET_REPORT: 'memory:get-report',
  MEMORY_CLEANUP: 'memory:cleanup',
  MEMORY_FORCE_GC: 'memory:force-gc',
  // 添加应用导航IPC通道
  NAVIGATE_TO_VIEW: 'app:navigate-to-view',
  // 添加聊天历史相关IPC通道
  CHAT_CREATE_SESSION: 'chat:create-session',
  CHAT_SAVE_MESSAGE: 'chat:save-message',
  CHAT_GET_SESSIONS: 'chat:get-sessions',
  CHAT_GET_SESSION_MESSAGES: 'chat:get-session-messages',
  CHAT_UPDATE_SESSION_TITLE: 'chat:update-session-title',
  CHAT_DELETE_SESSION: 'chat:delete-session',
  CHAT_DELETE_MESSAGE: 'chat:delete-message',
  CHAT_GET_SESSION_STATS: 'chat:get-session-stats',
  CHAT_CLEANUP_OLD_SESSIONS: 'chat:cleanup-old-sessions'
}

// 禁用硬件加速以解决GPU缓存问题
app.disableHardwareAcceleration()

// 设置自定义缓存路径
const userDataPath = app.getPath('userData')
const customCachePath = path.join(userDataPath, 'Cache')
app.setPath('sessionData', userDataPath)
app.setPath('userCache', customCachePath)
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')

// 获取markdown文件夹路径
function getMarkdownFolderPath(): string {
  // 在开发环境中，markdown文件夹在项目根目录下
  // 在生产环境中，markdown文件夹在应用程序可执行文件的同级目录下
  let markdownPath
  if (is.dev) {
    markdownPath = resolve(app.getAppPath(), 'markdown')
  } else {
    markdownPath = resolve(app.getPath('exe'), '..', 'markdown')
  }

  // 确保markdown根目录存在
  try {
    if (!fsSync.existsSync(markdownPath)) {
      fsSync.mkdirSync(markdownPath, { recursive: true })
    }

    // 在开发环境和生产环境都创建根目录下的.assets文件夹
    const defaultAssetsFolderPath = path.join(markdownPath, '.assets')
    if (!fsSync.existsSync(defaultAssetsFolderPath)) {
      fsSync.mkdirSync(defaultAssetsFolderPath, { recursive: true })
    }
  } catch (error) {
    mainErrorHandler.error(
      'Failed to create markdown directory structure',
      error,
      ErrorCategory.FILE_IO,
      'getMarkdownFolderPath'
    )
  }

  return markdownPath
}

// 确保markdown文件夹和子文件夹存在
async function ensureMarkdownFolders(folderPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(folderPath, { recursive: true })
  } catch (error) {
    throw error
  }
}

function createTray(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appWithIsQuitting = app as any
  tray = new Tray(icon)

  // 导航到指定视图的辅助函数
  const navigateToView = async (viewKey: string): Promise<void> => {
    try {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
        // 发送导航事件到渲染进程
        mainWindow.webContents.send('navigate-to-view', viewKey)
      }
    } catch (error) {
      console.error('导航失败:', error)
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 Note-by',
      click: (): void => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: '📝 笔记',
      click: (): void => {
        navigateToView('Editor')
      }
    },
    {
      label: '📊 数据分析',
      click: (): void => {
        navigateToView('DataAnalysis')
      }
    },
    {
      label: '🧠 思维导图',
      click: (): void => {
        navigateToView('MindMap')
      }
    },
    {
      label: '💬 对话',
      click: (): void => {
        navigateToView('Chat')
      }
    },
    {
      label: '⚙️ 设置',
      click: (): void => {
        navigateToView('Settings')
      }
    },
    { type: 'separator' },
    {
      label: '🔄 立即同步',
      click: async (): Promise<void> => {
        const config = getWebDAVConfig()
        if (!config.enabled) {
          new Notification({
            title: 'Note-by 同步',
            body: 'WebDAV 同步未启用，请在设置中配置并启用。'
          }).show()
          return
        }

        new Notification({
          title: 'Note-by 同步',
          body: '正在准备同步...'
        }).show()
        try {
          // 为配置添加运行时需要的本地路径
          const fullConfig = { ...config, localPath: getMarkdownFolderPath() }
          await syncBidirectional(fullConfig)
          new Notification({
            title: 'Note-by 同步',
            body: '数据同步完成。'
          }).show()
        } catch (error) {
          mainErrorHandler.error('Bidirectional sync from tray failed', error, ErrorCategory.WEBDAV)
          new Notification({
            title: 'Note-by 同步',
            body: '同步失败，请检查配置或网络。'
          }).show()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: (): void => {
        appWithIsQuitting.isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setToolTip('Note-by')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

function createWindow(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appWithIsQuitting = app as any
  appWithIsQuitting.isQuitting = false
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 950,
    height: 670,
    minWidth: 400, // 设置最小宽度
    minHeight: 300, // 设置最小高度
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f5', // 设置默认背景色为浅色主题背景
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // 禁用 webSecurity 以允许加载本地文件
      allowRunningInsecureContent: true, // 允许运行不安全的内容
      disableBlinkFeatures: 'Accelerated2dCanvas,AcceleratedSmil', // 禁用加速2D画布
      offscreen: false,
      backgroundThrottling: false
    }
  })

  // 禁用BrowserWindow的硬件加速
  mainWindow.webContents.setFrameRate(30)
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1)

  // 配置session缓存路径
  const userDataPath = app.getPath('userData')
  const cachePath = path.join(userDataPath, 'GPUCache')
  mainWindow.webContents.session.setCodeCachePath(cachePath)

  // 设置内容安全策略，允许加载本地协议图片和外部网络图片
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders }
    // 完全禁用CSP以避免限制
    delete responseHeaders['Content-Security-Policy']
    delete responseHeaders['content-security-policy']

    callback({ responseHeaders })
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
      // 设置更新服务的主窗口引用
      updaterService.setMainWindow(mainWindow)
      // 自动更新检查已被禁用，仅支持手动检查
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!appWithIsQuitting.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

// 执行WebDAV自动同步
async function performAutoSync(): Promise<void> {
  try {
    const webdavConfig = getWebDAVConfig()

    // 检查是否启用了自动同步
    if (!webdavConfig.enabled || !webdavConfig.syncOnStartup) {
      return
    }

    // 设置本地路径
    const markdownPath = getMarkdownFolderPath()

    // 根据配置的同步方向执行同步
    switch (webdavConfig.syncDirection) {
      case 'localToRemote':
        await syncLocalToRemote({
          ...webdavConfig,
          localPath: markdownPath
        })
        break
      case 'remoteToLocal':
        await syncRemoteToLocal({
          ...webdavConfig,
          localPath: markdownPath
        })
        break
      case 'bidirectional':
      default:
        await syncBidirectional({
          ...webdavConfig,
          localPath: markdownPath
        })
        break
    }
  } catch (error) {
    mainErrorHandler.error(
      'WebDAV auto-sync failed',
      error,
      ErrorCategory.WEBDAV,
      'performAutoSync'
    )
  }
}

// GitHub releases API URL
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/funkpopo/note-by/releases/latest'

// 检查更新函数
async function checkForUpdates(): Promise<{
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  error?: string
}> {
  try {
    const currentVersion = app.getVersion()

    // 基本请求配置
    const requestConfig = {
      timeout: 10000, // 10秒超时
      headers: {
        'User-Agent': `note-by/${currentVersion}`
      }
    }

    let response
    let directConnectionError: Error | null = null

    try {
      // 首先尝试使用系统代理（如果有）
      response = await axios.get(GITHUB_RELEASES_URL, requestConfig)
    } catch (proxyError) {
      console.warn('使用系统代理检查更新失败，尝试直接连接:', proxyError)

      // 临时修改环境变量，以便proxy-from-env不使用系统代理
      const originalHttpProxy = process.env.HTTP_PROXY
      const originalHttpsProxy = process.env.HTTPS_PROXY
      const originalNoProxy = process.env.NO_PROXY

      // 清除代理环境变量
      delete process.env.HTTP_PROXY
      delete process.env.HTTPS_PROXY
      process.env.NO_PROXY = '*'

      try {
        // 使用直接连接
        const httpAgent = new http.Agent({ keepAlive: true })
        const httpsAgent = new https.Agent({
          keepAlive: true,
          rejectUnauthorized: true // 确保验证SSL证书
        })

        response = await axios.get(GITHUB_RELEASES_URL, {
          ...requestConfig,
          httpAgent,
          httpsAgent,
          proxy: false // 显式禁用代理
        })
      } catch (directError) {
        // 保存直接连接的错误
        directConnectionError =
          directError instanceof Error ? directError : new Error(String(directError))
      } finally {
        // 恢复原始环境变量
        if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy
        else delete process.env.HTTP_PROXY

        if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy
        else delete process.env.HTTPS_PROXY

        if (originalNoProxy) process.env.NO_PROXY = originalNoProxy
        else delete process.env.NO_PROXY
      }

      // 如果直接连接也失败，抛出错误
      if (directConnectionError) {
        throw directConnectionError
      }
    }

    if (!response || response.status !== 200) {
      throw new Error(`GitHub API请求失败: ${response ? response.status : '无响应'}`)
    }

    const data = response.data as { tag_name: string }
    const latestVersion = data.tag_name.replace('v', '')

    // 简单的版本比较 (可以使用更复杂的语义版本比较)
    const hasUpdate = latestVersion > currentVersion

    return {
      hasUpdate,
      latestVersion,
      currentVersion
    }
  } catch (error) {
    return {
      hasUpdate: false,
      latestVersion: '',
      currentVersion: app.getVersion(),
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 自动更新检查已禁用 - 仅支持手动检查
// async function checkUpdatesOnStartup(): Promise<void> {
//   try {
//     const settings = readSettings()
//     const shouldCheckUpdates = settings.checkUpdatesOnStartup !== false
//
//     if (shouldCheckUpdates) {
//       const updateInfo = await checkForUpdates()
//
//       if (updateInfo.hasUpdate) {
//         // 发送更新通知到渲染进程
//         const mainWindow = BrowserWindow.getAllWindows()[0]
//         if (mainWindow) {
//           mainWindow.webContents.send('update-available', updateInfo)
//         }
//       }
//     }
//   } catch (error) {
//     mainErrorHandler.error(
//       'Failed to check for updates on startup',
//       error,
//       ErrorCategory.UPDATER,
//       'checkUpdatesOnStartup'
//     )
//   }
// }

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 设置全局错误处理
  mainErrorHandler.setupGlobalHandlers()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron.note-by')

  // 注册自定义协议，用于加载本地文件（特别是图片）
  protocol.registerFileProtocol('notebyfileprotocol', (request, callback) => {
    try {
      // 解析URL路径
      let url = decodeURI(request.url.substr(20)) // 移除 'notebyfileprotocol://'

      // 清理URL，移除可能存在的 file:// 前缀
      if (url.startsWith('file://')) {
        url = url.substr(7)
      }

      // 修复格式：去掉多余的前导斜线
      while (url.startsWith('//')) {
        url = url.substr(1)
      }

      // 修复格式：确保Windows路径正确（处理斜杠问题）
      const normalizedPath = path.normalize(url)

      // 安全检查：确保路径在应用数据目录内（这里用markdownRoot作为基准）
      const markdownRoot = getMarkdownFolderPath()
      if (!normalizedPath.startsWith(markdownRoot)) {
        return callback({ error: -2 }) // 文件不存在或无权限
      }
      callback({ path: normalizedPath })
    } catch (error) {
      callback({ error: -2 })
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => {
    // pong
  })

  // 设置相关的IPC处理
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return readSettings()
  })

  ipcMain.handle(IPC_CHANNELS.GET_ALL_SETTINGS, () => {
    return readSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, (_, settings) => {
    writeSettings(settings)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.GET_SETTING, (_, key, defaultValue) => {
    return getSetting(key, defaultValue)
  })

  ipcMain.handle(IPC_CHANNELS.SET_SETTING, (_, key, value) => {
    updateSetting(key, value)
    return true
  })

  // OpenAI连接测试
  ipcMain.handle(IPC_CHANNELS.TEST_OPENAI_CONNECTION, async (_, AiApiConfig) => {
    return await testOpenAIConnection(AiApiConfig)
  })

  // 内容生成
  ipcMain.handle(IPC_CHANNELS.GENERATE_CONTENT, async (_, request) => {
    return await generateContent(request)
  })

  // 流式请求管理Map
  const activeStreams = new Map<string, { emitter: any; cleanup: () => void }>()

  // 流式内容生成
  ipcMain.handle(IPC_CHANNELS.STREAM_GENERATE_CONTENT, async (event, request) => {
    try {
      const emitter = await streamGenerateContent(request)
      const sender = event.sender

      // 为每个流式数据块分配唯一ID
      const streamId = Date.now().toString()

      // 用于跟踪事件监听器，确保能正确清理
      const listeners = {
        data: null as ((chunk: string) => void) | null,
        done: null as ((fullContent: string) => void) | null,
        error: null as ((error: string) => void) | null
      }

      // 创建清理函数，移除所有事件监听器
      const cleanupListeners = (): void => {
        if (listeners.data) {
          try {
            emitter.removeListener('data', listeners.data)
          } catch (err) {
            // 移除监听器失败，继续执行
          }
        }

        if (listeners.done) {
          try {
            emitter.removeListener('done', listeners.done)
          } catch (err) {
            // 移除监听器失败，继续执行
          }
        }

        if (listeners.error) {
          try {
            emitter.removeListener('error', listeners.error)
          } catch (err) {
            // 移除监听器失败，继续执行
          }
        }

        // 从活跃流式请求Map中移除
        activeStreams.delete(streamId)
      }

      // 添加超时机制
      const timeoutMs = 60000 // 60秒超时
      const timeoutId = setTimeout(() => {
        if (!sender.isDestroyed()) {
          sender.send(`stream-error-${streamId}`, {
            error: `生成超时 (${timeoutMs / 1000}秒). 请检查网络连接或API服务状态。`
          })
        }

        cleanupListeners()
      }, timeoutMs)

      // 监听数据事件
      listeners.data = (chunk) => {
        if (sender.isDestroyed()) {
          cleanupListeners()
          clearTimeout(timeoutId)
          return
        }

        sender.send(`stream-data-${streamId}`, { chunk })
      }
      emitter.on('data', listeners.data)

      // 监听完成事件
      listeners.done = (fullContent) => {
        clearTimeout(timeoutId)

        if (sender.isDestroyed()) {
          cleanupListeners()
          return
        }

        sender.send(`stream-done-${streamId}`, { content: fullContent })

        // 完成后清理监听器
        cleanupListeners()
      }
      emitter.on('done', listeners.done)

      // 监听错误事件
      listeners.error = (error) => {
        clearTimeout(timeoutId)

        if (sender.isDestroyed()) {
          cleanupListeners()
          return
        }

        sender.send(`stream-error-${streamId}`, { error })

        // 错误后清理监听器
        cleanupListeners()
      }
      emitter.on('error', listeners.error)

      // 将流式请求添加到管理Map中
      activeStreams.set(streamId, {
        emitter,
        cleanup: cleanupListeners
      })

      // 返回流ID供客户端使用
      return { success: true, streamId }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '启动流式生成失败'
      }
    }
  })

  // 停止流式内容生成
  ipcMain.handle(IPC_CHANNELS.STOP_STREAM_GENERATE, async (_, streamId: string) => {
    try {
      const streamInfo = activeStreams.get(streamId)
      if (streamInfo) {
        // 调用emitter的停止方法（如果存在）
        if (streamInfo.emitter && typeof streamInfo.emitter.stop === 'function') {
          streamInfo.emitter.stop()
        }

        // 清理监听器和从Map中移除
        streamInfo.cleanup()

        return { success: true }
      } else {
        return { success: false, error: '流式请求不存在或已完成' }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '停止流式生成失败'
      }
    }
  })

  // 保存API配置
  ipcMain.handle(IPC_CHANNELS.SAVE_API_CONFIG, (_, AiApiConfig) => {
    try {
      const settings = readSettings()
      const AiApiConfigs = (settings.AiApiConfigs as AiApiConfig[]) || []

      // 检查是否存在相同ID的配置
      const index = AiApiConfigs.findIndex((config: AiApiConfig) => config.id === AiApiConfig.id)

      if (index >= 0) {
        // 更新已存在的配置
        AiApiConfigs[index] = AiApiConfig
      } else {
        // 添加新配置
        AiApiConfigs.push(AiApiConfig)
      }

      // 保存到设置
      settings.AiApiConfigs = AiApiConfigs
      writeSettings(settings)

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除API配置
  ipcMain.handle(IPC_CHANNELS.DELETE_API_CONFIG, (_, configId) => {
    try {
      const settings = readSettings()
      const AiApiConfigs = (settings.AiApiConfigs as AiApiConfig[]) || []

      // 过滤掉要删除的配置
      settings.AiApiConfigs = AiApiConfigs.filter((config: AiApiConfig) => config.id !== configId)
      writeSettings(settings)

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 保存Markdown文件
  ipcMain.handle(IPC_CHANNELS.SAVE_MARKDOWN, async (_, filePath, content) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const fullPath = resolve(markdownRoot, filePath)

      // 确保路径中的文件夹存在
      const folderPath = fullPath.substring(0, fullPath.lastIndexOf('\\'))
      await ensureMarkdownFolders(folderPath)

      // 使用流式写入优化大文件处理
      await fileStreamManager.writeFileStream(fullPath, content, {
        encoding: 'utf-8'
      })

      // 添加历史记录
      await addNoteHistory({
        filePath,
        content
      })

      return { success: true, path: fullPath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 导出PDF文件
  ipcMain.handle(IPC_CHANNELS.EXPORT_PDF, async (_, filePath, content) => {
    try {
      // 获取文件名（不含扩展名）
      const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'

      // 打开保存对话框，让用户选择保存位置
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        title: '导出PDF',
        defaultPath: join(app.getPath('documents'), `${fileName}.pdf`),
        filters: [{ name: 'PDF文件', extensions: ['pdf'] }]
      })

      if (canceled || !savePath) {
        return { success: false, error: '用户取消了操作' }
      }

      // 使用md-to-pdf库将Markdown转换为PDF
      await mdToPdf({ content }, { dest: savePath })

      // 转换成功后打开文件
      shell.openPath(savePath)

      return { success: true, path: savePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 将Markdown转换为DOCX
  async function markdownToDocx(markdownContent: string): Promise<Buffer> {
    // 使用Showdown将Markdown转换为HTML（用于解析结构）
    const converter = new Showdown.Converter({
      tables: true,
      tasklists: true,
      strikethrough: true
    })

    // 将Markdown转换为HTML
    const html = converter.makeHtml(markdownContent)

    // 简单解析HTML并添加内容（这是一个基本实现，实际应用可能需要更复杂的HTML解析）
    // 移除HTML标签，获取纯文本
    const plainText = html.replace(/<[^>]*>/g, '')

    // 将纯文本按行分割，创建段落
    const lines = plainText.split('\n').filter((line) => line.trim() !== '')

    // 将每行添加为段落到第一个section
    const paragraphs = lines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim()
            })
          ]
        })
    )

    // 创建一个包含所有段落的文档
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1
            }),
            ...paragraphs
          ]
        }
      ]
    })

    // 导出为Buffer
    return await Packer.toBuffer(doc)
  }

  // 导出DOCX文件
  ipcMain.handle(IPC_CHANNELS.EXPORT_DOCX, async (_, filePath, content) => {
    try {
      // 获取文件名（不含扩展名）
      const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'

      // 打开保存对话框，让用户选择保存位置
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        title: '导出DOCX',
        defaultPath: join(app.getPath('documents'), `${fileName}.docx`),
        filters: [{ name: 'DOCX文件', extensions: ['docx'] }]
      })

      if (canceled || !savePath) {
        return { success: false, error: '用户取消了操作' }
      }

      // 将Markdown转换为DOCX
      const buffer = await markdownToDocx(content)

      // 写入二进制文件
      await fsPromises.writeFile(savePath, buffer)

      // 转换成功后打开文件
      shell.openPath(savePath)

      return { success: true, path: savePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 导出HTML文件
  ipcMain.handle(IPC_CHANNELS.EXPORT_HTML, async (_, filePath, content) => {
    try {
      // 获取文件名（不含扩展名）
      const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'

      // 打开保存对话框，让用户选择保存位置
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        title: '导出HTML',
        defaultPath: join(app.getPath('documents'), `${fileName}.html`),
        filters: [{ name: 'HTML文件', extensions: ['html'] }]
      })

      if (canceled || !savePath) {
        return { success: false, error: '用户取消了操作' }
      }

      // 使用Showdown将Markdown转换为HTML
      const converter = new Showdown.Converter({
        tables: true,
        tasklists: true,
        strikethrough: true,
        emoji: true
      })

      // 将Markdown转换为HTML内容
      const htmlContent = converter.makeHtml(content)

      // 创建完整的HTML文档，包含基本样式
      const htmlDocument = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 {
            font-size: 2em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: .3em;
        }
        h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: .3em;
        }
        code {
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            background-color: rgba(27, 31, 35, .05);
            border-radius: 3px;
            font-size: 85%;
            margin: 0;
            padding: .2em .4em;
        }
        pre {
            background-color: #f6f8fa;
            border-radius: 3px;
            font-size: 85%;
            line-height: 1.45;
            overflow: auto;
            padding: 16px;
        }
        pre code {
            background-color: transparent;
            border: 0;
            display: inline;
            line-height: inherit;
            margin: 0;
            max-width: auto;
            overflow: visible;
            padding: 0;
            word-wrap: normal;
        }
        blockquote {
            border-left: 4px solid #dfe2e5;
            color: #6a737d;
            margin: 0;
            padding: 0 1em;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        table th, table td {
            border: 1px solid #dfe2e5;
            padding: 6px 13px;
        }
        table tr {
            background-color: #fff;
            border-top: 1px solid #c6cbd1;
        }
        table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        input[type="checkbox"] {
            margin-right: 0.5em;
        }
        hr {
            border: 0;
            border-bottom: 1px solid #eee;
            height: 0;
            margin: 15px 0;
            overflow: hidden;
        }
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #0d1117;
                color: #c9d1d9;
            }
            a {
                color: #58a6ff;
            }
            code {
                background-color: rgba(240, 246, 252, 0.15);
            }
            pre {
                background-color: #161b22;
            }
            blockquote {
                color: #8b949e;
                border-left-color: #30363d;
            }
            table tr {
                background-color: #0d1117;
                border-top-color: #30363d;
            }
            table tr:nth-child(2n) {
                background-color: #161b22;
            }
            table th, table td {
                border-color: #30363d;
            }
            hr {
                border-bottom-color: #21262d;
            }
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`

      // 写入HTML文件
      await fsPromises.writeFile(savePath, htmlDocument, 'utf-8')

      // 转换成功后打开文件
      shell.openPath(savePath)

      return { success: true, path: savePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 检查文件是否存在
  ipcMain.handle(IPC_CHANNELS.CHECK_FILE_EXISTS, async (_, filePath) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const fullPath = resolve(markdownRoot, filePath)

      // 检查文件是否存在
      try {
        const stat = await fsPromises.stat(fullPath)
        return { success: true, exists: stat.isFile() }
      } catch {
        // 文件不存在
        return { success: true, exists: false }
      }
    } catch (error) {
      return { success: false, error: String(error), exists: false }
    }
  })

  // 获取Markdown文件夹列表
  ipcMain.handle(IPC_CHANNELS.GET_MARKDOWN_FOLDERS, async () => {
    try {
      const markdownRoot = getMarkdownFolderPath()

      // 确保根目录存在
      await ensureMarkdownFolders(markdownRoot)

      // 递归获取所有子文件夹
      const getAllFolders = async (dir: string, basePath: string = ''): Promise<string[]> => {
        const folders: string[] = []

        try {
          const entries = await fsPromises.readdir(dir, { withFileTypes: true })

          // 先添加当前目录下的直接子文件夹
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
              folders.push(relativePath)

              // 递归获取子文件夹中的文件夹
              const subFolders = await getAllFolders(resolve(dir, entry.name), relativePath)
              folders.push(...subFolders)
            }
          }
        } catch (error) {
          mainErrorHandler.warn(
            'Failed to read directory entry during folder scan',
            ErrorCategory.FILE_IO,
            'getAllFolders',
            error
          )
        }

        return folders
      }

      const folders = await getAllFolders(markdownRoot)
      return { success: true, folders }
    } catch (error) {
      return { success: false, error: String(error), folders: [] }
    }
  })

  // 获取特定文件夹中的Markdown文件
  ipcMain.handle(IPC_CHANNELS.GET_MARKDOWN_FILES, async (_, folderName) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const folderPath = resolve(markdownRoot, folderName)

      // 确保文件夹存在
      await ensureMarkdownFolders(folderPath)

      // 检查文件夹是否存在
      try {
        await fsPromises.access(folderPath)
      } catch (error) {
        return { success: false, error: String(error), files: [] }
      }

      const entries = await fsPromises.readdir(folderPath, { withFileTypes: true })
      const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name)

      return { success: true, files }
    } catch (error) {
      return { success: false, error: String(error), files: [] }
    }
  })

  // 读取Markdown文件内容
  ipcMain.handle(IPC_CHANNELS.READ_MARKDOWN_FILE, async (_, filePath) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const fullPath = resolve(markdownRoot, filePath)

      // 检查文件是否存在
      try {
        await fsPromises.access(fullPath)
      } catch {
        // 文件不存在，返回空内容
        return { success: false, error: '文件不存在', content: '' }
      }

      // 使用流式读取优化大文件处理
      const result = await fileStreamManager.readFileStream(fullPath, {
        encoding: 'utf-8'
      })

      if (result.success && result.content !== undefined) {
        return { success: true, content: result.content }
      } else {
        return { success: false, error: result.error || '读取文件失败', content: '' }
      }
    } catch (error) {
      return { success: false, error: String(error), content: '' }
    }
  })

  // 创建新文件夹
  ipcMain.handle(IPC_CHANNELS.CREATE_MARKDOWN_FOLDER, async (_, folderName) => {
    try {
      // 验证文件夹名称
      if (!folderName || folderName.trim() === '') {
        return { success: false, error: '文件夹名称不能为空' }
      }

      const markdownRoot = getMarkdownFolderPath()

      // 处理嵌套路径，先分割成路径部分
      const pathParts = folderName.split('/')

      // 过滤每个部分中的非法字符，保留路径结构
      const sanitizedParts = pathParts.map((part) => part.replace(/[\\:*?"<>|]/g, '_'))

      // 重新组合路径
      const sanitizedFolderName = sanitizedParts.join('/')

      const fullPath = resolve(markdownRoot, sanitizedFolderName)

      // 检查markdown根目录是否存在，如果不存在则创建
      if (!fsSync.existsSync(markdownRoot)) {
        await fsPromises.mkdir(markdownRoot, { recursive: true })
      }

      // 检查文件夹是否已存在
      try {
        const stat = await fsPromises.stat(fullPath)
        if (stat.isDirectory()) {
          return { success: false, error: '文件夹已存在' }
        } else {
          return { success: false, error: '该名称已被文件占用' }
        }
      } catch {}

      // 创建文件夹
      await fsPromises.mkdir(fullPath, { recursive: true })

      return { success: true, path: fullPath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除文件夹
  ipcMain.handle(IPC_CHANNELS.DELETE_MARKDOWN_FOLDER, async (_, folderName) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const fullPath = resolve(markdownRoot, folderName)

      // 检查文件夹是否存在
      try {
        await fsPromises.access(fullPath)
      } catch {
        return { success: false, error: '文件夹不存在' }
      }

      // 递归删除文件夹及其内容
      await fsPromises.rm(fullPath, { recursive: true, force: true })

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 重命名文件夹
  ipcMain.handle(IPC_CHANNELS.RENAME_MARKDOWN_FOLDER, async (_, oldFolderName, newFolderName) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const oldPath = resolve(markdownRoot, oldFolderName)
      const newPath = resolve(markdownRoot, newFolderName)

      // 检查源文件夹是否存在
      try {
        await fsPromises.access(oldPath)
      } catch {
        return { success: false, error: '源文件夹不存在' }
      }

      // 检查目标文件夹是否已存在
      try {
        await fsPromises.access(newPath)
        return { success: false, error: '目标文件夹已存在' }
      } catch {
        // 目标文件夹不存在，可以重命名
      }

      // 重命名文件夹
      await fsPromises.rename(oldPath, newPath)

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 创建新笔记
  ipcMain.handle(IPC_CHANNELS.CREATE_MARKDOWN_NOTE, async (_, folderName, fileName, content) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const folderPath = resolve(markdownRoot, folderName)

      // 确保文件夹存在
      await ensureMarkdownFolders(folderPath)

      const filePath = resolve(folderPath, fileName)

      // 检查文件是否已存在
      try {
        await fsPromises.access(filePath)
        return { success: false, error: '文件已存在' }
      } catch {
        // 文件不存在，可以创建
      }

      // 使用流式写入优化大文件处理
      await fileStreamManager.writeFileStream(filePath, content || '', {
        encoding: 'utf-8'
      })

      return { success: true, path: filePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除笔记文件
  ipcMain.handle(IPC_CHANNELS.DELETE_MARKDOWN_FILE, async (_, filePath) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const fullPath = resolve(markdownRoot, filePath)

      // 检查文件是否存在
      try {
        await fsPromises.access(fullPath)
      } catch {
        return { success: false, error: '文件不存在' }
      }

      // 删除文件
      await fsPromises.unlink(fullPath)

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 重命名笔记文件
  ipcMain.handle(IPC_CHANNELS.RENAME_MARKDOWN_FILE, async (_, oldFilePath, newFilePath) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const oldPath = resolve(markdownRoot, oldFilePath)
      const newPath = resolve(markdownRoot, newFilePath)

      // 检查源文件是否存在
      try {
        await fsPromises.access(oldPath)
      } catch {
        return { success: false, error: '源文件不存在' }
      }

      // 检查目标文件是否已存在
      try {
        await fsPromises.access(newPath)
        return { success: false, error: '目标文件已存在' }
      } catch {
        // 目标文件不存在，可以重命名
      }

      // 确保目标文件的文件夹存在
      const newFolderPath = newPath.substring(0, newPath.lastIndexOf('\\'))
      await ensureMarkdownFolders(newFolderPath)

      // 重命名文件
      await fsPromises.rename(oldPath, newPath)

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 测试WebDAV连接
  ipcMain.handle(IPC_CHANNELS.TEST_WEBDAV_CONNECTION, async (_, config) => {
    try {
      const result = await testWebDAVConnection(config)
      return result
    } catch (error) {
      return { success: false, message: `测试连接失败: ${error}` }
    }
  })

  // 同步本地到远程
  ipcMain.handle(IPC_CHANNELS.SYNC_LOCAL_TO_REMOTE, async (_, config) => {
    try {
      if (!config.localPath) {
        // 如果未指定本地路径，使用默认的markdown文件夹
        config.localPath = getMarkdownFolderPath()
      }

      const result = await syncLocalToRemote(config)
      return result
    } catch (error) {
      return {
        success: false,
        message: `同步失败: ${error}`,
        uploaded: 0,
        failed: 0
      }
    }
  })

  // 同步远程到本地
  ipcMain.handle(IPC_CHANNELS.SYNC_REMOTE_TO_LOCAL, async (_, config) => {
    try {
      if (!config.localPath) {
        // 如果未指定本地路径，使用默认的markdown文件夹
        config.localPath = getMarkdownFolderPath()
      }

      const result = await syncRemoteToLocal(config)
      return result
    } catch (error) {
      return {
        success: false,
        message: `同步失败: ${error}`,
        downloaded: 0,
        failed: 0
      }
    }
  })

  // 双向同步
  ipcMain.handle(IPC_CHANNELS.SYNC_BIDIRECTIONAL, async (_, config) => {
    try {
      if (!config.localPath) {
        // 如果未指定本地路径，使用默认的markdown文件夹
        config.localPath = getMarkdownFolderPath()
      }

      const result = await syncBidirectional(config)
      return result
    } catch (error) {
      return {
        success: false,
        message: `同步失败: ${error}`,
        uploaded: 0,
        downloaded: 0,
        failed: 0
      }
    }
  })

  // 取消同步
  ipcMain.handle(IPC_CHANNELS.CANCEL_SYNC, async () => {
    try {
      cancelSync()
      return { success: true, message: '已发送取消同步请求' }
    } catch (error) {
      return { success: false, message: `取消同步失败: ${error}` }
    }
  })

  // 清除WebDAV同步缓存
  ipcMain.handle(IPC_CHANNELS.CLEAR_WEBDAV_SYNC_CACHE, async () => {
    try {
      const result = await clearSyncCache()
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 验证主密码
  ipcMain.handle(IPC_CHANNELS.VERIFY_MASTER_PASSWORD, async (_, password) => {
    try {
      const webdavConfig = getWebDAVConfig()

      // 如果未启用自定义加密，返回错误
      if (!webdavConfig.useCustomEncryption) {
        return {
          success: false,
          message: '未启用自定义加密',
          error: '未启用自定义加密'
        }
      }

      // 验证主密码
      const isValid = verifyMasterPassword(webdavConfig, password)

      if (isValid) {
        return {
          success: true,
          message: '密码验证成功'
        }
      } else {
        return {
          success: false,
          message: '密码验证失败',
          error: '密码不正确'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: '验证过程中发生错误',
        error: String(error)
      }
    }
  })

  // 设置主密码
  ipcMain.handle(IPC_CHANNELS.SET_MASTER_PASSWORD, async (_, config) => {
    try {
      const { password, webdavConfig } = config

      if (!password || !webdavConfig) {
        return {
          success: false,
          message: '无效的主密码或WebDAV配置',
          error: '缺少必要参数'
        }
      }

      // 设置useCustomEncryption为true
      webdavConfig.useCustomEncryption = true

      // 使用主密码加密配置
      const encryptedConfig = encryptWebDAVWithMasterPassword(webdavConfig, password)

      // 保存加密后的配置
      updateWebDAVConfig(encryptedConfig)

      return {
        success: true,
        message: '主密码设置成功'
      }
    } catch (error) {
      return {
        success: false,
        message: '设置过程中发生错误',
        error: String(error)
      }
    }
  })

  // WebDAV配置变更通知
  ipcMain.handle(IPC_CHANNELS.WEBDAV_CONFIG_CHANGED, async () => {
    try {
      // 从webdav模块导入配置变更处理函数
      const { handleConfigChanged } = await import('./webdav')

      // 重新初始化WebDAV客户端
      const result = await handleConfigChanged()

      return {
        success: result.success,
        message: result.message || 'WebDAV配置已更新'
      }
    } catch (error) {
      return {
        success: false,
        message: '配置更新失败',
        error: String(error)
      }
    }
  })

  // 处理文件上传
  ipcMain.handle(IPC_CHANNELS.UPLOAD_FILE, async (_, filePath, fileData, fileName) => {
    try {
      const markdownRoot = getMarkdownFolderPath()

      // 先处理传入的参数，确保没有引号和特殊字符
      filePath = filePath ? filePath.replace(/["']/g, '') : ''
      fileName = fileName ? fileName.replace(/["']/g, '') : ''

      // 检查fileData是否是本地文件路径（以file://开头或包含引号的路径）
      if (
        typeof fileData === 'string' &&
        (fileData.startsWith('file://') || fileData.includes('"') || fileData.includes('\\'))
      ) {
        try {
          // 如果是文件路径，尝试读取文件内容
          let cleanPath = fileData.replace(/^file:\/\//i, '').replace(/["']/g, '')

          // 处理可能的编码字符，如 %5C
          try {
            if (cleanPath.includes('%')) {
              const decodedPath = decodeURI(cleanPath)
              cleanPath = decodedPath
            }
          } catch (decodeError) {
            // 继续使用原始路径
          }

          // 确保Windows路径格式正确
          if (cleanPath.match(/^[A-Za-z]:\/{2,}/)) {
            // 修复Windows盘符后可能的多斜杠问题
            cleanPath = cleanPath.replace(/^([A-Za-z]:)\/{2,}/, '$1/')
          }

          try {
            // 尝试读取文件（二进制文件，不使用流式处理）
            const fileBuffer = await fsPromises.readFile(cleanPath)
            // 转换为base64
            const base64Data = `data:image/${path.extname(cleanPath).substring(1)};base64,${fileBuffer.toString('base64')}`
            fileData = base64Data
          } catch (readError) {
            // 如果读取失败，保持原始数据
          }
        } catch (error) {
          // 错误处理，继续使用原始fileData
        }
      }

      // 解析Markdown文件路径，获取目录和文件名
      // 使用path.sep来确保跨平台兼容性
      const pathSeparator = path.sep
      const lastSeparatorIndex = filePath.lastIndexOf(pathSeparator)

      // 如果找不到平台特定的分隔符，尝试使用正斜杠和反斜杠
      const mdDirectory =
        lastSeparatorIndex !== -1
          ? filePath.substring(0, lastSeparatorIndex)
          : filePath.substring(0, Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')))

      // 统一使用markdown/.assets目录存储上传的文件
      const assetsDir = path.join(markdownRoot, '.assets')

      // 确保资源目录存在
      await ensureMarkdownFolders(assetsDir)

      // 清理文件名中的非法字符，增强对特殊字符的处理
      const cleanFileName = fileName.replace(/[\\/:*?"<>|']/g, '_')

      // 使用原始文件名，不添加时间戳
      const uniqueFileName = cleanFileName

      // 完整的保存路径
      const savePath = path.resolve(markdownRoot, path.join(assetsDir, uniqueFileName))

      // 根据文件类型处理数据
      if (fileData.startsWith('data:')) {
        // 处理base64编码的数据
        const base64Data = fileData.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        await fsPromises.writeFile(savePath, buffer)
      } else {
        // 处理非base64数据（如果有的话）
        await fsPromises.writeFile(savePath, fileData)
      }

      // 计算绝对路径，用于在Markdown中引用图片
      // 使用path.posix确保在Markdown中使用正斜杠
      const absoluteDirPath = path.resolve(markdownRoot, mdDirectory)
      const assetRelativePath = `.assets${path.posix.sep}${uniqueFileName}`
      const markdownImagePath = `${absoluteDirPath}${path.posix.sep}${assetRelativePath}`

      // 确保路径使用正斜杠，这对于 file:// URL 是必需的
      let fileUrl = ''

      try {
        // 从markdownRoot中提取盘符，精确构建路径
        const assetsPath = path.join(markdownRoot, '.assets', uniqueFileName)

        // 检测是否有Windows盘符 (如 D:\)
        if (assetsPath.match(/^[A-Za-z]:/)) {
          // 提取盘符 (如 "D:")
          const driveLetter = assetsPath.substring(0, 2)

          // 提取路径其余部分并转换为正斜杠格式
          const pathPart = assetsPath.substring(2).replace(/\\/g, '/')

          // 确保路径开始没有多余的斜杠，然后添加一个斜杠
          const cleanPathPart = pathPart.replace(/^\/+/, '/')
          if (cleanPathPart.startsWith('/')) {
            // 构建完整URL，避免盘符后出现双斜杠
            fileUrl = `file:///${driveLetter}${cleanPathPart}`
          } else {
            // 确保有一个斜杠分隔盘符和路径
            fileUrl = `file:///${driveLetter}/${cleanPathPart.replace(/^\/+/, '')}`
          }
        } else {
          // 非Windows路径，直接转换斜杠
          fileUrl = `file:///${assetsPath.replace(/\\/g, '/')}`
        }
      } catch (error) {
        // 使用备用方法生成URL
        fileUrl = `file:///${markdownImagePath.replace(/\\/g, '/')}`
      }

      return {
        success: true,
        url: fileUrl,
        path: savePath
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 更新检查
  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
    return await checkForUpdates()
  })

  // 获取笔记的历史记录
  ipcMain.handle(IPC_CHANNELS.GET_NOTE_HISTORY, async (_, filePath) => {
    try {
      const history = await getNoteHistory(filePath)
      return { success: true, history }
    } catch (error) {
      return { success: false, error: String(error), history: [] }
    }
  })

  // 获取特定ID的历史记录
  ipcMain.handle(IPC_CHANNELS.GET_NOTE_HISTORY_BY_ID, async (_, id) => {
    try {
      const history = await getNoteHistoryById(id)
      if (!history) {
        return { success: false, error: '未找到历史记录', history: null }
      }
      return { success: true, history }
    } catch (error) {
      return { success: false, error: String(error), history: null }
    }
  })

  // 更新单个设置
  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTING, (_, key: string, value: unknown) => {
    updateSetting(key, value)
    return true
  })

  // 获取笔记历史记录统计数据
  ipcMain.handle(IPC_CHANNELS.GET_NOTE_HISTORY_STATS, async () => {
    try {
      const stats = await getNoteHistoryStats()
      return { success: true, stats }
    } catch (error) {
      return { success: false, error: String(error), stats: null }
    }
  })

  // 获取用户活动数据
  ipcMain.handle(IPC_CHANNELS.GET_USER_ACTIVITY_DATA, async (_, days = 30) => {
    try {
      const activityData = await getUserActivityData(days)
      return { success: true, activityData }
    } catch (error) {
      return { success: false, error: String(error), activityData: null }
    }
  })

  // 获取分析缓存
  ipcMain.handle(IPC_CHANNELS.GET_ANALYSIS_CACHE, async () => {
    try {
      const cache = await getAnalysisCache()
      return { success: true, cache }
    } catch (error) {
      return { success: false, error: String(error), cache: null }
    }
  })

  // 保存分析缓存
  ipcMain.handle(IPC_CHANNELS.SAVE_ANALYSIS_CACHE, async (_, cacheData: AnalysisCacheItem) => {
    try {
      const success = await saveAnalysisCache(cacheData)
      return { success }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 重置分析缓存
  ipcMain.handle(IPC_CHANNELS.RESET_ANALYSIS_CACHE, async () => {
    try {
      const success = await resetAnalysisCache()
      return { success }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 检查数据库状态
  ipcMain.handle(IPC_CHANNELS.CHECK_DATABASE_STATUS, async () => {
    try {
      const status = await checkDatabaseStatus()
      return { success: true, status }
    } catch (error) {
      return { success: false, error: String(error), status: null }
    }
  })

  // 获取全局标签数据
  ipcMain.handle(IPC_CHANNELS.GET_GLOBAL_TAGS, async () => {
    try {
      const markdownPath = getMarkdownFolderPath()
      const tagsData = await getDocumentTagsData(markdownPath)
      return { success: true, tagsData }
    } catch (error) {
      return { success: false, error: String(error), tagsData: null }
    }
  })

  // 刷新全局标签数据
  ipcMain.handle(IPC_CHANNELS.REFRESH_GLOBAL_TAGS, async () => {
    try {
      const markdownPath = getMarkdownFolderPath()
      const tagsData = await getDocumentTagsData(markdownPath)
      return { success: true, tagsData }
    } catch (error) {
      return { success: false, error: String(error), tagsData: null }
    }
  })

  // 显示保存对话框
  ipcMain.handle(IPC_CHANNELS.DIALOG_SHOW_SAVE, async (_, options: Electron.SaveDialogOptions) => {
    try {
      if (!mainWindow) {
        return undefined
      }
      const result = await dialog.showSaveDialog(mainWindow, options)
      return result.canceled ? undefined : result.filePath
    } catch (error) {
      return undefined
    }
  })

  // 显示打开对话框
  ipcMain.handle(IPC_CHANNELS.DIALOG_SHOW_OPEN, async (_, options: Electron.OpenDialogOptions) => {
    try {
      if (!mainWindow) {
        return undefined
      }
      const result = await dialog.showOpenDialog(mainWindow, options)
      return result.canceled ? undefined : result.filePaths[0]
    } catch (error) {
      return undefined
    }
  })

  // 保存思维导图文件
  ipcMain.handle(IPC_CHANNELS.MINDMAP_SAVE_FILE, async (_, content: string) => {
    try {
      if (!mainWindow) {
        return { success: false, error: '主窗口未初始化' }
      }

      // 显示保存对话框
      const { canceled, filePath: savePath } = await dialog.showSaveDialog(mainWindow, {
        title: '保存思维导图',
        defaultPath: path.join(app.getPath('documents'), 'mindmap.json'),
        filters: [{ name: '思维导图文件', extensions: ['json'] }]
      })

      if (canceled || !savePath) {
        return { success: false, error: '用户取消保存' }
      }

      await fileStreamManager.writeFileStream(savePath, content, {
        encoding: 'utf-8'
      })
      return { success: true, path: savePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 加载思维导图文件
  ipcMain.handle(IPC_CHANNELS.MINDMAP_LOAD_FILE, async () => {
    try {
      if (!mainWindow) {
        return { success: false, error: '主窗口未初始化' }
      }

      // 显示打开对话框
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: '加载思维导图',
        filters: [{ name: '思维导图文件', extensions: ['json'] }],
        properties: ['openFile']
      })

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, cancelled: true }
      }

      const filePath = filePaths[0]
      const result = await fileStreamManager.readFileStream(filePath, {
        encoding: 'utf-8'
      })

      if (result.success && result.content !== undefined) {
        return { success: true, data: result.content }
      } else {
        return { success: false, error: result.error || '读取文件失败' }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 导出思维导图HTML
  ipcMain.handle(IPC_CHANNELS.MINDMAP_EXPORT_HTML, async (_, imageDataUrl: string) => {
    try {
      if (!mainWindow) {
        return { success: false, error: '主窗口未初始化' }
      }

      // 显示保存对话框
      const { canceled, filePath: savePath } = await dialog.showSaveDialog(mainWindow, {
        title: '导出思维导图HTML',
        defaultPath: path.join(app.getPath('documents'), 'mindmap.html'),
        filters: [{ name: 'HTML文件', extensions: ['html'] }]
      })

      if (canceled || !savePath) {
        return { success: false, error: '用户取消导出' }
      }

      // 创建HTML内容，嵌入图片
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>思维导图</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .mindmap-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 20px;
            max-width: 100%;
            max-height: 100%;
        }
        .mindmap-image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }
        .title {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="mindmap-container">
        <h1 class="title">思维导图</h1>
        <img src="${imageDataUrl}" alt="思维导图" class="mindmap-image">
    </div>
</body>
</html>`

      // 保存HTML内容
      await fileStreamManager.writeFileStream(savePath, htmlContent, {
        encoding: 'utf-8'
      })
      return { success: true, path: savePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 设置窗口背景色
  ipcMain.handle(IPC_CHANNELS.SET_WINDOW_BACKGROUND, async (_, backgroundColor: string) => {
    try {
      if (mainWindow) {
        mainWindow.setBackgroundColor(backgroundColor)
        return { success: true }
      }
      return { success: false, error: '主窗口未初始化' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 批量读取文件
  ipcMain.handle(IPC_CHANNELS.BATCH_READ_FILES, async (_, filePaths: string[]) => {
    try {
      const markdownRoot = getMarkdownFolderPath()
      const fullPaths = filePaths.map((filePath) => resolve(markdownRoot, filePath))

      const results = await fileStreamManager.batchReadFiles(fullPaths, {
        maxConcurrency: 5,
        encoding: 'utf-8'
      })

      return {
        success: true,
        results: results.map((result, index) => ({
          filePath: filePaths[index],
          success: result.success,
          content: result.content,
          error: result.error
        }))
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 批量写入文件
  ipcMain.handle(
    IPC_CHANNELS.BATCH_WRITE_FILES,
    async (_, operations: Array<{ filePath: string; content: string }>) => {
      try {
        const markdownRoot = getMarkdownFolderPath()
        const writeOperations = operations.map((op) => ({
          filePath: resolve(markdownRoot, op.filePath),
          content: op.content
        }))

        const results = await fileStreamManager.batchWriteFiles(writeOperations, {
          maxConcurrency: 5,
          encoding: 'utf-8'
        })

        // 添加历史记录（仅对成功的操作）
        const historyPromises = operations
          .filter((_, index) => results[index].success)
          .map((op) =>
            addNoteHistory({
              filePath: op.filePath,
              content: op.content
            })
          )

        await Promise.allSettled(historyPromises)

        return {
          success: true,
          results: results.map((result, index) => ({
            filePath: operations[index].filePath,
            success: result.success,
            error: result.error
          }))
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取内存统计
  ipcMain.handle(IPC_CHANNELS.MEMORY_GET_STATS, async () => {
    try {
      const stats = memoryMonitor.getCurrentStats()
      return { success: true, stats }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取内存报告
  ipcMain.handle(IPC_CHANNELS.MEMORY_GET_REPORT, async () => {
    try {
      const report = memoryMonitor.generateReport()
      return { success: true, report }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 内存清理
  ipcMain.handle(IPC_CHANNELS.MEMORY_CLEANUP, async () => {
    try {
      const cleanupResults = {
        memoryMonitor: await memoryMonitor.cleanupMemory(),
        database: performDatabaseMemoryCleanup(),
        fileStreamManager: null as any,
        globalStats: {
          totalCleanedItems: 0,
          totalFreedMemory: 0
        }
      }

      // 如果有全局标签管理器的引用，也进行清理
      // 注意：由于全局标签管理器在渲染进程中，我们需要通过IPC通知它进行清理
      if (mainWindow) {
        mainWindow.webContents.send('perform-memory-cleanup')
      }

      // 清理文件流管理器的临时文件
      try {
        await fileStreamManager.cleanupFiles([])
        cleanupResults.fileStreamManager = { cleanedTempFiles: 0 }
      } catch (error) {
        cleanupResults.fileStreamManager = { error: String(error) }
      }

      // 汇总统计信息
      cleanupResults.globalStats.totalFreedMemory = cleanupResults.memoryMonitor.freedMemory || 0

      return { success: true, result: cleanupResults }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 强制垃圾回收
  ipcMain.handle(IPC_CHANNELS.MEMORY_FORCE_GC, async () => {
    try {
      memoryMonitor.forceGarbageCollection()
      const stats = memoryMonitor.getCurrentStats()
      return { success: true, stats }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 应用导航处理器
  ipcMain.handle(IPC_CHANNELS.NAVIGATE_TO_VIEW, async (_, viewKey: string) => {
    try {
      // 显示主窗口
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
        // 发送导航事件到渲染进程
        mainWindow.webContents.send('navigate-to-view', viewKey)
      }
      return { success: true, viewKey }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 聊天历史相关处理器
  // 创建新的聊天会话
  ipcMain.handle(IPC_CHANNELS.CHAT_CREATE_SESSION, async (_, title?: string) => {
    try {
      const sessionId = await createChatSession(title)
      return sessionId
    } catch (error) {
      console.error('创建聊天会话失败:', error)
      return null
    }
  })

  // 保存聊天消息
  ipcMain.handle(
    IPC_CHANNELS.CHAT_SAVE_MESSAGE,
    async (
      _,
      message: {
        id: string
        sessionId: string
        role: 'user' | 'assistant' | 'system'
        content: string
        status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
        parentId?: string
        modelId?: string
      }
    ) => {
      try {
        const success = await saveChatMessage(message)
        return success
      } catch (error) {
        console.error('保存聊天消息失败:', error)
        return false
      }
    }
  )

  // 获取所有聊天会话
  ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSIONS, async () => {
    try {
      const sessions = await getChatSessions()
      return sessions
    } catch (error) {
      console.error('获取聊天会话失败:', error)
      return []
    }
  })

  // 获取指定会话的消息
  ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSION_MESSAGES, async (_, sessionId: string) => {
    try {
      const messages = await getChatMessages(sessionId)
      return messages
    } catch (error) {
      console.error('获取会话消息失败:', error)
      return []
    }
  })

  // 更新会话标题
  ipcMain.handle(
    IPC_CHANNELS.CHAT_UPDATE_SESSION_TITLE,
    async (_, sessionId: string, title: string) => {
      try {
        const success = await updateChatSessionTitle(sessionId, title)
        return success
      } catch (error) {
        console.error('更新会话标题失败:', error)
        return false
      }
    }
  )

  // 删除聊天会话
  ipcMain.handle(IPC_CHANNELS.CHAT_DELETE_SESSION, async (_, sessionId: string) => {
    try {
      const success = await deleteChatSession(sessionId)
      return success
    } catch (error) {
      console.error('删除聊天会话失败:', error)
      return false
    }
  })

  // 删除单条聊天消息
  ipcMain.handle(IPC_CHANNELS.CHAT_DELETE_MESSAGE, async (_, messageId: string) => {
    try {
      const success = await deleteChatMessage(messageId)
      return success
    } catch (error) {
      console.error('删除聊天消息失败:', error)
      return false
    }
  })

  // 获取会话统计信息
  ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSION_STATS, async () => {
    try {
      const stats = await getChatSessionStats()
      return stats
    } catch (error) {
      console.error('获取会话统计失败:', error)
      return {
        totalSessions: 0,
        totalMessages: 0,
        activeSessions: 0
      }
    }
  })

  // 清理旧的会话
  ipcMain.handle(IPC_CHANNELS.CHAT_CLEANUP_OLD_SESSIONS, async (_, keepCount?: number) => {
    try {
      const deletedCount = await cleanupOldChatSessions(keepCount)
      return deletedCount
    } catch (error) {
      console.error('清理旧会话失败:', error)
      return 0
    }
  })

  createWindow()
  createTray()

  // 应用启动时执行自动同步
  performAutoSync()

  // 自动更新检查已禁用，仅支持手动检查
  // checkUpdatesOnStartup()

  // 启动内存监控
  memoryMonitor.start()

  // 设置内存监控事件监听
  memoryMonitor.on('memoryAlert', (alert) => {
    if (mainWindow) {
      mainWindow.webContents.send('memory-alert', alert)
    }

    // 当内存使用严重时，自动执行清理
    if (alert.level === 'critical') {
      setTimeout(async () => {
        try {
          // 执行数据库内存清理
          performDatabaseMemoryCleanup()

          // 通知渲染进程执行内存清理
          if (mainWindow) {
            mainWindow.webContents.send('perform-memory-cleanup')
          }
        } catch (error) {
          console.error('自动内存清理失败:', error)
        }
      }, 1000) // 延迟1秒执行，避免影响性能
    }
  })

  memoryMonitor.on('gcExecuted', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('memory-gc-executed', info)
    }
  })

  // 监听内存清理事件，协调各模块的清理工作
  memoryMonitor.on('memoryCleanup', async (event) => {
    try {
      // 清理数据库连接池
      const dbCleanup = performDatabaseMemoryCleanup()

      // 通知渲染进程清理缓存
      if (mainWindow) {
        mainWindow.webContents.send('perform-memory-cleanup', {
          source: 'memory-monitor',
          timestamp: event.timestamp
        })
      }

      console.log('协调内存清理完成:', {
        database: dbCleanup,
        timestamp: event.timestamp
      })
    } catch (error) {
      console.error('协调内存清理失败:', error)
    }
  })

  // 初始化数据库
  try {
    initDatabase()
      .then((db) => {
        if (db) {
          // analysis_cache表已在initializeTables中自动创建
          // 初始化WebDAV同步缓存表
          return initWebDAVSyncCacheTable()
        } else {
          throw new Error('数据库初始化失败')
        }
      })
      .catch((error) => {
        mainErrorHandler.error(
          'Failed to initialize database tables',
          error,
          ErrorCategory.DATABASE,
          'databaseInit'
        )
      })
  } catch (error) {
    mainErrorHandler.error(
      'Failed to initialize database',
      error,
      ErrorCategory.DATABASE,
      'databaseInit'
    )
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appWithIsQuitting = app as any
  appWithIsQuitting.isQuitting = true
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
