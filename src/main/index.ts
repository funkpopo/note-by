import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readSettings, writeSettings, updateSetting, getSetting, ApiConfig } from './settings'
import { testOpenAIConnection } from './openai'
import { promises as fs } from 'fs'

// 设置的IPC通信频道
const IPC_CHANNELS = {
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  SAVE_API_CONFIG: 'api:save-config',
  DELETE_API_CONFIG: 'api:delete-config',
  SAVE_MARKDOWN: 'markdown:save',
  GET_MARKDOWN_FOLDERS: 'markdown:get-folders',
  GET_MARKDOWN_FILES: 'markdown:get-files',
  READ_MARKDOWN_FILE: 'markdown:read-file'
}

// 获取markdown文件夹路径
function getMarkdownFolderPath(): string {
  // 在开发环境中，markdown文件夹在项目根目录下
  // 在生产环境中，markdown文件夹在应用程序可执行文件的同级目录下
  if (is.dev) {
    return resolve(app.getAppPath(), 'markdown')
  } else {
    return resolve(app.getPath('exe'), '..', 'markdown')
  }
}

// 确保markdown文件夹和子文件夹存在
async function ensureMarkdownFolders(folderPath: string): Promise<void> {
  try {
    await fs.mkdir(folderPath, { recursive: true })
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

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
      await fs.writeFile(fullPath, content, 'utf-8')

      return { success: true, path: fullPath }
    } catch (error) {
      console.error('保存Markdown文件失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取Markdown文件夹列表
  ipcMain.handle(IPC_CHANNELS.GET_MARKDOWN_FOLDERS, async () => {
    try {
      const markdownRoot = getMarkdownFolderPath()

      // 确保根目录存在
      await ensureMarkdownFolders(markdownRoot)

      const entries = await fs.readdir(markdownRoot, { withFileTypes: true })
      const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

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

      const entries = await fs.readdir(folderPath, { withFileTypes: true })
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
        await fs.access(fullPath)
      } catch {
        // 文件不存在，返回空内容
        return { success: false, error: '文件不存在', content: '' }
      }

      // 读取文件内容
      const content = await fs.readFile(fullPath, 'utf-8')

      return { success: true, content }
    } catch (error) {
      console.error(`读取文件 ${filePath} 失败:`, error)
      return { success: false, error: String(error), content: '' }
    }
  })

  createWindow()

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
