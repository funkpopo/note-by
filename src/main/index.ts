import { app, shell, BrowserWindow, ipcMain } from 'electron'
import path, { join, resolve } from 'path'
import fsSync from 'fs' // 添加同步fs模块
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  readSettings,
  writeSettings,
  updateSetting,
  getSetting,
  ApiConfig,
  getWebDAVConfig
} from './settings'
import { testOpenAIConnection, generateContent, streamGenerateContent } from './openai'
import { promises as fsPromises } from 'fs'
import {
  testWebDAVConnection,
  syncLocalToRemote,
  syncRemoteToLocal,
  syncBidirectional,
  cancelSync
} from './webdav'
import axios from 'axios'

// 设置的IPC通信频道
const IPC_CHANNELS = {
  GET_SETTINGS: 'setting:get-all',
  SET_SETTINGS: 'setting:set-all',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  GENERATE_CONTENT: 'openai:generate-content',
  STREAM_GENERATE_CONTENT: 'openai:stream-generate-content',
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
  CHECK_FOR_UPDATES: 'app:check-for-updates'
}

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

  console.log('Markdown文件夹路径:', markdownPath)

  // 确保markdown根目录存在
  try {
    if (!fsSync.existsSync(markdownPath)) {
      console.log('创建markdown根目录:', markdownPath)
      fsSync.mkdirSync(markdownPath, { recursive: true })
    }
  } catch (error) {
    console.error('创建markdown根目录失败:', error)
  }

  return markdownPath
}

// 确保markdown文件夹和子文件夹存在
async function ensureMarkdownFolders(folderPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(folderPath, { recursive: true })
  } catch (error) {
    console.error(`创建文件夹失败: ${folderPath}`, error)
    throw error
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 400, // 设置最小宽度
    minHeight: 300, // 设置最小高度
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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
}

// 执行WebDAV自动同步
async function performAutoSync(): Promise<void> {
  try {
    console.log('检查WebDAV自动同步设置...')
    const webdavConfig = getWebDAVConfig()

    // 检查是否启用了自动同步
    if (!webdavConfig.enabled || !webdavConfig.syncOnStartup) {
      console.log('WebDAV自动同步未启用')
      return
    }

    console.log('开始WebDAV自动同步，方向:', webdavConfig.syncDirection)

    // 设置本地路径
    const markdownPath = getMarkdownFolderPath()

    // 根据配置的同步方向执行同步
    let result

    switch (webdavConfig.syncDirection) {
      case 'localToRemote':
        result = await syncLocalToRemote({
          ...webdavConfig,
          localPath: markdownPath
        })
        console.log('自动同步本地到远程完成:', result.message)
        break
      case 'remoteToLocal':
        result = await syncRemoteToLocal({
          ...webdavConfig,
          localPath: markdownPath
        })
        console.log('自动同步远程到本地完成:', result.message)
        break
      case 'bidirectional':
      default:
        result = await syncBidirectional({
          ...webdavConfig,
          localPath: markdownPath
        })
        console.log('自动双向同步完成:', result.message)
        break
    }
  } catch (error) {
    console.error('WebDAV自动同步失败:', error)
  }
}

// GitHub releases API URL
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/funkpopo/note-by/releases/latest'

