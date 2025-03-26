import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readSettings, writeSettings, updateSetting, getSetting, ApiConfig } from './settings'
import { testOpenAIConnection } from './openai'

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
