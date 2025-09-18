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

// 文件日志配置
export interface FileLogConfig {
  enabled: boolean
  logFile?: string
  maxLogSize?: number
  maxLogFiles?: number
}

// 错误处理器配置
export interface ErrorHandlerConfig {
  isDev: boolean
  logLevel?: LogLevel
  maxLogEntries?: number
  fileLog?: FileLogConfig
  consoleLog?: boolean
  setupGlobalHandlers?: boolean
  onError?: (info: ErrorInfo) => void | Promise<void>
  onFatalError?: (error: Error) => void
}

// 统一的可配置错误处理器
export class UnifiedErrorHandler {
  protected config: ErrorHandlerConfig
  protected logEntries: ErrorInfo[] = []
  private fileLogHelper?: FileLogHelper
  private static instance?: UnifiedErrorHandler
  private environment: 'main' | 'renderer' | 'node' = 'node'

  constructor(config: ErrorHandlerConfig) {
    this.config = {
      ...config,
      logLevel: config.logLevel ?? (config.isDev ? LogLevel.DEBUG : LogLevel.INFO),
      maxLogEntries: config.maxLogEntries ?? 1000,
      consoleLog: config.consoleLog ?? true
    }

    // 检测运行环境
    this.detectEnvironment()

    // 初始化文件日志
    if (config.fileLog?.enabled) {
      this.fileLogHelper = new FileLogHelper(config.fileLog)
    }

    // 设置全局处理器
    if (config.setupGlobalHandlers) {
      this.setupGlobalHandlers()
    }
  }

  private detectEnvironment(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.environment = 'renderer'
    } else if (typeof process !== 'undefined' && process.versions?.electron) {
      this.environment = 'main'
    } else {
      this.environment = 'node'
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

    return formatted
  }

  private async log(info: ErrorInfo): Promise<void> {
    // 检查日志级别
    if (info.level < (this.config.logLevel ?? LogLevel.INFO)) {
      return
    }

    // 添加环境信息
    info.url = this.getUrl()
    info.userAgent = this.getUserAgent()

    // 添加到内存中的日志队列
    this.logEntries.push(info)

    // 保持日志队列大小
    if (this.logEntries.length > (this.config.maxLogEntries ?? 1000)) {
      this.logEntries.shift()
    }

    const message = this.formatLogMessage(info)

    // 控制台输出
    if (this.config.consoleLog) {
      this.logToConsole(info, message)
    }

    // 文件日志
    if (this.fileLogHelper) {
      await this.fileLogHelper.write(message + '\n')
    }

    // 自定义错误处理
    if (this.config.onError) {
      await this.config.onError(info)
    }
  }

