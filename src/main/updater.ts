import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

// 更新状态枚举
export enum UpdateStatus {
  CHECKING = 'checking-for-update',
  AVAILABLE = 'update-available',
  NOT_AVAILABLE = 'update-not-available',
  DOWNLOADED = 'update-downloaded',
  ERROR = 'error'
}

// 更新信息接口
export interface UpdateInfo {
  status: UpdateStatus
  version?: string
  progress?: number
  error?: string
}

class UpdaterService {
  private mainWindow: BrowserWindow | null = null
  private updateCheckInProgress = false

  constructor() {
    this.setupAutoUpdater()
    this.setupIpcHandlers()
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private setupAutoUpdater(): void {
    // 开发环境跳过更新检查
    if (is.dev) {
      autoUpdater.updateConfigPath = './dev-app-update.yml'
    }

    // 配置自动更新
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // 设置事件监听器
    autoUpdater.on('checking-for-update', () => {
      this.sendUpdateInfo({
        status: UpdateStatus.CHECKING
      })
    })

    autoUpdater.on('update-available', (info) => {
      this.sendUpdateInfo({
        status: UpdateStatus.AVAILABLE,
        version: info.version
      })
      this.showUpdateDialog(info.version)
    })

    autoUpdater.on('update-not-available', () => {
      this.sendUpdateInfo({
        status: UpdateStatus.NOT_AVAILABLE
      })
      this.updateCheckInProgress = false
    })

    autoUpdater.on('error', (error) => {
      this.sendUpdateInfo({
        status: UpdateStatus.ERROR,
        error: error.message
      })
      this.updateCheckInProgress = false
      console.error('Updater error:', error)
    })

    autoUpdater.on('download-progress', (progress) => {
      this.sendUpdateInfo({
        status: UpdateStatus.AVAILABLE,
        progress: progress.percent
      })
    })

    autoUpdater.on('update-downloaded', () => {
      this.sendUpdateInfo({
        status: UpdateStatus.DOWNLOADED
      })
      this.showRestartDialog()
    })
  }

  private setupIpcHandlers(): void {
    // 检查更新
    ipcMain.handle('updater:check-for-updates', async () => {
      if (this.updateCheckInProgress) {
        return { status: 'already-checking' }
      }

      try {
        this.updateCheckInProgress = true
        const result = await autoUpdater.checkForUpdates()
        return {
          status: 'success',
          updateInfo: result?.updateInfo
        }
      } catch (error) {
        this.updateCheckInProgress = false
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // 下载更新
    ipcMain.handle('updater:download-update', async () => {
      try {
        await autoUpdater.downloadUpdate()
        return { status: 'success' }
      } catch (error) {
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // 安装更新
    ipcMain.handle('updater:install-update', () => {
      autoUpdater.quitAndInstall()
    })

    // 获取当前版本
    ipcMain.handle('updater:get-version', () => {
      return app.getVersion()
    })
  }

  private sendUpdateInfo(info: UpdateInfo): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:status-changed', info)
    }
  }

  private async showUpdateDialog(version: string): Promise<void> {
    if (!this.mainWindow) return

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${version}`,
      detail: '是否现在下载更新？',
      buttons: ['现在下载', '稍后提醒', '跳过此版本'],
      defaultId: 0,
      cancelId: 1
    })

    switch (result.response) {
      case 0: // 现在下载
        await autoUpdater.downloadUpdate()
        break
      case 1: // 稍后提醒
        // 不做任何操作，稍后会再次检查
        break
      case 2: // 跳过此版本
        // 可以在这里记录跳过的版本
        break
    }
  }

  private async showRestartDialog(): Promise<void> {
    if (!this.mainWindow) return

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '更新已下载',
      message: '更新已下载完成',
      detail: '重启应用程序以应用更新？',
      buttons: ['立即重启', '稍后重启'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  }

  // 初始化自动检查
  public initializeAutoCheck(): void {
    // 应用启动后延迟检查更新
    setTimeout(() => {
      if (!is.dev) {
        this.checkForUpdates()
      }
    }, 5000) // 5秒后检查

    // 设置定期检查（每4小时）
    setInterval(
      () => {
        if (!is.dev && !this.updateCheckInProgress) {
          this.checkForUpdates()
        }
      },
      4 * 60 * 60 * 1000
    ) // 4小时
  }

  private async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      console.error('Failed to check for updates:', error)
    }
  }
}

// 导出单例实例
export const updaterService = new UpdaterService()