// 检查更新函数
async function checkForUpdates(): Promise<{
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
}> {
  try {
    const currentVersion = app.getVersion()
    const response = await axios.get(GITHUB_RELEASES_URL)

    if (response.status !== 200) {
      throw new Error(`GitHub API responded with status: ${response.status}`)
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
    console.error('检查更新失败:', error)
    return {
      hasUpdate: false,
      latestVersion: '',
      currentVersion: app.getVersion()
    }
  }
}

// 在应用启动时检查更新
async function checkUpdatesOnStartup(): Promise<void> {
  try {
    const settings = readSettings()
    const shouldCheckUpdates = settings.checkUpdatesOnStartup !== false

    if (shouldCheckUpdates) {
      const updateInfo = await checkForUpdates()

      if (updateInfo.hasUpdate) {
        // 发送更新通知到渲染进程
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow) {
          mainWindow.webContents.send('update-available', updateInfo)
        }
      }
    }
  } catch (error) {
    console.error('启动时检查更新失败:', error)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron.note-by')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

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
  ipcMain.handle(IPC_CHANNELS.TEST_OPENAI_CONNECTION, async (_, apiConfig) => {
    return await testOpenAIConnection(apiConfig)
  })

  // 内容生成
  ipcMain.handle(IPC_CHANNELS.GENERATE_CONTENT, async (_, request) => {
    return await generateContent(request)
  })

  // 流式内容生成
  ipcMain.handle(IPC_CHANNELS.STREAM_GENERATE_CONTENT, async (event, request) => {
    try {
      const emitter = await streamGenerateContent(request)
      const sender = event.sender

      // 为每个流式数据块分配唯一ID
      const streamId = Date.now().toString()

      // 监听数据事件
      emitter.on('data', (chunk) => {
        if (!sender.isDestroyed()) {
          sender.send(`stream-data-${streamId}`, { chunk })
        }
      })

      // 监听完成事件
      emitter.on('done', (fullContent) => {
        if (!sender.isDestroyed()) {
          sender.send(`stream-done-${streamId}`, { content: fullContent })
        }
      })

      // 监听错误事件
      emitter.on('error', (error) => {
        if (!sender.isDestroyed()) {
          sender.send(`stream-error-${streamId}`, { error })
        }
      })

      // 返回流ID供客户端使用
      return { success: true, streamId }
    } catch (error) {
      console.error('启动流式内容生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '启动流式生成失败'
      }
    }
  })

  // 保存API配置
  ipcMain.handle(IPC_CHANNELS.SAVE_API_CONFIG, (_, apiConfig) => {
    try {
      const settings = readSettings()
      const apiConfigs = (settings.apiConfigs as ApiConfig[]) || []

      // 检查是否存在相同ID的配置
      const index = apiConfigs.findIndex((config: ApiConfig) => config.id === apiConfig.id)

      if (index >= 0) {
        // 更新已存在的配置
        apiConfigs[index] = apiConfig
      } else {
        // 添加新配置
        apiConfigs.push(apiConfig)
      }

      // 保存到设置
      settings.apiConfigs = apiConfigs
      writeSettings(settings)

      return { success: true }
    } catch (error) {
      console.error('保存API配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除API配置
  ipcMain.handle(IPC_CHANNELS.DELETE_API_CONFIG, (_, configId) => {
    try {
      const settings = readSettings()
      const apiConfigs = (settings.apiConfigs as ApiConfig[]) || []

      // 过滤掉要删除的配置
      settings.apiConfigs = apiConfigs.filter((config: ApiConfig) => config.id !== configId)
      writeSettings(settings)

      return { success: true }
    } catch (error) {
      console.error('删除API配置失败:', error)
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

      // 写入文件
      await fsPromises.writeFile(fullPath, content, 'utf-8')

      return { success: true, path: fullPath }
    } catch (error) {
      console.error('保存Markdown文件失败:', error)
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
      console.error(`检查文件 ${filePath} 是否存在失败:`, error)
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
          console.error(`读取目录 ${dir} 失败:`, error)
        }

        return folders
      }

      const folders = await getAllFolders(markdownRoot)
      return { success: true, folders }
    } catch (error) {
      console.error('获取Markdown文件夹列表失败:', error)
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
      } catch {
        console.log(`文件夹 ${folderName} 不存在，已创建`)
      }

      const entries = await fsPromises.readdir(folderPath, { withFileTypes: true })
      const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name)

      return { success: true, files }
    } catch (error) {
      console.error(`获取文件夹 ${folderName} 中的Markdown文件列表失败:`, error)
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

      // 读取文件内容
      const content = await fsPromises.readFile(fullPath, 'utf-8')

      return { success: true, content }
    } catch (error) {
      console.error(`读取文件 ${filePath} 失败:`, error)
      return { success: false, error: String(error), content: '' }
    }
  })

  // 创建新文件夹
  ipcMain.handle(IPC_CHANNELS.CREATE_MARKDOWN_FOLDER, async (_, folderName) => {
    console.log('接收到创建文件夹请求:', folderName)

    try {
      // 验证文件夹名称
      if (!folderName || folderName.trim() === '') {
        console.error('文件夹名称无效')
        return { success: false, error: '文件夹名称不能为空' }
      }

      const markdownRoot = getMarkdownFolderPath()

      // 处理嵌套路径，先分割成路径部分
      const pathParts = folderName.split('/')

      // 过滤每个部分中的非法字符，保留路径结构
      const sanitizedParts = pathParts.map((part) => part.replace(/[\\:*?"<>|]/g, '_'))

      // 重新组合路径
      const sanitizedFolderName = sanitizedParts.join('/')

      if (sanitizedFolderName !== folderName) {
        console.log(`文件夹名称包含非法字符，已净化: ${folderName} -> ${sanitizedFolderName}`)
      }

      const fullPath = resolve(markdownRoot, sanitizedFolderName)

      console.log('将要创建的文件夹完整路径:', fullPath)

      // 检查markdown根目录是否存在，如果不存在则创建
      if (!fsSync.existsSync(markdownRoot)) {
        console.log('创建主markdown目录')
        await fsPromises.mkdir(markdownRoot, { recursive: true })
      }

      // 检查文件夹是否已存在
      try {
        const stat = await fsPromises.stat(fullPath)
        if (stat.isDirectory()) {
          console.log('文件夹已存在')
          return { success: false, error: '文件夹已存在' }
        } else {
          console.error('路径存在但不是文件夹')
          return { success: false, error: '该名称已被文件占用' }
        }
      } catch {
        // 错误表示路径不存在，可以创建
        console.log('开始创建文件夹')
      }

      // 创建文件夹
      await fsPromises.mkdir(fullPath, { recursive: true })
      console.log('文件夹创建成功:', fullPath)

      return { success: true, path: fullPath }
    } catch (error) {
      console.error(`创建文件夹 ${folderName} 失败:`, error)
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
      console.error(`删除文件夹 ${folderName} 失败:`, error)
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
      console.error(`重命名文件夹从 ${oldFolderName} 到 ${newFolderName} 失败:`, error)
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

      // 写入文件
      await fsPromises.writeFile(filePath, content || '', 'utf-8')

      return { success: true, path: filePath }
    } catch (error) {
      console.error(`创建笔记 ${folderName}/${fileName} 失败:`, error)
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
      console.error(`删除文件 ${filePath} 失败:`, error)
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
      console.error(`重命名文件从 ${oldFilePath} 到 ${newFilePath} 失败:`, error)
      return { success: false, error: String(error) }
    }
  })

  // 测试WebDAV连接
  ipcMain.handle(IPC_CHANNELS.TEST_WEBDAV_CONNECTION, async (_, config) => {
    try {
      const result = await testWebDAVConnection(config)
      return result
    } catch (error) {
      console.error('测试WebDAV连接失败:', error)
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
      console.error('同步本地到远程失败:', error)
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
      console.error('同步远程到本地失败:', error)
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
      console.error('双向同步失败:', error)
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
      console.error('取消同步失败:', error)
      return { success: false, message: `取消同步失败: ${error}` }
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
          const cleanPath = fileData.replace(/^file:\/\//i, '').replace(/["']/g, '')
          console.log(`检测到可能的文件路径，尝试读取: ${cleanPath}`)

          try {
            // 尝试读取文件
            const fileBuffer = await fsPromises.readFile(cleanPath)
            // 转换为base64
            const base64Data = `data:image/${path.extname(cleanPath).substring(1)};base64,${fileBuffer.toString('base64')}`
            fileData = base64Data
            console.log('成功读取本地文件并转换为base64')
          } catch (readError) {
            console.error('读取文件失败，可能不是有效的本地文件路径:', readError)
            // 如果读取失败，保持原始数据
          }
        } catch (error) {
          console.error('解析文件路径失败:', error)
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

      // 为当前文档创建一个.assets资源目录（使用隐藏文件夹）
      const assetsDir = path.join(mdDirectory, '.assets')
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
      // 格式：![图片文件名称](绝对路径/.assets/对应的图片文件名)
      // 使用path.posix确保在Markdown中使用正斜杠
      const absoluteDirPath = path.resolve(markdownRoot, mdDirectory)
      const markdownImagePath = `${absoluteDirPath}${path.posix.sep}.assets${path.posix.sep}${uniqueFileName}`

      console.log(`文件上传成功: ${markdownImagePath}`)

      return {
        success: true,
        url: markdownImagePath,
        path: savePath
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新检查
  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
    return await checkForUpdates()
  })

  createWindow()

  // 应用启动时执行自动同步
  performAutoSync()

  // 在应用启动时检查更新
  checkUpdatesOnStartup()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
