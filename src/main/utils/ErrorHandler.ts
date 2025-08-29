import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import {
  BaseErrorHandler,
  EnvironmentAdapter,
  LogLevel,
  ErrorCategory,
  ErrorInfo
} from '../../shared/utils/ErrorHandler'

// 重新导出共享的类型和枚举，以保持向后兼容性
export { LogLevel, ErrorCategory }
export type { ErrorInfo }

class MainErrorHandler extends BaseErrorHandler {
  private logFile: string
  private maxLogSize = 10 * 1024 * 1024 // 10MB
  private maxLogFiles = 5

  constructor() {
    const adapter: EnvironmentAdapter = {
      isDev: is.dev,
      log: async (info: ErrorInfo, message: string) => {
        await this.writeToFile(message + '\n')

        // 输出到控制台（仅开发环境）
        if (is.dev) {
          switch (info.level) {
            case LogLevel.DEBUG:
              console.debug(message)
              break
            case LogLevel.INFO:
              console.info(message)
              break
            case LogLevel.WARN:
              console.warn(message)
              break
            case LogLevel.ERROR:
              console.error(message)
              break
          }
        }
      },
      setupGlobalHandlers: (handler) => {
        // 延迟到super调用后执行
        setTimeout(() => this.setupGlobalHandlers(handler), 0)
      }
    }

    super(adapter)
    this.logFile = this.getLogFilePath()
    this.ensureLogDirectory()
  }

  private getLogFilePath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'logs', 'main.log')
  }

  private ensureLogDirectory(): void {
    try {
      const logDir = path.dirname(this.logFile)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
    } catch (error) {
      console.error('Failed to create log directory:', error)
    }
  }

  private async writeToFile(message: string): Promise<void> {
    try {
      await this.rotateLogsIfNeeded()
      await fs.promises.appendFile(this.logFile, message, 'utf8')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  private async rotateLogsIfNeeded(): Promise<void> {
    try {
      if (!fs.existsSync(this.logFile)) {
        return
      }

      const stats = await fs.promises.stat(this.logFile)
      if (stats.size < this.maxLogSize) {
        return
      }

      // 轮转日志文件
      const logDir = path.dirname(this.logFile)
      const basename = path.basename(this.logFile, '.log')

      // 删除最旧的日志文件
      const oldestLog = path.join(logDir, `${basename}.${this.maxLogFiles - 1}.log`)
      if (fs.existsSync(oldestLog)) {
        await fs.promises.unlink(oldestLog)
      }

      // 移动现有的日志文件
      for (let i = this.maxLogFiles - 2; i >= 0; i--) {
        const currentLog = i === 0 ? this.logFile : path.join(logDir, `${basename}.${i}.log`)
        const nextLog = path.join(logDir, `${basename}.${i + 1}.log`)

        if (fs.existsSync(currentLog)) {
          await fs.promises.rename(currentLog, nextLog)
        }
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error)
    }
  }

  // 处理未捕获的异常和Promise拒绝
  public setupMainGlobalHandlers(): void {
    this.setupGlobalHandlers(this)
  }

  // 私有方法用于设置全局处理器
  private setupGlobalHandlers(handler: BaseErrorHandler): void {
    process.on('uncaughtException', (error: Error) => {
      handler.error('Uncaught Exception', error, ErrorCategory.SYSTEM, 'global')
      // 在生产环境中，考虑重启应用
      if (!is.dev) {
        setTimeout(() => {
          app.relaunch()
          app.exit(1)
        }, 1000)
      }
    })

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      handler.error('Unhandled Promise Rejection', reason, ErrorCategory.SYSTEM, 'global')
      console.error('Promise:', promise)
    })
  }

  // 获取最近的日志文件内容
  public async getRecentFileLog(lines: number = 100): Promise<string[]> {
    try {
      if (!fs.existsSync(this.logFile)) {
        return []
      }

      const content = await fs.promises.readFile(this.logFile, 'utf8')
      const allLines = content.split('\n').filter((line) => line.trim())
      return allLines.slice(-lines)
    } catch (error) {
      console.error('Failed to read log file:', error)
      return []
    }
  }

  // 清除日志文件
  public async clearFileLogs(): Promise<void> {
    try {
      const logDir = path.dirname(this.logFile)
      const files = await fs.promises.readdir(logDir)

      for (const file of files) {
        if (file.endsWith('.log')) {
          await fs.promises.unlink(path.join(logDir, file))
        }
      }
    } catch (error) {
      this.error('Failed to clear logs', error, ErrorCategory.SYSTEM, 'clearLogs')
    }
  }

  // 实现抽象方法
  protected getUrl(): string | undefined {
    return undefined
  }

  protected getUserAgent(): string | undefined {
    return undefined
  }
}

// 导出单例实例
export const mainErrorHandler = new MainErrorHandler()
