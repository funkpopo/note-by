import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { is } from '@electron-toolkit/utils'

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// 错误类型分类
export enum ErrorCategory {
  SYSTEM = 'system',
  NETWORK = 'network',
  FILE_IO = 'file_io',
  DATABASE = 'database',
  WEBDAV = 'webdav',
  AI_API = 'ai_api',
  UPDATER = 'updater',
  UNKNOWN = 'unknown'
}

// 错误信息接口
export interface ErrorInfo {
  level: LogLevel
  category: ErrorCategory
  message: string
  details?: unknown
  stack?: string
  timestamp: string
  context?: string
}

class MainErrorHandler {
  private logLevel: LogLevel = is.dev ? LogLevel.DEBUG : LogLevel.INFO
  private logFile: string
  private maxLogSize = 10 * 1024 * 1024 // 10MB
  private maxLogFiles = 5

  constructor() {
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

  private formatLogMessage(info: ErrorInfo): string {
    const { timestamp, level, category, message, context, details, stack } = info
    const levelStr = LogLevel[level]

    let formatted = `[${timestamp}] [${levelStr}] [${category}]`
    if (context) {
      formatted += ` [${context}]`
    }
    formatted += ` ${message}`

    if (details) {
      formatted += `\nDetails: ${JSON.stringify(details, null, 2)}`
    }

    if (stack) {
      formatted += `\nStack: ${stack}`
    }

    return formatted + '\n'
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

  private async log(info: ErrorInfo): Promise<void> {
    // 检查日志级别
    if (info.level < this.logLevel) {
      return
    }

    const message = this.formatLogMessage(info)

    // 输出到控制台
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

    // 写入文件
    await this.writeToFile(message)
  }

  // 公共接口方法
  public debug(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string,
    details?: unknown
  ): void {
    this.log({
      level: LogLevel.DEBUG,
      category,
      message,
      context,
      details,
      timestamp: new Date().toISOString()
    }).catch(() => {}) // 静默处理日志记录错误
  }

  public info(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string,
    details?: unknown
  ): void {
    this.log({
      level: LogLevel.INFO,
      category,
      message,
      context,
      details,
      timestamp: new Date().toISOString()
    }).catch(() => {})
  }

  public warn(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string,
    details?: unknown
  ): void {
    this.log({
      level: LogLevel.WARN,
      category,
      message,
      context,
      details,
      timestamp: new Date().toISOString()
    }).catch(() => {})
  }

  public error(
    message: string,
    error?: Error | unknown,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string
  ): void {
    let details: unknown
    let stack: string | undefined

    if (error instanceof Error) {
      details = {
        name: error.name,
        message: error.message,
        cause: error.cause
      }
      stack = error.stack
    } else if (error) {
      details = error
    }

    this.log({
      level: LogLevel.ERROR,
      category,
      message,
      details,
      stack,
      context,
      timestamp: new Date().toISOString()
    }).catch(() => {})
  }

  // 处理未捕获的异常和Promise拒绝
  public setupGlobalHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      this.error('Uncaught Exception', error, ErrorCategory.SYSTEM, 'global')
      // 在生产环境中，考虑重启应用
      if (!is.dev) {
        setTimeout(() => {
          app.relaunch()
          app.exit(1)
        }, 1000)
      }
    })

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      this.error('Unhandled Promise Rejection', reason, ErrorCategory.SYSTEM, 'global')
      console.error('Promise:', promise)
    })
  }

  // 设置日志级别
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  // 获取最近的日志
  public async getRecentLogs(lines: number = 100): Promise<string[]> {
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

  // 清除日志
  public async clearLogs(): Promise<void> {
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
}

// 导出单例实例
export const mainErrorHandler = new MainErrorHandler()