  private logToConsole(info: ErrorInfo, message: string): void {
    if (!this.config.isDev && this.environment === 'main') {
      return // 主进程生产环境不输出到控制台
    }

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

  private getUrl(): string | undefined {
    if (this.environment === 'renderer') {
      return window?.location?.href
    }
    return undefined
  }

  private getUserAgent(): string | undefined {
    if (this.environment === 'renderer') {
      return navigator?.userAgent
    }
    return undefined
  }

  private setupGlobalHandlers(): void {
    if (this.environment === 'main') {
      this.setupMainHandlers()
    } else if (this.environment === 'renderer') {
      this.setupRendererHandlers()
    } else {
      this.setupNodeHandlers()
    }
  }

  private setupMainHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      this.error('Uncaught Exception', error, ErrorCategory.SYSTEM, 'global')
      if (this.config.onFatalError) {
        this.config.onFatalError(error)
      }
    })

    process.on('unhandledRejection', (reason: unknown) => {
      this.error('Unhandled Promise Rejection', reason, ErrorCategory.SYSTEM, 'global')
    })
  }

  private setupRendererHandlers(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.error(
        'Unhandled Promise Rejection',
        event.reason,
        ErrorCategory.SYSTEM,
        'unhandledrejection'
      )
    })

    window.addEventListener('error', (event) => {
      this.error(
        'Runtime Error',
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        },
        ErrorCategory.SYSTEM,
        'error'
      )
    })

    // 处理资源加载错误
    window.addEventListener(
      'error',
      (event) => {
        const target = event.target
        if (target && target instanceof HTMLElement) {
          this.error(
            'Resource Load Error',
            {
              tagName: target.tagName,
              src: (target as HTMLImageElement | HTMLScriptElement).src,
              href: (target as HTMLLinkElement).href
            },
            ErrorCategory.NETWORK,
            'resourceerror'
          )
        }
      },
      true
    )
  }

  private setupNodeHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      this.error('Uncaught Exception', error, ErrorCategory.SYSTEM, 'global')
    })

    process.on('unhandledRejection', (reason: unknown) => {
      this.error('Unhandled Promise Rejection', reason, ErrorCategory.SYSTEM, 'global')
    })
  }

  // React错误边界支持
  public handleReactError(error: Error, errorInfo: { componentStack: string }): void {
    this.error('React Error Boundary Caught Error', error, ErrorCategory.UI, 'ReactErrorBoundary')
    this.error(
      'React Component Stack',
      { componentStack: errorInfo.componentStack },
      ErrorCategory.UI,
      'ReactErrorBoundary'
    )
  }

  // 设置日志级别
  public setLogLevel(level: LogLevel): void {
    this.config.logLevel = level
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

  // 获取文件日志内容
  public async getRecentFileLog(lines: number = 100): Promise<string[]> {
    if (!this.fileLogHelper) {
      return []
    }
    return this.fileLogHelper.getRecentLines(lines)
  }

  // 清除文件日志
  public async clearFileLogs(): Promise<void> {
    if (this.fileLogHelper) {
      await this.fileLogHelper.clearLogs()
    }
  }

  // 获取单例实例
  public static getInstance(config?: ErrorHandlerConfig): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      if (!config) {
        throw new Error('ErrorHandler must be initialized with config on first call')
      }
      UnifiedErrorHandler.instance = new UnifiedErrorHandler(config)
    }
    return UnifiedErrorHandler.instance
  }

  // 重置单例（用于测试）
  public static resetInstance(): void {
    UnifiedErrorHandler.instance = undefined
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

// 文件日志助手类
class FileLogHelper {
  private config: FileLogConfig
  private fs?: typeof import('fs')
  private path?: typeof import('path')
  private pendingWrites: string[] = []
  private isWriting = false

  constructor(config: FileLogConfig) {
    this.config = {
      ...config,
      maxLogSize: config.maxLogSize ?? 10 * 1024 * 1024, // 10MB
      maxLogFiles: config.maxLogFiles ?? 5
    }

    // 动态导入fs和path（仅在Node环境）
    this.initializeFileSystem()
  }

  private async initializeFileSystem(): Promise<void> {
    if (typeof window === 'undefined') {
      try {
        this.fs = await import('fs')
        this.path = await import('path')
        await this.ensureLogDirectory()
      } catch (error) {
        console.error('Failed to initialize file system:', error)
      }
    }
  }

  private async ensureLogDirectory(): Promise<void> {
    if (!this.fs || !this.path || !this.config.logFile) return

    try {
      const logDir = this.path.dirname(this.config.logFile)
      if (!this.fs.existsSync(logDir)) {
        this.fs.mkdirSync(logDir, { recursive: true })
      }
    } catch (error) {
      console.error('Failed to create log directory:', error)
    }
  }

  public async write(message: string): Promise<void> {
    if (!this.fs || !this.config.logFile) return

    this.pendingWrites.push(message)
    if (!this.isWriting) {
      await this.processPendingWrites()
    }
  }

  private async processPendingWrites(): Promise<void> {
    if (!this.fs || !this.config.logFile || this.pendingWrites.length === 0) return

    this.isWriting = true
    const messages = this.pendingWrites.splice(0)
    const content = messages.join('')

    try {
      await this.rotateLogsIfNeeded()
      await this.fs.promises.appendFile(this.config.logFile, content, 'utf8')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    } finally {
      this.isWriting = false
      if (this.pendingWrites.length > 0) {
        await this.processPendingWrites()
      }
    }
  }

  private async rotateLogsIfNeeded(): Promise<void> {
    if (!this.fs || !this.path || !this.config.logFile) return

    try {
      if (!this.fs.existsSync(this.config.logFile)) return

      const stats = await this.fs.promises.stat(this.config.logFile)
      if (stats.size < (this.config.maxLogSize ?? 10 * 1024 * 1024)) return

      const logDir = this.path.dirname(this.config.logFile)
      const basename = this.path.basename(this.config.logFile, '.log')
      const maxFiles = this.config.maxLogFiles ?? 5

      // 删除最旧的日志文件
      const oldestLog = this.path.join(logDir, `${basename}.${maxFiles - 1}.log`)
      if (this.fs.existsSync(oldestLog)) {
        await this.fs.promises.unlink(oldestLog)
      }

      // 移动现有的日志文件
      for (let i = maxFiles - 2; i >= 0; i--) {
        const currentLog =
          i === 0 ? this.config.logFile : this.path.join(logDir, `${basename}.${i}.log`)
        const nextLog = this.path.join(logDir, `${basename}.${i + 1}.log`)

        if (this.fs.existsSync(currentLog)) {
          await this.fs.promises.rename(currentLog, nextLog)
        }
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error)
    }
  }

  public async getRecentLines(lines: number): Promise<string[]> {
    if (!this.fs || !this.config.logFile) return []

    try {
      if (!this.fs.existsSync(this.config.logFile)) return []

      const content = await this.fs.promises.readFile(this.config.logFile, 'utf8')
      const allLines = content.split('\n').filter((line) => line.trim())
      return allLines.slice(-lines)
    } catch (error) {
      console.error('Failed to read log file:', error)
      return []
    }
  }

  public async clearLogs(): Promise<void> {
    if (!this.fs || !this.path || !this.config.logFile) return

    try {
      const logDir = this.path.dirname(this.config.logFile)
      const files = await this.fs.promises.readdir(logDir)

      for (const file of files) {
        if (file.endsWith('.log')) {
          await this.fs.promises.unlink(this.path.join(logDir, file))
        }
      }
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }
}

// 保留旧的类型导出以保持向后兼容性
export { UnifiedErrorHandler as BaseErrorHandler }
export type { ErrorHandlerConfig as EnvironmentAdapter }
