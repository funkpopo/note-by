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
  UI = 'ui',
  STORAGE = 'storage',
  FILE_IO = 'file_io',
  DATABASE = 'database',
  WEBDAV = 'webdav',
  AI_API = 'ai_api',
  API = 'api',
  VALIDATION = 'validation',
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
  url?: string
  userAgent?: string
}

// 环境适配器接口
export interface EnvironmentAdapter {
  isDev: boolean
  log: (info: ErrorInfo, message: string) => void | Promise<void>
  setupGlobalHandlers?: (handler: BaseErrorHandler) => void
}

// 基础错误处理器
export abstract class BaseErrorHandler {
  protected logLevel: LogLevel
  protected maxLogEntries = 1000
  protected logEntries: ErrorInfo[] = []
  protected environmentAdapter: EnvironmentAdapter

  constructor(environmentAdapter: EnvironmentAdapter, logLevel?: LogLevel) {
    this.environmentAdapter = environmentAdapter
    this.logLevel = logLevel ?? (environmentAdapter.isDev ? LogLevel.DEBUG : LogLevel.INFO)

    // 设置全局处理器（如果支持）
    if (environmentAdapter.setupGlobalHandlers) {
      environmentAdapter.setupGlobalHandlers(this)
    }
  }

  protected formatLogMessage(info: ErrorInfo): string {
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

    return formatted
  }

  protected async log(info: ErrorInfo): Promise<void> {
    // 检查日志级别
    if (info.level < this.logLevel) {
      return
    }

    // 添加到内存中的日志队列
    this.logEntries.push(info)

    // 保持日志队列大小
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries.shift()
    }

    const message = this.formatLogMessage(info)

    // 委托给环境适配器处理具体的日志输出
    await this.environmentAdapter.log(info, message)
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
      timestamp: new Date().toISOString(),
      url: this.getUrl(),
      userAgent: this.getUserAgent()
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
      timestamp: new Date().toISOString(),
      url: this.getUrl(),
      userAgent: this.getUserAgent()
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
      timestamp: new Date().toISOString(),
      url: this.getUrl(),
      userAgent: this.getUserAgent()
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
      timestamp: new Date().toISOString(),
      url: this.getUrl(),
      userAgent: this.getUserAgent()
    }).catch(() => {})
  }

  // 抽象方法，由子类实现
  protected abstract getUrl(): string | undefined
  protected abstract getUserAgent(): string | undefined

  // 设置日志级别
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  // 获取最近的日志
  public getRecentLogs(lines: number = 100): ErrorInfo[] {
    return this.logEntries.slice(-lines)
  }

  // 清除日志
  public clearLogs(): void {
    this.logEntries = []
  }

  // 导出日志（用于调试）
  public exportLogs(): string {
    return this.logEntries.map((entry) => this.formatLogMessage(entry)).join('\n')
  }

  // 获取错误统计
  public getErrorStats(): {
    total: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
    recent: number
  } {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    const byLevel: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    let recent = 0

    for (const entry of this.logEntries) {
      const levelStr = LogLevel[entry.level]
      byLevel[levelStr] = (byLevel[levelStr] || 0) + 1
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1

      const entryTime = new Date(entry.timestamp).getTime()
      if (entryTime > oneHourAgo) {
        recent++
      }
    }

    return {
      total: this.logEntries.length,
      byLevel,
      byCategory,
      recent
    }
  }
}
